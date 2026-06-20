/**
 * Apply idempotent SQL migrations that drizzle-kit migrate cannot run on existing DBs.
 * Safe to re-run — skips columns that already exist.
 *
 *   pnpm db:migrate
 */
import "dotenv/config";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import mysql from "mysql2/promise";

const MIGRATIONS_DIR = join(process.cwd(), "drizzle");

async function createMigrationConnection(url: string) {
  const instance = process.env.INSTANCE_CONNECTION_NAME;
  if (instance) {
    const u = new URL(url);
    return mysql.createConnection({
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, ""),
      socketPath: `/cloudsql/${instance}`,
    });
  }
  return mysql.createConnection(url);
}

async function columnExists(conn: mysql.Connection, table: string, column: string): Promise<boolean> {
  const [rows] = await conn.query<mysql.RowDataPacket[]>(
    `SELECT COUNT(*) AS c FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  );
  return Number(rows[0]?.c ?? 0) > 0;
}

async function applyStatement(conn: mysql.Connection, sql: string): Promise<"ok" | "skip"> {
  const trimmed = sql.trim();
  if (!trimmed) return "skip";

  const addCol = trimmed.match(/^ALTER TABLE `?(\w+)`? ADD `?(\w+)`?/i);
  if (addCol) {
    const [, table, column] = addCol;
    if (await columnExists(conn, table, column)) {
      console.log(`  SKIP (exists): ${table}.${column}`);
      return "skip";
    }
  }

  try {
    await conn.query(trimmed);
    console.log(`  OK: ${trimmed.slice(0, 80)}…`);
    return "ok";
  } catch (err: any) {
    if (err.code === "ER_DUP_FIELDNAME" || err.code === "ER_TABLE_EXISTS_ERROR") {
      console.log(`  SKIP: ${trimmed.slice(0, 60)}…`);
      return "skip";
    }
    throw err;
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn("[migrate] DATABASE_URL not set — skipping migrations");
    return;
  }

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const conn = await createMigrationConnection(url);
  console.log(`Applying ${files.length} migration file(s)…`);

  for (const file of files) {
    const raw = readFileSync(join(MIGRATIONS_DIR, file), "utf-8");
    const statements = raw.split(/--> statement-breakpoint/).map((s) => s.trim()).filter(Boolean);
    if (statements.length === 0) continue;
    console.log(`\n→ ${file}`);
    for (const stmt of statements) {
      await applyStatement(conn, stmt);
    }
  }

  await conn.end();
  console.log("\n✅ Migrations complete.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
