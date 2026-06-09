import { z } from "zod";
import { router, staffProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { posExpenseReceipts, posExpenseReceiptItems } from "../../drizzle/schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";

const expenseItemSchema = z.object({
  itemName: z.string().min(1),
  quantity: z.string(), // decimal as string
  unit: z.string().optional(),
  unitPrice: z.string(),
  totalPrice: z.string(),
  category: z.string().optional(),
  notes: z.string().optional(),
});

const createExpenseSchema = z.object({
  branchId: z.number(),
  vendor: z.string().min(1),
  vendorBranch: z.string().optional(),
  receiptNumber: z.string().optional(),
  receiptDate: z.string(), // YYYY-MM-DD
  category: z.enum(["ingredients", "packaging", "equipment", "cleaning", "utilities", "marketing", "delivery_fee", "other"]),
  paymentMethod: z.enum(["cash", "transfer", "credit_card", "corporate_card", "cod", "other"]),
  subtotal: z.string(),
  vatAmount: z.string().optional(),
  discountAmount: z.string().optional(),
  deliveryFee: z.string().optional(),
  grandTotal: z.string(),
  receiptImageUrl: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["draft", "confirmed", "voided"]).optional(),
  items: z.array(expenseItemSchema),
});

export const expenseReceiptsRouter = router({
  // List all expense receipts with optional filters
  list: staffProcedure
    .input(z.object({
      branchId: z.number().optional(),
      vendor: z.string().optional(),
      category: z.enum(["ingredients", "packaging", "equipment", "cleaning", "utilities", "marketing", "delivery_fee", "other"]).optional(),
      status: z.enum(["draft", "confirmed", "voided"]).optional(),
      startDate: z.string().optional(), // YYYY-MM-DD
      endDate: z.string().optional(),   // YYYY-MM-DD
      limit: z.number().min(1).max(100).optional(),
      offset: z.number().min(0).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { receipts: [], total: 0 };

      const filters: any[] = [];
      if (input?.branchId) filters.push(eq(posExpenseReceipts.branchId, input.branchId));
      if (input?.vendor) filters.push(eq(posExpenseReceipts.vendor, input.vendor));
      if (input?.category) filters.push(eq(posExpenseReceipts.category, input.category));
      if (input?.status) filters.push(eq(posExpenseReceipts.status, input.status));
      if (input?.startDate) filters.push(sql`${posExpenseReceipts.receiptDate} >= ${input.startDate}`);
      if (input?.endDate) filters.push(sql`${posExpenseReceipts.receiptDate} <= ${input.endDate}`);

      const whereClause = filters.length > 0 ? and(...filters) : undefined;

      const [receipts, countResult] = await Promise.all([
        db.select().from(posExpenseReceipts)
          .where(whereClause)
          .orderBy(desc(posExpenseReceipts.receiptDate))
          .limit(input?.limit || 50)
          .offset(input?.offset || 0),
        db.select({ count: sql<number>`count(*)` }).from(posExpenseReceipts).where(whereClause),
      ]);

      return { receipts, total: countResult[0]?.count || 0 };
    }),

  // Get single receipt with items
  getById: staffProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const [receipt] = await db.select().from(posExpenseReceipts)
        .where(eq(posExpenseReceipts.id, input.id))
        .limit(1);

      if (!receipt) return null;

      const items = await db.select().from(posExpenseReceiptItems)
        .where(eq(posExpenseReceiptItems.receiptId, input.id));

      return { ...receipt, items };
    }),

  // Create a new expense receipt
  create: staffProcedure
    .input(createExpenseSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { items, ...receiptData } = input;
      const staffId = (ctx as any).staffToken?.staffId || null;

      const [result] = await db.insert(posExpenseReceipts).values({
        ...receiptData,
        receiptDate: new Date(receiptData.receiptDate),
        status: receiptData.status || "draft",
        createdByStaffId: staffId,
      } as any);

      const receiptId = result.insertId;

      // Insert line items
      if (items.length > 0) {
        await db.insert(posExpenseReceiptItems).values(
          items.map((item) => ({
            receiptId,
            ...item,
          }))
        );
      }

      return { id: receiptId };
    }),

  // Update an expense receipt
  update: staffProcedure
    .input(z.object({
      id: z.number(),
      data: createExpenseSchema.partial().extend({ items: z.array(expenseItemSchema).optional() }),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { items, ...receiptData } = input.data;

      // Update receipt header
      if (Object.keys(receiptData).length > 0) {
        const updateData: any = { ...receiptData };
        if (updateData.receiptDate) {
          updateData.receiptDate = new Date(updateData.receiptDate);
        }
        await db.update(posExpenseReceipts)
          .set(updateData)
          .where(eq(posExpenseReceipts.id, input.id));
      }

      // Replace line items if provided
      if (items) {
        await db.delete(posExpenseReceiptItems)
          .where(eq(posExpenseReceiptItems.receiptId, input.id));

        if (items.length > 0) {
          await db.insert(posExpenseReceiptItems).values(
            items.map((item) => ({
              receiptId: input.id,
              ...item,
            }))
          );
        }
      }

      return { success: true };
    }),

  // Delete an expense receipt
  delete: staffProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Delete items first
      await db.delete(posExpenseReceiptItems)
        .where(eq(posExpenseReceiptItems.receiptId, input.id));

      // Delete receipt
      await db.delete(posExpenseReceipts)
        .where(eq(posExpenseReceipts.id, input.id));

      return { success: true };
    }),

  // Monthly summary by vendor
  summary: staffProcedure
    .input(z.object({
      branchId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { byVendor: [], byCategory: [], total: "0" };

      const filters: any[] = [eq(posExpenseReceipts.status, "confirmed")];
      if (input?.branchId) filters.push(eq(posExpenseReceipts.branchId, input.branchId));
      if (input?.startDate) filters.push(sql`${posExpenseReceipts.receiptDate} >= ${input.startDate}`);
      if (input?.endDate) filters.push(sql`${posExpenseReceipts.receiptDate} <= ${input.endDate}`);

      const whereClause = and(...filters);

      const [byVendor, byCategory, totalResult] = await Promise.all([
        db.select({
          vendor: posExpenseReceipts.vendor,
          count: sql<number>`count(*)`,
          total: sql<string>`COALESCE(SUM(${posExpenseReceipts.grandTotal}), 0)`,
        }).from(posExpenseReceipts)
          .where(whereClause)
          .groupBy(posExpenseReceipts.vendor)
          .orderBy(desc(sql`SUM(${posExpenseReceipts.grandTotal})`)),

        db.select({
          category: posExpenseReceipts.category,
          count: sql<number>`count(*)`,
          total: sql<string>`COALESCE(SUM(${posExpenseReceipts.grandTotal}), 0)`,
        }).from(posExpenseReceipts)
          .where(whereClause)
          .groupBy(posExpenseReceipts.category)
          .orderBy(desc(sql`SUM(${posExpenseReceipts.grandTotal})`)),

        db.select({
          total: sql<string>`COALESCE(SUM(${posExpenseReceipts.grandTotal}), 0)`,
        }).from(posExpenseReceipts).where(whereClause),
      ]);

      return {
        byVendor,
        byCategory,
        total: totalResult[0]?.total || "0",
      };
    }),

  // Get distinct vendors for autocomplete
  vendors: staffProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const result = await db.selectDistinct({ vendor: posExpenseReceipts.vendor })
      .from(posExpenseReceipts)
      .orderBy(posExpenseReceipts.vendor);

    return result.map((r) => r.vendor);
  }),
});
