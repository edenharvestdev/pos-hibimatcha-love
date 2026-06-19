import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import {
  posOrders,
  posOrderItems,
  posOrderItemOptions,
  posOptionGroups,
  posOptions,
  posMenuItems,
  posCategories,
  posRecipeIngredients,
  posBranchInventoryStock,
  posInventoryMovements,
  posInventoryItems,
  posBranchMenuItems,
  branches,
} from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

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

const TEST_BRANCH_ID = 99999;
const TEST_MENU_ITEM_ID = 99001;
const TEST_INVENTORY_ITEM_MATCHA = 99101;
const TEST_INVENTORY_ITEM_MILK = 99102;
const TEST_INVENTORY_ITEM_OAT_MILK = 99103;
const TEST_INVENTORY_ITEM_COOL_PACK = 99104;

const TEST_OPTION_GROUP_ID = 99501;
const TEST_OPTION_OAT_MILK_ID = 99601;
const TEST_OPTION_COOL_PACK_ID = 99602;

async function setupTestData() {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  // 1. Ensure test branch exists
  const [existingBranch] = await db.select().from(branches).where(eq(branches.id, TEST_BRANCH_ID)).limit(1);
  if (!existingBranch) {
    await db.insert(branches).values({
      id: TEST_BRANCH_ID,
      name: "Test Branch (StockEffects)",
      code: "TST-SE",
      isActive: true,
    } as any);
  }

  // 2. Ensure test inventory items exist
  for (const item of [
    { id: TEST_INVENTORY_ITEM_MATCHA, name: "Test Matcha", unitOfMeasure: "g" as const, costPerUnit: "0.50" },
    { id: TEST_INVENTORY_ITEM_MILK, name: "Test Milk", unitOfMeasure: "ml" as const, costPerUnit: "0.05" },
    { id: TEST_INVENTORY_ITEM_OAT_MILK, name: "Test Oat Milk", unitOfMeasure: "ml" as const, costPerUnit: "0.10" },
    { id: TEST_INVENTORY_ITEM_COOL_PACK, name: "Test Cool Pack", unitOfMeasure: "piece" as const, costPerUnit: "5.00" },
  ]) {
    const [existing] = await db.select().from(posInventoryItems).where(eq(posInventoryItems.id, item.id)).limit(1);
    if (!existing) {
      await db.insert(posInventoryItems).values({
        id: item.id,
        name: item.name,
        unitOfMeasure: item.unitOfMeasure,
        costPerUnit: item.costPerUnit,
        isActive: true,
      } as any);
    }
  }

  // 3. Ensure category exists
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

  // 4. Ensure menu item exists
  const [existingMenu] = await db.select().from(posMenuItems).where(eq(posMenuItems.id, TEST_MENU_ITEM_ID)).limit(1);
  if (!existingMenu) {
    await db.insert(posMenuItems).values({
      id: TEST_MENU_ITEM_ID,
      categoryId: TEST_CATEGORY_ID,
      name: "Test Latte",
      basePrice: "100.00",
      costPrice: "12.50", // 5g matcha (2.50) + 200ml milk (10.00)
      isActive: true,
    } as any);
  }

  // 5. Ensure branch menu item link exists
  const [existingBranchMenu] = await db.select().from(posBranchMenuItems)
    .where(and(eq(posBranchMenuItems.branchId, TEST_BRANCH_ID), eq(posBranchMenuItems.menuItemId, TEST_MENU_ITEM_ID))).limit(1);
  if (!existingBranchMenu) {
    await db.insert(posBranchMenuItems).values({
      branchId: TEST_BRANCH_ID,
      menuItemId: TEST_MENU_ITEM_ID,
      isAvailable: true,
    } as any);
  }

  // 6. Base Recipe: 5g matcha (MATCHA) + 200ml milk (MILK)
  await db.delete(posRecipeIngredients).where(eq(posRecipeIngredients.menuItemId, TEST_MENU_ITEM_ID));
  await db.insert(posRecipeIngredients).values([
    { menuItemId: TEST_MENU_ITEM_ID, inventoryItemId: TEST_INVENTORY_ITEM_MATCHA, quantity: "5.00", role: "MATCHA", unitOfMeasure: "g" },
    { menuItemId: TEST_MENU_ITEM_ID, inventoryItemId: TEST_INVENTORY_ITEM_MILK, quantity: "200.00", role: "MILK", unitOfMeasure: "ml" },
  ]);

  // 7. Ensure Option Group and Options exist
  await db.delete(posOptions).where(eq(posOptions.groupId, TEST_OPTION_GROUP_ID));
  await db.delete(posOptionGroups).where(eq(posOptionGroups.id, TEST_OPTION_GROUP_ID));

  await db.insert(posOptionGroups).values({
    id: TEST_OPTION_GROUP_ID,
    name: "Test Group",
    selectionType: "multi",
    isActive: true,
  } as any);

  await db.insert(posOptions).values([
    {
      id: TEST_OPTION_OAT_MILK_ID,
      groupId: TEST_OPTION_GROUP_ID,
      name: "Oat Milk",
      priceAdjustment: "15.00",
      costAdjustment: "10.00", // (200ml * 0.10) - (200ml * 0.05) = 20.00 - 10.00 = +10.00
      stockEffects: [
        { type: "REPLACE", targetRole: "MILK", inventoryItemId: TEST_INVENTORY_ITEM_OAT_MILK, quantity: 200, unit: "ml", role: "MILK" }
      ]
    },
    {
      id: TEST_OPTION_COOL_PACK_ID,
      groupId: TEST_OPTION_GROUP_ID,
      name: "Add Cool Pack",
      priceAdjustment: "10.00",
      costAdjustment: "5.00", // +5.00 cool pack cost
      stockEffects: [
        { type: "ADD", inventoryItemId: TEST_INVENTORY_ITEM_COOL_PACK, quantity: 1, unit: "pcs", role: "TOPPING" }
      ]
    }
  ] as any);
}

async function setStock(inventoryItemId: number, stock: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const [existing] = await db.select().from(posBranchInventoryStock)
    .where(and(eq(posBranchInventoryStock.branchId, TEST_BRANCH_ID), eq(posBranchInventoryStock.inventoryItemId, inventoryItemId))).limit(1);

  if (existing) {
    await db.update(posBranchInventoryStock).set({ currentStock: String(stock) }).where(eq(posBranchInventoryStock.id, existing.id));
  } else {
    await db.insert(posBranchInventoryStock).values({
      branchId: TEST_BRANCH_ID,
      inventoryItemId,
      currentStock: String(stock),
    });
  }
}

async function getStock(inventoryItemId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const [row] = await db.select().from(posBranchInventoryStock)
    .where(and(eq(posBranchInventoryStock.branchId, TEST_BRANCH_ID), eq(posBranchInventoryStock.inventoryItemId, inventoryItemId))).limit(1);
  return row ? Number(row.currentStock ?? 0) : 0;
}

async function cleanupOrder(orderId: number) {
  const db = await getDb();
  if (!db) return;
  const items = await db.select().from(posOrderItems).where(eq(posOrderItems.orderId, orderId));
  for (const item of items) {
    await db.delete(posOrderItemOptions).where(eq(posOrderItemOptions.orderItemId, item.id));
    const { posOrderRecipeSnapshots } = await import("../drizzle/schema");
    await db.delete(posOrderRecipeSnapshots).where(eq(posOrderRecipeSnapshots.orderItemId, item.id));
  }
  await db.delete(posInventoryMovements).where(and(eq(posInventoryMovements.referenceType, "order"), eq(posInventoryMovements.referenceId, orderId)));
  await db.delete(posOrderItems).where(eq(posOrderItems.orderId, orderId));
  await db.delete(posOrders).where(eq(posOrders.id, orderId));
}

describe("POS Options Inventory Stock Effects & Dynamic Costing", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  const createdOrderIds: number[] = [];

  beforeEach(async () => {
    const ctx = createStaffContext(TEST_BRANCH_ID);
    caller = appRouter.createCaller(ctx);
    await setupTestData();
  });

  afterAll(async () => {
    for (const oid of createdOrderIds) {
      await cleanupOrder(oid);
    }
  });

  it("should successfully apply ADD stock effects during stock deduction", async () => {
    // Set stock: Matcha = 100g, Milk = 1000ml, Oat Milk = 0ml, Cool Pack = 10 pieces
    await setStock(TEST_INVENTORY_ITEM_MATCHA, 100);
    await setStock(TEST_INVENTORY_ITEM_MILK, 1000);
    await setStock(TEST_INVENTORY_ITEM_OAT_MILK, 0);
    await setStock(TEST_INVENTORY_ITEM_COOL_PACK, 10);

    // Order: 1x Latte (5g matcha + 200ml milk) + Add Cool Pack option
    const result = await caller.orders.create({
      branchId: TEST_BRANCH_ID,
      orderType: "dine-in",
      items: [
        {
          menuItemId: TEST_MENU_ITEM_ID,
          quantity: 1,
          options: [
            { optionId: TEST_OPTION_COOL_PACK_ID, priceAdjustment: "10.00", costAdjustment: "5.00" }
          ]
        }
      ]
    });
    createdOrderIds.push(result.id);

    // Complete the order to trigger stock deduction
    await caller.orders.complete({ orderId: result.id });

    // Verify deductions:
    // Matcha should be reduced by 5g (100 -> 95)
    expect(await getStock(TEST_INVENTORY_ITEM_MATCHA)).toBe(95);
    // Milk should be reduced by 200ml (1000 -> 800)
    expect(await getStock(TEST_INVENTORY_ITEM_MILK)).toBe(800);
    // Cool pack should be reduced by 1 piece (10 -> 9)
    expect(await getStock(TEST_INVENTORY_ITEM_COOL_PACK)).toBe(9);
  });

  it("should successfully apply REPLACE stock effects during stock deduction", async () => {
    // Set stock: Matcha = 100g, Milk = 1000ml, Oat Milk = 500ml, Cool Pack = 0
    await setStock(TEST_INVENTORY_ITEM_MATCHA, 100);
    await setStock(TEST_INVENTORY_ITEM_MILK, 1000);
    await setStock(TEST_INVENTORY_ITEM_OAT_MILK, 500);
    await setStock(TEST_INVENTORY_ITEM_COOL_PACK, 0);

    // Order: 1x Latte + Oat Milk option (REPLACE milk with oat milk)
    const result = await caller.orders.create({
      branchId: TEST_BRANCH_ID,
      orderType: "dine-in",
      items: [
        {
          menuItemId: TEST_MENU_ITEM_ID,
          quantity: 1,
          options: [
            { optionId: TEST_OPTION_OAT_MILK_ID, priceAdjustment: "15.00", costAdjustment: "10.00" }
          ]
        }
      ]
    });
    createdOrderIds.push(result.id);

    // Complete order
    await caller.orders.complete({ orderId: result.id });

    // Verify deductions:
    // Matcha reduced by 5g (100 -> 95)
    expect(await getStock(TEST_INVENTORY_ITEM_MATCHA)).toBe(95);
    // Milk should NOT be reduced (remains 1000) because REPLACE removed it from recipe
    expect(await getStock(TEST_INVENTORY_ITEM_MILK)).toBe(1000);
    // Oat milk should be reduced by 200ml (500 -> 300)
    expect(await getStock(TEST_INVENTORY_ITEM_OAT_MILK)).toBe(300);
  });

  it("should fail validation and roll back when replacement item is out of stock", async () => {
    // Set stock: Matcha = 100g, Milk = 1000ml, Oat Milk = 50ml (need 200ml)
    await setStock(TEST_INVENTORY_ITEM_MATCHA, 100);
    await setStock(TEST_INVENTORY_ITEM_MILK, 1000);
    await setStock(TEST_INVENTORY_ITEM_OAT_MILK, 50);

    const resultPromise = caller.orders.create({
      branchId: TEST_BRANCH_ID,
      orderType: "dine-in",
      items: [
        {
          menuItemId: TEST_MENU_ITEM_ID,
          quantity: 1,
          options: [
            { optionId: TEST_OPTION_OAT_MILK_ID, priceAdjustment: "15.00", costAdjustment: "10.00" }
          ]
        }
      ]
    });

    await expect(resultPromise).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });

    // Verify no stock is deducted (matcha remains 100)
    expect(await getStock(TEST_INVENTORY_ITEM_MATCHA)).toBe(100);
    expect(await getStock(TEST_INVENTORY_ITEM_OAT_MILK)).toBe(50);
  });

  it("should successfully record recipe snapshots in posOrderRecipeSnapshots", async () => {
    await setStock(TEST_INVENTORY_ITEM_MATCHA, 100);
    await setStock(TEST_INVENTORY_ITEM_MILK, 1000);
    await setStock(TEST_INVENTORY_ITEM_COOL_PACK, 10);

    const result = await caller.orders.create({
      branchId: TEST_BRANCH_ID,
      orderType: "dine-in",
      items: [
        {
          menuItemId: TEST_MENU_ITEM_ID,
          quantity: 2, // ordered quantity = 2
          options: [
            { optionId: TEST_OPTION_COOL_PACK_ID, priceAdjustment: "10.00", costAdjustment: "5.00" }
          ]
        }
      ]
    });
    createdOrderIds.push(result.id);

    await caller.orders.complete({ orderId: result.id });

    // Verify snapshots in database
    const db = await getDb();
    if (!db) throw new Error("DB not available");

    const orderItems = await db.select().from(posOrderItems).where(eq(posOrderItems.orderId, result.id));
    expect(orderItems.length).toBe(1);
    const orderItemId = orderItems[0].id;

    const { posOrderRecipeSnapshots } = await import("../drizzle/schema");
    const snapshots = await db.select().from(posOrderRecipeSnapshots).where(eq(posOrderRecipeSnapshots.orderItemId, orderItemId));
    
    // We expect 3 snapshot rows: Matcha (base), Milk (base), Cool Pack (option)
    expect(snapshots.length).toBe(3);

    const matchaSnap = snapshots.find(s => s.inventoryItemId === TEST_INVENTORY_ITEM_MATCHA);
    expect(matchaSnap).toBeDefined();
    expect(Number(matchaSnap!.quantityUsed)).toBe(10); // 5g * 2 qty
    expect(matchaSnap!.effectSource).toBe("base");

    const milkSnap = snapshots.find(s => s.inventoryItemId === TEST_INVENTORY_ITEM_MILK);
    expect(milkSnap).toBeDefined();
    expect(Number(milkSnap!.quantityUsed)).toBe(400); // 200ml * 2 qty
    expect(milkSnap!.effectSource).toBe("base");

    const coolPackSnap = snapshots.find(s => s.inventoryItemId === TEST_INVENTORY_ITEM_COOL_PACK);
    expect(coolPackSnap).toBeDefined();
    expect(Number(coolPackSnap!.quantityUsed)).toBe(2); // 1 pc * 2 qty
    expect(coolPackSnap!.effectSource).toBe("option");
    expect(coolPackSnap!.optionId).toBe(TEST_OPTION_COOL_PACK_ID);
  });
});
