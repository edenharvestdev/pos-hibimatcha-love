import { TRPCError } from "@trpc/server";
import { eq, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import {
  posPurchaseOrders,
  posPurchaseOrderItems,
  posInventoryItems,
} from "../../drizzle/schema";
import { logAudit, generatePoNumber } from "../lib/audit";
import { router, staffProcedure, staffAdminProcedure, superAdminProcedure } from "../_core/trpc";

const POItemInput = z.object({
  inventoryItemId: z.number().int(),
  quantityOrdered: z.string(),
  unitOfMeasure: z.string().optional(),
  unitCost: z.string().optional(),
  notes: z.string().optional(),
});

export const purchaseOrdersRouter = router({
  list: staffAdminProcedure
    .input(z.object({
      status: z.string().optional(),
      supplierId: z.number().int().optional(),
      branchId: z.number().int().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      let rows = await db.select().from(posPurchaseOrders).orderBy(desc(posPurchaseOrders.createdAt));
      if (input?.status) rows = rows.filter((po) => po.status === input.status);
      if (input?.supplierId) rows = rows.filter((po) => po.supplierId === input.supplierId);
      if (input?.branchId) rows = rows.filter((po) => po.branchId === input.branchId);
      return rows;
    }),

  getById: staffProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [po] = await db.select().from(posPurchaseOrders)
        .where(eq(posPurchaseOrders.id, input.id)).limit(1);
      if (!po) throw new TRPCError({ code: "NOT_FOUND" });

      const items = await db.select({
        id: posPurchaseOrderItems.id,
        purchaseOrderId: posPurchaseOrderItems.purchaseOrderId,
        inventoryItemId: posPurchaseOrderItems.inventoryItemId,
        quantityOrdered: posPurchaseOrderItems.quantityOrdered,
        quantityReceived: posPurchaseOrderItems.quantityReceived,
        unitOfMeasure: posPurchaseOrderItems.unitOfMeasure,
        unitCost: posPurchaseOrderItems.unitCost,
        totalCost: posPurchaseOrderItems.totalCost,
        notes: posPurchaseOrderItems.notes,
        itemName: posInventoryItems.name,
        itemSku: posInventoryItems.sku,
      }).from(posPurchaseOrderItems)
        .leftJoin(posInventoryItems, eq(posPurchaseOrderItems.inventoryItemId, posInventoryItems.id))
        .where(eq(posPurchaseOrderItems.purchaseOrderId, input.id));

      return { ...po, items };
    }),

  create: staffAdminProcedure
    .input(z.object({
      supplierId: z.number().int().optional(),
      branchId: z.number().int(),
      orderDate: z.string().optional(),
      requiredDate: z.string().optional(),
      expectedDeliveryDate: z.string().optional(),
      priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
      paymentTerms: z.string().optional(),
      shippingMethod: z.string().optional(),
      notesToSupplier: z.string().optional(),
      internalNotes: z.string().optional(),
      items: z.array(POItemInput).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { items, ...poData } = input;
      let subtotal = 0;
      const resolvedItems = items.map((item) => {
        const totalCost = Number(item.unitCost ?? 0) * Number(item.quantityOrdered);
        subtotal += totalCost;
        return { ...item, totalCost: String(totalCost) };
      });

      const taxAmount = subtotal * 0.07;
      const totalAmount = subtotal + taxAmount;

      const [result] = await db.insert(posPurchaseOrders).values({
        ...poData,
        poNumber: generatePoNumber(),
        status: "draft",
        subtotal: String(subtotal),
        taxAmount: String(taxAmount),
        totalAmount: String(totalAmount),
        createdByStaffId: ctx.staff.staffId,
        orderDate: poData.orderDate as any,
        requiredDate: poData.requiredDate as any,
        expectedDeliveryDate: poData.expectedDeliveryDate as any,
      });
      const id = (result as any).insertId as number;

      for (const item of resolvedItems) {
        await db.insert(posPurchaseOrderItems).values({ ...item, purchaseOrderId: id });
      }

      const [created] = await db.select().from(posPurchaseOrders).where(eq(posPurchaseOrders.id, id)).limit(1);
      await logAudit({ staff: ctx.staff, action: "create", entity: "pos_purchase_orders", entityId: id });
      return created;
    }),

  update: staffAdminProcedure
    .input(z.object({ id: z.number().int() }).passthrough())
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(posPurchaseOrders).set(data as any).where(eq(posPurchaseOrders.id, id));
      const [updated] = await db.select().from(posPurchaseOrders).where(eq(posPurchaseOrders.id, id)).limit(1);
      return updated;
    }),

  submitForApproval: staffAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(posPurchaseOrders).set({ status: "pending_approval" })
        .where(eq(posPurchaseOrders.id, input.id));
      const [updated] = await db.select().from(posPurchaseOrders).where(eq(posPurchaseOrders.id, input.id)).limit(1);
      await logAudit({ staff: ctx.staff, action: "submit_approval", entity: "pos_purchase_orders", entityId: input.id });
      return updated;
    }),

  approve: staffAdminProcedure
    .input(z.object({ id: z.number().int(), notes: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(posPurchaseOrders).set({
        status: "approved",
        approvedByStaffId: ctx.staff.staffId,
        approvedAt: new Date(),
        internalNotes: input.notes,
      }).where(eq(posPurchaseOrders.id, input.id));
      const [updated] = await db.select().from(posPurchaseOrders).where(eq(posPurchaseOrders.id, input.id)).limit(1);
      await logAudit({ staff: ctx.staff, action: "approve", entity: "pos_purchase_orders", entityId: input.id });
      return updated;
    }),

  reject: staffAdminProcedure
    .input(z.object({ id: z.number().int(), reason: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(posPurchaseOrders).set({ status: "cancelled", internalNotes: input.reason })
        .where(eq(posPurchaseOrders.id, input.id));
      const [updated] = await db.select().from(posPurchaseOrders).where(eq(posPurchaseOrders.id, input.id)).limit(1);
      await logAudit({ staff: ctx.staff, action: "reject", entity: "pos_purchase_orders", entityId: input.id });
      return updated;
    }),

  markSent: staffAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(posPurchaseOrders).set({ status: "sent" }).where(eq(posPurchaseOrders.id, input.id));
      const [updated] = await db.select().from(posPurchaseOrders).where(eq(posPurchaseOrders.id, input.id)).limit(1);
      return updated;
    }),

  receiveItems: staffAdminProcedure
    .input(z.object({
      poId: z.number().int(),
      items: z.array(z.object({ itemId: z.number().int(), quantityReceived: z.number() })),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [po] = await db.select().from(posPurchaseOrders)
        .where(eq(posPurchaseOrders.id, input.poId)).limit(1);
      if (!po) throw new TRPCError({ code: "NOT_FOUND" });

      for (const item of input.items) {
        await db.update(posPurchaseOrderItems)
          .set({ quantityReceived: sql`${posPurchaseOrderItems.quantityReceived} + ${item.quantityReceived}` })
          .where(eq(posPurchaseOrderItems.id, item.itemId));
      }

      await db.update(posPurchaseOrders).set({ status: "partial" }).where(eq(posPurchaseOrders.id, input.poId));
      const [updated] = await db.select().from(posPurchaseOrders).where(eq(posPurchaseOrders.id, input.poId)).limit(1);
      await logAudit({ staff: ctx.staff, action: "receive", entity: "pos_purchase_orders", entityId: input.poId });
      return updated;
    }),

  close: staffAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(posPurchaseOrders).set({ status: "closed" }).where(eq(posPurchaseOrders.id, input.id));
      const [updated] = await db.select().from(posPurchaseOrders).where(eq(posPurchaseOrders.id, input.id)).limit(1);
      return updated;
    }),

  cancel: staffAdminProcedure
    .input(z.object({ id: z.number().int(), reason: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(posPurchaseOrders)
        .set({ status: "cancelled", internalNotes: input.reason })
        .where(eq(posPurchaseOrders.id, input.id));
      const [updated] = await db.select().from(posPurchaseOrders).where(eq(posPurchaseOrders.id, input.id)).limit(1);
      return updated;
    }),

  delete: staffAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Delete items first, then the PO
      await db.delete(posPurchaseOrderItems).where(eq(posPurchaseOrderItems.purchaseOrderId, input.id));
      await db.delete(posPurchaseOrders).where(eq(posPurchaseOrders.id, input.id));
      await logAudit({ staff: ctx.staff, action: "delete", entity: "pos_purchase_orders", entityId: input.id });
      return { success: true };
    }),
});
