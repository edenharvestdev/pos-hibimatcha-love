import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import { posSuppliers, posPurchaseOrders, posInventoryItems } from "../../drizzle/schema";
import { logAudit } from "../lib/audit";
import { router, staffProcedure, staffAdminProcedure } from "../_core/trpc";

const SupplierInput = z.object({
  code: z.string().optional(),
  companyName: z.string().min(1),
  companyNameThai: z.string().optional(),
  contactPerson: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  lineId: z.string().optional(),
  address: z.string().optional(),
  province: z.string().optional(),
  country: z.string().optional(),
  paymentTerms: z.string().optional(),
  currency: z.string().optional(),
  bankAccountInfo: z.record(z.string(), z.unknown()).optional(),
  performanceRating: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const suppliersRouter = router({
  list: staffProcedure
    .input(z.object({ status: z.string().optional(), search: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      let rows = await db.select().from(posSuppliers);
      if (input?.status) rows = rows.filter((s) => s.status === input.status);
      if (input?.search) {
        const q = input.search.toLowerCase();
        rows = rows.filter((s) =>
          s.companyName.toLowerCase().includes(q) ||
          (s.companyNameThai ?? "").toLowerCase().includes(q) ||
          (s.contactPerson ?? "").toLowerCase().includes(q)
        );
      }
      return rows;
    }),

  getById: staffProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [supplier] = await db.select().from(posSuppliers)
        .where(eq(posSuppliers.id, input.id)).limit(1);
      if (!supplier) throw new TRPCError({ code: "NOT_FOUND" });

      const orders = await db.select().from(posPurchaseOrders)
        .where(eq(posPurchaseOrders.supplierId, input.id));

      const totalOrders = orders.length;
      const totalSpend = orders.reduce((sum, o) => sum + Number(o.totalAmount ?? 0), 0);

      return { ...supplier, stats: { totalOrders, totalSpend } };
    }),

  create: staffAdminProcedure
    .input(SupplierInput)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(posSuppliers).values(input as any);
      const id = (result as any).insertId as number;
      const [created] = await db.select().from(posSuppliers).where(eq(posSuppliers.id, id)).limit(1);
      await logAudit({ staff: ctx.staff, action: "create", entity: "pos_suppliers", entityId: id });
      return created;
    }),

  update: staffAdminProcedure
    .input(z.object({ id: z.number().int() }).merge(SupplierInput.partial()))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(posSuppliers).set(data as any).where(eq(posSuppliers.id, id));
      const [updated] = await db.select().from(posSuppliers).where(eq(posSuppliers.id, id)).limit(1);
      await logAudit({ staff: ctx.staff, action: "update", entity: "pos_suppliers", entityId: id });
      return updated;
    }),

  archive: staffAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(posSuppliers).set({ status: "inactive" }).where(eq(posSuppliers.id, input.id));
      await logAudit({ staff: ctx.staff, action: "archive", entity: "pos_suppliers", entityId: input.id });
      return { success: true };
    }),

  linkInventoryItems: staffAdminProcedure
    .input(z.object({ supplierId: z.number().int(), itemIds: z.array(z.number().int()) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      for (const itemId of input.itemIds) {
        await db.update(posInventoryItems)
          .set({ primarySupplierId: input.supplierId })
          .where(eq(posInventoryItems.id, itemId));
      }
      return { success: true };
    }),

  delete: staffAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(posSuppliers).where(eq(posSuppliers.id, input.id));
      await logAudit({ staff: ctx.staff, action: "delete", entity: "pos_suppliers", entityId: input.id });
      return { success: true };
    }),
});
