import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import { posPaymentMethods } from "../../drizzle/schema";
import { logAudit } from "../lib/audit";
import { router, staffProcedure, staffAdminProcedure } from "../_core/trpc";

export const paymentsRouter = router({
  listMethods: staffProcedure
    .input(z.object({ activeOnly: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      let rows = await db.select().from(posPaymentMethods);
      if (input?.activeOnly) rows = rows.filter((m) => m.isActive);
      return rows.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }),

  getMethodById: staffProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [row] = await db.select().from(posPaymentMethods).where(eq(posPaymentMethods.id, input.id)).limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  createMethod: staffAdminProcedure
    .input(z.object({
      code: z.string().min(1),
      name: z.string().min(1),
      nameThai: z.string().optional(),
      type: z.enum(["cash", "qr", "card", "voucher", "transfer", "other"]),
      iconName: z.string().optional(),
      feePercentage: z.string().optional(),
      feeFixed: z.string().optional(),
      requiresReference: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(posPaymentMethods).values(input as any);
      const id = (result as any).insertId as number;
      const [created] = await db.select().from(posPaymentMethods).where(eq(posPaymentMethods.id, id)).limit(1);
      await logAudit({ staff: ctx.staff, action: "create", entity: "pos_payment_methods", entityId: id });
      return created;
    }),

  updateMethod: staffAdminProcedure
    .input(z.object({
      id: z.number().int(),
      name: z.string().optional(),
      nameThai: z.string().optional(),
      iconName: z.string().optional(),
      feePercentage: z.string().optional(),
      feeFixed: z.string().optional(),
      requiresReference: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(posPaymentMethods).set(data as any).where(eq(posPaymentMethods.id, id));
      const [updated] = await db.select().from(posPaymentMethods).where(eq(posPaymentMethods.id, id)).limit(1);
      return updated;
    }),

  archiveMethod: staffAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(posPaymentMethods).set({ isActive: false }).where(eq(posPaymentMethods.id, input.id));
      return { success: true };
    }),

  toggleMethod: staffAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [current] = await db.select().from(posPaymentMethods).where(eq(posPaymentMethods.id, input.id)).limit(1);
      if (!current) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(posPaymentMethods).set({ isActive: !current.isActive }).where(eq(posPaymentMethods.id, input.id));
      const [updated] = await db.select().from(posPaymentMethods).where(eq(posPaymentMethods.id, input.id)).limit(1);
      return updated;
    }),

  deleteMethod: staffAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(posPaymentMethods).where(eq(posPaymentMethods.id, input.id));
      await logAudit({ staff: ctx.staff, action: "delete", entity: "pos_payment_methods", entityId: input.id });
      return { success: true };
    }),
});
