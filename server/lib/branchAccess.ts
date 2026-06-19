import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { posBranchMenuItems } from "../../drizzle/schema";
import type { getDb } from "../db";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

type StaffCtx = {
  role: string;
  currentBranchId: number | null | undefined;
};

/** Non–super-admin staff may only access menu items distributed to their branch. */
export async function assertMenuItemAccessible(
  db: Db,
  staff: StaffCtx,
  menuItemId: number,
): Promise<void> {
  if (staff.role === "super_admin") return;
  if (!staff.currentBranchId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Branch context required" });
  }
  const [assigned] = await db.select({ id: posBranchMenuItems.id })
    .from(posBranchMenuItems)
    .where(and(
      eq(posBranchMenuItems.menuItemId, menuItemId),
      eq(posBranchMenuItems.branchId, staff.currentBranchId),
    ))
    .limit(1);
  if (!assigned) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Menu item not assigned to your branch" });
  }
}

/** Non–super-admin staff may not mutate branch-scoped categories outside their branch. */
export function assertCategoryAccessible(
  staff: StaffCtx,
  category: { branchId: number | null | undefined },
): void {
  if (staff.role === "super_admin") return;
  if (category.branchId !== null && category.branchId !== undefined && category.branchId !== staff.currentBranchId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Category does not belong to your branch" });
  }
}
