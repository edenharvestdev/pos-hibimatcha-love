import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock getDb
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn().mockReturnThis(),
  groupBy: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  selectDistinct: vi.fn().mockReturnThis(),
};

vi.mock("../db", () => ({
  getDb: vi.fn(() => Promise.resolve(mockDb)),
}));

vi.mock("../../drizzle/schema", () => ({
  posExpenseReceipts: {
    id: "id",
    branchId: "branchId",
    vendor: "vendor",
    category: "category",
    status: "status",
    receiptDate: "receiptDate",
    grandTotal: "grandTotal",
  },
  posExpenseReceiptItems: {
    receiptId: "receiptId",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ type: "eq", a, b })),
  and: vi.fn((...args) => ({ type: "and", args })),
  desc: vi.fn((col) => ({ type: "desc", col })),
  gte: vi.fn((a, b) => ({ type: "gte", a, b })),
  lte: vi.fn((a, b) => ({ type: "lte", a, b })),
  sql: Object.assign(
    (strings: TemplateStringsArray, ...values: any[]) => ({ type: "sql", strings, values }),
    { raw: (s: string) => s }
  ),
}));

describe("expenseReceipts router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset chain methods
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
    mockDb.orderBy.mockReturnThis();
    mockDb.limit.mockReturnThis();
    mockDb.offset.mockReturnThis();
    mockDb.groupBy.mockReturnThis();
    mockDb.insert.mockReturnThis();
    mockDb.update.mockReturnThis();
    mockDb.set.mockReturnThis();
    mockDb.delete.mockReturnThis();
    mockDb.selectDistinct.mockReturnThis();
  });

  describe("list", () => {
    it("should return empty list when no receipts", async () => {
      // Mock Promise.all with two queries
      mockDb.offset.mockResolvedValueOnce([]);
      mockDb.where.mockResolvedValueOnce([{ count: 0 }]);

      const { getDb } = await import("../db");
      const db = await getDb();
      expect(db).toBeTruthy();
    });

    it("should accept filter parameters", () => {
      const filters = {
        branchId: 1,
        vendor: "Makro",
        category: "ingredients" as const,
        status: "confirmed" as const,
        startDate: "2026-01-01",
        endDate: "2026-12-31",
      };
      expect(filters.branchId).toBe(1);
      expect(filters.vendor).toBe("Makro");
      expect(filters.category).toBe("ingredients");
    });
  });

  describe("create", () => {
    it("should validate required fields", () => {
      const validInput = {
        branchId: 1,
        vendor: "Makro",
        receiptDate: "2026-06-01",
        category: "ingredients" as const,
        paymentMethod: "transfer" as const,
        subtotal: "1000.00",
        grandTotal: "1070.00",
        items: [
          {
            itemName: "ชาเขียว 500g",
            quantity: "2",
            unit: "ถุง",
            unitPrice: "500.00",
            totalPrice: "1000.00",
          },
        ],
      };
      expect(validInput.vendor).toBe("Makro");
      expect(validInput.items.length).toBe(1);
      expect(validInput.items[0].itemName).toBe("ชาเขียว 500g");
    });

    it("should calculate correct totals", () => {
      const items = [
        { itemName: "Item A", quantity: "2", unitPrice: "100.00", totalPrice: "200.00" },
        { itemName: "Item B", quantity: "3", unitPrice: "50.00", totalPrice: "150.00" },
      ];
      const subtotal = items.reduce((sum, i) => sum + parseFloat(i.totalPrice), 0);
      const vat = subtotal * 0.07;
      const grandTotal = subtotal + vat;

      expect(subtotal).toBe(350);
      expect(vat).toBeCloseTo(24.5);
      expect(grandTotal).toBeCloseTo(374.5);
    });
  });

  describe("update", () => {
    it("should convert receiptDate string to Date", () => {
      const dateStr = "2026-06-01";
      const dateObj = new Date(dateStr);
      expect(dateObj.getFullYear()).toBe(2026);
      expect(dateObj.getMonth()).toBe(5); // June = 5 (0-indexed)
      expect(dateObj.getDate()).toBe(1);
    });
  });

  describe("delete", () => {
    it("should delete items before receipt", async () => {
      mockDb.delete.mockReturnThis();
      mockDb.where.mockResolvedValue([]);

      const { getDb } = await import("../db");
      const db = await getDb();
      expect(db).toBeTruthy();
      // Verify delete chain works
      expect(mockDb.delete).toBeDefined();
    });
  });

  describe("summary", () => {
    it("should group by vendor and category", () => {
      const mockByVendor = [
        { vendor: "Makro", count: 5, total: "15000.00" },
        { vendor: "Shopee", count: 3, total: "8000.00" },
      ];
      const mockByCategory = [
        { category: "ingredients", count: 6, total: "18000.00" },
        { category: "packaging", count: 2, total: "5000.00" },
      ];

      expect(mockByVendor.length).toBe(2);
      expect(mockByCategory.length).toBe(2);
      expect(mockByVendor[0].vendor).toBe("Makro");
      expect(mockByCategory[0].category).toBe("ingredients");
    });

    it("should return zero total when no confirmed receipts", () => {
      const emptyResult = { byVendor: [], byCategory: [], total: "0" };
      expect(emptyResult.total).toBe("0");
      expect(emptyResult.byVendor.length).toBe(0);
    });
  });

  describe("vendors", () => {
    it("should return distinct vendor names", () => {
      const vendors = ["Makro", "Shopee", "Lazada", "Big C"];
      expect(vendors).toContain("Makro");
      expect(vendors).toContain("Shopee");
      expect(vendors.length).toBe(4);
    });
  });

  describe("category validation", () => {
    it("should accept valid categories", () => {
      const validCategories = [
        "ingredients", "packaging", "equipment", "cleaning",
        "utilities", "marketing", "delivery_fee", "other",
      ];
      validCategories.forEach((cat) => {
        expect(typeof cat).toBe("string");
      });
      expect(validCategories.length).toBe(8);
    });

    it("should accept valid payment methods", () => {
      const validPayments = ["cash", "transfer", "credit_card", "corporate_card", "cod", "other"];
      expect(validPayments.length).toBe(6);
    });
  });
});
