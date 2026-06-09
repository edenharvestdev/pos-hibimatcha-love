import { TRPCError } from "@trpc/server";
import { eq, and, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import {
  posInventoryCategories,
  posInventoryItems,
  posBranchInventoryStock,
  posInventoryMovements,
  posRecipeIngredients,
} from "../../drizzle/schema";
import { logAudit } from "../lib/audit";
import { router, staffProcedure, staffAdminProcedure } from "../_core/trpc";

export const inventoryRouter = router({
  // ── Categories ────────────────────────────────────────────────────────────
  listCategories: staffProcedure
    .input(z.object({ parentId: z.number().int().optional().nullable() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      let rows = await db.select().from(posInventoryCategories).where(eq(posInventoryCategories.isActive, true));
      return rows.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }),

  createCategory: staffAdminProcedure
    .input(z.object({
      name: z.string().min(1),
      nameThai: z.string().optional(),
      parentId: z.number().int().optional().nullable(),
      sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(posInventoryCategories).values(input as any);
      const id = (result as any).insertId as number;
      const [created] = await db.select().from(posInventoryCategories).where(eq(posInventoryCategories.id, id)).limit(1);
      return created;
    }),

  updateCategory: staffAdminProcedure
    .input(z.object({ id: z.number().int(), name: z.string().optional(), nameThai: z.string().optional(), sortOrder: z.number().int().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(posInventoryCategories).set(data as any).where(eq(posInventoryCategories.id, id));
      const [updated] = await db.select().from(posInventoryCategories).where(eq(posInventoryCategories.id, id)).limit(1);
      return updated;
    }),

  archiveCategory: staffAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(posInventoryCategories).set({ isActive: false }).where(eq(posInventoryCategories.id, input.id));
      return { success: true };
    }),

  // ── Items ────────────────────────────────────────────────────────────────
  listItems: staffProcedure
    .input(z.object({
      branchId: z.number().int().optional(),
      categoryId: z.number().int().optional(),
      search: z.string().optional(),
      sourceFlag: z.string().optional(),
      includeArchived: z.boolean().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      let rows = await db.select().from(posInventoryItems);
      if (!input?.includeArchived) rows = rows.filter((i) => !i.isArchived);
      if (input?.categoryId) rows = rows.filter((i) => i.categoryId === input.categoryId);
      if (input?.sourceFlag) rows = rows.filter((i) => i.sourceFlag === input.sourceFlag);
      if (input?.search) {
        const q = input.search.toLowerCase();
        rows = rows.filter((i) =>
          i.name.toLowerCase().includes(q) ||
          (i.nameThai ?? "").toLowerCase().includes(q) ||
          (i.sku ?? "").toLowerCase().includes(q)
        );
      }

      if (input?.branchId) {
        const stocks = await db.select().from(posBranchInventoryStock)
          .where(eq(posBranchInventoryStock.branchId, input.branchId));
        const stockMap = new Map(stocks.map((s) => [s.inventoryItemId, s]));
        return rows.map((item) => ({ ...item, stock: stockMap.get(item.id) ?? null }));
      }

      return rows;
    }),

  getItemById: staffProcedure
    .input(z.object({ id: z.number().int(), branchId: z.number().int().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [item] = await db.select().from(posInventoryItems).where(eq(posInventoryItems.id, input.id)).limit(1);
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });

      let stock = null;
      if (input.branchId) {
        const [s] = await db.select().from(posBranchInventoryStock)
          .where(and(
            eq(posBranchInventoryStock.branchId, input.branchId),
            eq(posBranchInventoryStock.inventoryItemId, input.id)
          )).limit(1);
        stock = s ?? null;
      }

      return { ...item, stock };
    }),

  createItem: staffAdminProcedure
    .input(z.object({
      name: z.string().min(1),
      nameThai: z.string().optional(),
      sku: z.string().optional(),
      barcode: z.string().optional(),
      description: z.string().optional(),
      categoryId: z.number().int().optional().nullable(),
      unitOfMeasure: z.enum(["g", "kg", "ml", "l", "piece", "pack", "box", "bottle", "can", "bag"]).optional(),
      sourceFlag: z.enum(["hq_supply", "customer_supplied", "mixed"]).optional(),
      costPerUnit: z.string().optional(),
      sellingPricePerUnit: z.string().optional(),
      retailPrice: z.string().optional(),
      minStockLevel: z.string().optional(),
      reorderPoint: z.string().optional(),
      reorderQuantity: z.string().optional(),
      primarySupplierId: z.number().int().optional().nullable(),
      leadTimeDays: z.number().int().optional(),
      shelfLifeDays: z.number().int().optional(),
      storageRequirements: z.string().optional(),
      allergens: z.array(z.string()).optional(),
      attributes: z.record(z.string(), z.union([z.string(), z.number(), z.null()])).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(posInventoryItems).values(input as any);
      const id = (result as any).insertId as number;
      const [created] = await db.select().from(posInventoryItems).where(eq(posInventoryItems.id, id)).limit(1);
      await logAudit({ staff: ctx.staff, action: "create", entity: "pos_inventory_items", entityId: id });
      return created;
    }),

  updateItem: staffAdminProcedure
    .input(z.object({ id: z.number().int() }).passthrough())
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(posInventoryItems).set(data as any).where(eq(posInventoryItems.id, id));
      const [updated] = await db.select().from(posInventoryItems).where(eq(posInventoryItems.id, id)).limit(1);
      await logAudit({ staff: ctx.staff, action: "update", entity: "pos_inventory_items", entityId: id });
      return updated;
    }),

  archiveItem: staffAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(posInventoryItems).set({ isArchived: true, isActive: false }).where(eq(posInventoryItems.id, input.id));
      await logAudit({ staff: ctx.staff, action: "archive", entity: "pos_inventory_items", entityId: input.id });
      return { success: true };
    }),

  // ── Stock ────────────────────────────────────────────────────────────────
  getStock: staffProcedure
    .input(z.object({ branchId: z.number().int(), itemId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [row] = await db.select().from(posBranchInventoryStock)
        .where(and(
          eq(posBranchInventoryStock.branchId, input.branchId),
          eq(posBranchInventoryStock.inventoryItemId, input.itemId)
        )).limit(1);
      return row ?? null;
    }),

  listStock: staffProcedure
    .input(z.object({
      branchId: z.number().int(),
      lowStockOnly: z.boolean().optional(),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const stocks = await db.select().from(posBranchInventoryStock)
        .where(eq(posBranchInventoryStock.branchId, input.branchId));
      const items = await db.select().from(posInventoryItems).where(eq(posInventoryItems.isActive, true));
      const itemMap = new Map(items.map((i) => [i.id, i]));

      let result = stocks.map((s) => ({
        ...s,
        item: itemMap.get(s.inventoryItemId) ?? null,
        availableStock: Number(s.currentStock ?? 0) - Number(s.reservedStock ?? 0),
      })).filter((s) => s.item !== null);

      if (input.lowStockOnly) {
        result = result.filter((s) => {
          const reorderPoint = Number(s.item?.reorderPoint ?? 0);
          return reorderPoint > 0 && s.availableStock <= reorderPoint;
        });
      }
      if (input.search) {
        const q = input.search.toLowerCase();
        result = result.filter((s) =>
          s.item!.name.toLowerCase().includes(q) ||
          (s.item!.nameThai ?? "").toLowerCase().includes(q)
        );
      }

      return result;
    }),

  adjustStock: staffAdminProcedure
    .input(z.object({
      branchId: z.number().int(),
      itemId: z.number().int(),
      quantity: z.number(),
      reason: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.insert(posBranchInventoryStock).values({
        branchId: input.branchId,
        inventoryItemId: input.itemId,
        currentStock: String(input.quantity),
      }).onDuplicateKeyUpdate({
        set: {
          currentStock: sql`${posBranchInventoryStock.currentStock} + ${input.quantity}`,
          lastCountedAt: new Date(),
        },
      });

      await db.insert(posInventoryMovements).values({
        branchId: input.branchId,
        inventoryItemId: input.itemId,
        movementType: "adjusted",
        quantity: String(input.quantity),
        notes: input.reason,
        performedByStaffId: ctx.staff.staffId,
        referenceType: "manual",
      });

      await logAudit({ staff: ctx.staff, action: "adjust_stock", entity: "pos_inventory_items", entityId: input.itemId });
      return { success: true };
    }),

  receiveStock: staffAdminProcedure
    .input(z.object({
      branchId: z.number().int(),
      items: z.array(z.object({
        inventoryItemId: z.number().int(),
        quantity: z.number(),
        costPerUnit: z.number().optional(),
        unitOfMeasure: z.string().optional(),
        notes: z.string().optional(),
      })),
      referenceType: z.enum(["purchase_order", "manual"]).optional(),
      referenceId: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      for (const item of input.items) {
        // Get current stock and average cost for Weighted Average Cost calculation
        const [existingStock] = await db.select().from(posBranchInventoryStock)
          .where(and(
            eq(posBranchInventoryStock.branchId, input.branchId),
            eq(posBranchInventoryStock.inventoryItemId, item.inventoryItemId)
          )).limit(1);

        const currentQty = existingStock ? Number(existingStock.currentStock ?? 0) : 0;
        const currentAvgCost = existingStock ? Number(existingStock.averageCost ?? 0) : 0;
        const newQty = item.quantity;
        const newCost = item.costPerUnit ?? 0;

        // Weighted Average Cost = (existing_value + new_value) / (existing_qty + new_qty)
        let newAvgCost = currentAvgCost;
        if (newCost > 0) {
          const existingValue = currentQty * currentAvgCost;
          const incomingValue = newQty * newCost;
          const totalQty = currentQty + newQty;
          newAvgCost = totalQty > 0 ? (existingValue + incomingValue) / totalQty : newCost;
        }

        const totalQtyAfter = currentQty + newQty;
        const totalStockValue = totalQtyAfter * newAvgCost;

        await db.insert(posBranchInventoryStock).values({
          branchId: input.branchId,
          inventoryItemId: item.inventoryItemId,
          currentStock: String(newQty),
          averageCost: String(newAvgCost.toFixed(4)),
          totalStockValue: String(totalStockValue.toFixed(2)),
          lastReceivedAt: new Date(),
        }).onDuplicateKeyUpdate({
          set: {
            currentStock: sql`${posBranchInventoryStock.currentStock} + ${newQty}`,
            averageCost: String(newAvgCost.toFixed(4)),
            totalStockValue: String(totalStockValue.toFixed(2)),
            lastReceivedAt: new Date(),
          },
        });

        const itemTotalCost = newQty * newCost;
        await db.insert(posInventoryMovements).values({
          branchId: input.branchId,
          inventoryItemId: item.inventoryItemId,
          movementType: "received",
          quantity: String(item.quantity),
          unitOfMeasure: item.unitOfMeasure,
          costPerUnit: newCost > 0 ? String(newCost) : undefined,
          totalCost: newCost > 0 ? String(itemTotalCost.toFixed(2)) : undefined,
          notes: item.notes,
          performedByStaffId: ctx.staff.staffId,
          referenceType: input.referenceType ?? "manual",
          referenceId: input.referenceId,
        });
      }

      return { success: true };
    }),

  countStock: staffAdminProcedure
    .input(z.object({
      branchId: z.number().int(),
      counts: z.array(z.object({
        inventoryItemId: z.number().int(),
        countedQuantity: z.number(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const variances: Array<{ inventoryItemId: number; expected: number; counted: number; variance: number }> = [];

      for (const count of input.counts) {
        const [existing] = await db.select().from(posBranchInventoryStock)
          .where(and(
            eq(posBranchInventoryStock.branchId, input.branchId),
            eq(posBranchInventoryStock.inventoryItemId, count.inventoryItemId)
          )).limit(1);

        const expected = Number(existing?.currentStock ?? 0);
        const variance = count.countedQuantity - expected;

        if (Math.abs(variance) > 0.001) {
          variances.push({ inventoryItemId: count.inventoryItemId, expected, counted: count.countedQuantity, variance });
        }

        await db.insert(posBranchInventoryStock).values({
          branchId: input.branchId,
          inventoryItemId: count.inventoryItemId,
          currentStock: String(count.countedQuantity),
          lastCountedAt: new Date(),
        }).onDuplicateKeyUpdate({
          set: { currentStock: String(count.countedQuantity), lastCountedAt: new Date() },
        });

        if (Math.abs(variance) > 0.001) {
          await db.insert(posInventoryMovements).values({
            branchId: input.branchId,
            inventoryItemId: count.inventoryItemId,
            movementType: "adjusted",
            quantity: String(variance),
            notes: `Stock count adjustment`,
            performedByStaffId: ctx.staff.staffId,
            referenceType: "count",
          });
        }
      }

      return { success: true, variances };
    }),

  listMovements: staffProcedure
    .input(z.object({
      branchId: z.number().int().optional(),
      itemId: z.number().int().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      type: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      let rows = await db.select().from(posInventoryMovements);
      if (input?.branchId) rows = rows.filter((m) => m.branchId === input.branchId);
      if (input?.itemId) rows = rows.filter((m) => m.inventoryItemId === input.itemId);
      if (input?.type) rows = rows.filter((m) => m.movementType === input.type);
      if (input?.dateFrom) rows = rows.filter((m) => m.createdAt && m.createdAt >= new Date(input.dateFrom!));
      if (input?.dateTo) rows = rows.filter((m) => m.createdAt && m.createdAt <= new Date(input.dateTo!));

      return rows.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
    }),

  // ── Inter-branch transfer ──────────────────────────────────────────────────
  // Hibi House (or any branch with stock) sends items to another branch.
  // Creates a `transferred_out` movement at source + `transferred_in` at destination,
  // adjusts both branch stock rows, ensures destination has a stock record.
  transferStock: staffAdminProcedure
    .input(z.object({
      fromBranchId: z.number().int(),
      toBranchId: z.number().int(),
      items: z.array(z.object({
        inventoryItemId: z.number().int(),
        quantity: z.string(),
        unitOfMeasure: z.string(),
        notes: z.string().optional(),
      })).min(1),
      transferNote: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (input.fromBranchId === input.toBranchId)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Source and destination branch must differ" });

      const movementIds: number[] = [];
      for (const it of input.items) {
        const qty = Number(it.quantity);
        if (qty <= 0) continue;

        // 1) Check source stock
        const [srcStock] = await db.select().from(posBranchInventoryStock)
          .where(and(
            eq(posBranchInventoryStock.branchId, input.fromBranchId),
            eq(posBranchInventoryStock.inventoryItemId, it.inventoryItemId),
          )).limit(1);
        const available = Number(srcStock?.currentStock ?? 0);
        if (available < qty) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Insufficient stock for item #${it.inventoryItemId} (have ${available}, need ${qty})`,
          });
        }

        // 2) Deduct source
        await db.update(posBranchInventoryStock).set({
          currentStock: sql`${posBranchInventoryStock.currentStock} - ${qty}`,
        }).where(and(
          eq(posBranchInventoryStock.branchId, input.fromBranchId),
          eq(posBranchInventoryStock.inventoryItemId, it.inventoryItemId),
        ));

        // 3) Add to destination (create row if missing)
        await db.insert(posBranchInventoryStock).values({
          branchId: input.toBranchId,
          inventoryItemId: it.inventoryItemId,
          currentStock: it.quantity,
          reservedStock: "0",
        }).onDuplicateKeyUpdate({ set: {
          currentStock: sql`${posBranchInventoryStock.currentStock} + ${qty}`,
        } });

        // 4) Record both movement rows
        const [outRes] = await db.insert(posInventoryMovements).values({
          branchId: input.fromBranchId,
          inventoryItemId: it.inventoryItemId,
          movementType: "transferred_out",
          quantity: String(-qty),
          unitOfMeasure: it.unitOfMeasure as any,
          referenceType: "transfer",
          notes: it.notes || input.transferNote || `transfer_to_branch_${input.toBranchId}`,
          performedByStaffId: ctx.staff.staffId,
        });
        movementIds.push((outRes as any).insertId as number);
        const [inRes] = await db.insert(posInventoryMovements).values({
          branchId: input.toBranchId,
          inventoryItemId: it.inventoryItemId,
          movementType: "transferred_in",
          quantity: it.quantity,
          unitOfMeasure: it.unitOfMeasure as any,
          referenceType: "transfer",
          notes: it.notes || input.transferNote || `transfer_from_branch_${input.fromBranchId}`,
          performedByStaffId: ctx.staff.staffId,
        });
        movementIds.push((inRes as any).insertId as number);
      }

      await logAudit({
        staff: ctx.staff,
        action: "transfer_stock",
        entity: "pos_inventory_movements",
        entityId: undefined,
        afterData: { fromBranchId: input.fromBranchId, toBranchId: input.toBranchId, itemCount: input.items.length } as any,
      });
      return { success: true, movementIds };
    }),

  // ── Stock Value Summary ─────────────────────────────────────────────────────
  stockValueSummary: staffProcedure
    .input(z.object({
      branchId: z.number().int(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { totalValue: 0, totalItems: 0, bySource: [] };

      const stocks = await db.select().from(posBranchInventoryStock)
        .where(eq(posBranchInventoryStock.branchId, input.branchId));
      const items = await db.select().from(posInventoryItems).where(eq(posInventoryItems.isActive, true));
      const itemMap = new Map(items.map((i) => [i.id, i]));

      let totalValue = 0;
      let totalItems = 0;
      const sourceMap: Record<string, { count: number; value: number; qty: number }> = {};

      for (const s of stocks) {
        const item = itemMap.get(s.inventoryItemId);
        if (!item) continue;

        const qty = Number(s.currentStock ?? 0);
        const avgCost = Number(s.averageCost ?? 0);
        // Use averageCost if available, otherwise fallback to item's costPerUnit
        const effectiveCost = avgCost > 0 ? avgCost : Number(item.costPerUnit ?? 0);
        const value = qty * effectiveCost;

        totalValue += value;
        totalItems++;

        const source = item.sourceFlag ?? "hq_supply";
        if (!sourceMap[source]) sourceMap[source] = { count: 0, value: 0, qty: 0 };
        sourceMap[source].count++;
        sourceMap[source].value += value;
        sourceMap[source].qty += qty;
      }

      const bySource = Object.entries(sourceMap).map(([source, data]) => ({
        source,
        ...data,
      }));

      return { totalValue, totalItems, bySource };
    }),

  // ── Delete ────────────────────────────────────────────────────────────
  deleteCategory: staffAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Soft delete - set isActive = false
      await db.update(posInventoryCategories).set({ isActive: false } as any).where(eq(posInventoryCategories.id, input.id));
      await logAudit({ staff: ctx.staff, action: "inventory.deleteCategory", entity: "inventoryCategory", entityId: input.id });
      return { success: true };
    }),

  deleteItem: staffAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Soft delete - set status = inactive
      await db.update(posInventoryItems).set({ status: "inactive" } as any).where(eq(posInventoryItems.id, input.id));
      await logAudit({ staff: ctx.staff, action: "inventory.deleteItem", entity: "inventoryItem", entityId: input.id });
      return { success: true };
    }),
});
