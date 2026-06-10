import "dotenv/config";
import { getDb } from "./db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    return;
  }

  try {
    const dbs = await db.execute(sql`SHOW DATABASES`);
    console.log("Databases:", JSON.stringify(dbs, null, 2));

    const currentDb = await db.execute(sql`SELECT DATABASE()`);
    console.log("Current Database:", JSON.stringify(currentDb, null, 2));

    const tables = await db.execute(sql`SHOW TABLES`);
    console.log("Tables in current DB:", JSON.stringify(tables, null, 2));
  } catch (err) {
    console.error("Query failed:", err);
  }
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
