// ============================================
// Router: production
// Handles Batch Production (Volume 10)
// ============================================

import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { router, staffProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  posBatchProductions,
  posBatchProductionIngredients,
  posBranchInventoryStock,
  posInventoryMovements,
  posInventoryLots,
  posInventoryItems,
} from "../../drizzle/schema";

export const productionRouter = router({
  // List batch productions for a branch
  list: staffProcedure
    .input(z.object({
      branchId: z.number(),
      status: z.enum(["draft", "in_production", "completed", "cancelled", "all"]).optional().default("all"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [eq(posBatchProductions.branchId, input.branchId)];
      if (input.status !== "all") {
        conditions.push(eq(posBatchProductions.status, input.status));
      }

      const rows = await db
        .select({
          batch: posBatchProductions,
          targetItemName: posInventoryItems.name,
          targetItemNameThai: posInventoryItems.nameThai,
          unit: posInventoryItems.unitOfMeasure,
        })
        .from(posBatchProductions)
        .leftJoin(posInventoryItems, eq(posBatchProductions.inventoryItemId, posInventoryItems.id))
        .where(and(...conditions))
        .orderBy(desc(posBatchProductions.createdAt));

      // Fetch ingredients for each batch
      const batches = [];
      for (const r of rows) {
        const ingredients = await db
          .select({
            id: posBatchProductionIngredients.id,
            inventoryItemId: posBatchProductionIngredients.inventoryItemId,
            plannedQty: posBatchProductionIngredients.plannedQty,
            actualQty: posBatchProductionIngredients.actualQty,
            unit: posBatchProductionIngredients.unitOfMeasure,
            itemName: posInventoryItems.name,
            itemNameThai: posInventoryItems.nameThai,
          })
          .from(posBatchProductionIngredients)
          .leftJoin(posInventoryItems, eq(posBatchProductionIngredients.inventoryItemId, posInventoryItems.id))
          .where(eq(posBatchProductionIngredients.batchProductionId, r.batch.id));

        batches.push({
          ...r.batch,
          targetItemName: r.targetItemName,
          targetItemNameThai: r.targetItemNameThai,
          unit: r.unit,
          ingredients,
        });
      }

      return batches;
    }),

  // Create a new production batch (Status: draft)
  create: staffProcedure
    .input(z.object({
      branchId: z.number(),
      inventoryItemId: z.number(),
      batchNumber: z.string(),
      plannedQty: z.number().positive(),
      notes: z.string().optional(),
      manufactureDate: z.string().optional(),
      expiryDate: z.string().optional(),
      ingredients: z.array(z.object({
        inventoryItemId: z.number(),
        plannedQty: z.number().positive(),
        actualQty: z.number().positive(),
        unitOfMeasure: z.string().optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const staffId = ctx.staff.staffId;

      // 1. Insert master batch row
      const [result] = await db.insert(posBatchProductions).values({
        branchId: input.branchId,
        inventoryItemId: input.inventoryItemId,
        batchNumber: input.batchNumber,
        plannedQty: String(input.plannedQty),
        actualQty: null,
        status: "draft",
        notes: input.notes,
        manufactureDate: input.manufactureDate ? new Date(input.manufactureDate) : null,
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
        createdByStaffId: staffId,
      });

      const batchId = (result as any).insertId as number;

      // 2. Insert ingredients list
      for (const ing of input.ingredients) {
        await db.insert(posBatchProductionIngredients).values({
          batchProductionId: batchId,
          inventoryItemId: ing.inventoryItemId,
          plannedQty: String(ing.plannedQty),
          actualQty: String(ing.actualQty),
          unitOfMeasure: ing.unitOfMeasure || "g",
        });
      }

      return { id: batchId };
    }),

  // Update status (e.g. from draft -> in_production -> completed)
  updateStatus: staffProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["draft", "in_production", "completed", "cancelled"]),
      actualQty: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const staffId = ctx.staff.staffId;

      // Fetch original batch
      const [batch] = await db
        .select()
        .from(posBatchProductions)
        .where(eq(posBatchProductions.id, input.id))
        .limit(1);

      if (!batch) throw new Error("Batch production not found");
      if (batch.status === "completed" || batch.status === "cancelled") {
        throw new Error("Cannot modify a closed batch");
      }

      const updates: Record<string, any> = { status: input.status };
      if (input.actualQty !== undefined) updates.actualQty = String(input.actualQty);
      if (input.notes !== undefined) updates.notes = input.notes;

      // Execute status transition
      await db.update(posBatchProductions).set(updates).where(eq(posBatchProductions.id, input.id));

      // If status is completed, trigger stock deduction for ingredients and addition for target item
      if (input.status === "completed") {
        const finalQty = input.actualQty ?? Number(batch.plannedQty);

        // A. Increase target item stock
        await db.insert(posBranchInventoryStock).values({
          branchId: batch.branchId,
          inventoryItemId: batch.inventoryItemId,
          currentStock: String(finalQty),
          reservedStock: "0",
        }).onDuplicateKeyUpdate({
          set: { currentStock: sql`currentStock + ${finalQty}` }
        });

        // Log movement for target item
        await db.insert(posInventoryMovements).values({
          branchId: batch.branchId,
          inventoryItemId: batch.inventoryItemId,
          movementType: "received", // type 'received' represents added stock from production
          quantity: String(finalQty),
          referenceType: "manual",
          referenceId: batch.id,
          notes: `Produced via batch ${batch.batchNumber}`,
          performedByStaffId: staffId,
        });

        // B. Create inventory lot if expiry date is available
        if (batch.expiryDate) {
          await db.insert(posInventoryLots).values({
            branchId: batch.branchId,
            inventoryItemId: batch.inventoryItemId,
            lotNumber: batch.batchNumber,
            manufactureDate: batch.manufactureDate,
            expiryDate: batch.expiryDate,
            quantity: String(finalQty),
            remainingQty: String(finalQty),
            status: "active",
            notes: `Batch production #${batch.id}`,
            createdByStaffId: staffId,
          });
        }

        // C. Process ingredients stock deduction
        const ingredients = await db
          .select()
          .from(posBatchProductionIngredients)
          .where(eq(posBatchProductionIngredients.batchProductionId, batch.id));

        for (const ing of ingredients) {
          const deductionQty = Number(ing.actualQty);

          // Deduct from branch inventory stock
          await db.update(posBranchInventoryStock)
            .set({
              currentStock: sql`currentStock - ${deductionQty}`,
            })
            .where(and(
              eq(posBranchInventoryStock.branchId, batch.branchId),
              eq(posBranchInventoryStock.inventoryItemId, ing.inventoryItemId)
            ));

          // Log movement for ingredient
          await db.insert(posInventoryMovements).values({
            branchId: batch.branchId,
            inventoryItemId: ing.inventoryItemId,
            movementType: "used", // type 'waste' or 'used' (we use used/waste to deplete stock)
            quantity: String(-deductionQty),
            referenceType: "manual",
            referenceId: batch.id,
            notes: `Consumed for batch production ${batch.batchNumber}`,
            performedByStaffId: staffId,
          });
        }
      }

      return { success: true };
    }),

  // Delete production batch (Only draft or cancelled ones)
  delete: staffProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const [batch] = await db
        .select()
        .from(posBatchProductions)
        .where(eq(posBatchProductions.id, input.id))
        .limit(1);

      if (!batch) throw new Error("Batch not found");
      if (batch.status === "completed") {
        throw new Error("Cannot delete completed batch");
      }

      // Delete ingredients links first
      await db.delete(posBatchProductionIngredients).where(eq(posBatchProductionIngredients.batchProductionId, input.id));
      // Delete master batch
      await db.delete(posBatchProductions).where(eq(posBatchProductions.id, input.id));

      return { success: true };
    }),
});
