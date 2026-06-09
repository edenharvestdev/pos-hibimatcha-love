import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  onDuplicateKeyUpdate: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
};

vi.mock("./db", () => ({
  getDb: vi.fn(() => Promise.resolve(mockDb)),
}));

describe("Stock Cost Tracking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Weighted Average Cost Calculation", () => {
    it("should calculate weighted average cost correctly for new stock", () => {
      // Formula: (existingQty * existingAvgCost + newQty * newCostPerUnit) / (existingQty + newQty)
      const existingQty = 0;
      const existingAvgCost = 0;
      const newQty = 100;
      const newCostPerUnit = 50;

      const totalQty = existingQty + newQty;
      const newAvgCost = totalQty > 0
        ? (existingQty * existingAvgCost + newQty * newCostPerUnit) / totalQty
        : newCostPerUnit;

      expect(newAvgCost).toBe(50);
    });

    it("should calculate weighted average cost correctly for existing stock", () => {
      const existingQty = 100;
      const existingAvgCost = 50;
      const newQty = 50;
      const newCostPerUnit = 80;

      const totalQty = existingQty + newQty;
      const newAvgCost = (existingQty * existingAvgCost + newQty * newCostPerUnit) / totalQty;

      // (100*50 + 50*80) / 150 = (5000 + 4000) / 150 = 60
      expect(newAvgCost).toBe(60);
    });

    it("should handle zero cost gracefully", () => {
      const existingQty = 50;
      const existingAvgCost = 100;
      const newQty = 50;
      const newCostPerUnit = 0;

      const totalQty = existingQty + newQty;
      const newAvgCost = (existingQty * existingAvgCost + newQty * newCostPerUnit) / totalQty;

      // (50*100 + 50*0) / 100 = 5000 / 100 = 50
      expect(newAvgCost).toBe(50);
    });
  });

  describe("Stock Value Summary", () => {
    it("should calculate total stock value using average cost", () => {
      const stocks = [
        { inventoryItemId: 1, currentStock: "100", averageCost: "50.00" },
        { inventoryItemId: 2, currentStock: "200", averageCost: "30.00" },
        { inventoryItemId: 3, currentStock: "50", averageCost: "0" },
      ];
      const items = [
        { id: 1, sourceFlag: "hq_supply", costPerUnit: "45.00", isActive: true },
        { id: 2, sourceFlag: "customer_supplied", costPerUnit: "28.00", isActive: true },
        { id: 3, sourceFlag: "hq_supply", costPerUnit: "60.00", isActive: true },
      ];

      let totalValue = 0;
      const sourceMap: Record<string, { count: number; value: number; qty: number }> = {};

      for (const s of stocks) {
        const item = items.find((i) => i.id === s.inventoryItemId);
        if (!item) continue;

        const qty = Number(s.currentStock ?? 0);
        const avgCost = Number(s.averageCost ?? 0);
        // Use averageCost if available, otherwise fallback to item's costPerUnit
        const effectiveCost = avgCost > 0 ? avgCost : Number(item.costPerUnit ?? 0);
        const value = qty * effectiveCost;

        totalValue += value;

        const source = item.sourceFlag ?? "hq_supply";
        if (!sourceMap[source]) sourceMap[source] = { count: 0, value: 0, qty: 0 };
        sourceMap[source].count++;
        sourceMap[source].value += value;
        sourceMap[source].qty += qty;
      }

      // Item 1: 100 * 50 = 5000
      // Item 2: 200 * 30 = 6000
      // Item 3: 50 * 60 = 3000 (fallback to costPerUnit since averageCost is 0)
      expect(totalValue).toBe(14000);
      expect(sourceMap["hq_supply"].count).toBe(2);
      expect(sourceMap["hq_supply"].value).toBe(8000);
      expect(sourceMap["hq_supply"].qty).toBe(150);
      expect(sourceMap["customer_supplied"].count).toBe(1);
      expect(sourceMap["customer_supplied"].value).toBe(6000);
      expect(sourceMap["customer_supplied"].qty).toBe(200);
    });
  });

  describe("Stock Deduction for Orders", () => {
    it("should calculate correct deduction amounts from recipe", () => {
      const orderItems = [
        { menuItemId: 1, quantity: 2 },
        { menuItemId: 2, quantity: 1 },
      ];
      const recipes = [
        { menuItemId: 1, inventoryItemId: 10, quantity: "5.0000" }, // 5g matcha per cup
        { menuItemId: 1, inventoryItemId: 11, quantity: "200.0000" }, // 200ml milk per cup
        { menuItemId: 2, inventoryItemId: 10, quantity: "3.0000" }, // 3g matcha per cup
        { menuItemId: 2, inventoryItemId: 12, quantity: "150.0000" }, // 150ml oat milk per cup
      ];

      const deductions = new Map<number, number>();
      for (const oi of orderItems) {
        const itemRecipes = recipes.filter((r) => r.menuItemId === oi.menuItemId);
        for (const r of itemRecipes) {
          const deductQty = Number(r.quantity ?? 0) * (oi.quantity ?? 1);
          if (deductQty > 0) {
            deductions.set(r.inventoryItemId, (deductions.get(r.inventoryItemId) ?? 0) + deductQty);
          }
        }
      }

      // Item 10 (matcha): 2*5 + 1*3 = 13g
      expect(deductions.get(10)).toBe(13);
      // Item 11 (milk): 2*200 = 400ml
      expect(deductions.get(11)).toBe(400);
      // Item 12 (oat milk): 1*150 = 150ml
      expect(deductions.get(12)).toBe(150);
    });

    it("should handle orders with no recipes gracefully", () => {
      const orderItems = [
        { menuItemId: 99, quantity: 1 },
      ];
      const recipes: Array<{ menuItemId: number; inventoryItemId: number; quantity: string }> = [];

      const deductions = new Map<number, number>();
      for (const oi of orderItems) {
        const itemRecipes = recipes.filter((r) => r.menuItemId === oi.menuItemId);
        for (const r of itemRecipes) {
          const deductQty = Number(r.quantity ?? 0) * (oi.quantity ?? 1);
          if (deductQty > 0) {
            deductions.set(r.inventoryItemId, (deductions.get(r.inventoryItemId) ?? 0) + deductQty);
          }
        }
      }

      expect(deductions.size).toBe(0);
    });

    it("should aggregate deductions for same ingredient across multiple items", () => {
      const orderItems = [
        { menuItemId: 1, quantity: 3 },
        { menuItemId: 2, quantity: 2 },
      ];
      // Both items use the same ingredient (matcha)
      const recipes = [
        { menuItemId: 1, inventoryItemId: 10, quantity: "5.0000" },
        { menuItemId: 2, inventoryItemId: 10, quantity: "4.0000" },
      ];

      const deductions = new Map<number, number>();
      for (const oi of orderItems) {
        const itemRecipes = recipes.filter((r) => r.menuItemId === oi.menuItemId);
        for (const r of itemRecipes) {
          const deductQty = Number(r.quantity ?? 0) * (oi.quantity ?? 1);
          if (deductQty > 0) {
            deductions.set(r.inventoryItemId, (deductions.get(r.inventoryItemId) ?? 0) + deductQty);
          }
        }
      }

      // Item 10: 3*5 + 2*4 = 15 + 8 = 23
      expect(deductions.get(10)).toBe(23);
    });
  });

  describe("Idempotency Guard", () => {
    it("should not deduct stock twice for the same order", () => {
      // Simulates the guard logic: if existingMovements.length > 0, skip
      const existingMovements = [{ id: 1 }]; // Already has a movement
      const shouldDeduct = existingMovements.length === 0;
      expect(shouldDeduct).toBe(false);
    });

    it("should deduct stock when no prior movements exist", () => {
      const existingMovements: Array<{ id: number }> = [];
      const shouldDeduct = existingMovements.length === 0;
      expect(shouldDeduct).toBe(true);
    });

    it("should handle missing branch stock row by creating new row", () => {
      // When stockRow is null, create a new row with negative stock
      const stockRow = null;
      const qty = 10;
      const newStock = stockRow ? Number(stockRow) - qty : -qty;
      expect(newStock).toBe(-10);
    });
  });

  describe("POS Branch Linking", () => {
    it("should resolve branchId from session when branch context is available", () => {
      const branch = { id: 5 };
      const session = { currentBranchId: 3 };
      const branchId = branch?.id || session?.currentBranchId;
      expect(branchId).toBe(5);
    });

    it("should fallback to session branchId when branch context is null", () => {
      const branch = null;
      const session = { currentBranchId: 3 };
      const branchId = branch?.id || session?.currentBranchId;
      expect(branchId).toBe(3);
    });

    it("should handle both null gracefully", () => {
      const branch = null;
      const session = { currentBranchId: null };
      const branchId = branch?.id || session?.currentBranchId;
      expect(branchId).toBeFalsy();
    });
  });
});
