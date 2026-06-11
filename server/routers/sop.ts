import { TRPCError } from "@trpc/server";
import { eq, and, desc, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import {
  posSopCategories, posSops, posSopAcknowledgments,
  posSopVariantRequests, posSopTasks, staff, staffBranches,
  posRecipeIngredients, posInventoryItems, posBranchInventoryStock,
  posInventoryMovements, posMenuItems, posOrders,
} from "../../drizzle/schema";
import { logAudit } from "../lib/audit";
import { router, staffProcedure, staffAdminProcedure, superAdminProcedure } from "../_core/trpc";

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 100) + "-" + Date.now().toString(36);
}

export const sopRouter = router({
  // ── Categories ────────────────────────────────────────────────────────────
  listCategories: staffProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(posSopCategories).where(eq(posSopCategories.isActive, true));
  }),

  createCategory: staffAdminProcedure
    .input(z.object({
      name: z.string().min(1),
      nameThai: z.string().optional(),
      parentId: z.number().int().optional().nullable(),
      sortOrder: z.number().int().optional(),
      iconName: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(posSopCategories).values(input as any);
      const id = (result as any).insertId as number;
      const [created] = await db.select().from(posSopCategories).where(eq(posSopCategories.id, id)).limit(1);
      return created;
    }),

  updateCategory: staffAdminProcedure
    .input(z.object({ id: z.number().int() }).passthrough())
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(posSopCategories).set(data as any).where(eq(posSopCategories.id, id));
      const [updated] = await db.select().from(posSopCategories).where(eq(posSopCategories.id, id)).limit(1);
      return updated;
    }),

  // ── SOPs ──────────────────────────────────────────────────────────────────
  list: staffProcedure
    .input(z.object({
      categoryId: z.number().int().optional(),
      status: z.string().optional(),
      branchId: z.number().int().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      let rows = await db.select().from(posSops).orderBy(desc(posSops.updatedAt));

      if (input?.categoryId) rows = rows.filter((s) => s.categoryId === input.categoryId);
      if (input?.status) rows = rows.filter((s) => s.status === input.status);
      else rows = rows.filter((s) => s.status !== "archived");

      if (input?.branchId) {
        // Find overrides for this branch
        const branchOverrides = rows.filter((s) => s.branchId === input.branchId && s.masterSopId !== null);
        const overriddenMasterIds = new Set(branchOverrides.map((s) => s.masterSopId));

        rows = rows.filter((s) => {
          // Keep branch's own overrides
          if (s.branchId === input.branchId) return true;
          // Keep master SOPs only if they are not overridden by this branch
          if (s.branchId === null && !overriddenMasterIds.has(s.id)) return true;
          return false;
        });
      } else {
        // HQ / general view: only return master SOPs
        rows = rows.filter((s) => s.branchId === null);
      }

      if (input?.search) {
        const q = input.search.toLowerCase();
        rows = rows.filter((s) =>
          s.title.toLowerCase().includes(q) ||
          (s.titleThai ?? "").toLowerCase().includes(q)
        );
      }
      return rows;
    }),

  getById: staffProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [sop] = await db.select().from(posSops).where(eq(posSops.id, input.id)).limit(1);
      if (!sop) throw new TRPCError({ code: "NOT_FOUND" });
      return sop;
    }),

  create: staffAdminProcedure
    .input(z.object({
      title: z.string().min(1),
      titleThai: z.string().optional(),
      subtitle: z.string().optional(),
      coverImageUrl: z.string().optional().nullable(),
      videoUrl: z.string().optional().nullable(),
      categoryId: z.number().int().optional().nullable(),
      content: z.unknown().optional(),
      tags: z.array(z.string()).optional(),
      requiresAcknowledgment: z.boolean().optional(),
      requiredRoles: z.array(z.string()).optional(),
      acknowledgmentDeadlineDays: z.number().int().optional(),
      allowBranchVariants: z.boolean().optional(),
      branchId: z.number().int().optional().nullable(),
      masterSopId: z.number().int().optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(posSops).values({
        ...input,
        slug: generateSlug(input.title),
        status: "draft",
        authorStaffId: ctx.staff.staffId,
        version: 1,
        content: (input.content ?? null) as any,
      } as any);
      const id = (result as any).insertId as number;
      const [created] = await db.select().from(posSops).where(eq(posSops.id, id)).limit(1);
      await logAudit({ staff: ctx.staff, action: "create", entity: "pos_sops", entityId: id });
      return created;
    }),

  update: staffAdminProcedure
    .input(z.object({ id: z.number().int() }).passthrough())
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(posSops).set(data as any).where(eq(posSops.id, id));
      const [updated] = await db.select().from(posSops).where(eq(posSops.id, id)).limit(1);
      await logAudit({ staff: ctx.staff, action: "update", entity: "pos_sops", entityId: id });
      return updated;
    }),

  publish: staffAdminProcedure
    .input(z.object({ id: z.number().int(), changeReason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(posSops).set({
        status: "published",
        publishedAt: new Date(),
        changeReason: input.changeReason,
      }).where(eq(posSops.id, input.id));
      const [updated] = await db.select().from(posSops).where(eq(posSops.id, input.id)).limit(1);
      await logAudit({ staff: ctx.staff, action: "publish", entity: "pos_sops", entityId: input.id });
      return updated;
    }),

  archive: staffAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(posSops).set({ status: "archived" }).where(eq(posSops.id, input.id));
      await logAudit({ staff: ctx.staff, action: "archive", entity: "pos_sops", entityId: input.id });
      return { success: true };
    }),

  duplicate: staffAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [original] = await db.select().from(posSops).where(eq(posSops.id, input.id)).limit(1);
      if (!original) throw new TRPCError({ code: "NOT_FOUND" });
      const { id, slug, createdAt, updatedAt, publishedAt, ...rest } = original;
      const [result] = await db.insert(posSops).values({
        ...rest,
        title: `${rest.title} (Copy)`,
        slug: generateSlug(`${rest.title} copy`),
        status: "draft",
        authorStaffId: ctx.staff.staffId,
        version: 1,
      } as any);
      const newId = (result as any).insertId as number;
      const [created] = await db.select().from(posSops).where(eq(posSops.id, newId)).limit(1);
      return created;
    }),

  // ── Acknowledgments ───────────────────────────────────────────────────────
  acknowledge: staffProcedure
    .input(z.object({ sopId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(posSopAcknowledgments).values({
        sopId: input.sopId,
        staffId: ctx.staff.staffId,
        branchId: ctx.staff.currentBranchId ?? undefined,
        acknowledgedAt: new Date(),
      }).onDuplicateKeyUpdate({ set: { acknowledgedAt: new Date() } });
      return { success: true };
    }),

  listAcknowledgments: staffAdminProcedure
    .input(z.object({ sopId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const acks = await db.select({
        id: posSopAcknowledgments.id,
        sopId: posSopAcknowledgments.sopId,
        staffId: posSopAcknowledgments.staffId,
        branchId: posSopAcknowledgments.branchId,
        acknowledgedAt: posSopAcknowledgments.acknowledgedAt,
        firstName: staff.firstName,
        lastName: staff.lastName,
        employeeCode: staff.employeeCode,
      }).from(posSopAcknowledgments)
        .leftJoin(staff, eq(posSopAcknowledgments.staffId, staff.id))
        .where(eq(posSopAcknowledgments.sopId, input.sopId));
      return acks;
    }),

  getComplianceReport: staffAdminProcedure
    .input(z.object({ branchId: z.number().int().optional(), sopId: z.number().int().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { totalSops: 0, totalStaff: 0, acknowledged: 0, pending: 0, rate: 0, items: [] };

      let sops = await db.select().from(posSops)
        .where(and(eq(posSops.status, "published"), eq(posSops.requiresAcknowledgment, true)));
      
      if (input?.branchId) {
        // Find overrides for this branch
        const branchOverrides = sops.filter((s) => s.branchId === input.branchId && s.masterSopId !== null);
        const overriddenMasterIds = new Set(branchOverrides.map((s) => s.masterSopId));

        sops = sops.filter((s) => {
          // Keep branch's own overrides
          if (s.branchId === input.branchId) return true;
          // Keep master SOPs only if they are not overridden by this branch
          if (s.branchId === null && !overriddenMasterIds.has(s.id)) return true;
          return false;
        });
      } else {
        // HQ / general view: only return master SOPs
        sops = sops.filter((s) => s.branchId === null);
      }

      let relevantStaff = await db.select({ id: staff.id, firstName: staff.firstName, lastName: staff.lastName, employeeCode: staff.employeeCode })
        .from(staff).where(eq(staff.status, "active"));
      // Filter staff by branch if branchId provided
      if (input?.branchId) {
        const branchStaffIds = await db.select({ staffId: staffBranches.staffId })
          .from(staffBranches).where(eq(staffBranches.branchId, input.branchId));
        const ids = new Set(branchStaffIds.map((b) => b.staffId));
        relevantStaff = relevantStaff.filter((s) => ids.has(s.id));
      }

      const acks = await db.select().from(posSopAcknowledgments);
      const sopIds = new Set(sops.map((s) => s.id));
      const staffIds = new Set(relevantStaff.map((s) => s.id));
      const filteredAcks = acks.filter((a) => sopIds.has(a.sopId) && staffIds.has(a.staffId));

      const totalRequired = sops.length * relevantStaff.length;
      const acknowledged = filteredAcks.length;

      return {
        totalSops: sops.length,
        totalStaff: relevantStaff.length,
        acknowledged,
        pending: Math.max(0, totalRequired - acknowledged),
        rate: totalRequired > 0 ? Math.round((acknowledged / totalRequired) * 100) : 0,
        items: sops.map((sop) => ({
          sop,
          acknowledgedCount: filteredAcks.filter((a) => a.sopId === sop.id).length,
          totalRequired: relevantStaff.length,
        })),
        staffList: relevantStaff,
        acknowledgments: filteredAcks,
      };
    }),

  // ── Variants ──────────────────────────────────────────────────────────────
  listVariants: staffProcedure
    .input(z.object({ branchId: z.number().int().optional(), status: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      let rows = await db.select().from(posSopVariantRequests);
      if (input?.status) rows = rows.filter((v) => v.status === input.status);
      if (input?.branchId) rows = rows.filter((v) => v.branchId === input.branchId);
      else if (ctx.staff.role !== "super_admin") {
        rows = rows.filter((v) => v.branchId === ctx.staff.currentBranchId);
      }
      return rows;
    }),

  requestVariant: staffAdminProcedure
    .input(z.object({
      masterSopId: z.number().int(),
      proposedContent: z.unknown(),
      reason: z.string(),
      changesSummary: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (!ctx.staff.currentBranchId)
        throw new TRPCError({ code: "BAD_REQUEST", message: "No branch selected" });
      const [result] = await db.insert(posSopVariantRequests).values({
        masterSopId: input.masterSopId,
        branchId: ctx.staff.currentBranchId,
        proposedContent: input.proposedContent as any,
        changeReason: input.reason,
        changesSummary: input.changesSummary,
        requestedByStaffId: ctx.staff.staffId,
        status: "pending",
      });
      const id = (result as any).insertId as number;
      const [created] = await db.select().from(posSopVariantRequests).where(eq(posSopVariantRequests.id, id)).limit(1);
      return created;
    }),

  approveVariant: superAdminProcedure
    .input(z.object({ variantId: z.number().int(), notes: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [req] = await db.select().from(posSopVariantRequests)
        .where(eq(posSopVariantRequests.id, input.variantId)).limit(1);
      if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "Variant request not found" });

      const [master] = await db.select().from(posSops)
        .where(eq(posSops.id, req.masterSopId)).limit(1);
      if (!master) throw new TRPCError({ code: "NOT_FOUND", message: "Master SOP not found" });

      // Check if a branch SOP override already exists
      const [existing] = await db.select().from(posSops)
        .where(and(
          eq(posSops.masterSopId, req.masterSopId),
          eq(posSops.branchId, req.branchId)
        )).limit(1);

      if (existing) {
        await db.update(posSops).set({
          content: req.proposedContent,
          title: master.title,
          titleThai: master.titleThai,
          subtitle: master.subtitle,
          subtitleThai: master.subtitleThai,
          coverImageUrl: master.coverImageUrl,
          videoUrl: master.videoUrl,
          categoryId: master.categoryId,
          tags: master.tags,
          requiresAcknowledgment: master.requiresAcknowledgment,
          requiredRoles: master.requiredRoles,
          acknowledgmentDeadlineDays: master.acknowledgmentDeadlineDays,
          status: "published",
          updatedAt: new Date(),
        }).where(eq(posSops.id, existing.id));
      } else {
        await db.insert(posSops).values({
          masterSopId: req.masterSopId,
          branchId: req.branchId,
          content: req.proposedContent,
          slug: `${master.slug || "sop"}-branch-${req.branchId}-${Date.now().toString(36)}`,
          title: master.title,
          titleThai: master.titleThai,
          subtitle: master.subtitle,
          subtitleThai: master.subtitleThai,
          coverImageUrl: master.coverImageUrl,
          videoUrl: master.videoUrl,
          categoryId: master.categoryId,
          tags: master.tags,
          requiresAcknowledgment: master.requiresAcknowledgment,
          requiredRoles: master.requiredRoles,
          acknowledgmentDeadlineDays: master.acknowledgmentDeadlineDays,
          status: "published",
          authorStaffId: req.requestedByStaffId,
          version: 1,
        } as any);
      }

      await db.update(posSopVariantRequests).set({
        status: "approved",
        reviewedByStaffId: ctx.staff.staffId,
        reviewedAt: new Date(),
        reviewNotes: input.notes,
      }).where(eq(posSopVariantRequests.id, input.variantId));

      const [updated] = await db.select().from(posSopVariantRequests).where(eq(posSopVariantRequests.id, input.variantId)).limit(1);
      await logAudit({ staff: ctx.staff, action: "approve_variant", entity: "pos_sop_variant_requests", entityId: input.variantId });
      return updated;
    }),

  rejectVariant: superAdminProcedure
    .input(z.object({ variantId: z.number().int(), reason: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(posSopVariantRequests).set({
        status: "rejected",
        reviewedByStaffId: ctx.staff.staffId,
        reviewedAt: new Date(),
        reviewNotes: input.reason,
      }).where(eq(posSopVariantRequests.id, input.variantId));
      const [updated] = await db.select().from(posSopVariantRequests).where(eq(posSopVariantRequests.id, input.variantId)).limit(1);
      return updated;
    }),

  withdrawVariant: staffAdminProcedure
    .input(z.object({ variantId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(posSopVariantRequests).set({ status: "withdrawn" })
        .where(eq(posSopVariantRequests.id, input.variantId));
      return { success: true };
    }),

  // ── Tasks ─────────────────────────────────────────────────────────────────
  listMyTasks: staffProcedure
    .input(z.object({ staffId: z.number().int().optional(), status: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const targetId = input?.staffId ?? ctx.staff.staffId;
      let rows = await db.select().from(posSopTasks).where(eq(posSopTasks.staffId, targetId));
      if (input?.status) rows = rows.filter((t) => t.status === input.status);
      return rows;
    }),

  assignTask: staffAdminProcedure
    .input(z.object({
      sopId: z.number().int(),
      staffIds: z.array(z.number().int()),
      dueDate: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      for (const staffId of input.staffIds) {
        await db.insert(posSopTasks).values({
          sopId: input.sopId,
          staffId,
          dueDate: input.dueDate as any,
          status: "pending",
        });
      }
      return { success: true };
    }),

  startTask: staffProcedure
    .input(z.object({ taskId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(posSopTasks).set({ status: "in_progress", startedAt: new Date() })
        .where(and(eq(posSopTasks.id, input.taskId), eq(posSopTasks.staffId, ctx.staff.staffId)));
      const [updated] = await db.select().from(posSopTasks).where(eq(posSopTasks.id, input.taskId)).limit(1);
      return updated;
    }),

  completeTask: staffProcedure
    .input(z.object({ taskId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(posSopTasks).set({ status: "completed", completedAt: new Date() })
        .where(and(eq(posSopTasks.id, input.taskId), eq(posSopTasks.staffId, ctx.staff.staffId)));
      const [updated] = await db.select().from(posSopTasks).where(eq(posSopTasks.id, input.taskId)).limit(1);
      return updated;
    }),

  // ── Material Usage & Cost Calculation ──────────────────────────────────────
  getRecipeCosts: staffProcedure
    .input(z.object({
      branchId: z.number().int().optional(),
      menuItemId: z.number().int().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      let recipes = await db.select({
        id: posRecipeIngredients.id,
        menuItemId: posRecipeIngredients.menuItemId,
        inventoryItemId: posRecipeIngredients.inventoryItemId,
        quantity: posRecipeIngredients.quantity,
        unitOfMeasure: posRecipeIngredients.unitOfMeasure,
        notes: posRecipeIngredients.notes,
        itemName: posInventoryItems.name,
        itemNameThai: posInventoryItems.nameThai,
        itemSku: posInventoryItems.sku,
        costPerUnit: posInventoryItems.costPerUnit,
        itemUnit: posInventoryItems.unitOfMeasure,
      }).from(posRecipeIngredients)
        .leftJoin(posInventoryItems, eq(posRecipeIngredients.inventoryItemId, posInventoryItems.id));
      if (input?.menuItemId) recipes = recipes.filter((r) => r.menuItemId === input.menuItemId);
      const menuItemIds = Array.from(new Set(recipes.map((r) => r.menuItemId)));
      if (menuItemIds.length === 0) return [];
      const menuItems = await db.select({
        id: posMenuItems.id, name: posMenuItems.name, nameThai: posMenuItems.nameThai, basePrice: posMenuItems.basePrice,
      }).from(posMenuItems).where(inArray(posMenuItems.id, menuItemIds));
      let stockMap = new Map<number, number>();
      if (input?.branchId) {
        const stocks = await db.select().from(posBranchInventoryStock)
          .where(eq(posBranchInventoryStock.branchId, input.branchId));
        for (const s of stocks) stockMap.set(s.inventoryItemId, Number(s.currentStock ?? 0));
      }
      return menuItems.map((mi) => {
        const itemRecipes = recipes.filter((r) => r.menuItemId === mi.id);
        let totalCostPerCup = 0;
        const ingredients = itemRecipes.map((r) => {
          const qty = Number(r.quantity ?? 0);
          const cost = Number(r.costPerUnit ?? 0);
          const ingredientCost = qty * cost;
          totalCostPerCup += ingredientCost;
          const currentStock = stockMap.get(r.inventoryItemId) ?? null;
          const cupsAvailable = qty > 0 && currentStock !== null ? Math.floor(currentStock / qty) : null;
          return {
            id: r.id, inventoryItemId: r.inventoryItemId,
            name: r.itemName ?? 'Unknown', nameThai: r.itemNameThai, sku: r.itemSku,
            quantityPerCup: qty, unitOfMeasure: r.unitOfMeasure ?? r.itemUnit ?? 'g',
            costPerUnit: cost, costPerCup: ingredientCost,
            currentStock, cupsAvailable, notes: r.notes,
          };
        });
        return {
          menuItemId: mi.id, menuItemName: mi.name, menuItemNameThai: mi.nameThai,
          basePrice: Number(mi.basePrice ?? 0), totalCostPerCup,
          profitPerCup: Number(mi.basePrice ?? 0) - totalCostPerCup,
          marginPercent: Number(mi.basePrice ?? 0) > 0
            ? Math.round(((Number(mi.basePrice ?? 0) - totalCostPerCup) / Number(mi.basePrice ?? 0)) * 100) : 0,
          ingredients,
        };
      });
    }),

  getMaterialUsageHistory: staffProcedure
    .input(z.object({
      branchId: z.number().int(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      limit: z.number().int().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      let movements = await db.select().from(posInventoryMovements)
        .where(and(eq(posInventoryMovements.branchId, input.branchId), eq(posInventoryMovements.movementType, "sold")));
      if (input.dateFrom) movements = movements.filter((m) => m.createdAt && m.createdAt >= new Date(input.dateFrom!));
      if (input.dateTo) movements = movements.filter((m) => m.createdAt && m.createdAt <= new Date(input.dateTo!));
      movements.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
      if (input.limit) movements = movements.slice(0, input.limit);
      const itemIds = Array.from(new Set(movements.map((m) => m.inventoryItemId)));
      if (itemIds.length === 0) return [];
      const items = await db.select({ id: posInventoryItems.id, name: posInventoryItems.name, nameThai: posInventoryItems.nameThai, unitOfMeasure: posInventoryItems.unitOfMeasure })
        .from(posInventoryItems).where(inArray(posInventoryItems.id, itemIds));
      const itemMap = new Map(items.map((i) => [i.id, i]));
      const orderIds = Array.from(new Set(movements.filter((m) => m.referenceId).map((m) => m.referenceId!)));
      let orderMap = new Map<number, any>();
      if (orderIds.length > 0) {
        const orders = await db.select({ id: posOrders.id, orderNumber: posOrders.orderNumber, createdAt: posOrders.createdAt })
          .from(posOrders).where(inArray(posOrders.id, orderIds));
        orderMap = new Map(orders.map((o) => [o.id, o]));
      }
      return movements.map((m) => {
        const item = itemMap.get(m.inventoryItemId);
        const order = m.referenceId ? orderMap.get(m.referenceId) : null;
        return {
          id: m.id, inventoryItemId: m.inventoryItemId,
          itemName: item?.name ?? 'Unknown', itemNameThai: item?.nameThai,
          itemUnit: item?.unitOfMeasure ?? m.unitOfMeasure,
          quantity: Math.abs(Number(m.quantity ?? 0)),
          costPerUnit: Number(m.costPerUnit ?? 0), totalCost: Number(m.totalCost ?? 0),
          orderNumber: order?.orderNumber, orderId: m.referenceId, createdAt: m.createdAt, notes: m.notes,
        };
      });
    }),

  getMaterialUsageSummary: staffProcedure
    .input(z.object({
      branchId: z.number().int(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], totalCost: 0, totalOrders: 0 };
      let movements = await db.select().from(posInventoryMovements)
        .where(and(eq(posInventoryMovements.branchId, input.branchId), eq(posInventoryMovements.movementType, "sold")));
      if (input.dateFrom) movements = movements.filter((m) => m.createdAt && m.createdAt >= new Date(input.dateFrom!));
      if (input.dateTo) movements = movements.filter((m) => m.createdAt && m.createdAt <= new Date(input.dateTo!));
      const agg = new Map<number, { totalQty: number; totalCost: number; count: number }>();
      const orderIds = new Set<number>();
      for (const m of movements) {
        const existing = agg.get(m.inventoryItemId) ?? { totalQty: 0, totalCost: 0, count: 0 };
        existing.totalQty += Math.abs(Number(m.quantity ?? 0));
        existing.totalCost += Math.abs(Number(m.totalCost ?? 0));
        existing.count += 1;
        agg.set(m.inventoryItemId, existing);
        if (m.referenceId) orderIds.add(m.referenceId);
      }
      const itemIds = Array.from(agg.keys());
      if (itemIds.length === 0) return { items: [], totalCost: 0, totalOrders: orderIds.size };
      const items = await db.select({ id: posInventoryItems.id, name: posInventoryItems.name, nameThai: posInventoryItems.nameThai, unitOfMeasure: posInventoryItems.unitOfMeasure, costPerUnit: posInventoryItems.costPerUnit })
        .from(posInventoryItems).where(inArray(posInventoryItems.id, itemIds));
      const itemMap = new Map(items.map((i) => [i.id, i]));
      const stocks = await db.select().from(posBranchInventoryStock)
        .where(eq(posBranchInventoryStock.branchId, input.branchId));
      const stockMap = new Map(stocks.map((s) => [s.inventoryItemId, Number(s.currentStock ?? 0)]));
      let totalCost = 0;
      const result = Array.from(agg.entries()).map(([itemId, data]) => {
        const item = itemMap.get(itemId);
        totalCost += data.totalCost;
        return {
          inventoryItemId: itemId, name: item?.name ?? 'Unknown', nameThai: item?.nameThai,
          unitOfMeasure: item?.unitOfMeasure ?? 'g', totalUsed: data.totalQty, totalCost: data.totalCost,
          usageCount: data.count, currentStock: stockMap.get(itemId) ?? 0, costPerUnit: Number(item?.costPerUnit ?? 0),
        };
      }).sort((a, b) => b.totalCost - a.totalCost);
      return { items: result, totalCost, totalOrders: orderIds.size };
    }),
});
