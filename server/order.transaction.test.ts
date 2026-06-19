import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import {
  posOrders,
  posOrderItems,
  posMenuItems,
  posCategories,
  posRecipeIngredients,
  posBranchInventoryStock,
  posInventoryMovements,
  posInventoryItems,
  posBranchMenuItems,
  branches,
} from "../drizzle/schema";
import { eq, and, inArray } from "drizzle-orm";

/**
 * Integration tests for transactional stock deduction (Phase 22).
 *
 * These tests exercise the real database to verify:
 * 1. Idempotency: calling complete twice does NOT double-deduct
 * 2. Insufficient stock: order is NOT completed, error details are returned
 * 3. Successful deduction: stock reduced, movements recorded, order completed
 */

// ─── Test Helpers ───────────────────────────────────────────────────────────────

function createStaffContext(branchId = 1): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: { authorization: "Bearer mock-token" },
    } as any,
    res: { clearCookie: vi.fn() } as any,
    staff: {
      staffId: 1,
      role: "super_admin",
      primaryBranchId: branchId,
      currentBranchId: branchId,
      employeeCode: "TEST001",
    },
  };
}

// Unique test branch/items to avoid collisions with production data
const TEST_BRANCH_ID = 99999;
const TEST_MENU_ITEM_ID = 99001;
const TEST_INVENTORY_ITEM_A = 99101; // e.g. matcha powder
const TEST_INVENTORY_ITEM_B = 99102; // e.g. milk

// ─── Setup & Teardown ───────────────────────────────────────────────────────────

async function setupTestData() {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  // 1. Ensure test branch exists
  const [existingBranch] = await db.select().from(branches).where(eq(branches.id, TEST_BRANCH_ID)).limit(1);
  if (!existingBranch) {
    await db.insert(branches).values({
      id: TEST_BRANCH_ID,
      name: "Test Branch (Transaction)",
      code: "TST-TXN",
      isActive: true,
    } as any);
  }

  // 2. Ensure test inventory items exist
  for (const item of [
    { id: TEST_INVENTORY_ITEM_A, name: "Test Matcha Powder", nameThai: "ผงมัทฉะทดสอบ", unitOfMeasure: "g" as const },
    { id: TEST_INVENTORY_ITEM_B, name: "Test Milk", nameThai: "นมทดสอบ", unitOfMeasure: "ml" as const },
  ]) {
    const [existing] = await db.select().from(posInventoryItems).where(eq(posInventoryItems.id, item.id)).limit(1);
    if (!existing) {
      await db.insert(posInventoryItems).values({
        id: item.id,
        name: item.name,
        nameThai: item.nameThai,
        unitOfMeasure: item.unitOfMeasure,
        isActive: true,
      } as any);
    }
  }

  // 3. Ensure test menu item exists (need a category first)
  const TEST_CATEGORY_ID = 99001;
  const [existingCat] = await db.select().from(posCategories).where(eq(posCategories.id, TEST_CATEGORY_ID)).limit(1);
  if (!existingCat) {
    await db.insert(posCategories).values({
      id: TEST_CATEGORY_ID,
      name: "Test Category",
      sortOrder: 0,
      isActive: true,
    } as any);
  }

  const [existingMenu] = await db.select().from(posMenuItems).where(eq(posMenuItems.id, TEST_MENU_ITEM_ID)).limit(1);
  if (!existingMenu) {
    await db.insert(posMenuItems).values({
      id: TEST_MENU_ITEM_ID,
      categoryId: TEST_CATEGORY_ID,
      name: "Test Matcha Latte",
      basePrice: "100.00",
      isActive: true,
    } as any);
  }

  // 4. Ensure branch menu item link exists
  const [existingBranchMenu] = await db.select().from(posBranchMenuItems)
    .where(and(
      eq(posBranchMenuItems.branchId, TEST_BRANCH_ID),
      eq(posBranchMenuItems.menuItemId, TEST_MENU_ITEM_ID),
    )).limit(1);
  if (!existingBranchMenu) {
    await db.insert(posBranchMenuItems).values({
      branchId: TEST_BRANCH_ID,
      menuItemId: TEST_MENU_ITEM_ID,
      isAvailable: true,
    } as any);
  }

  // 5. Set up recipe: Test Matcha Latte = 5g matcha + 200ml milk
  // Clear old recipes first
  await db.delete(posRecipeIngredients).where(eq(posRecipeIngredients.menuItemId, TEST_MENU_ITEM_ID));
  await db.insert(posRecipeIngredients).values([
    { menuItemId: TEST_MENU_ITEM_ID, inventoryItemId: TEST_INVENTORY_ITEM_A, quantity: "5.0000" },
    { menuItemId: TEST_MENU_ITEM_ID, inventoryItemId: TEST_INVENTORY_ITEM_B, quantity: "200.0000" },
  ]);

  return db;
}

async function setStock(branchId: number, inventoryItemId: number, stock: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const [existing] = await db.select().from(posBranchInventoryStock)
    .where(and(
      eq(posBranchInventoryStock.branchId, branchId),
      eq(posBranchInventoryStock.inventoryItemId, inventoryItemId),
    )).limit(1);

  if (existing) {
    await db.update(posBranchInventoryStock)
      .set({ currentStock: String(stock) })
      .where(eq(posBranchInventoryStock.id, existing.id));
  } else {
    await db.insert(posBranchInventoryStock).values({
      branchId,
      inventoryItemId,
      currentStock: String(stock),
    });
  }
}

async function getStock(branchId: number, inventoryItemId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const [row] = await db.select().from(posBranchInventoryStock)
    .where(and(
      eq(posBranchInventoryStock.branchId, branchId),
      eq(posBranchInventoryStock.inventoryItemId, inventoryItemId),
    )).limit(1);
  return row ? Number(row.currentStock ?? 0) : 0;
}

async function getMovementsForOrder(orderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(posInventoryMovements)
    .where(and(
      eq(posInventoryMovements.referenceType, "order"),
      eq(posInventoryMovements.referenceId, orderId),
    ));
}

async function getOrderStatus(orderId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select({ status: posOrders.status }).from(posOrders)
    .where(eq(posOrders.id, orderId)).limit(1);
  return row?.status ?? null;
}

async function createTestOrder(caller: ReturnType<typeof appRouter.createCaller>): Promise<number> {
  const result = await caller.orders.create({
    branchId: TEST_BRANCH_ID,
    orderType: "dine-in",
    items: [{ menuItemId: TEST_MENU_ITEM_ID, quantity: 2 }],
  });
  return result.id;
}

async function cleanupOrder(orderId: number) {
  const db = await getDb();
  if (!db) return;
  // Remove movements for this order
  await db.delete(posInventoryMovements).where(
    and(
      eq(posInventoryMovements.referenceType, "order"),
      eq(posInventoryMovements.referenceId, orderId),
    )
  );
  // Remove order items
  await db.delete(posOrderItems).where(eq(posOrderItems.orderId, orderId));
  // Remove order
  await db.delete(posOrders).where(eq(posOrders.id, orderId));
}

// ─── Tests ──────────────────────────────────────────────────────────────────────

describe("Transactional Stock Deduction (Phase 22)", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  const createdOrderIds: number[] = [];

  beforeEach(async () => {
    const ctx = createStaffContext(TEST_BRANCH_ID);
    caller = appRouter.createCaller(ctx);
    await setupTestData();
  });

  // Cleanup after all tests
  afterAll(async () => {
    for (const oid of createdOrderIds) {
      await cleanupOrder(oid);
    }
  });

  describe("Successful deduction", () => {
    it("should deduct stock and mark order completed when stock is sufficient", async () => {
      // Set sufficient stock: 100g matcha, 1000ml milk
      await setStock(TEST_BRANCH_ID, TEST_INVENTORY_ITEM_A, 100);
      await setStock(TEST_BRANCH_ID, TEST_INVENTORY_ITEM_B, 1000);

      // Create order: 2x Test Matcha Latte = 10g matcha + 400ml milk
      const orderId = await createTestOrder(caller);
      createdOrderIds.push(orderId);

      // Complete the order
      await caller.orders.complete({ orderId });

      // Verify order is completed
      const status = await getOrderStatus(orderId);
      expect(status).toBe("completed");

      // Verify stock was reduced
      const matchaStock = await getStock(TEST_BRANCH_ID, TEST_INVENTORY_ITEM_A);
      expect(matchaStock).toBe(90); // 100 - 10

      const milkStock = await getStock(TEST_BRANCH_ID, TEST_INVENTORY_ITEM_B);
      expect(milkStock).toBe(600); // 1000 - 400

      // Verify movements were recorded with correct referenceId
      const movements = await getMovementsForOrder(orderId);
      expect(movements.length).toBe(2);
      expect(movements.every((m) => m.referenceType === "order")).toBe(true);
      expect(movements.every((m) => m.referenceId === orderId)).toBe(true);
      expect(movements.every((m) => m.movementType === "sold")).toBe(true);
    });
  });

  describe("Idempotency guard", () => {
    it("should NOT double-deduct when complete is called twice on the same order", async () => {
      // Set sufficient stock
      await setStock(TEST_BRANCH_ID, TEST_INVENTORY_ITEM_A, 100);
      await setStock(TEST_BRANCH_ID, TEST_INVENTORY_ITEM_B, 1000);

      // Create and complete order
      const orderId = await createTestOrder(caller);
      createdOrderIds.push(orderId);
      await caller.orders.complete({ orderId });

      // Record stock after first completion
      const matchaAfterFirst = await getStock(TEST_BRANCH_ID, TEST_INVENTORY_ITEM_A);
      const milkAfterFirst = await getStock(TEST_BRANCH_ID, TEST_INVENTORY_ITEM_B);

      // Call complete again (should be idempotent)
      await caller.orders.complete({ orderId });

      // Stock should NOT have changed (no double deduction)
      const matchaAfterSecond = await getStock(TEST_BRANCH_ID, TEST_INVENTORY_ITEM_A);
      const milkAfterSecond = await getStock(TEST_BRANCH_ID, TEST_INVENTORY_ITEM_B);
      expect(matchaAfterSecond).toBe(matchaAfterFirst);
      expect(milkAfterSecond).toBe(milkAfterFirst);

      // Should still only have 2 movements (not 4)
      const movements = await getMovementsForOrder(orderId);
      expect(movements.length).toBe(2);
    });
  });

  describe("Insufficient stock rejection", () => {
    it("should throw PRECONDITION_FAILED when stock is insufficient", async () => {
      // Set insufficient stock: only 3g matcha (need 10g for 2 cups)
      await setStock(TEST_BRANCH_ID, TEST_INVENTORY_ITEM_A, 3);
      await setStock(TEST_BRANCH_ID, TEST_INVENTORY_ITEM_B, 1000);

      // Create order should fail at checkout (pre-check)
      await expect(caller.orders.create({
        branchId: TEST_BRANCH_ID,
        orderType: "dine-in",
        items: [{ menuItemId: TEST_MENU_ITEM_ID, quantity: 2 }],
      })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });

      const matchaStock = await getStock(TEST_BRANCH_ID, TEST_INVENTORY_ITEM_A);
      expect(matchaStock).toBe(3);
    });

    it("should include ingredient details in the error message", async () => {
      await setStock(TEST_BRANCH_ID, TEST_INVENTORY_ITEM_A, 2);
      await setStock(TEST_BRANCH_ID, TEST_INVENTORY_ITEM_B, 100);

      try {
        await caller.orders.create({
          branchId: TEST_BRANCH_ID,
          orderType: "dine-in",
          items: [{ menuItemId: TEST_MENU_ITEM_ID, quantity: 2 }],
        });
        expect.fail("Should have thrown");
      } catch (err: any) {
        expect(err.code).toBe("PRECONDITION_FAILED");
        expect(err.message).toContain("วัตถุดิบไม่เพียงพอ");
        expect(err.message).toContain("ต้องการ");
        expect(err.message).toContain("แต่มี");
      }
    });
  });

  describe("Transaction atomicity", () => {
    it("should not partially deduct stock when one ingredient is insufficient", async () => {
      await setStock(TEST_BRANCH_ID, TEST_INVENTORY_ITEM_A, 100);
      await setStock(TEST_BRANCH_ID, TEST_INVENTORY_ITEM_B, 50);

      await expect(caller.orders.create({
        branchId: TEST_BRANCH_ID,
        orderType: "dine-in",
        items: [{ menuItemId: TEST_MENU_ITEM_ID, quantity: 2 }],
      })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });

      const matchaStock = await getStock(TEST_BRANCH_ID, TEST_INVENTORY_ITEM_A);
      expect(matchaStock).toBe(100);

      const milkStock = await getStock(TEST_BRANCH_ID, TEST_INVENTORY_ITEM_B);
      expect(milkStock).toBe(50);
    });
  });
});
