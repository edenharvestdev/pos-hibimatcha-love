import { getDb } from "../server/db";
import { branches, staffBranches, posBranchMenuItems, posBranchInventoryStock } from "../drizzle/schema";
import { ne, eq } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Database connection failed");
    process.exit(1);
  }

  // 1. Find the Hibi House branch
  const hibiHouseList = await db.select().from(branches).where(eq(branches.branchCode, "0000")).limit(1);
  if (hibiHouseList.length === 0) {
    console.error("Hibi House branch (code 0000) not found in database.");
    process.exit(1);
  }
  const hibiHouse = hibiHouseList[0];
  const hibiHouseId = hibiHouse.id;
  console.log(`Found Hibi House (id: ${hibiHouseId}, code: ${hibiHouse.branchCode})`);

  // 2. Delete all other branches
  console.log("Deleting other branches...");
  await db.delete(branches).where(ne(branches.id, hibiHouseId));
  console.log("Deleted other branches");

  // 3. Clean up staff branch mappings to keep only Hibi House mappings
  console.log("Cleaning up staff branch mappings...");
  await db.delete(staffBranches).where(ne(staffBranches.branchId, hibiHouseId));

  // 4. Clean up branch menu items
  console.log("Cleaning up branch menu items...");
  await db.delete(posBranchMenuItems).where(ne(posBranchMenuItems.branchId, hibiHouseId));

  // 5. Clean up branch inventory stock
  console.log("Cleaning up branch inventory stock...");
  await db.delete(posBranchInventoryStock).where(ne(posBranchInventoryStock.branchId, hibiHouseId));

  console.log("Database clean up completed successfully!");
  process.exit(0);
}

main().catch(console.error);
