// ============================================
// Supplier Payment Schedule Router — ผ่อนจ่าย Supplier
// ============================================
import { TRPCError } from "@trpc/server";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import {
  supplierPaymentSchedules, supplierPaymentInstallments, posSuppliers, posPurchaseOrders,
} from "../../drizzle/schema";
import { logAudit } from "../lib/audit";
import { router, staffAdminProcedure, staffProcedure } from "../_core/trpc";

export const supplierPaymentsRouter = router({
  // ── List all schedules ─────────────────────────────────────────────────────
  list: staffProcedure
    .input(z.object({ supplierId: z.number().int().optional(), status: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      let rows = await db.select({
        id: supplierPaymentSchedules.id,
        supplierId: supplierPaymentSchedules.supplierId,
        purchaseOrderId: supplierPaymentSchedules.purchaseOrderId,
        totalAmount: supplierPaymentSchedules.totalAmount,
        paidAmount: supplierPaymentSchedules.paidAmount,
        remainingAmount: supplierPaymentSchedules.remainingAmount,
        installments: supplierPaymentSchedules.installments,
        status: supplierPaymentSchedules.status,
        notes: supplierPaymentSchedules.notes,
        createdAt: supplierPaymentSchedules.createdAt,
        supplierName: posSuppliers.companyName,
      }).from(supplierPaymentSchedules)
        .leftJoin(posSuppliers, eq(supplierPaymentSchedules.supplierId, posSuppliers.id))
        .orderBy(desc(supplierPaymentSchedules.createdAt));

      if (input?.supplierId) rows = rows.filter((r) => r.supplierId === input.supplierId);
      if (input?.status) rows = rows.filter((r) => r.status === input.status);
      return rows;
    }),

  // ── Get schedule with installments ────────────────────────────────────────
  getById: staffProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [schedule] = await db.select().from(supplierPaymentSchedules)
        .where(eq(supplierPaymentSchedules.id, input.id)).limit(1);
      if (!schedule) throw new TRPCError({ code: "NOT_FOUND" });
      const installmentsList = await db.select().from(supplierPaymentInstallments)
        .where(eq(supplierPaymentInstallments.scheduleId, input.id))
        .orderBy(supplierPaymentInstallments.installmentNumber);
      return { ...schedule, installmentsList };
    }),

  // ── Create payment schedule ────────────────────────────────────────────────
  create: staffAdminProcedure
    .input(z.object({
      supplierId: z.number().int(),
      purchaseOrderId: z.number().int().optional(),
      totalAmount: z.number().positive(),
      installments: z.number().int().min(1).max(36),
      startDate: z.string(),   // first due date
      intervalDays: z.number().int().default(30),  // days between installments
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const installmentAmount = Math.round((input.totalAmount / input.installments) * 100) / 100;

      const [result] = await db.insert(supplierPaymentSchedules).values({
        supplierId: input.supplierId,
        purchaseOrderId: input.purchaseOrderId,
        totalAmount: String(input.totalAmount),
        paidAmount: "0",
        remainingAmount: String(input.totalAmount),
        installments: input.installments,
        notes: input.notes,
        status: "active",
        createdByStaffId: ctx.staff.staffId,
      });
      const scheduleId = (result as any).insertId as number;

      // Create installment records
      const startDate = new Date(input.startDate);
      for (let i = 0; i < input.installments; i++) {
        const dueDate = new Date(startDate);
        dueDate.setDate(dueDate.getDate() + i * input.intervalDays);
        // Last installment: adjust for rounding
        const amount = i === input.installments - 1
          ? input.totalAmount - installmentAmount * (input.installments - 1)
          : installmentAmount;

        await db.insert(supplierPaymentInstallments).values({
          scheduleId,
          installmentNumber: i + 1,
          dueDate: dueDate.toISOString().slice(0, 10) as any,
          amount: String(Math.round(amount * 100) / 100),
          status: "pending",
        });
      }

      await logAudit({ staff: ctx.staff, action: "create", entity: "supplier_payment_schedules", entityId: scheduleId });
      return { scheduleId, installments: input.installments };
    }),

  // ── Record a payment on an installment ────────────────────────────────────
  payInstallment: staffAdminProcedure
    .input(z.object({
      scheduleId: z.number().int(),
      installmentId: z.number().int(),
      paymentRef: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [installment] = await db.select().from(supplierPaymentInstallments)
        .where(eq(supplierPaymentInstallments.id, input.installmentId)).limit(1);
      if (!installment) throw new TRPCError({ code: "NOT_FOUND" });

      await db.update(supplierPaymentInstallments).set({
        status: "paid",
        paidAt: new Date(),
        paymentRef: input.paymentRef,
        notes: input.notes,
      }).where(eq(supplierPaymentInstallments.id, input.installmentId));

      // Update schedule totals
      const [schedule] = await db.select().from(supplierPaymentSchedules)
        .where(eq(supplierPaymentSchedules.id, input.scheduleId)).limit(1);
      if (schedule) {
        const paidAmount = Number(schedule.paidAmount ?? 0) + Number(installment.amount);
        const remainingAmount = Number(schedule.totalAmount) - paidAmount;
        const status = remainingAmount <= 0 ? "completed" : "active";
        await db.update(supplierPaymentSchedules).set({
          paidAmount: String(paidAmount),
          remainingAmount: String(Math.max(0, remainingAmount)),
          status,
        }).where(eq(supplierPaymentSchedules.id, input.scheduleId));
      }

      await logAudit({ staff: ctx.staff, action: "pay_installment", entity: "supplier_payment_schedules", entityId: input.scheduleId });
      return { success: true };
    }),

  // ── Get upcoming payments ─────────────────────────────────────────────────
  getUpcoming: staffProcedure
    .input(z.object({ daysAhead: z.number().int().default(30) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + input.daysAhead);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const installments = await db.select({
        id: supplierPaymentInstallments.id,
        scheduleId: supplierPaymentInstallments.scheduleId,
        installmentNumber: supplierPaymentInstallments.installmentNumber,
        dueDate: supplierPaymentInstallments.dueDate,
        amount: supplierPaymentInstallments.amount,
        status: supplierPaymentInstallments.status,
        supplierName: posSuppliers.companyName,
      }).from(supplierPaymentInstallments)
        .leftJoin(supplierPaymentSchedules, eq(supplierPaymentInstallments.scheduleId, supplierPaymentSchedules.id))
        .leftJoin(posSuppliers, eq(supplierPaymentSchedules.supplierId, posSuppliers.id))
        .where(eq(supplierPaymentInstallments.status, "pending"));

      return installments.filter((i) => {
        const due = new Date(i.dueDate as any);
        return due >= today && due <= futureDate;
      }).sort((a, b) => new Date(a.dueDate as any).getTime() - new Date(b.dueDate as any).getTime());
    }),
});
