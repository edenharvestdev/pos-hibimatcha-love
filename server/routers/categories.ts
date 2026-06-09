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
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      let rows = await db.select().from(posCategories);

      if (!input?.includeArchived) {
        rows = rows.filter((c) => !c.isArchived);
      }
      // Global categories (branchId = null) + branch-specific if branchId provided
      if (input?.branchId != null) {
        rows = rows.filter((c) => c.branchId === null || c.branchId === input.branchId);
      }

      return rows.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }),

  getById: staffProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [row] = await db.select().from(posCategories).where(eq(posCategories.id, input.id)).limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  create: staffAdminProcedure
    .input(CategoryInput)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(posCategories).values(input as any);
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
      await db.update(posCategories).set({ isArchived: true, isActive: false }).where(eq(posCategories.id, input.id));
      await logAudit({ staff: ctx.staff, action: "archive", entity: "pos_categories", entityId: input.id });
      return { success: true };
    }),

  restore: staffAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(posCategories).set({ isArchived: false, isActive: true }).where(eq(posCategories.id, input.id));
      return { success: true };
    }),

  reorder: staffAdminProcedure
    .input(z.object({ categoryIds: z.array(z.number().int()) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
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
      await db.delete(posCategories).where(eq(posCategories.id, input.id));
      await logAudit({ staff: ctx.staff, action: "delete", entity: "pos_categories", entityId: input.id });
      return { success: true };
    }),
});
