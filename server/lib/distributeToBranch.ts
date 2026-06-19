import { and, eq, ne, sql } from "drizzle-orm";
import type { getDb } from "../db";
import {
  branches,
  posBranchInventoryStock,
  posBranchMenuItems,
  posInventoryItems,
  posMenuItems,
} from "../../drizzle/schema";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

const STOCK_SHARE = 0.25;
const MIN_STARTER_STOCK = 50;

export type DistributeResult = {
  menuLinks: number;
  stockRows: number;
};

/** Link all active menu items + starter consumable stock from HQ to one store branch. */
export async function distributeStarterPackToBranch(
  db: Db,
  branchId: number,
): Promise<DistributeResult> {
  const [branch] = await db.select().from(branches).where(eq(branches.id, branchId)).limit(1);
  if (!branch || branch.branchType === "hq") {
    return { menuLinks: 0, stockRows: 0 };
  }

  const [hq] = await db.select().from(branches).where(eq(branches.branchType, "hq")).limit(1);
  if (!hq) return { menuLinks: 0, stockRows: 0 };

  const menuItems = await db.select({ id: posMenuItems.id })
    .from(posMenuItems)
    .where(and(eq(posMenuItems.isActive, true), eq(posMenuItems.isArchived, false)));

  let menuLinks = 0;
  for (const item of menuItems) {
    await db.insert(posBranchMenuItems).values({
      branchId,
      menuItemId: item.id,
      isAvailable: true,
    }).onDuplicateKeyUpdate({ set: { isAvailable: true } });
    menuLinks++;
  }

  const hqStock = await db.select().from(posBranchInventoryStock)
    .where(eq(posBranchInventoryStock.branchId, hq.id));
  const consumables = await db.select({ id: posInventoryItems.id, sourceFlag: posInventoryItems.sourceFlag })
    .from(posInventoryItems)
    .where(eq(posInventoryItems.isActive, true));
  const consumableIds = new Set(
    consumables.filter((i) => i.sourceFlag === "hq_supply" || i.sourceFlag === "mixed").map((i) => i.id),
  );

  let stockRows = 0;
  for (const row of hqStock) {
    if (!consumableIds.has(row.inventoryItemId)) continue;
    const hqQty = Number(row.currentStock ?? 0);
    if (hqQty <= 0) continue;

    const transferQty = Math.min(Math.max(MIN_STARTER_STOCK, Math.floor(hqQty * STOCK_SHARE)), hqQty);

    await db.update(posBranchInventoryStock).set({
      currentStock: sql`${posBranchInventoryStock.currentStock} - ${transferQty}`,
    }).where(and(
      eq(posBranchInventoryStock.branchId, hq.id),
      eq(posBranchInventoryStock.inventoryItemId, row.inventoryItemId),
    ));

    await db.insert(posBranchInventoryStock).values({
      branchId,
      inventoryItemId: row.inventoryItemId,
      currentStock: String(transferQty),
      reservedStock: "0",
      lastReceivedAt: new Date(),
    }).onDuplicateKeyUpdate({
      set: {
        currentStock: sql`GREATEST(${posBranchInventoryStock.currentStock}, ${transferQty})`,
      },
    });
    stockRows++;
  }

  return { menuLinks, stockRows };
}

/** Distribute starter packs to every active non-HQ branch. */
export async function distributeStarterPackToAllStores(db: Db): Promise<DistributeResult> {
  const storeBranches = await db.select({ id: branches.id }).from(branches).where(
    and(eq(branches.status, "active"), ne(branches.branchType, "hq")),
  );

  let menuLinks = 0;
  let stockRows = 0;
  for (const { id } of storeBranches) {
    const result = await distributeStarterPackToBranch(db, id);
    menuLinks += result.menuLinks;
    stockRows += result.stockRows;
  }
  return { menuLinks, stockRows };
}
