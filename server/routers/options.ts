import { TRPCError } from "@trpc/server";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import { posOptionGroups, posOptions, posMenuItemOptionGroups, posMenuItems, posCategories } from "../../drizzle/schema";
import { logAudit } from "../lib/audit";
import { router, staffProcedure, staffAdminProcedure } from "../_core/trpc";

export const optionsRouter = router({
  listGroups: staffProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(posOptionGroups).where(eq(posOptionGroups.isActive, true));
  }),

  getGroupById: staffProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [group] = await db.select().from(posOptionGroups)
        .where(eq(posOptionGroups.id, input.id)).limit(1);
      if (!group) throw new TRPCError({ code: "NOT_FOUND" });
      const options = await db.select().from(posOptions)
        .where(eq(posOptions.groupId, input.id));
      return { ...group, options: options.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)) };
    }),

  createGroup: staffAdminProcedure
    .input(z.object({
      name: z.string().min(1),
      nameThai: z.string().optional(),
      selectionType: z.enum(["single", "multi", "quantity"]).optional(),
      isRequired: z.boolean().optional(),
      minSelections: z.number().int().optional(),
      maxSelections: z.number().int().optional(),
      sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(posOptionGroups).values(input as any);
      const id = (result as any).insertId as number;
      const [created] = await db.select().from(posOptionGroups).where(eq(posOptionGroups.id, id)).limit(1);
      await logAudit({ staff: ctx.staff, action: "create", entity: "pos_option_groups", entityId: id });
      return created;
    }),

  updateGroup: staffAdminProcedure
    .input(z.object({
      id: z.number().int(),
      name: z.string().optional(),
      nameThai: z.string().optional(),
      selectionType: z.enum(["single", "multi", "quantity"]).optional(),
      isRequired: z.boolean().optional(),
      minSelections: z.number().int().optional(),
      maxSelections: z.number().int().optional(),
      sortOrder: z.number().int().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(posOptionGroups).set(data as any).where(eq(posOptionGroups.id, id));
      const [updated] = await db.select().from(posOptionGroups).where(eq(posOptionGroups.id, id)).limit(1);
      return updated;
    }),

  archiveGroup: staffAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(posOptionGroups).set({ isActive: false }).where(eq(posOptionGroups.id, input.id));
      return { success: true };
    }),

  listOptions: staffProcedure
    .input(z.object({ groupId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const opts = await db.select().from(posOptions)
        .where(eq(posOptions.groupId, input.groupId));
      return opts.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }),

  createOption: staffAdminProcedure
    .input(z.object({
      groupId: z.number().int(),
      name: z.string().min(1),
      nameThai: z.string().optional(),
      priceAdjustment: z.string().optional(),
      costAdjustment: z.string().optional(),
      stockEffects: z.any().optional(),
      sortOrder: z.number().int().optional(),
      isDefault: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(posOptions).values(input as any);
      const id = (result as any).insertId as number;
      const [created] = await db.select().from(posOptions).where(eq(posOptions.id, id)).limit(1);
      return created;
    }),

  updateOption: staffAdminProcedure
    .input(z.object({
      id: z.number().int(),
      name: z.string().optional(),
      nameThai: z.string().optional(),
      priceAdjustment: z.string().optional(),
      costAdjustment: z.string().optional(),
      stockEffects: z.any().optional(),
      sortOrder: z.number().int().optional(),
      isDefault: z.boolean().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(posOptions).set(data as any).where(eq(posOptions.id, id));
      const [updated] = await db.select().from(posOptions).where(eq(posOptions.id, id)).limit(1);
      return updated;
    }),

  deleteOption: staffAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(posOptions).where(eq(posOptions.id, input.id));
      return { success: true };
    }),

  reorderOptions: staffAdminProcedure
    .input(z.object({ groupId: z.number().int(), optionIds: z.array(z.number().int()) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      for (let i = 0; i < input.optionIds.length; i++) {
        await db.update(posOptions).set({ sortOrder: i }).where(eq(posOptions.id, input.optionIds[i]));
      }
      return { success: true };
    }),

  // ─── Linked Menus ─────────────────────────────────────────────────────────
  listLinkedMenus: staffProcedure
    .input(z.object({ optionGroupId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const linked = await db
        .select({
          menuItemId: posMenuItemOptionGroups.menuItemId,
          menuItemName: posMenuItems.name,
          menuItemSku: posMenuItems.sku,
          categoryId: posMenuItems.categoryId,
          categoryName: posCategories.name,
        })
        .from(posMenuItemOptionGroups)
        .leftJoin(posMenuItems, eq(posMenuItemOptionGroups.menuItemId, posMenuItems.id))
        .leftJoin(posCategories, eq(posMenuItems.categoryId, posCategories.id))
        .where(eq(posMenuItemOptionGroups.optionGroupId, input.optionGroupId));
      return linked;
    }),

  setLinkedMenus: staffAdminProcedure
    .input(z.object({
      optionGroupId: z.number().int(),
      menuItemIds: z.array(z.number().int()),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Get current links
      const current = await db
        .select({ menuItemId: posMenuItemOptionGroups.menuItemId })
        .from(posMenuItemOptionGroups)
        .where(eq(posMenuItemOptionGroups.optionGroupId, input.optionGroupId));

      const currentIds = new Set(current.map((c) => c.menuItemId));
      const newIds = new Set(input.menuItemIds);

      const toAdd = [...newIds].filter((id) => !currentIds.has(id));
      const toRemove = [...currentIds].filter((id) => !newIds.has(id));

      // Remove unlinked
      if (toRemove.length > 0) {
        await db.delete(posMenuItemOptionGroups).where(
          and(
            eq(posMenuItemOptionGroups.optionGroupId, input.optionGroupId),
            inArray(posMenuItemOptionGroups.menuItemId, toRemove)
          )
        );
      }

      // Add new links
      if (toAdd.length > 0) {
        await db.insert(posMenuItemOptionGroups).values(
          toAdd.map((menuItemId) => ({
            optionGroupId: input.optionGroupId,
            menuItemId,
          }))
        );
      }

      await logAudit({
        staff: ctx.staff,
        action: "update",
        entity: "option_group_linked_menus",
        entityId: input.optionGroupId,
        details: `Added ${toAdd.length}, Removed ${toRemove.length} linked menus`,
      });

      return { added: toAdd.length, removed: toRemove.length };
    }),
});
