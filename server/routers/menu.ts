import { TRPCError } from "@trpc/server";
import { eq, and, inArray, like, or } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import {
  posMenuItems,
  posMenuItemOptionGroups,
  posOptionGroups,
  posOptions,
  posBranchMenuItems,
  posRecipeIngredients,
  posInventoryItems,
  posSops,
  branches,
} from "../../drizzle/schema";
import { logAudit } from "../lib/audit";
import { router, staffProcedure, staffAdminProcedure, superAdminProcedure } from "../_core/trpc";

const MenuItemInput = z.object({
  sku: z.string().optional(),
  barcode: z.string().optional(),
  name: z.string().min(1),
  nameThai: z.string().optional(),
  nameJapanese: z.string().optional(),
  description: z.string().optional(),
  descriptionThai: z.string().optional(),
  imageUrl: z.string().optional(),
  categoryId: z.number().int().optional().nullable(),
  tags: z.array(z.string()).optional(),
  basePrice: z.string(),
  costPrice: z.string().optional(),
  memberPrice: z.string().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  availableFrom: z.string().optional(),
  availableTo: z.string().optional(),
  trackInventory: z.boolean().optional(),
  prepTimeMinutes: z.number().int().optional(),
  cookTimeMinutes: z.number().int().optional(),
  recipeNotes: z.string().optional(),
  sopId: z.number().int().optional().nullable(),
  sortOrder: z.number().int().optional(),
});

export const menuRouter = router({
  list: staffProcedure
    .input(z.object({
      branchId: z.number().int().optional(),
      categoryId: z.number().int().optional(),
      includeArchived: z.boolean().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      let rows = await db.select().from(posMenuItems);

      const activeBranchId = ctx.staff.role === "super_admin" ? input?.branchId : ctx.staff.currentBranchId;

      if (activeBranchId) {
        const branchMenus = await db.select().from(posBranchMenuItems)
          .where(eq(posBranchMenuItems.branchId, activeBranchId));
        if (ctx.staff.role !== "super_admin") {
          const availableIds = new Set(branchMenus.filter(bm => bm.isAvailable !== false).map(bm => bm.menuItemId));
          rows = rows.filter((m) => availableIds.has(m.id));
        } else {
          if (branchMenus.length > 0) {
            const availableIds = new Set(branchMenus.filter(bm => bm.isAvailable !== false).map(bm => bm.menuItemId));
            rows = rows.filter((m) => availableIds.has(m.id));
          }
        }
      } else if (ctx.staff.role !== "super_admin") {
        return [];
      }

      if (!input?.includeArchived) rows = rows.filter((m) => !m.isArchived);
      if (input?.categoryId) rows = rows.filter((m) => m.categoryId === input.categoryId);
      if (input?.search) {
        const q = input.search.toLowerCase();
        rows = rows.filter((m) =>
          m.name.toLowerCase().includes(q) ||
          (m.nameThai ?? "").toLowerCase().includes(q) ||
          (m.sku ?? "").toLowerCase().includes(q)
        );
      }

      return rows.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }),

  listAvailable: staffProcedure
    .input(z.object({ branchId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const targetBranchId = ctx.staff.role === "super_admin" ? input.branchId : ctx.staff.currentBranchId;
      if (!targetBranchId) return [];

      const overrides = await db.select().from(posBranchMenuItems)
        .where(eq(posBranchMenuItems.branchId, targetBranchId));
      const overrideMap = new Map(overrides.map((o) => [o.menuItemId, o]));

      const items = await db.select().from(posMenuItems)
        .where(and(eq(posMenuItems.isActive, true), eq(posMenuItems.isArchived, false)));

      return items
        .filter((item) => {
          const override = overrideMap.get(item.id);
          return override ? override.isAvailable : true;
        })
        .map((item) => {
          const override = overrideMap.get(item.id);
          return {
            ...item,
            displayPrice: override?.priceOverride ?? item.basePrice,
            stockLevel: override?.stockLevel ?? null,
          };
        })
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }),

  // Returns ONLY items explicitly assigned to a branch (have a row in pos_branch_menu_items with isAvailable=true)
  listAssignedToBranch: staffProcedure
    .input(z.object({ branchId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const targetBranchId = ctx.staff.role === "super_admin" ? input.branchId : ctx.staff.currentBranchId;
      if (!targetBranchId) return [];
      const assignments = await db.select().from(posBranchMenuItems)
        .where(and(eq(posBranchMenuItems.branchId, targetBranchId), eq(posBranchMenuItems.isAvailable, true)));
      if (assignments.length === 0) return [];
      const menuItemIds = assignments.map(a => a.menuItemId);
      const items = await db.select().from(posMenuItems)
        .where(and(eq(posMenuItems.isActive, true), inArray(posMenuItems.id, menuItemIds)));
      const overrideMap = new Map(assignments.map(a => [a.menuItemId, a]));
      return items.map(item => {
        const override = overrideMap.get(item.id);
        return { ...item, displayPrice: override?.priceOverride ?? item.basePrice, stockLevel: override?.stockLevel ?? null };
      }).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }),

  getById: staffProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      if (ctx.staff.role !== "super_admin") {
        if (!ctx.staff.currentBranchId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Branch context required" });
        }
        const [isAssigned] = await db.select().from(posBranchMenuItems)
          .where(and(
            eq(posBranchMenuItems.menuItemId, input.id),
            eq(posBranchMenuItems.branchId, ctx.staff.currentBranchId)
          )).limit(1);
        if (!isAssigned) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Menu item not assigned to your branch" });
        }
      }

      const [item] = await db.select().from(posMenuItems)
        .where(eq(posMenuItems.id, input.id)).limit(1);
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });

      const itemGroups = await db.select({
        id: posMenuItemOptionGroups.id,
        optionGroupId: posMenuItemOptionGroups.optionGroupId,
        sortOrder: posMenuItemOptionGroups.sortOrder,
        group: posOptionGroups,
      }).from(posMenuItemOptionGroups)
        .leftJoin(posOptionGroups, eq(posMenuItemOptionGroups.optionGroupId, posOptionGroups.id))
        .where(eq(posMenuItemOptionGroups.menuItemId, input.id));

      const recipe = await db.select({
        id: posRecipeIngredients.id,
        inventoryItemId: posRecipeIngredients.inventoryItemId,
        quantity: posRecipeIngredients.quantity,
        unitOfMeasure: posRecipeIngredients.unitOfMeasure,
        notes: posRecipeIngredients.notes,
        itemName: posInventoryItems.name,
      }).from(posRecipeIngredients)
        .leftJoin(posInventoryItems, eq(posRecipeIngredients.inventoryItemId, posInventoryItems.id))
        .where(eq(posRecipeIngredients.menuItemId, input.id));

      // Load options for each group
      const optionGroupsWithOptions = await Promise.all(
        itemGroups.map(async (ig) => {
          if (!ig.optionGroupId) return ig;
          const options = await db.select().from(posOptions)
            .where(and(eq(posOptions.groupId, ig.optionGroupId), eq(posOptions.isActive, true)));
          return { ...ig, options };
        })
      );

      // Load linked SOP (preparation instructions) if any
      let sop = null;
      if ((item as any).sopId) {
        const [s] = await db.select({
          id: posSops.id,
          title: posSops.title,
          titleThai: posSops.titleThai,
          subtitle: posSops.subtitle,
          content: posSops.content,
          status: posSops.status,
        }).from(posSops).where(eq(posSops.id, (item as any).sopId)).limit(1);
        sop = s ?? null;
      }

      return { ...item, optionGroups: optionGroupsWithOptions, recipe, sop };
    }),

  create: staffAdminProcedure
    .input(MenuItemInput)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(posMenuItems).values(input as any);
      const id = (result as any).insertId as number;

      const targetBranchId = ctx.staff.role === "super_admin" ? ctx.staff.currentBranchId : ctx.staff.currentBranchId;
      if (targetBranchId) {
        await db.insert(posBranchMenuItems).values({
          branchId: targetBranchId,
          menuItemId: id,
          isAvailable: true,
        }).onDuplicateKeyUpdate({ set: { isAvailable: true } });
      } else {
        const [hq] = await db.select().from(branches).where(eq(branches.branchType, "hq")).limit(1);
        if (hq) {
          await db.insert(posBranchMenuItems).values({
            branchId: hq.id,
            menuItemId: id,
            isAvailable: true,
          }).onDuplicateKeyUpdate({ set: { isAvailable: true } });
        }
      }

      const [created] = await db.select().from(posMenuItems).where(eq(posMenuItems.id, id)).limit(1);
      await logAudit({ staff: ctx.staff, action: "create", entity: "pos_menu_items", entityId: id, afterData: created });
      return created;
    }),

  // List which branches a menu item is enabled at + their overrides
  listBranchAvailability: staffAdminProcedure
    .input(z.object({ menuItemId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      if (ctx.staff.role !== "super_admin") {
        if (!ctx.staff.currentBranchId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Branch context required" });
        }
        const [isAssigned] = await db.select().from(posBranchMenuItems)
          .where(and(eq(posBranchMenuItems.menuItemId, input.menuItemId), eq(posBranchMenuItems.branchId, ctx.staff.currentBranchId)))
          .limit(1);
        if (!isAssigned) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Menu item not assigned to your branch" });
        }
      }

      const rows = await db.select({
        id: posBranchMenuItems.id,
        branchId: posBranchMenuItems.branchId,
        isAvailable: posBranchMenuItems.isAvailable,
        priceOverride: posBranchMenuItems.priceOverride,
        stockLevel: posBranchMenuItems.stockLevel,
        branchName: branches.name,
        branchCode: branches.branchCode,
        branchType: branches.branchType,
      }).from(posBranchMenuItems)
        .leftJoin(branches, eq(posBranchMenuItems.branchId, branches.id))
        .where(eq(posBranchMenuItems.menuItemId, input.menuItemId));
      return rows;
    }),

  // Distribute one or more menu items to a set of branches (additive — does not unassign)
  distributeMenuItems: superAdminProcedure
    .input(z.object({
      menuItemIds: z.array(z.number().int()).min(1),
      branchIds: z.array(z.number().int()).min(1),
      isAvailable: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      let inserted = 0;
      for (const menuItemId of input.menuItemIds) {
        for (const branchId of input.branchIds) {
          await db.insert(posBranchMenuItems).values({
            branchId,
            menuItemId,
            isAvailable: input.isAvailable,
          }).onDuplicateKeyUpdate({ set: { isAvailable: input.isAvailable } });
          inserted++;
        }
      }
      await logAudit({ staff: ctx.staff, action: "distribute_menu", entity: "pos_branch_menu_items", entityId: undefined,
        afterData: { menuItemIds: input.menuItemIds, branchIds: input.branchIds, count: inserted } as any });
      return { success: true, count: inserted };
    }),

  // Toggle a single branch's availability for a single item
  setBranchAvailability: staffAdminProcedure
    .input(z.object({
      menuItemId: z.number().int(),
      branchId: z.number().int(),
      isAvailable: z.boolean(),
      priceOverride: z.string().optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const targetBranchId = ctx.staff.role === "super_admin" ? input.branchId : ctx.staff.currentBranchId;
      if (!targetBranchId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Branch context required" });
      }

      if (ctx.staff.role !== "super_admin") {
        const [exists] = await db.select().from(posBranchMenuItems)
          .where(and(eq(posBranchMenuItems.menuItemId, input.menuItemId), eq(posBranchMenuItems.branchId, targetBranchId)))
          .limit(1);
        if (!exists) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Menu item not assigned to your branch" });
        }
      }

      await db.insert(posBranchMenuItems).values({
        branchId: targetBranchId,
        menuItemId: input.menuItemId,
        isAvailable: input.isAvailable,
        priceOverride: input.priceOverride ?? null,
      }).onDuplicateKeyUpdate({ set: {
        isAvailable: input.isAvailable,
        priceOverride: input.priceOverride ?? null,
      } });
      return { success: true };
    }),

  // Toggle single branch status (Open / Out of Stock / Hidden) from POS screen
  setBranchItemStatus: staffProcedure
    .input(z.object({
      menuItemId: z.number().int(),
      branchId: z.number().int(),
      status: z.enum(["open", "out_of_stock", "hidden"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      
      const targetBranchId = ctx.staff.role === "super_admin" ? input.branchId : ctx.staff.currentBranchId;
      if (!targetBranchId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Branch context required" });
      }

      if (ctx.staff.role !== "super_admin") {
        const [exists] = await db.select().from(posBranchMenuItems)
          .where(and(eq(posBranchMenuItems.menuItemId, input.menuItemId), eq(posBranchMenuItems.branchId, targetBranchId)))
          .limit(1);
        if (!exists) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Menu item not assigned to your branch" });
        }
      }

      const isAvailable = input.status !== "hidden";
      const stockLevel = input.status === "out_of_stock" ? 0 : null;

      await db.insert(posBranchMenuItems).values({
        branchId: targetBranchId,
        menuItemId: input.menuItemId,
        isAvailable,
        stockLevel,
      }).onDuplicateKeyUpdate({ set: {
        isAvailable,
        stockLevel,
      } });
      return { success: true };
    }),

  update: staffAdminProcedure
    .input(z.object({ id: z.number().int() }).merge(MenuItemInput.partial()))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;

      if (ctx.staff.role !== "super_admin") {
        if (!ctx.staff.currentBranchId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Branch context required" });
        }
        const [isAssigned] = await db.select().from(posBranchMenuItems)
          .where(and(eq(posBranchMenuItems.menuItemId, id), eq(posBranchMenuItems.branchId, ctx.staff.currentBranchId)))
          .limit(1);
        if (!isAssigned) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Menu item not assigned to your branch" });
        }
      }

      await db.update(posMenuItems).set(data as any).where(eq(posMenuItems.id, id));
      const [updated] = await db.select().from(posMenuItems).where(eq(posMenuItems.id, id)).limit(1);
      await logAudit({ staff: ctx.staff, action: "update", entity: "pos_menu_items", entityId: id });
      return updated;
    }),

  archive: staffAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      if (ctx.staff.role !== "super_admin") {
        if (!ctx.staff.currentBranchId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Branch context required" });
        }
        const [isAssigned] = await db.select().from(posBranchMenuItems)
          .where(and(eq(posBranchMenuItems.menuItemId, input.id), eq(posBranchMenuItems.branchId, ctx.staff.currentBranchId)))
          .limit(1);
        if (!isAssigned) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Menu item not assigned to your branch" });
        }
      }

      await db.update(posMenuItems).set({ isArchived: true, isActive: false }).where(eq(posMenuItems.id, input.id));
      await logAudit({ staff: ctx.staff, action: "archive", entity: "pos_menu_items", entityId: input.id });
      return { success: true };
    }),

  restore: staffAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      if (ctx.staff.role !== "super_admin") {
        if (!ctx.staff.currentBranchId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Branch context required" });
        }
        const [isAssigned] = await db.select().from(posBranchMenuItems)
          .where(and(eq(posBranchMenuItems.menuItemId, input.id), eq(posBranchMenuItems.branchId, ctx.staff.currentBranchId)))
          .limit(1);
        if (!isAssigned) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Menu item not assigned to your branch" });
        }
      }

      await db.update(posMenuItems).set({ isArchived: false, isActive: true }).where(eq(posMenuItems.id, input.id));
      return { success: true };
    }),

  duplicate: staffAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      if (ctx.staff.role !== "super_admin") {
        if (!ctx.staff.currentBranchId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Branch context required" });
        }
        const [isAssigned] = await db.select().from(posBranchMenuItems)
          .where(and(eq(posBranchMenuItems.menuItemId, input.id), eq(posBranchMenuItems.branchId, ctx.staff.currentBranchId)))
          .limit(1);
        if (!isAssigned) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Menu item not assigned to your branch" });
        }
      }

      const [original] = await db.select().from(posMenuItems).where(eq(posMenuItems.id, input.id)).limit(1);
      if (!original) throw new TRPCError({ code: "NOT_FOUND" });
      const { id, sku, createdAt, updatedAt, ...rest } = original;
      const [result] = await db.insert(posMenuItems).values({ ...rest, name: `${rest.name} (Copy)`, sku: undefined });
      const newId = (result as any).insertId as number;

      const targetBranchId = ctx.staff.role === "super_admin" ? ctx.staff.currentBranchId : ctx.staff.currentBranchId;
      if (targetBranchId) {
        await db.insert(posBranchMenuItems).values({
          branchId: targetBranchId,
          menuItemId: newId,
          isAvailable: true,
        }).onDuplicateKeyUpdate({ set: { isAvailable: true } });
      }

      const [created] = await db.select().from(posMenuItems).where(eq(posMenuItems.id, newId)).limit(1);
      return created;
    }),

  bulkArchive: staffAdminProcedure
    .input(z.object({ ids: z.array(z.number().int()) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (input.ids.length === 0) return { success: true };

      if (ctx.staff.role !== "super_admin") {
        if (!ctx.staff.currentBranchId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Branch context required" });
        }
        const assigned = await db.select().from(posBranchMenuItems)
          .where(and(inArray(posBranchMenuItems.menuItemId, input.ids), eq(posBranchMenuItems.branchId, ctx.staff.currentBranchId)));
        if (assigned.length !== input.ids.length) {
          throw new TRPCError({ code: "FORBIDDEN", message: "One or more menu items do not belong to your branch" });
        }
      }

      await db.update(posMenuItems)
        .set({ isArchived: true, isActive: false })
        .where(inArray(posMenuItems.id, input.ids));
      return { success: true };
    }),

  updateAvailability: staffAdminProcedure
    .input(z.object({
      menuItemId: z.number().int(),
      branchId: z.number().int(),
      isAvailable: z.boolean(),
      priceOverride: z.string().optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const targetBranchId = ctx.staff.role === "super_admin" ? input.branchId : ctx.staff.currentBranchId;
      if (!targetBranchId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Branch context required" });
      }

      if (ctx.staff.role !== "super_admin") {
        const [exists] = await db.select().from(posBranchMenuItems)
          .where(and(eq(posBranchMenuItems.menuItemId, input.menuItemId), eq(posBranchMenuItems.branchId, targetBranchId)))
          .limit(1);
        if (!exists) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Menu item not assigned to your branch" });
        }
      }

      await db.insert(posBranchMenuItems).values({
        branchId: targetBranchId,
        menuItemId: input.menuItemId,
        isAvailable: input.isAvailable,
        priceOverride: input.priceOverride ?? undefined,
      }).onDuplicateKeyUpdate({
        set: { isAvailable: input.isAvailable, priceOverride: input.priceOverride ?? undefined },
      });
      return { success: true };
    }),

  linkOptionGroups: staffAdminProcedure
    .input(z.object({ menuItemId: z.number().int(), optionGroupIds: z.array(z.number().int()) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      if (ctx.staff.role !== "super_admin") {
        if (!ctx.staff.currentBranchId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Branch context required" });
        }
        const [isAssigned] = await db.select().from(posBranchMenuItems)
          .where(and(eq(posBranchMenuItems.menuItemId, input.menuItemId), eq(posBranchMenuItems.branchId, ctx.staff.currentBranchId)))
          .limit(1);
        if (!isAssigned) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Menu item not assigned to your branch" });
        }
      }

      await db.delete(posMenuItemOptionGroups).where(eq(posMenuItemOptionGroups.menuItemId, input.menuItemId));
      if (input.optionGroupIds.length > 0) {
        await db.insert(posMenuItemOptionGroups).values(
          input.optionGroupIds.map((groupId, i) => ({
            menuItemId: input.menuItemId,
            optionGroupId: groupId,
            sortOrder: i,
          }))
        );
      }
      return { success: true };
    }),

  // Bulk-link an SOP to many menu items at once
  // (SOP → POS direction: from the SOP detail page, "Push this SOP to these menu items")
  linkSopToMenuItems: staffAdminProcedure
    .input(z.object({
      sopId: z.number().int().nullable(),  // null to unlink
      menuItemIds: z.array(z.number().int()).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      if (ctx.staff.role !== "super_admin") {
        if (!ctx.staff.currentBranchId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Branch context required" });
        }
        if (input.menuItemIds.length > 0) {
          const assigned = await db.select().from(posBranchMenuItems)
            .where(and(inArray(posBranchMenuItems.menuItemId, input.menuItemIds), eq(posBranchMenuItems.branchId, ctx.staff.currentBranchId)));
          if (assigned.length !== input.menuItemIds.length) {
            throw new TRPCError({ code: "FORBIDDEN", message: "One or more menu items do not belong to your branch" });
          }
        }
      }

      let updated = 0;
      for (const id of input.menuItemIds) {
        await db.update(posMenuItems).set({ sopId: input.sopId as any })
          .where(eq(posMenuItems.id, id));
        updated++;
      }
      await logAudit({
        staff: ctx.staff,
        action: input.sopId ? "link_sop_to_menu" : "unlink_sop_from_menu",
        entity: "pos_menu_items",
        entityId: undefined,
        afterData: { sopId: input.sopId, menuItemIds: input.menuItemIds, count: updated } as any,
      });
      return { success: true, count: updated };
    }),

  // List menu items currently linked to a given SOP (for the SOP detail page)
  listBySop: staffProcedure
    .input(z.object({ sopId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      let rows = await db.select({
        id: posMenuItems.id,
        sku: posMenuItems.sku,
        name: posMenuItems.name,
        nameThai: posMenuItems.nameThai,
        categoryId: posMenuItems.categoryId,
        basePrice: posMenuItems.basePrice,
        imageUrl: posMenuItems.imageUrl,
        sopId: posMenuItems.sopId,
      }).from(posMenuItems).where(eq(posMenuItems.sopId, input.sopId));

      if (ctx.staff.role !== "super_admin") {
        if (!ctx.staff.currentBranchId) return [];
        const branchMenus = await db.select().from(posBranchMenuItems)
          .where(eq(posBranchMenuItems.branchId, ctx.staff.currentBranchId));
        const availableIds = new Set(branchMenus.filter(bm => bm.isAvailable !== false).map(bm => bm.menuItemId));
        rows = rows.filter((m) => availableIds.has(m.id));
      }

      return rows;
    }),

  setRecipe: staffAdminProcedure
    .input(z.object({
      menuItemId: z.number().int(),
      ingredients: z.array(z.object({
        inventoryItemId: z.number().int(),
        quantity: z.string(),
        unitOfMeasure: z.string(),
        notes: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      if (ctx.staff.role !== "super_admin") {
        if (!ctx.staff.currentBranchId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Branch context required" });
        }
        const [isAssigned] = await db.select().from(posBranchMenuItems)
          .where(and(eq(posBranchMenuItems.menuItemId, input.menuItemId), eq(posBranchMenuItems.branchId, ctx.staff.currentBranchId)))
          .limit(1);
        if (!isAssigned) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Menu item not assigned to your branch" });
        }
      }

      await db.delete(posRecipeIngredients).where(eq(posRecipeIngredients.menuItemId, input.menuItemId));
      if (input.ingredients.length > 0) {
        await db.insert(posRecipeIngredients).values(
          input.ingredients.map((ing) => ({ ...ing, menuItemId: input.menuItemId }))
        );
      }
      return { success: true };
    }),
});
