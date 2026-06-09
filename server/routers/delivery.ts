// ============================================
// Delivery integration router
// ============================================
// Receives orders from Grab / LINE MAN / Shopee Food / FoodPanda / Robinhood.
// Each platform has its own webhook URL — point them all to /api/trpc/delivery.webhook.
//
// Auth: webhook secret in header (X-Webhook-Secret) — set per platform in env.
// All inbound orders are stored as posOrders with orderType="delivery" and the
// platform's external id captured so we can reconcile later.

import { TRPCError } from "@trpc/server";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import {
  posOrders, posOrderItems, posMenuItems, branches,
} from "../../drizzle/schema";
import { logAudit, generateOrderNumber } from "../lib/audit";
import { publicProcedure, router, staffProcedure, staffAdminProcedure } from "../_core/trpc";

// Map platform name → default commission rate (overrideable per item)
const DEFAULT_COMMISSION: Record<string, number> = {
  grab: 30,
  lineman: 25,
  shopeefood: 28,
  foodpanda: 32,
  robinhood: 0,
  other: 0,
  in_house: 0,
};

const PlatformEnum = z.enum(["grab", "lineman", "shopeefood", "foodpanda", "robinhood", "other"]);

export const deliveryRouter = router({
  // Inbound webhook from delivery platforms
  // Public — secured by webhook secret in X-Webhook-Secret header.
  webhook: publicProcedure
    .input(z.object({
      secret: z.string().min(1),  // shared secret (matched against env)
      platform: PlatformEnum,
      branchCode: z.string(),     // identify branch by Hibi's branch code
      externalOrderId: z.string(),
      customerName: z.string().optional(),
      customerPhone: z.string().optional(),
      deliveryAddress: z.string().optional(),
      items: z.array(z.object({
        sku: z.string().optional(),
        menuItemId: z.number().int().optional(),
        name: z.string(),
        quantity: z.number().int().min(1),
        unitPrice: z.string(),
        notes: z.string().optional(),
      })).min(1),
      subtotal: z.string(),
      deliveryFee: z.string().default("0"),
      totalAmount: z.string(),
      platformCommissionPct: z.number().optional(),
      notes: z.string().optional(),
      riderName: z.string().optional(),
      riderPhone: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const expectedSecret = process.env.DELIVERY_WEBHOOK_SECRET || "hibi-delivery-secret-change-me";
      if (input.secret !== expectedSecret)
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid webhook secret" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Find the branch by branchCode
      const [branchRow] = await db.select().from(branches)
        .where(eq(branches.branchCode, input.branchCode)).limit(1);
      if (!branchRow) throw new TRPCError({ code: "NOT_FOUND", message: `Branch ${input.branchCode} not found` });

      // Deduplicate by externalOrderId — return existing if already received
      const [dup] = await db.select().from(posOrders)
        .where(and(
          eq(posOrders.externalOrderId, input.externalOrderId),
          eq(posOrders.deliveryPlatform, input.platform),
        )).limit(1);
      if (dup) return { success: true, orderId: dup.id, duplicate: true };

      // Compute commission + payout
      const commissionPct = input.platformCommissionPct ?? DEFAULT_COMMISSION[input.platform] ?? 0;
      const total = Number(input.totalAmount);
      const platformCut = total * (commissionPct / 100);
      const platformPayout = total - platformCut;

      const orderNumber = generateOrderNumber();

      const [orderRes] = await db.insert(posOrders).values({
        orderNumber,
        branchId: branchRow.id,
        orderType: "delivery",
        deliveryPlatform: input.platform,
        externalOrderId: input.externalOrderId,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        deliveryAddress: input.deliveryAddress,
        deliveryFee: input.deliveryFee,
        platformCommissionPct: String(commissionPct),
        platformPayout: String(platformPayout.toFixed(2)),
        riderName: input.riderName,
        riderPhone: input.riderPhone,
        subtotal: input.subtotal,
        totalAmount: input.totalAmount,
        notes: input.notes,
        status: "pending",
      } as any);
      const orderId = (orderRes as any).insertId as number;

      // Resolve menu items by SKU or id, fall back to name-only line
      for (const it of input.items) {
        let menuItemId = it.menuItemId;
        if (!menuItemId && it.sku) {
          const [mi] = await db.select().from(posMenuItems).where(eq(posMenuItems.sku, it.sku)).limit(1);
          if (mi) menuItemId = mi.id;
        }
        await db.insert(posOrderItems).values({
          orderId,
          menuItemId: menuItemId ?? undefined,
          menuItemName: it.name,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          totalPrice: String(Number(it.unitPrice) * it.quantity),
          notes: it.notes,
        } as any);
      }

      return { success: true, orderId, duplicate: false, orderNumber };
    }),

  // Staff-facing: list active delivery orders by branch
  listDeliveryOrders: staffProcedure
    .input(z.object({
      branchId: z.number().int().optional(),
      platform: PlatformEnum.optional(),
      status: z.string().optional(),
      limit: z.number().int().default(50),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const branchId = input.branchId ?? ctx.staff.currentBranchId;
      if (!branchId) return [];
      let rows = await db.select().from(posOrders)
        .where(and(
          eq(posOrders.branchId, branchId),
          eq(posOrders.orderType, "delivery"),
        ))
        .orderBy(desc(posOrders.createdAt))
        .limit(input.limit);
      if (input.platform) rows = rows.filter((r) => r.deliveryPlatform === input.platform);
      if (input.status) rows = rows.filter((r) => r.status === input.status);
      return rows;
    }),

  // Manual create — for testing / when platform doesn't have webhook integration yet
  createManual: staffAdminProcedure
    .input(z.object({
      branchId: z.number().int(),
      platform: PlatformEnum,
      externalOrderId: z.string().optional(),
      customerName: z.string().optional(),
      deliveryAddress: z.string().optional(),
      items: z.array(z.object({
        menuItemId: z.number().int(),
        quantity: z.number().int().min(1),
        unitPrice: z.string(),
        notes: z.string().optional(),
      })).min(1),
      deliveryFee: z.string().default("0"),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Compute totals
      const subtotal = input.items.reduce((s, it) => s + Number(it.unitPrice) * it.quantity, 0);
      const total = subtotal + Number(input.deliveryFee);
      const commissionPct = DEFAULT_COMMISSION[input.platform] ?? 0;
      const platformPayout = total * (1 - commissionPct / 100);

      const orderNumber = generateOrderNumber();
      const externalId = input.externalOrderId || `MANUAL-${Date.now()}`;

      const [orderRes] = await db.insert(posOrders).values({
        orderNumber,
        branchId: input.branchId,
        staffId: ctx.staff.staffId,
        orderType: "delivery",
        deliveryPlatform: input.platform,
        externalOrderId: externalId,
        customerName: input.customerName,
        deliveryAddress: input.deliveryAddress,
        deliveryFee: input.deliveryFee,
        platformCommissionPct: String(commissionPct),
        platformPayout: String(platformPayout.toFixed(2)),
        subtotal: String(subtotal),
        totalAmount: String(total),
        notes: input.notes,
        status: "pending",
      } as any);
      const orderId = (orderRes as any).insertId as number;

      for (const it of input.items) {
        const [mi] = await db.select().from(posMenuItems).where(eq(posMenuItems.id, it.menuItemId)).limit(1);
        await db.insert(posOrderItems).values({
          orderId,
          menuItemId: it.menuItemId,
          menuItemName: mi?.name ?? "Unknown",
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          totalPrice: String(Number(it.unitPrice) * it.quantity),
          notes: it.notes,
        } as any);
      }

      await logAudit({
        staff: ctx.staff, action: "create_delivery_order",
        entity: "pos_orders", entityId: orderId,
        afterData: { platform: input.platform, externalId } as any,
      });
      return { success: true, orderId, orderNumber };
    }),

  // Summary per platform — for accounting reconciliation
  platformSummary: staffAdminProcedure
    .input(z.object({
      branchId: z.number().int().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const branchId = input.branchId ?? ctx.staff.currentBranchId;
      let rows = await db.select().from(posOrders)
        .where(and(
          branchId ? eq(posOrders.branchId, branchId) : undefined as any,
          eq(posOrders.orderType, "delivery"),
        ));
      if (input.dateFrom) rows = rows.filter((r) => r.createdAt && r.createdAt >= new Date(input.dateFrom!));
      if (input.dateTo) rows = rows.filter((r) => r.createdAt && r.createdAt <= new Date(input.dateTo!));

      // Group by platform
      const byPlatform: Record<string, { orders: number; gross: number; commission: number; payout: number }> = {};
      for (const r of rows) {
        const p = r.deliveryPlatform || "other";
        if (!byPlatform[p]) byPlatform[p] = { orders: 0, gross: 0, commission: 0, payout: 0 };
        byPlatform[p].orders += 1;
        const total = Number(r.totalAmount ?? 0);
        const payout = Number(r.platformPayout ?? 0);
        byPlatform[p].gross += total;
        byPlatform[p].payout += payout;
        byPlatform[p].commission += total - payout;
      }
      return Object.entries(byPlatform).map(([platform, s]) => ({ platform, ...s }));
    }),
});
