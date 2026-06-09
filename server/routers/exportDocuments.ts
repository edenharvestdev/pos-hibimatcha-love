/**
 * Export Documents Router
 * Handles creation and retrieval of export document drafts
 * (ใบเสร็จรับเงิน/ใบกำกับภาษี and ใบขนส่งสินค้า)
 */
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import { posExportDocuments } from "../../drizzle/schema";
import { router, staffAdminProcedure } from "../_core/trpc";

const lineItemSchema = z.object({
  no: z.number(),
  productCode: z.string().optional(),
  description: z.string(),
  quantity: z.number(),
  unit: z.string(),
  unitPrice: z.number(),
  totalPrice: z.number(),
});

const posReceiptLineItemSchema = z.object({
  no: z.number(),
  productCode: z.string().optional(),
  description: z.string(),
  quantity: z.number(),
  unit: z.string(),
  unitPrice: z.number(),
  totalPrice: z.number(),
  options: z.array(z.object({ name: z.string(), priceAdjustment: z.number() })).optional(),
});

const documentDataSchema = z.object({
  // Document type
  docType: z.enum(["receipt_tax_invoice", "shipping_note", "pos_receipt"]),

  // Company info (seller)
  companyName: z.string(),
  companyAddress: z.string(),
  companyTaxId: z.string(),
  companyBranch: z.string().optional(), // สำนักงานใหญ่ / สาขา

  // Customer info
  customerCode: z.string().optional(),
  customerName: z.string(),
  customerAddress: z.string(),
  customerTaxId: z.string().optional(),
  customerBranch: z.string().optional(),

  // Document meta
  documentNumber: z.string(),
  soNumber: z.string().optional(), // Sales Order number
  documentDate: z.string(), // date string
  deliveryDate: z.string().optional(),
  salesperson: z.string().optional(),
  reference: z.string().optional(),
  shippingBy: z.string().optional(),
  salesRegion: z.string().optional(),

  // Line items
  items: z.array(lineItemSchema.or(posReceiptLineItemSchema)),

  // Totals
  subtotal: z.number(),
  discount: z.number().optional(),
  totalBeforeVat: z.number().optional(),
  vatRate: z.number().default(7),
  vatAmount: z.number(),
  grandTotal: z.number(),
  amountInWords: z.string().optional(), // จำนวนเงินเป็นตัวอักษร

  // Notes
  note: z.string().optional(),

  // POS Receipt specific fields
  branchName: z.string().optional(),
  pickupNumber: z.string().optional(),
  orderNumber: z.string().optional(),
  deviceSN: z.string().optional(),
  receiptNumber: z.string().optional(),
  paymentMethod: z.string().optional(),
  paidAmount: z.number().optional(),
  roundingAmount: z.number().optional(),
});

export type ExportDocumentData = z.infer<typeof documentDataSchema>;

export const exportDocumentsRouter = router({
  // List saved documents
  list: staffAdminProcedure
    .input(z.object({
      docType: z.enum(["receipt_tax_invoice", "shipping_note", "pos_receipt"]).optional(),
      branchId: z.number().int().optional(),
      limit: z.number().int().default(50),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      let conditions: any[] = [];
      if (input?.docType) conditions.push(eq(posExportDocuments.docType, input.docType));
      if (input?.branchId) conditions.push(eq(posExportDocuments.branchId, input.branchId));

      const rows = conditions.length > 0
        ? await db.select().from(posExportDocuments).where(and(...conditions)).orderBy(desc(posExportDocuments.createdAt)).limit(input?.limit ?? 50)
        : await db.select().from(posExportDocuments).orderBy(desc(posExportDocuments.createdAt)).limit(input?.limit ?? 50);

      return rows;
    }),

  // Get single document
  getById: staffAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      const [row] = await db.select().from(posExportDocuments).where(eq(posExportDocuments.id, input.id));
      return row ?? null;
    }),

  // Create/save document draft
  create: staffAdminProcedure
    .input(documentDataSchema.extend({
      branchId: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const { branchId, ...docData } = input;
      const [result] = await db.insert(posExportDocuments).values({
        docType: docData.docType,
        documentNumber: docData.documentNumber,
        branchId: branchId ?? ctx.staff.currentBranchId ?? null,
        customerName: docData.customerName,
        grandTotal: String(docData.grandTotal),
        data: docData,
        createdBy: ctx.staff.staffId,
        createdAt: new Date(),
      });

      return { id: (result as any).insertId, documentNumber: docData.documentNumber };
    }),

  // Update document
  update: staffAdminProcedure
    .input(z.object({
      id: z.number().int(),
      data: documentDataSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      await db.update(posExportDocuments)
        .set({
          docType: input.data.docType,
          documentNumber: input.data.documentNumber,
          customerName: input.data.customerName,
          grandTotal: String(input.data.grandTotal),
          data: input.data,
        })
        .where(eq(posExportDocuments.id, input.id));

      return { success: true };
    }),

  // Delete document
  delete: staffAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db.delete(posExportDocuments).where(eq(posExportDocuments.id, input.id));
      return { success: true };
    }),

  // Get next document number
  getNextNumber: staffAdminProcedure
    .input(z.object({ docType: z.enum(["receipt_tax_invoice", "shipping_note", "pos_receipt"]) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return "00000001";

      const [row] = await db.select({ cnt: sql<number>`COUNT(*)` })
        .from(posExportDocuments)
        .where(eq(posExportDocuments.docType, input.docType));

      const nextNum = (row?.cnt ?? 0) + 1;
      if (input.docType === "pos_receipt") {
        // POS receipt uses YYYY + 12-digit running number
        const year = new Date().getFullYear();
        return `${year}${String(nextNum).padStart(12, "0")}`;
      }
      return String(nextNum).padStart(8, "0");
    }),
});
