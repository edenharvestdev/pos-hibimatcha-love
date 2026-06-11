import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { eq, and, inArray } from "drizzle-orm";
import {
  branches,
  staff,
  staffBranches,
  posMenuItems,
  posBranchMenuItems,
  posCategories,
  posInventoryItems,
  posBranchInventoryStock,
} from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";

function createSuperAdminContext(branchId = 1): TrpcContext {
  return {
    user: null,
    staff: {
      staffId: 1,
      role: "super_admin",
      primaryBranchId: 1,
      currentBranchId: branchId,
      employeeCode: "HMC-0001",
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {}, cookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function createBranchAdminContext(branchId: number, staffId = 2): TrpcContext {
  return {
    user: null,
    staff: {
      staffId,
      role: "staff_admin",
      primaryBranchId: branchId,
      currentBranchId: branchId,
      employeeCode: `HMC-000${staffId}`,
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {}, cookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("Branch Data Isolation", () => {
  const BRANCH_A_ID = 2; // Ladprao 71 (usually exists)
  const BRANCH_B_ID = 3; // Ari (usually exists)

  let staffAId: number;
  let staffBId: number;
  let menuItemAId: number;
  let menuItemBId: number;
  let categoryAId: number;
  let categoryBId: number;
  let inventoryAId: number;
  let inventoryBId: number;

  beforeEach(async () => {
    const db = await getDb();
    if (!db) return;

    // 1. Create staff for Branch A and Branch B
    const [insStaffA] = await db.insert(staff).values({
      firstName: "Staff Branch A",
      employeeCode: "TS-A-" + Date.now().toString(36),
      role: "staff",
      status: "active",
    });
    staffAId = (insStaffA as any).insertId;
    await db.insert(staffBranches).values({ staffId: staffAId, branchId: BRANCH_A_ID, isPrimary: true });

    const [insStaffB] = await db.insert(staff).values({
      firstName: "Staff Branch B",
      employeeCode: "TS-B-" + Date.now().toString(36),
      role: "staff",
      status: "active",
    });
    staffBId = (insStaffB as any).insertId;
    await db.insert(staffBranches).values({ staffId: staffBId, branchId: BRANCH_B_ID, isPrimary: true });

    // 2. Create menu items and map to Branch A and Branch B
    const [insItemA] = await db.insert(posMenuItems).values({
      name: "Chai Branch A",
      basePrice: "99.00",
    });
    menuItemAId = (insItemA as any).insertId;
    await db.insert(posBranchMenuItems).values({ branchId: BRANCH_A_ID, menuItemId: menuItemAId, isAvailable: true });

    const [insItemB] = await db.insert(posMenuItems).values({
      name: "Matcha Branch B",
      basePrice: "120.00",
    });
    menuItemBId = (insItemB as any).insertId;
    await db.insert(posBranchMenuItems).values({ branchId: BRANCH_B_ID, menuItemId: menuItemBId, isAvailable: true });

    // 3. Create Categories
    const [insCatA] = await db.insert(posCategories).values({
      name: "Cat Branch A",
      branchId: BRANCH_A_ID,
    });
    categoryAId = (insCatA as any).insertId;

    const [insCatB] = await db.insert(posCategories).values({
      name: "Cat Branch B",
      branchId: BRANCH_B_ID,
    });
    categoryBId = (insCatB as any).insertId;

    // 4. Create Inventory items and stock mapping
    const [insInvA] = await db.insert(posInventoryItems).values({
      name: "Inv Branch A",
    });
    inventoryAId = (insInvA as any).insertId;
    await db.insert(posBranchInventoryStock).values({ branchId: BRANCH_A_ID, inventoryItemId: inventoryAId, currentStock: "10.0" });

    const [insInvB] = await db.insert(posInventoryItems).values({
      name: "Inv Branch B",
    });
    inventoryBId = (insInvB as any).insertId;
    await db.insert(posBranchInventoryStock).values({ branchId: BRANCH_B_ID, inventoryItemId: inventoryBId, currentStock: "20.0" });
  });

  afterEach(async () => {
    const db = await getDb();
    if (!db) return;

    // Cleanup all created records
    await db.delete(staffBranches).where(inArray(staffBranches.staffId, [staffAId, staffBId]));
    await db.delete(staff).where(inArray(staff.id, [staffAId, staffBId]));

    await db.delete(posBranchMenuItems).where(inArray(posBranchMenuItems.menuItemId, [menuItemAId, menuItemBId]));
    await db.delete(posMenuItems).where(inArray(posMenuItems.id, [menuItemAId, menuItemBId]));

    await db.delete(posCategories).where(inArray(posCategories.id, [categoryAId, categoryBId]));

    await db.delete(posBranchInventoryStock).where(inArray(posBranchInventoryStock.inventoryItemId, [inventoryAId, inventoryBId]));
    await db.delete(posInventoryItems).where(inArray(posInventoryItems.id, [inventoryAId, inventoryBId]));
  });

  describe("Staff Isolation", () => {
    it("restricts branch admin listing to staff in their active branch context", async () => {
      const ctx = createBranchAdminContext(BRANCH_A_ID);
      const caller = appRouter.createCaller(ctx);

      const list = await caller.staff.list({});
      const hasA = list.some(s => s.id === staffAId);
      const hasB = list.some(s => s.id === staffBId);

      expect(hasA).toBe(true);
      expect(hasB).toBe(false);
    });

    it("prevents branch admin from viewing staff details from another branch", async () => {
      const ctx = createBranchAdminContext(BRANCH_A_ID);
      const caller = appRouter.createCaller(ctx);

      await expect(caller.staff.getById({ id: staffBId })).rejects.toThrow();
    });

    it("prevents branch admin from updating or archiving staff in another branch", async () => {
      const ctx = createBranchAdminContext(BRANCH_A_ID);
      const caller = appRouter.createCaller(ctx);

      await expect(caller.staff.update({ id: staffBId, firstName: "Hacker" })).rejects.toThrow();
      await expect(caller.staff.archive({ id: staffBId })).rejects.toThrow();
    });
  });

  describe("Menu Isolation", () => {
    it("restricts branch admin menu list query to assigned items", async () => {
      const ctx = createBranchAdminContext(BRANCH_A_ID);
      const caller = appRouter.createCaller(ctx);

      const list = await caller.menu.list({});
      const hasA = list.some(m => m.id === menuItemAId);
      const hasB = list.some(m => m.id === menuItemBId);

      expect(hasA).toBe(true);
      expect(hasB).toBe(false);
    });

    it("prevents branch admin from viewing or updating menu items from another branch", async () => {
      const ctx = createBranchAdminContext(BRANCH_A_ID);
      const caller = appRouter.createCaller(ctx);

      await expect(caller.menu.getById({ id: menuItemBId })).rejects.toThrow();
      await expect(caller.menu.update({ id: menuItemBId, name: "Hacker Menu" })).rejects.toThrow();
    });
  });

  describe("Category Isolation", () => {
    it("restricts category listing to global and branch-specific ones", async () => {
      const ctx = createBranchAdminContext(BRANCH_A_ID);
      const caller = appRouter.createCaller(ctx);

      const list = await caller.categories.list({});
      const hasA = list.some(c => c.id === categoryAId);
      const hasB = list.some(c => c.id === categoryBId);

      expect(hasA).toBe(true);
      expect(hasB).toBe(false);
    });

    it("prevents branch admin from updating categories in other branches", async () => {
      const ctx = createBranchAdminContext(BRANCH_A_ID);
      const caller = appRouter.createCaller(ctx);

      await expect(caller.categories.update({ id: categoryBId, name: "Hacker Cat" })).rejects.toThrow();
    });
  });

  describe("Inventory Isolation", () => {
    it("restricts item list to items with active branch stock", async () => {
      const ctx = createBranchAdminContext(BRANCH_A_ID);
      const caller = appRouter.createCaller(ctx);

      const list = await caller.inventory.listItems({});
      const hasA = list.some(i => i.id === inventoryAId);
      const hasB = list.some(i => i.id === inventoryBId);

      expect(hasA).toBe(true);
      expect(hasB).toBe(false);
    });

    it("prevents stock adjustment for items in other branches", async () => {
      const ctx = createBranchAdminContext(BRANCH_A_ID);
      const caller = appRouter.createCaller(ctx);

      await expect(caller.inventory.adjustStock({
        branchId: BRANCH_B_ID,
        itemId: inventoryBId,
        quantity: 5,
        reason: "Hacker adjust",
      })).rejects.toThrow();
    });
  });
});
