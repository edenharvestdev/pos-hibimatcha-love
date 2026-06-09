import { TRPCError } from "@trpc/server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import {
  posInventoryAttributes,
  posInventoryAttributeOptions,
} from "../../drizzle/schema";
import { router, staffProcedure, staffAdminProcedure } from "../_core/trpc";

export const inventoryAttributesRouter = router({
  /**
   * List attributes for a given category (with their options)
   */
  listByCategory: staffProcedure
    .input(z.object({ categoryId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const attrs = await db
        .select()
        .from(posInventoryAttributes)
        .where(
          and(
            eq(posInventoryAttributes.categoryId, input.categoryId),
            eq(posInventoryAttributes.isActive, true)
          )
        )
        .orderBy(posInventoryAttributes.sortOrder);

      // Fetch options for all dropdown attributes
      const dropdownIds = attrs
        .filter((a) => a.fieldType === "dropdown")
        .map((a) => a.id);

      let allOptions: (typeof posInventoryAttributeOptions.$inferSelect)[] = [];
      if (dropdownIds.length > 0) {
        const { inArray } = await import("drizzle-orm");
        allOptions = await db
          .select()
          .from(posInventoryAttributeOptions)
          .where(
            and(
              inArray(posInventoryAttributeOptions.attributeId, dropdownIds),
              eq(posInventoryAttributeOptions.isActive, true)
            )
          )
          .orderBy(posInventoryAttributeOptions.sortOrder);
      }

      return attrs.map((attr) => ({
        ...attr,
        options:
          attr.fieldType === "dropdown"
            ? allOptions.filter((o) => o.attributeId === attr.id)
            : [],
      }));
    }),

  /**
   * Add a new option to a dropdown attribute
   */
  addOption: staffAdminProcedure
    .input(
      z.object({
        attributeId: z.number().int(),
        value: z.string().min(1),
        labelTh: z.string().optional(),
        labelEn: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verify attribute exists and is dropdown
      const [attr] = await db
        .select()
        .from(posInventoryAttributes)
        .where(eq(posInventoryAttributes.id, input.attributeId))
        .limit(1);

      if (!attr) throw new TRPCError({ code: "NOT_FOUND", message: "Attribute not found" });
      if (attr.fieldType !== "dropdown")
        throw new TRPCError({ code: "BAD_REQUEST", message: "Can only add options to dropdown attributes" });

      // Get max sortOrder
      const existing = await db
        .select()
        .from(posInventoryAttributeOptions)
        .where(eq(posInventoryAttributeOptions.attributeId, input.attributeId));
      const maxSort = existing.reduce((max, o) => Math.max(max, o.sortOrder ?? 0), 0);

      const [inserted] = await db
        .insert(posInventoryAttributeOptions)
        .values({
          attributeId: input.attributeId,
          value: input.value,
          labelTh: input.labelTh || input.value,
          labelEn: input.labelEn || input.value,
          sortOrder: maxSort + 1,
        })
        .$returningId();

      return { id: inserted.id, value: input.value, labelTh: input.labelTh, labelEn: input.labelEn };
    }),

  /**
   * Update an existing option
   */
  updateOption: staffAdminProcedure
    .input(
      z.object({
        id: z.number().int(),
        value: z.string().optional(),
        labelTh: z.string().optional(),
        labelEn: z.string().optional(),
        sortOrder: z.number().int().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { id, ...updates } = input;
      const setObj: Record<string, any> = {};
      if (updates.value !== undefined) setObj.value = updates.value;
      if (updates.labelTh !== undefined) setObj.labelTh = updates.labelTh;
      if (updates.labelEn !== undefined) setObj.labelEn = updates.labelEn;
      if (updates.sortOrder !== undefined) setObj.sortOrder = updates.sortOrder;
      if (updates.isActive !== undefined) setObj.isActive = updates.isActive;

      if (Object.keys(setObj).length === 0) return { success: true };

      await db
        .update(posInventoryAttributeOptions)
        .set(setObj)
        .where(eq(posInventoryAttributeOptions.id, id));

      return { success: true };
    }),

  /**
   * Soft-delete an option (set isActive=false)
   */
  deleteOption: staffAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db
        .update(posInventoryAttributeOptions)
        .set({ isActive: false })
        .where(eq(posInventoryAttributeOptions.id, input.id));

      return { success: true };
    }),
});
