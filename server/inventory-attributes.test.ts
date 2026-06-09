import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import { posInventoryAttributes, posInventoryAttributeOptions } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const adminCtx: TrpcContext = {
  user: null,
  staff: {
    staffId: 1,
    employeeCode: "HMC-0001",
    role: "super_admin",
    primaryBranchId: 1,
    currentBranchId: 1,
  },
  req: { protocol: "https", headers: {} } as any,
  res: { cookie: () => {}, clearCookie: () => {} } as any,
};

const caller = appRouter.createCaller(adminCtx);

describe("inventoryAttributes router", () => {
  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB not available");

    // Clean up existing attributes for categoryId: 2 to ensure deterministic seeding
    const existing = await db
      .select()
      .from(posInventoryAttributes)
      .where(eq(posInventoryAttributes.categoryId, 2));

    if (existing.length < 3) {
      await db.delete(posInventoryAttributes).where(eq(posInventoryAttributes.categoryId, 2));

      // Seed variety
      const [variety] = await db.insert(posInventoryAttributes).values({
        categoryId: 2,
        attributeKey: "variety",
        labelTh: "สายพันธุ์",
        labelEn: "Variety",
        fieldType: "dropdown",
        isRequired: true,
        sortOrder: 1,
        isActive: true,
      } as any).$returningId();

      await db.insert(posInventoryAttributeOptions).values({
        attributeId: variety.id,
        value: "Samidori",
        labelTh: "ซามิโดริ",
        labelEn: "Samidori",
        sortOrder: 1,
        isActive: true,
      });

      // Seed grade
      await db.insert(posInventoryAttributes).values({
        categoryId: 2,
        attributeKey: "grade",
        labelTh: "เกรด",
        labelEn: "Grade",
        fieldType: "dropdown",
        isRequired: true,
        sortOrder: 2,
        isActive: true,
      } as any);

      // Seed origin
      await db.insert(posInventoryAttributes).values({
        categoryId: 2,
        attributeKey: "origin",
        labelTh: "แหล่งปลูก",
        labelEn: "Origin",
        fieldType: "dropdown",
        isRequired: true,
        sortOrder: 3,
        isActive: true,
      } as any);
    }
  });

  it("listByCategory returns attributes with options for a seeded category", async () => {
    // Category 2 = Matcha (seeded with variety, grade, origin)
    const result = await caller.inventoryAttributes.listByCategory({ categoryId: 2 });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(3);
    // Each attribute should have options array
    const variety = result.find((a: any) => a.attributeKey === "variety");
    expect(variety).toBeDefined();
    expect(variety!.labelTh).toBe("สายพันธุ์");
    expect(Array.isArray(variety!.options)).toBe(true);
    expect(variety!.options.length).toBeGreaterThanOrEqual(1);
  });

  it("listByCategory returns empty array for category with no attributes", async () => {
    // Category 999 doesn't exist
    const result = await caller.inventoryAttributes.listByCategory({ categoryId: 999 });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it("addOption creates a new option for an attribute", async () => {
    // Get an attribute first
    const attrs = await caller.inventoryAttributes.listByCategory({ categoryId: 2 });
    const varietyAttr = attrs.find((a: any) => a.attributeKey === "variety");
    expect(varietyAttr).toBeDefined();

    const testValue = `test_opt_${Date.now()}`;
    const result = await caller.inventoryAttributes.addOption({
      attributeId: varietyAttr!.id,
      value: testValue,
      labelTh: "ทดสอบ",
      labelEn: "Test",
    });
    expect(result).toBeDefined();
    expect(result.value).toBe(testValue);
    expect(result.id).toBeGreaterThan(0);
  });
});
