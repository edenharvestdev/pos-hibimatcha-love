// ============================================
// Customer Orders Router — E-catalog Pre-orders
// ============================================
import { TRPCError } from "@trpc/server";
import { eq, and, desc, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import {
  customerOrders, customerOrderItems,
  posMenuItems, posCategories, posOptionGroups, posOptions,
  posBranchMenuItems, branches, memberPoints,
} from "../../drizzle/schema";
import { router, publicProcedure, staffProcedure } from "../_core/trpc";
import { verifyMemberToken } from "./members";

// Order number generator for customer orders
function generateCustomerOrderNumber(): string {
  const now = new Date();
  const prefix = "CO";
  const date = now.toISOString().slice(2, 10).replace(/-/g, "");
  const rand = Math.floor(Math.random() * 9999).toString().padStart(4, "0");
  return `${prefix}${date}${rand}`;
}

export const customerOrdersRouter = router({
  // ── Public: Get branches with E-catalog enabled ───────────────────────────
  listBranches: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select({
      id: branches.id,
      name: branches.name,
      branchCode: branches.branchCode,
      address: branches.address,
      province: branches.province,
      phone: branches.phone,
      latitude: branches.latitude,
      longitude: branches.longitude,
      logoUrl: branches.logoUrl,
      loyaltyEnabled: branches.loyaltyEnabled,
      loyaltyPointsPerBaht: branches.loyaltyPointsPerBaht,
    }).from(branches).where(eq(branches.status, "active"));
    return rows;
  }),

  // ── Public: Get menu for a branch ────────────────────────────────────────
  getBranchMenu: publicProcedure
    .input(z.object({
      branchId: z.number().int(),
      categoryId: z.number().int().optional(),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { categories: [], items: [] };

      // Get categories
      const categories = await db.select().from(posCategories)
        .where(eq(posCategories.isActive, true));

      // Get items available at this branch
      const branchItems = await db.select({
        itemId: posBranchMenuItems.menuItemId,
        isAvailable: posBranchMenuItems.isAvailable,
      }).from(posBranchMenuItems)
        .where(and(
          eq(posBranchMenuItems.branchId, input.branchId),
          eq(posBranchMenuItems.isAvailable, true),
        ));

      const availableIds = branchItems.map((b) => b.itemId);
      if (availableIds.length === 0) return { categories, items: [] };

      let items = await db.select().from(posMenuItems)
        .where(and(
          eq(posMenuItems.isActive, true),
          eq(posMenuItems.isArchived, false),
        ));

      items = items.filter((i) => availableIds.includes(i.id));
      if (input.categoryId) items = items.filter((i) => i.categoryId === input.categoryId);
      if (input.search) {
        const q = input.search.toLowerCase();
        items = items.filter((i) =>
          i.name.toLowerCase().includes(q) ||
          (i.nameThai ?? "").toLowerCase().includes(q)
        );
      }

      return { categories, items };
    }),

  // ── Public: Get option groups for a menu item ─────────────────────────────
  getMenuItemOptions: publicProcedure
    .input(z.object({ menuItemId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      // Get linked option groups
      const groups = await db.select({
        id: posOptionGroups.id,
        name: posOptionGroups.name,
        nameThai: posOptionGroups.nameThai,
        isRequired: posOptionGroups.isRequired,
        maxSelections: posOptionGroups.maxSelections,
        minSelections: posOptionGroups.minSelections,
      }).from(posOptionGroups)
        .where(eq(posOptionGroups.isActive, true));

      // For each group, get options
      const result = await Promise.all(groups.map(async (g) => {
        const opts = await db.select().from(posOptions)
          .where(and(eq(posOptions.groupId, g.id), eq(posOptions.isActive, true)));
        return { ...g, options: opts };
      }));

      return result.filter((g) => g.options.length > 0);
    }),

  // ── Create customer order (Pre-order) ────────────────────────────────────
  create: publicProcedure
    .input(z.object({
      memberToken: z.string().optional(),
      branchId: z.number().int(),
      orderType: z.enum(["pickup", "delivery"]).default("pickup"),
      pickupTime: z.string().optional(),
      deliveryAddress: z.string().optional(),
      customerName: z.string().min(1),
      customerPhone: z.string().min(9),
      notes: z.string().optional(),
      items: z.array(z.object({
        menuItemId: z.number().int(),
        quantity: z.number().int().min(1),
        notes: z.string().optional(),
        options: z.array(z.object({
          optionId: z.number().int(),
          optionName: z.string(),
          priceAdjustment: z.number().default(0),
        })).optional(),
      })).min(1),
      pointsToRedeem: z.number().min(0).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verify member token if provided
      let memberId: number | undefined;
      if (input.memberToken) {
        const payload = await verifyMemberToken(input.memberToken);
        if (payload) memberId = payload.memberId;
      }

      // Calculate totals
      let subtotal = 0;
      const resolvedItems = [];

      for (const item of input.items) {
        const [menuItem] = await db.select().from(posMenuItems)
          .where(eq(posMenuItems.id, item.menuItemId)).limit(1);
        if (!menuItem) throw new TRPCError({ code: "BAD_REQUEST", message: `Menu item ${item.menuItemId} not found` });

        let unitPrice = Number(menuItem.basePrice);
        for (const opt of item.options ?? []) {
          unitPrice += opt.priceAdjustment;
        }
        const totalPrice = unitPrice * item.quantity;
        subtotal += totalPrice;

        resolvedItems.push({
          menuItemId: menuItem.id,
          menuItemName: menuItem.nameThai || menuItem.name,
          unitPrice: String(unitPrice),
          quantity: item.quantity,
          totalPrice: String(totalPrice),
          options: item.options ?? [],
          notes: item.notes,
        });
      }

      // Points redemption
      let pointsRedeemed = 0;
      let discountFromPoints = 0;
      if (input.pointsToRedeem && memberId) {
        const [branch] = await db.select().from(branches).where(eq(branches.id, input.branchId)).limit(1);
        if (branch?.loyaltyEnabled) {
          const redeemRate = Number(branch.loyaltyRedeemRate ?? 1);
          pointsRedeemed = input.pointsToRedeem;
          discountFromPoints = pointsRedeemed * redeemRate;
        }
      }

      const taxAmount = Math.round((subtotal - discountFromPoints) * 0.07 * 100) / 100;
      const totalAmount = subtotal - discountFromPoints + taxAmount;
      const orderNumber = generateCustomerOrderNumber();

      const [result] = await db.insert(customerOrders).values({
        orderNumber,
        memberId,
        branchId: input.branchId,
        orderType: input.orderType,
        pickupTime: input.pickupTime ? new Date(input.pickupTime) : undefined,
        deliveryAddress: input.deliveryAddress,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        notes: input.notes,
        status: "pending",
        subtotal: String(subtotal),
        discountAmount: String(discountFromPoints),
        pointsRedeemed: String(pointsRedeemed),
        taxAmount: String(taxAmount),
        totalAmount: String(totalAmount),
        paymentStatus: "pending",
      });

      const orderId = (result as any).insertId as number;

      for (const item of resolvedItems) {
        await db.insert(customerOrderItems).values({
          customerOrderId: orderId,
          menuItemId: item.menuItemId,
          menuItemName: item.menuItemName,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          totalPrice: item.totalPrice,
          options: item.options,
          notes: item.notes,
        });
      }

      const [order] = await db.select().from(customerOrders)
        .where(eq(customerOrders.id, orderId)).limit(1);
      const items = await db.select().from(customerOrderItems)
        .where(eq(customerOrderItems.customerOrderId, orderId));

      return { order, items };
    }),

  // ── Track order status ────────────────────────────────────────────────────
  trackOrder: publicProcedure
    .input(z.object({ orderNumber: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [order] = await db.select().from(customerOrders)
        .where(eq(customerOrders.orderNumber, input.orderNumber)).limit(1);
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });
      const items = await db.select().from(customerOrderItems)
        .where(eq(customerOrderItems.customerOrderId, order.id));
      return { order, items };
    }),

  // ── My orders (member) ────────────────────────────────────────────────────
  myOrders: publicProcedure
    .input(z.object({ token: z.string(), limit: z.number().int().optional() }))
    .query(async ({ input }) => {
      const payload = await verifyMemberToken(input.token);
      if (!payload) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) return [];
      return db.select().from(customerOrders)
        .where(eq(customerOrders.memberId, payload.memberId))
        .orderBy(desc(customerOrders.createdAt))
        .limit(input.limit ?? 20);
    }),

  // ── Staff: list all customer orders ─────────────────────────────────────
  list: staffProcedure
    .input(z.object({
      branchId: z.number().int().optional(),
      status: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      let rows = await db.select().from(customerOrders).orderBy(desc(customerOrders.createdAt));
      const branchId = input?.branchId ?? ctx.staff.currentBranchId;
      if (branchId && ctx.staff.role !== "super_admin") rows = rows.filter((o) => o.branchId === branchId);
      if (input?.status) rows = rows.filter((o) => o.status === input.status);
      if (input?.dateFrom) rows = rows.filter((o) => o.createdAt && o.createdAt >= new Date(input.dateFrom!));
      if (input?.dateTo) rows = rows.filter((o) => o.createdAt && o.createdAt <= new Date(input.dateTo!));
      return rows;
    }),

  // ── Staff: update order status ───────────────────────────────────────────
  updateStatus: staffProcedure
    .input(z.object({
      id: z.number().int(),
      status: z.enum(["pending", "confirmed", "preparing", "ready", "completed", "cancelled"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(customerOrders).set({ status: input.status }).where(eq(customerOrders.id, input.id));
      const [updated] = await db.select().from(customerOrders).where(eq(customerOrders.id, input.id)).limit(1);
      return updated;
    }),
});
