import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import { posBranchPaymentSettings, posPrinterConfigs, branches } from "../../drizzle/schema";
import { logAudit } from "../lib/audit";
import { router, staffAdminProcedure } from "../_core/trpc";

export const branchSettingsRouter = router({
  // ─── Payment Settings ─────────────────────────────────────────────────────────
  getPaymentSettings: staffAdminProcedure
    .input(z.object({ branchId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [settings] = await db.select().from(posBranchPaymentSettings)
        .where(eq(posBranchPaymentSettings.branchId, input.branchId)).limit(1);

      return settings || null;
    }),

  upsertPaymentSettings: staffAdminProcedure
    .input(z.object({
      branchId: z.number().int(),
      promptpayId: z.string().optional(),
      promptpayName: z.string().optional(),
      promptpayType: z.enum(["phone", "tax_id", "ewallet"]).optional(),
      bankAccountName: z.string().optional(),
      bankAccountNumber: z.string().optional(),
      bankName: z.string().optional(),
      receiptHeader: z.string().optional(),
      receiptFooter: z.string().optional(),
      taxId: z.string().optional(),
      showQrOnSlip: z.boolean().optional(),
      autoPrintOrderSlip: z.boolean().optional(),
      autoPrintKitchenTicket: z.boolean().optional(),
      autoPrintLabels: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { branchId, ...data } = input;

      // Check if settings exist
      const [existing] = await db.select().from(posBranchPaymentSettings)
        .where(eq(posBranchPaymentSettings.branchId, branchId)).limit(1);

      if (existing) {
        await db.update(posBranchPaymentSettings)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(posBranchPaymentSettings.branchId, branchId));
      } else {
        await db.insert(posBranchPaymentSettings).values({
          branchId,
          ...data,
        });
      }

      await logAudit({
        staff: ctx.staff,
        action: "update_payment_settings",
        entity: "branch_payment_settings",
        entityId: branchId,
      });

      const [updated] = await db.select().from(posBranchPaymentSettings)
        .where(eq(posBranchPaymentSettings.branchId, branchId)).limit(1);
      return updated;
    }),

  // ─── Printer Configs ──────────────────────────────────────────────────────────
  listPrinters: staffAdminProcedure
    .input(z.object({ branchId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      return db.select().from(posPrinterConfigs)
        .where(eq(posPrinterConfigs.branchId, input.branchId));
    }),

  upsertPrinter: staffAdminProcedure
    .input(z.object({
      id: z.number().int().optional(), // if provided, update
      branchId: z.number().int(),
      printerName: z.string().min(1),
      printerType: z.enum(["order_slip", "label", "kitchen", "receipt"]),
      connection: z.enum(["usb", "bluetooth", "network", "browser"]).optional(),
      ipAddress: z.string().optional(),
      port: z.number().int().optional(),
      paperWidth: z.number().int().optional(),
      charactersPerLine: z.number().int().optional(),
      isDefault: z.boolean().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { id, ...data } = input;

      if (id) {
        await db.update(posPrinterConfigs).set(data).where(eq(posPrinterConfigs.id, id));
        await logAudit({ staff: ctx.staff, action: "update_printer", entity: "printer_config", entityId: id });
        const [updated] = await db.select().from(posPrinterConfigs).where(eq(posPrinterConfigs.id, id)).limit(1);
        return updated;
      } else {
        const [result] = await db.insert(posPrinterConfigs).values(data);
        const newId = (result as any).insertId as number;
        await logAudit({ staff: ctx.staff, action: "create_printer", entity: "printer_config", entityId: newId });
        const [created] = await db.select().from(posPrinterConfigs).where(eq(posPrinterConfigs.id, newId)).limit(1);
        return created;
      }
    }),

  deletePrinter: staffAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.delete(posPrinterConfigs).where(eq(posPrinterConfigs.id, input.id));
      await logAudit({ staff: ctx.staff, action: "delete_printer", entity: "printer_config", entityId: input.id });
      return { success: true };
    }),
});
