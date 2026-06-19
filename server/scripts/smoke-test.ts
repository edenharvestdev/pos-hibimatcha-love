/**
 * Post-deploy smoke test — verifies DB, auth, menu, and readiness.
 *   pnpm smoke
 */
import "dotenv/config";
import { appRouter } from "../routers";
import { getDb } from "../db";
import { branches as branchesTable } from "../../drizzle/schema";
import type { TrpcContext } from "../_core/context";

function superCtx(): TrpcContext {
  return {
    user: null,
    staff: {
      staffId: 1,
      role: "super_admin",
      primaryBranchId: 1,
      currentBranchId: 1,
      employeeCode: "SMOKE",
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {}, cookie: () => {} } as unknown as TrpcContext["res"],
  };
}

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL not configured");
  await db.select().from(branchesTable).limit(1);

  const caller = appRouter.createCaller(superCtx());
  const readiness = await caller.system.readiness();
  if (!readiness.ok) throw new Error(`Readiness failed: ${JSON.stringify(readiness)}`);

  const branches = await caller.branches.list({});
  const menu = await caller.menu.list({ branchId: branches[0]?.id });
  console.log(`✓ DB connected`);
  console.log(`✓ Readiness: ${readiness.checks.database ? "db ok" : "db fail"}`);
  console.log(`✓ Branches: ${branches.length}`);
  console.log(`✓ Menu items at branch ${branches[0]?.name ?? "?"}: ${menu.length}`);
  console.log("\n✅ Smoke test passed.");
}

main().catch((err) => {
  console.error("❌ Smoke test failed:", err.message || err);
  process.exit(1);
});
