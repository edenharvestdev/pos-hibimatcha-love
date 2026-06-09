import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * Create a mock context with staff admin authentication.
 * The staffAdminProcedure requires ctx.staff with role "super_admin" or "staff_admin".
 */
function createStaffAdminContext(): TrpcContext {
  return {
    user: null,
    staff: {
      staffId: 1,
      role: "super_admin",
      primaryBranchId: 1,
      currentBranchId: 1,
      employeeCode: "HMC-0001",
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

function createUnauthenticatedContext(): TrpcContext {
  return {
    user: null,
    staff: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

function createStaffOnlyContext(): TrpcContext {
  return {
    user: null,
    staff: {
      staffId: 3,
      role: "staff",
      primaryBranchId: 1,
      currentBranchId: 1,
      employeeCode: "HMC-STAFF",
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

describe("staff router", () => {
  describe("staff.list", () => {
    it("returns an array of staff members when authenticated as admin", async () => {
      const ctx = createStaffAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.staff.list({});
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      // Each staff should have basic fields
      const first = result[0];
      expect(first).toHaveProperty("id");
      expect(first).toHaveProperty("firstName");
      expect(first).toHaveProperty("employeeCode");
      expect(first).toHaveProperty("role");
    });

    it("rejects unauthenticated access with UNAUTHORIZED", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.staff.list({})).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("rejects regular staff (non-admin) with FORBIDDEN", async () => {
      const ctx = createStaffOnlyContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.staff.list({})).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });
  });

  describe("staff.create", () => {
    it("creates a new staff member and returns the record", async () => {
      const ctx = createStaffAdminContext();
      const caller = appRouter.createCaller(ctx);

      const uniqueId = Date.now();
      const result = await caller.staff.create({
        firstName: "VitestBulk",
        lastName: "TestUser",
        role: "staff",
        email: `vitest-bulk-${uniqueId}@test.local`,
      });

      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("employeeCode");
      expect(result.firstName).toBe("VitestBulk");
      expect(result.role).toBe("staff");
      expect(typeof result.id).toBe("number");
      expect(typeof result.employeeCode).toBe("string");
      expect(result.employeeCode.length).toBeGreaterThan(0);

      // Cleanup: archive the test staff
      await caller.staff.update({ id: result.id, status: "terminated" });
    });

    it("rejects unauthenticated create with UNAUTHORIZED", async () => {
      const ctx = createUnauthenticatedContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.staff.create({ firstName: "ShouldFail" })
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });
  });

  describe("staff.assignToBranches", () => {
    it("assigns branches to a staff member", async () => {
      const ctx = createStaffAdminContext();
      const caller = appRouter.createCaller(ctx);

      // First create a test staff
      const created = await caller.staff.create({
        firstName: "VitestAssign",
        role: "staff",
      });

      // Assign to branch 1
      const result = await caller.staff.assignToBranches({
        staffId: created.id,
        branchIds: [1],
      });

      expect(result).toHaveProperty("success", true);

      // Verify via getById
      const detail = await caller.staff.getById({ id: created.id });
      expect(detail.branchIds).toContain(1);

      // Cleanup
      await caller.staff.update({ id: created.id, status: "terminated" });
    });
  });
});
