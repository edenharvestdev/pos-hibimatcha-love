import { test } from "vitest";
import { getDb } from "./db";

test("print database info", async () => {
  console.log("TEST DATABASE_URL:", process.env.DATABASE_URL);
  const db = await getDb();
  console.log("DB instance exists:", !!db);
  if (db) {
    try {
      const res = await db.execute("SELECT 1");
      console.log("DB select 1 res:", res);
    } catch (e) {
      console.error("Test query error:", e);
    }
  }
});
