import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createSuperAdminCtx(): TrpcContext {
  return {
    user: null,
    staff: {
      staffId: 1,
      role: "super_admin",
      primaryBranchId: 1,
      currentBranchId: 1,
      employeeCode: "HMC-0001",
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {}, cookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("distribute & linked menus", () => {
  const caller = appRouter.createCaller(createSuperAdminCtx());

  describe("branches.distribute", () => {
    it("distributes menu items to branches and returns success", async () => {
      // Get first menu item
      const menus = await caller.menu.list({});
      if (menus.length === 0) return; // Skip if no menu items (cleared by admin)
      const firstMenu = menus[0];

      // Get first non-HQ branch
      const allBranches = await caller.branches.list({});
      const nonHqBranch = allBranches.find((b: any) => b.branchType !== "hq");
      expect(nonHqBranch).toBeDefined();

      // Distribute one menu item to one branch (entityType required)
      const result = await caller.branches.distribute({
        entityType: "menu_items",
        entityIds: [firstMenu.id],
        branchIds: [nonHqBranch!.id],
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.rowsAffected).toBeGreaterThanOrEqual(1);
    });
  });

  describe("options.listLinkedMenus + setLinkedMenus", () => {
    it("links menus to an option group and retrieves them", async () => {
      // Get an option group
      const groups = await caller.options.listGroups();
      expect(groups.length).toBeGreaterThan(0);
      const group = groups[0];

      // Get some menu items to link
      const menus = await caller.menu.list({});
      if (menus.length < 3) return; // Skip if no menu items (cleared by admin)
      const idsToLink = [menus[0].id, menus[1].id, menus[2].id];

      // Set linked menus
      const setResult = await caller.options.setLinkedMenus({
        optionGroupId: group.id,
        menuItemIds: idsToLink,
      });
      expect(setResult).toBeDefined();

      // Verify via listLinkedMenus
      const linked = await caller.options.listLinkedMenus({
        optionGroupId: group.id,
      });
      const linkedIds = linked.map((l: any) => l.menuItemId);
      for (const id of idsToLink) {
        expect(linkedIds).toContain(id);
      }
    });
  });
});
