import { TRPCError } from "@trpc/server";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import { posCategories } from "../../drizzle/schema";
import { logAudit } from "../lib/audit";
import { router, staffProcedure, staffAdminProcedure } from "../_core/trpc";

const CategoryInput = z.object({
  name: z.string().min(1),
  nameThai: z.string().optional(),
  description: z.string().optional(),
  iconName: z.string().optional(),
  colorHex: z.string().optional(),
  sortOrder: z.number().int().optional(),
  branchId: z.number().int().optional().nullable(),
});

export const categoriesRouter = router({
  list: staffProcedure
    .input(z.object({
      branchId: z.number().int().optional().nullable(),
      includeArchived: z.boolean().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      let rows = await db.select().from(posCategories);

      if (!input?.includeArchived) {
        rows = rows.filter((c) => !c.isArchived);
      }

      const activeBranchId = ctx.staff.role === "super_admin" ? input?.branchId : ctx.staff.currentBranchId;

      if (activeBranchId != null) {
        rows = rows.filter((c) => c.branchId === null || c.branchId === activeBranchId);
      } else if (ctx.staff.role !== "super_admin") {
        rows = rows.filter((c) => c.branchId === null);
      }

      return rows.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }),

  getById: staffProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [row] = await db.select().from(posCategories).where(eq(posCategories.id, input.id)).limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });

      if (ctx.staff.role !== "super_admin" && row.branchId !== null && row.branchId !== ctx.staff.currentBranchId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Category does not belong to your branch" });
      }
      return row;
    }),

  create: staffAdminProcedure
    .input(CategoryInput)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const targetBranchId = ctx.staff.role === "super_admin" ? input.branchId : ctx.staff.currentBranchId;
      if (ctx.staff.role !== "super_admin" && !targetBranchId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Branch context required" });
      }

      const [result] = await db.insert(posCategories).values({
        ...input,
        branchId: targetBranchId ?? null,
      } as any);
      const id = (result as any).insertId as number;
      const [created] = await db.select().from(posCategories).where(eq(posCategories.id, id)).limit(1);
      await logAudit({ staff: ctx.staff, action: "create", entity: "pos_categories", entityId: id, afterData: created });
      return created;
    }),

  update: staffAdminProcedure
    .input(z.object({ id: z.number().int() }).merge(CategoryInput.partial()))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;

      const [existing] = await db.select().from(posCategories).where(eq(posCategories.id, id)).limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      if (ctx.staff.role !== "super_admin") {
        if (existing.branchId !== ctx.staff.currentBranchId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only modify your branch specific categories" });
        }
      }

      await db.update(posCategories).set(data as any).where(eq(posCategories.id, id));
      const [updated] = await db.select().from(posCategories).where(eq(posCategories.id, id)).limit(1);
      await logAudit({ staff: ctx.staff, action: "update", entity: "pos_categories", entityId: id });
      return updated;
    }),

  archive: staffAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [existing] = await db.select().from(posCategories).where(eq(posCategories.id, input.id)).limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      if (ctx.staff.role !== "super_admin") {
        if (existing.branchId !== ctx.staff.currentBranchId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only archive your branch specific categories" });
        }
      }

      await db.update(posCategories).set({ isArchived: true, isActive: false }).where(eq(posCategories.id, input.id));
      await logAudit({ staff: ctx.staff, action: "archive", entity: "pos_categories", entityId: input.id });
      return { success: true };
    }),

  restore: staffAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [existing] = await db.select().from(posCategories).where(eq(posCategories.id, input.id)).limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      if (ctx.staff.role !== "super_admin") {
        if (existing.branchId !== ctx.staff.currentBranchId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only restore your branch specific categories" });
        }
      }

      await db.update(posCategories).set({ isArchived: false, isActive: true }).where(eq(posCategories.id, input.id));
      return { success: true };
    }),

  reorder: staffAdminProcedure
    .input(z.object({ categoryIds: z.array(z.number().int()) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      if (ctx.staff.role !== "super_admin") {
        if (!ctx.staff.currentBranchId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Branch context required" });
        }
        if (input.categoryIds.length > 0) {
          const matched = await db.select().from(posCategories)
            .where(and(inArray(posCategories.id, input.categoryIds), eq(posCategories.branchId, ctx.staff.currentBranchId)));
          if (matched.length !== input.categoryIds.length) {
            throw new TRPCError({ code: "FORBIDDEN", message: "You can only reorder your branch specific categories" });
          }
        }
      }

      for (let i = 0; i < input.categoryIds.length; i++) {
        await db.update(posCategories).set({ sortOrder: i }).where(eq(posCategories.id, input.categoryIds[i]));
      }
      return { success: true };
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
        const matched = await db.select().from(posCategories)
          .where(and(inArray(posCategories.id, input.ids), eq(posCategories.branchId, ctx.staff.currentBranchId)));
        if (matched.length !== input.ids.length) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only archive your branch specific categories" });
        }
      }

      await db.update(posCategories)
        .set({ isArchived: true, isActive: false })
        .where(inArray(posCategories.id, input.ids));
      return { success: true };
    }),

  delete: staffAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [existing] = await db.select().from(posCategories).where(eq(posCategories.id, input.id)).limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      if (ctx.staff.role !== "super_admin") {
        if (existing.branchId !== ctx.staff.currentBranchId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only delete your branch specific categories" });
        }
      }

      await db.delete(posCategories).where(eq(posCategories.id, input.id));
      await logAudit({ staff: ctx.staff, action: "delete", entity: "pos_categories", entityId: input.id });
      return { success: true };
    }),
});
