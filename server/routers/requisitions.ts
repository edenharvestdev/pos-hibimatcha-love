import { TRPCError } from "@trpc/server";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import {
  posRequisitions, posRequisitionItems,
  branches, posBranchInventoryStock, posInventoryMovements,
  posBranchMenuItems,
} from "../../drizzle/schema";
import { logAudit } from "../lib/audit";
import { router, staffProcedure, staffAdminProcedure, superAdminProcedure } from "../_core/trpc";
import { notifyOwner } from "../_core/notification";

function generateRequestNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `REQ-${y}${m}${d}-${rand}`;
}

export const requisitionsRouter = router({
  // List requisitions (filtered by branch for non-super, all for super)
  list: staffProcedure
    .input(z.object({
      branchId: z.number().int().optional(),
      status: z.enum(["pending", "approved", "partially_approved", "rejected", "cancelled", "fulfilled"]).optional(),
      type: z.enum(["stock", "menu", "supplies"]).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      let conditions: any[] = [];
      if (input?.branchId) conditions.push(eq(posRequisitions.requestingBranchId, input.branchId));
      if (input?.status) conditions.push(eq(posRequisitions.status, input.status));
      if (input?.type) conditions.push(eq(posRequisitions.type, input.type));

      const rows = conditions.length > 0
        ? await db.select().from(posRequisitions).where(and(...conditions)).orderBy(desc(posRequisitions.createdAt))
        : await db.select().from(posRequisitions).orderBy(desc(posRequisitions.createdAt));

      // Attach branch names
      const branchIds = [...new Set(rows.map(r => r.requestingBranchId))];
      const branchList = branchIds.length > 0
        ? await db.select().from(branches).where(inArray(branches.id, branchIds))
        : [];
      const branchMap = new Map(branchList.map(b => [b.id, b.name]));

      return rows.map(r => ({
        ...r,
        requestingBranchName: branchMap.get(r.requestingBranchId) ?? "Unknown",
      }));
    }),

  // Get single requisition with items
  getById: staffProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [req] = await db.select().from(posRequisitions).where(eq(posRequisitions.id, input.id)).limit(1);
      if (!req) throw new TRPCError({ code: "NOT_FOUND" });
      const items = await db.select().from(posRequisitionItems).where(eq(posRequisitionItems.requisitionId, input.id));
      const [reqBranch] = await db.select().from(branches).where(eq(branches.id, req.requestingBranchId)).limit(1);
      const [srcBranch] = await db.select().from(branches).where(eq(branches.id, req.sourceBranchId)).limit(1);
      return {
        ...req,
        items,
        requestingBranchName: reqBranch?.name ?? "Unknown",
        sourceBranchName: srcBranch?.name ?? "Unknown",
      };
    }),

  // Create a new requisition (branch staff creates)
  create: staffProcedure
    .input(z.object({
      requestingBranchId: z.number().int(),
      type: z.enum(["stock", "menu", "supplies"]),
      priority: z.enum(["low", "normal", "urgent"]).default("normal"),
      notes: z.string().optional(),
      items: z.array(z.object({
        itemType: z.enum(["inventory", "menu"]),
        itemId: z.number().int(),
        itemName: z.string(),
        requestedQty: z.string(), // decimal as string
        unit: z.string().optional(),
        notes: z.string().optional(),
      })).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Find HQ as source
      const [hq] = await db.select().from(branches).where(eq(branches.branchType, "hq")).limit(1);
      if (!hq) throw new TRPCError({ code: "BAD_REQUEST", message: "No HQ branch defined" });

      const requestNumber = generateRequestNumber();
      const [result] = await db.insert(posRequisitions).values({
        requestNumber,
        requestingBranchId: input.requestingBranchId,
        sourceBranchId: hq.id,
        requestedByStaffId: ctx.staff.staffId,
        type: input.type,
        priority: input.priority,
        notes: input.notes ?? null,
      });
      const reqId = (result as any).insertId as number;

      // Insert items
      for (const item of input.items) {
        await db.insert(posRequisitionItems).values({
          requisitionId: reqId,
          itemType: item.itemType,
          itemId: item.itemId,
          itemName: item.itemName,
          requestedQty: item.requestedQty,
          unit: item.unit ?? null,
          notes: item.notes ?? null,
        });
      }

      await logAudit({
        staff: ctx.staff, action: "create", entity: "pos_requisitions", entityId: reqId,
        afterData: { requestNumber, type: input.type, itemCount: input.items.length } as any,
      });

      // Notify HQ about new requisition
      notifyOwner({ title: `ใบขอใหม่: ${requestNumber}`, content: `สาขา #${input.requestingBranchId} ขอ ${input.type} ${input.items.length} รายการ (${input.priority})` }).catch(() => {});

      return { success: true, requestNumber };
    }),

  // Approve requisition (super admin / HQ)
  approve: superAdminProcedure
    .input(z.object({
      id: z.number().int(),
      items: z.array(z.object({
        itemId: z.number().int(),
        approvedQty: z.string(),
        status: z.enum(["approved", "rejected"]),
      })).optional(), // if not provided, approve all as-is
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [req] = await db.select().from(posRequisitions).where(eq(posRequisitions.id, input.id)).limit(1);
      if (!req) throw new TRPCError({ code: "NOT_FOUND" });
      if (req.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Can only approve pending requisitions" });

      const items = await db.select().from(posRequisitionItems).where(eq(posRequisitionItems.requisitionId, input.id));

      // Update individual items
      if (input.items && input.items.length > 0) {
        for (const update of input.items) {
          const item = items.find(i => i.itemId === update.itemId);
          if (item) {
            await db.update(posRequisitionItems)
              .set({ approvedQty: update.approvedQty, status: update.status })
              .where(eq(posRequisitionItems.id, item.id));
          }
        }
      } else {
        // Approve all items as-is
        for (const item of items) {
          await db.update(posRequisitionItems)
            .set({ approvedQty: item.requestedQty, status: "approved" })
            .where(eq(posRequisitionItems.id, item.id));
        }
      }

      // Determine overall status
      const updatedItems = await db.select().from(posRequisitionItems).where(eq(posRequisitionItems.requisitionId, input.id));
      const allApproved = updatedItems.every(i => i.status === "approved");
      const allRejected = updatedItems.every(i => i.status === "rejected");
      const overallStatus = allRejected ? "rejected" : allApproved ? "approved" : "partially_approved";

      await db.update(posRequisitions).set({
        status: overallStatus,
        approvedByStaffId: ctx.staff.staffId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(posRequisitions.id, input.id));

      // Auto-transfer stock for approved items
      if (overallStatus === "approved" || overallStatus === "partially_approved") {
        const approvedStockItems = updatedItems.filter(i => i.status === "approved" && i.itemType === "inventory");
        const [hq] = await db.select().from(branches).where(eq(branches.branchType, "hq")).limit(1);

        for (const item of approvedStockItems) {
          const qty = Number(item.approvedQty || item.requestedQty);
          if (qty <= 0) continue;

          // Deduct from HQ
          await db.update(posBranchInventoryStock)
            .set({ currentStock: sql`currentStock - ${qty}` })
            .where(and(
              eq(posBranchInventoryStock.branchId, hq.id),
              eq(posBranchInventoryStock.inventoryItemId, item.itemId),
            ));

          // Add to requesting branch (upsert)
          const [existing] = await db.select().from(posBranchInventoryStock)
            .where(and(
              eq(posBranchInventoryStock.branchId, req.requestingBranchId),
              eq(posBranchInventoryStock.inventoryItemId, item.itemId),
            )).limit(1);

          if (existing) {
            await db.update(posBranchInventoryStock)
              .set({ currentStock: sql`currentStock + ${qty}` })
              .where(eq(posBranchInventoryStock.id, existing.id));
          } else {
            await db.insert(posBranchInventoryStock).values({
              branchId: req.requestingBranchId,
              inventoryItemId: item.itemId,
              currentStock: String(qty),
              unit: item.unit ?? "piece",
            } as any);
          }

          // Record movements
          await db.insert(posInventoryMovements).values({
            branchId: hq.id,
            inventoryItemId: item.itemId,
            movementType: "transfer_out",
            quantity: String(-qty),
            unit: item.unit ?? "piece",
            notes: `Requisition ${req.requestNumber} → branch ${req.requestingBranchId}`,
            performedByStaffId: ctx.staff.staffId,
          } as any);
          await db.insert(posInventoryMovements).values({
            branchId: req.requestingBranchId,
            inventoryItemId: item.itemId,
            movementType: "transfer_in",
            quantity: String(qty),
            unit: item.unit ?? "piece",
            notes: `Requisition ${req.requestNumber} from HQ`,
            performedByStaffId: ctx.staff.staffId,
          } as any);
        }

        // Auto-assign menu items for approved menu requests
        const approvedMenuItems = updatedItems.filter(i => i.status === "approved" && i.itemType === "menu");
        for (const item of approvedMenuItems) {
          await db.insert(posBranchMenuItems).values({
            branchId: req.requestingBranchId,
            menuItemId: item.itemId,
            isAvailable: true,
          }).onDuplicateKeyUpdate({ set: { isAvailable: true } });
        }

        // Mark as fulfilled
        await db.update(posRequisitions).set({
          status: "fulfilled",
          fulfilledAt: new Date(),
          updatedAt: new Date(),
        }).where(eq(posRequisitions.id, input.id));
      }

      await logAudit({
        staff: ctx.staff, action: "approve_requisition", entity: "pos_requisitions", entityId: input.id,
        afterData: { status: overallStatus } as any,
      });

      // Notify requesting branch
      notifyOwner({ title: `ใบขอ ${req.requestNumber} อนุมัติแล้ว`, content: `สถานะ: ${overallStatus} — stock/menu ถูกโอนให้สาขาแล้ว` }).catch(() => {});

      return { success: true, status: overallStatus };
    }),

  // Reject requisition
  reject: superAdminProcedure
    .input(z.object({
      id: z.number().int(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [req] = await db.select().from(posRequisitions).where(eq(posRequisitions.id, input.id)).limit(1);
      if (!req) throw new TRPCError({ code: "NOT_FOUND" });
      if (req.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Can only reject pending requisitions" });

      await db.update(posRequisitions).set({
        status: "rejected",
        rejectionReason: input.reason ?? null,
        approvedByStaffId: ctx.staff.staffId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(posRequisitions.id, input.id));

      // Mark all items as rejected
      await db.update(posRequisitionItems)
        .set({ status: "rejected" })
        .where(eq(posRequisitionItems.requisitionId, input.id));

      await logAudit({
        staff: ctx.staff, action: "reject_requisition", entity: "pos_requisitions", entityId: input.id,
        afterData: { reason: input.reason } as any,
      });

      // Notify requesting branch
      notifyOwner({ title: `ใบขอ ${req.requestNumber} ถูกปฏิเสธ`, content: `เหตุผล: ${input.reason || 'ไม่ระบุ'}` }).catch(() => {});

      return { success: true };
    }),

  // Cancel requisition (by the requesting branch)
  cancel: staffProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [req] = await db.select().from(posRequisitions).where(eq(posRequisitions.id, input.id)).limit(1);
      if (!req) throw new TRPCError({ code: "NOT_FOUND" });
      if (req.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "Can only cancel pending requisitions" });

      await db.update(posRequisitions).set({
        status: "cancelled",
        updatedAt: new Date(),
      }).where(eq(posRequisitions.id, input.id));

      await logAudit({
        staff: ctx.staff, action: "cancel_requisition", entity: "pos_requisitions", entityId: input.id,
        afterData: {} as any,
      });

      return { success: true };
    }),

  // Count pending (for badge in sidebar)
  countPending: staffProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return 0;
      const [row] = await db.select({ count: sql<number>`COUNT(*)` }).from(posRequisitions)
        .where(eq(posRequisitions.status, "pending"));
      return Number(row?.count ?? 0);
    }),
});
