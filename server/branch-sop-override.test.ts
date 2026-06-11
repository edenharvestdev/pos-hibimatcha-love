import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { eq, and } from "drizzle-orm";
import {
  branches,
  posBranchPaymentSettings,
  posSops,
  posSopVariantRequests,
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

describe("Branch Settings & SOP Overrides", () => {
  const TEST_BRANCH_ID = 2; // Ladprao 71 (usually exists)
  let hqId = 1;

  beforeEach(async () => {
    const db = await getDb();
    if (db) {
      // Find dynamic HQ ID
      const [hq] = await db.select().from(branches).where(eq(branches.branchType, "hq")).limit(1);
      if (hq) hqId = hq.id;

      // Clean up any test settings or sops before tests
      await db.delete(posBranchPaymentSettings).where(eq(posBranchPaymentSettings.branchId, TEST_BRANCH_ID));
      await db.delete(posSops).where(eq(posSops.branchId, TEST_BRANCH_ID));
      await db.delete(posSopVariantRequests).where(eq(posSopVariantRequests.branchId, TEST_BRANCH_ID));
    }
  });

  afterEach(async () => {
    const db = await getDb();
    if (db) {
      // Clean up test data after tests
      await db.delete(posBranchPaymentSettings).where(eq(posBranchPaymentSettings.branchId, TEST_BRANCH_ID));
      await db.delete(posSops).where(eq(posSops.branchId, TEST_BRANCH_ID));
      await db.delete(posSopVariantRequests).where(eq(posSopVariantRequests.branchId, TEST_BRANCH_ID));
    }
  });

  describe("POS Payment Settings Inheritance", () => {
    it("falls back to HQ settings and returns isCustom=false if no custom settings exist", async () => {
      const db = await getDb();
      if (!db) return;

      // Ensure HQ settings exist
      const [hqExists] = await db.select().from(posBranchPaymentSettings).where(eq(posBranchPaymentSettings.branchId, hqId));
      if (!hqExists) {
        await db.insert(posBranchPaymentSettings).values({
          branchId: hqId,
          promptpayId: "0951234567",
          promptpayName: "HQ Default",
        });
      }

      const ctx = createSuperAdminContext(TEST_BRANCH_ID);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.branchSettings.getPaymentSettings({ branchId: TEST_BRANCH_ID });
      expect(result).not.toBeNull();
      expect(result?.isCustom).toBe(false);
      expect(result?.promptpayId).toBe(hqExists?.promptpayId || "0951234567");
    });

    it("returns custom settings with isCustom=true if they are configured specifically for the branch", async () => {
      const db = await getDb();
      if (!db) return;

      // Create branch-specific settings
      await db.insert(posBranchPaymentSettings).values({
        branchId: TEST_BRANCH_ID,
        promptpayId: "0888888888",
        promptpayName: "Branch Custom",
      });

      const ctx = createSuperAdminContext(TEST_BRANCH_ID);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.branchSettings.getPaymentSettings({ branchId: TEST_BRANCH_ID });
      expect(result).not.toBeNull();
      expect(result?.isCustom).toBe(true);
      expect(result?.promptpayId).toBe("0888888888");
      expect(result?.promptpayName).toBe("Branch Custom");
    });

    it("can delete branch-specific settings and fall back to HQ again", async () => {
      const db = await getDb();
      if (!db) return;

      // Create branch-specific settings
      await db.insert(posBranchPaymentSettings).values({
        branchId: TEST_BRANCH_ID,
        promptpayId: "0888888888",
        promptpayName: "Branch Custom",
      });

      const ctx = createSuperAdminContext(TEST_BRANCH_ID);
      const caller = appRouter.createCaller(ctx);

      // Verify custom settings first
      let settings = await caller.branchSettings.getPaymentSettings({ branchId: TEST_BRANCH_ID });
      expect(settings?.isCustom).toBe(true);

      // Delete custom settings
      const deleteResult = await caller.branchSettings.deletePaymentSettings({ branchId: TEST_BRANCH_ID });
      expect(deleteResult.success).toBe(true);

      // Verify they now fall back to HQ
      settings = await caller.branchSettings.getPaymentSettings({ branchId: TEST_BRANCH_ID });
      expect(settings?.isCustom).toBe(false);
    });
  });

  describe("SOP Overrides and Variant Request materialization", () => {
    it("filters list and replaces master SOP with branch override when branchId is active", async () => {
      const db = await getDb();
      if (!db) return;

      // 1. Create a master SOP
      const [insertMaster] = await db.insert(posSops).values({
        title: "Master Chai Latte",
        slug: "master-chai-latte-" + Date.now().toString(36),
        content: JSON.stringify([{ type: "paragraph", text: "Whisk chai with milk" }]),
        status: "published",
        version: 1,
      });
      const masterId = (insertMaster as any).insertId;

      // 2. Create a branch-specific override
      const [insertOverride] = await db.insert(posSops).values({
        title: "Master Chai Latte",
        masterSopId: masterId,
        branchId: TEST_BRANCH_ID,
        slug: `master-chai-latte-branch-${TEST_BRANCH_ID}`,
        content: JSON.stringify([{ type: "paragraph", text: "Special branch recipe: use soy milk" }]),
        status: "published",
        version: 1,
      });
      const overrideId = (insertOverride as any).insertId;

      const ctx = createSuperAdminContext(TEST_BRANCH_ID);
      const caller = appRouter.createCaller(ctx);

      // Query list for this branch
      const list = await caller.sop.list({ branchId: TEST_BRANCH_ID, status: "published" });

      // The master SOP should be replaced by the branch override, so masterId is NOT present, but overrideId IS present
      const hasMaster = list.some(s => s.id === masterId);
      const hasOverride = list.some(s => s.id === overrideId);

      expect(hasMaster).toBe(false);
      expect(hasOverride).toBe(true);

      // Cleanup master
      await db.delete(posSops).where(eq(posSops.id, masterId));
      await db.delete(posSops).where(eq(posSops.id, overrideId));
    });

    it("materializes override in posSops when variant request is approved", async () => {
      const db = await getDb();
      if (!db) return;

      // 1. Create a master SOP
      const [insertMaster] = await db.insert(posSops).values({
        title: "Master Matcha Milk",
        slug: "master-matcha-milk-" + Date.now().toString(36),
        content: JSON.stringify([{ type: "paragraph", text: "Whisk matcha" }]),
        status: "published",
        version: 1,
      });
      const masterId = (insertMaster as any).insertId;

      // 2. Create a variant request for this branch
      const [insertRequest] = await db.insert(posSopVariantRequests).values({
        masterSopId: masterId,
        branchId: TEST_BRANCH_ID,
        proposedContent: JSON.stringify([{ type: "paragraph", text: "Matcha with honey" }]),
        changeReason: "Local customer request",
        status: "pending",
      });
      const requestId = (insertRequest as any).insertId;

      const ctx = createSuperAdminContext(TEST_BRANCH_ID);
      const caller = appRouter.createCaller(ctx);

      // Approve the variant request
      const approvalResult = await caller.sop.approveVariant({ variantId: requestId, notes: "Approved for local customize" });
      expect(approvalResult.status).toBe("approved");

      // Verify that a branch override has been materialized in posSops
      const [override] = await db.select().from(posSops).where(and(
        eq(posSops.masterSopId, masterId),
        eq(posSops.branchId, TEST_BRANCH_ID)
      ));
      expect(override).toBeDefined();
      expect(override.status).toBe("published");
      expect(typeof override.content).toBe("string");
      expect(override.content).toContain("Matcha with honey");

      // Cleanup
      await db.delete(posSops).where(eq(posSops.id, masterId));
      if (override) {
        await db.delete(posSops).where(eq(posSops.id, override.id));
      }
    });
  });
});
