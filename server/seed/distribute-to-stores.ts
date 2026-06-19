/**
 * Distribute menu + starter stock from HQ to all active store branches.
 * Run after seed or when POS shows an empty menu at stores.
 *
 *   pnpm seed:distribute
 */

import "dotenv/config";
import { getDb } from "../db";
import { distributeStarterPackToAllStores } from "../lib/distributeToBranch";

export async function distributeToStores() {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL not configured");

  const { menuLinks, stockRows } = await distributeStarterPackToAllStores(db);
  console.log(`→ Menu: ${menuLinks} links · Stock: ${stockRows} rows`);
  console.log("\n✅ Store distribution complete.");
}

if (process.argv[1]?.endsWith("distribute-to-stores.ts")) {
  distributeToStores()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Distribution failed:", err);
      process.exit(1);
    });
}
