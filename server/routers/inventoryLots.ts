// ============================================
// Router: inventoryLots
// Tracks ingredient batches with manufacture & expiry dates.
// Alerts POS when lots are expiring_soon or expired.
// ============================================

import { z } from "zod";
import { and, asc, desc, eq, gte, isNotNull, lte, or, sql } from "drizzle-orm";
import { t, protectedProcedure } from "./_base";
import { getDb } from "../db";
import { posInventoryLots, posInventoryItems } from "../../drizzle/schema";

// ─── helpers ─────────────────────────────────────────────────────────────────

function daysDiff(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(dateStr);
  exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function computeStatus(expiryDate: string | null | undefined, warnDays = 7): "active" | "expiring_soon" | "expired" {
  const days = daysDiff(expiryDate);
  if (days === null) return "active";
  if (days <= 0) return "expired";
  if (days <= warnDays) return "expiring_soon";
  return "active";
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const inventoryLotsRouter = t.router({

  // List lots for a branch (with optional filters)
  list: protectedProcedure
    .input(z.object({
      branchId: z.number(),
      inventoryItemId: z.number().optional(),
      status: z.enum(["active", "expiring_soon", "expired", "depleted", "all"]).optional().default("all"),
      warnDays: z.number().optional().default(7),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { lots: [], total: 0 };

      const conditions = [eq(posInventoryLots.branchId, input.branchId)];
      if (input.inventoryItemId) conditions.push(eq(posInventoryLots.inventoryItemId, input.inventoryItemId));
      if (input.status !== "all") conditions.push(eq(posInventoryLots.status, input.status));

      const rows = await db
        .select({
          lot: posInventoryLots,
          itemName: posInventoryItems.name,
          itemNameThai: posInventoryItems.nameThai,
          unitOfMeasure: posInventoryItems.unitOfMeasure,
        })
        .from(posInventoryLots)
        .leftJoin(posInventoryItems, eq(posInventoryLots.inventoryItemId, posInventoryItems.id))
        .where(and(...conditions))
        .orderBy(asc(posInventoryLots.expiryDate));

      // Recompute status live based on current date
      const lots = rows.map((r) => {
        const status = r.lot.expiryDate
          ? computeStatus(String(r.lot.expiryDate), input.warnDays)
          : r.lot.status;
        const daysLeft = daysDiff(r.lot.expiryDate ? String(r.lot.expiryDate) : null);
        return {
          ...r.lot,
          status,
          daysLeft,
          itemName: r.itemName,
          itemNameThai: r.itemNameThai,
          unit: r.unitOfMeasure,
        };
      });

      return { lots, total: lots.length };
    }),

  // Get expiry alerts for POS banner — returns items expiring within warnDays
  getExpiryAlerts: protectedProcedure
    .input(z.object({
      branchId: z.number(),
      warnDays: z.number().optional().default(7),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { expired: [], expiringSoon: [] };

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const warnDate = new Date(today);
      warnDate.setDate(warnDate.getDate() + input.warnDays);

      const rows = await db
        .select({
          lot: posInventoryLots,
          itemName: posInventoryItems.name,
          itemNameThai: posInventoryItems.nameThai,
        })
        .from(posInventoryLots)
        .leftJoin(posInventoryItems, eq(posInventoryLots.inventoryItemId, posInventoryItems.id))
        .where(
          and(
            eq(posInventoryLots.branchId, input.branchId),
            isNotNull(posInventoryLots.expiryDate),
            // remainingQty > 0 (not depleted)
            sql`${posInventoryLots.remainingQty} > 0`,
            // expiryDate <= warnDate (expiring within warnDays OR already expired)
            lte(posInventoryLots.expiryDate, warnDate.toISOString().split("T")[0]),
          )
        )
        .orderBy(asc(posInventoryLots.expiryDate));

      const expired: typeof rows = [];
      const expiringSoon: typeof rows = [];

      for (const r of rows) {
        const days = daysDiff(r.lot.expiryDate ? String(r.lot.expiryDate) : null);
        if (days !== null && days <= 0) expired.push(r);
        else expiringSoon.push(r);
      }

      return {
        expired: expired.map((r) => ({
          ...r.lot,
          daysLeft: daysDiff(r.lot.expiryDate ? String(r.lot.expiryDate) : null),
          itemName: r.itemName,
          itemNameThai: r.itemNameThai,
        })),
        expiringSoon: expiringSoon.map((r) => ({
          ...r.lot,
          daysLeft: daysDiff(r.lot.expiryDate ? String(r.lot.expiryDate) : null),
          itemName: r.itemName,
          itemNameThai: r.itemNameThai,
        })),
      };
    }),

  // Create a new lot (usually called when confirming expense receipt)
  create: protectedProcedure
    .input(z.object({
      branchId: z.number(),
      inventoryItemId: z.number(),
      expenseReceiptId: z.number().optional(),
      lotNumber: z.string().optional(),
      manufactureDate: z.string().optional(),
      expiryDate: z.string().optional(),
      quantity: z.number().positive(),
      unitOfMeasure: z.string().optional(),
      costPerUnit: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const status = computeStatus(input.expiryDate);
      const [result] = await db.insert(posInventoryLots).values({
        branchId: input.branchId,
        inventoryItemId: input.inventoryItemId,
        expenseReceiptId: input.expenseReceiptId,
        lotNumber: input.lotNumber,
        manufactureDate: input.manufactureDate,
        expiryDate: input.expiryDate,
        quantity: String(input.quantity),
        remainingQty: String(input.quantity),
        unitOfMeasure: input.unitOfMeasure,
        costPerUnit: input.costPerUnit ? String(input.costPerUnit) : undefined,
        status,
        notes: input.notes,
        createdByStaffId: (ctx as any).staffId,
      });

      return { id: (result as any).insertId };
    }),

  // Update lot (mark as depleted, add notes, etc.)
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      remainingQty: z.number().optional(),
      status: z.enum(["active", "expiring_soon", "expired", "depleted"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const updates: Record<string, unknown> = {};
      if (input.remainingQty !== undefined) updates.remainingQty = String(input.remainingQty);
      if (input.status) updates.status = input.status;
      if (input.notes !== undefined) updates.notes = input.notes;

      await db.update(posInventoryLots).set(updates).where(eq(posInventoryLots.id, input.id));
      return { ok: true };
    }),

  // Delete a lot
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.delete(posInventoryLots).where(eq(posInventoryLots.id, input.id));
      return { ok: true };
    }),
});
