import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import { posDiscounts } from "../../drizzle/schema";
import { logAudit } from "../lib/audit";
import { router, staffProcedure, staffAdminProcedure } from "../_core/trpc";

const DiscountInput = z.object({
  code: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  discountType: z.enum(["percentage", "fixed", "bogo", "free_item"]),
  value: z.string(),
  minOrderAmount: z.string().optional(),
  maxDiscountAmount: z.string().optional(),
  applicableCategories: z.array(z.number()).optional(),
  applicableMenuItems: z.array(z.number()).optional(),
  maxUses: z.number().int().optional(),
  maxUsesPerCustomer: z.number().int().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  daysOfWeek: z.array(z.number()).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const discountsRouter = router({
  list: staffProcedure
    .input(z.object({ activeOnly: z.boolean().optional(), includeArchived: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      let rows = await db.select().from(posDiscounts);
      if (input?.activeOnly) rows = rows.filter((d) => d.isActive);
      return rows;
    }),

  getById: staffProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [row] = await db.select().from(posDiscounts).where(eq(posDiscounts.id, input.id)).limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  create: staffAdminProcedure
    .input(DiscountInput)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(posDiscounts).values(input as any);
      const id = (result as any).insertId as number;
      const [created] = await db.select().from(posDiscounts).where(eq(posDiscounts.id, id)).limit(1);
      await logAudit({ staff: ctx.staff, action: "create", entity: "pos_discounts", entityId: id });
      return created;
    }),

  update: staffAdminProcedure
    .input(z.object({ id: z.number().int() }).merge(DiscountInput.partial()))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(posDiscounts).set(data as any).where(eq(posDiscounts.id, id));
      const [updated] = await db.select().from(posDiscounts).where(eq(posDiscounts.id, id)).limit(1);
      await logAudit({ staff: ctx.staff, action: "update", entity: "pos_discounts", entityId: id });
      return updated;
    }),

  archive: staffAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(posDiscounts).set({ isActive: false }).where(eq(posDiscounts.id, input.id));
      await logAudit({ staff: ctx.staff, action: "archive", entity: "pos_discounts", entityId: input.id });
      return { success: true };
    }),

  toggleActive: staffAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [current] = await db.select().from(posDiscounts).where(eq(posDiscounts.id, input.id)).limit(1);
      if (!current) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(posDiscounts).set({ isActive: !current.isActive }).where(eq(posDiscounts.id, input.id));
      const [updated] = await db.select().from(posDiscounts).where(eq(posDiscounts.id, input.id)).limit(1);
      return updated;
    }),

  validateCode: staffProcedure
    .input(z.object({
      code: z.string(),
      orderTotal: z.number(),
      items: z.array(z.object({ menuItemId: z.number(), categoryId: z.number().optional() })),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { valid: false, discountAmount: 0, reason: "Database unavailable" };

      const [discount] = await db.select().from(posDiscounts)
        .where(eq(posDiscounts.code, input.code)).limit(1);

      if (!discount || !discount.isActive)
        return { valid: false, discountAmount: 0, reason: "Invalid or inactive discount code" };

      const now = new Date();
      if (discount.startDate && new Date(discount.startDate) > now)
        return { valid: false, discountAmount: 0, reason: "Discount not yet active" };
      if (discount.endDate && new Date(discount.endDate) < now)
        return { valid: false, discountAmount: 0, reason: "Discount has expired" };
      if (discount.maxUses && (discount.usedCount ?? 0) >= discount.maxUses)
        return { valid: false, discountAmount: 0, reason: "Discount usage limit reached" };
      if (discount.minOrderAmount && input.orderTotal < Number(discount.minOrderAmount))
        return { valid: false, discountAmount: 0, reason: `Minimum order amount is ${discount.minOrderAmount}` };

      let discountAmount = 0;
      if (discount.discountType === "percentage") {
        discountAmount = input.orderTotal * (Number(discount.value) / 100);
      } else if (discount.discountType === "fixed") {
        discountAmount = Number(discount.value);
      }

      if (discount.maxDiscountAmount) {
        discountAmount = Math.min(discountAmount, Number(discount.maxDiscountAmount));
      }

      return { valid: true, discountAmount: Math.round(discountAmount * 100) / 100, discount };
    }),

  delete: staffAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(posDiscounts).where(eq(posDiscounts.id, input.id));
      await logAudit({ staff: ctx.staff, action: "delete", entity: "pos_discounts", entityId: input.id });
      return { success: true };
    }),
});
