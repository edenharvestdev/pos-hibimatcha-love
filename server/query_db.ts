import "dotenv/config";
import { getDb } from "./db";
import { branches } from "../drizzle/schema";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    return;
  }
  const branchesList = await db.select().from(branches);
  console.log("Branches list:");
  branchesList.forEach(b => {
    console.log(`- ID: ${b.id}, Name: ${b.name}, Code: ${b.branchCode}, Type: ${b.branchType}, Status: ${b.status}`);
  });

  process.exit(0);
}

main().catch(console.error);
