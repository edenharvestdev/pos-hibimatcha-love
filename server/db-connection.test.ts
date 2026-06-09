import { describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

describe("Database connection", () => {
  it("connects to DB successfully", async () => {
    const dbUrl = process.env.DATABASE_URL;
    expect(dbUrl).toBeTruthy();
    expect(dbUrl).toContain("mysql://");

    const db = drizzle(dbUrl!);
    const result = await db.execute(sql`SELECT 1 as ping`);
    expect(result).toBeTruthy();
  });
});
