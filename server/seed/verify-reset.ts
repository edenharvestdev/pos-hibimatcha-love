/**
 * verify-reset.ts
 * ตรวจสอบว่า reset สำเร็จ:
 *  - ตาราง business data ว่างเปล่า
 *  - branches และ staff ยังอยู่ครบ
 *
 * Run: npx tsx server/seed/verify-reset.ts
 */

import "dotenv/config";
import { sql } from "drizzle-orm";
import { getDb } from "../db";

const SHOULD_BE_EMPTY = [
  "pos_categories",
  "pos_menu_items",
  "pos_option_groups",
  "pos_options",
  "pos_branch_menu_items",
  "pos_menu_item_option_groups",
  "pos_orders",
  "pos_order_items",
  "pos_order_item_options",
  "pos_order_payments",
  "pos_kitchen_tickets",
  "pos_daily_summaries",
  "pos_inventory_categories",
  "pos_inventory_items",
  "pos_branch_inventory_stock",
  "pos_inventory_movements",
  "pos_recipe_ingredients",
  "pos_inventory_attributes",
  "pos_inventory_attribute_options",
  "pos_purchase_orders",
  "pos_purchase_order_items",
  "pos_suppliers",
  "pos_requisitions",
  "pos_requisition_items",
  "pos_sop_categories",
  "pos_sops",
  "pos_sop_tasks",
  "pos_sop_acknowledgments",
  "pos_sop_variant_requests",
  "pos_discounts",
  "pos_payment_methods",
  "pos_printer_configs",
  "pos_branch_payment_settings",
  "pos_export_documents",
  "pos_expense_receipts",
  "pos_expense_receipt_items",
];

const SHOULD_HAVE_DATA = [
  "branches",
  "staff",
  "staff_branches",
];

async function verify() {
  const db = await getDb();
  if (!db) { console.error("❌  Cannot connect to DB"); process.exit(1); }

  console.log("🔍  Verifying database state after reset...\n");

  let hasError = false;

  console.log("── Tables that should be EMPTY ─────────────────────────────");
  for (const table of SHOULD_BE_EMPTY) {
    const [row] = await db.execute(sql.raw(`SELECT COUNT(*) as cnt FROM \`${table}\``)) as any;
    const cnt = Number((row as any)[0]?.cnt ?? (row as any)?.cnt ?? 0);
    if (cnt === 0) {
      console.log(`  ✅  ${table.padEnd(40)} (empty)`);
    } else {
      console.log(`  ❌  ${table.padEnd(40)} ⚠️  STILL HAS ${cnt} rows!`);
      hasError = true;
    }
  }

  console.log("\n── Tables that should have DATA ────────────────────────────");
  for (const table of SHOULD_HAVE_DATA) {
    const [row] = await db.execute(sql.raw(`SELECT COUNT(*) as cnt FROM \`${table}\``)) as any;
    const cnt = Number((row as any)[0]?.cnt ?? (row as any)?.cnt ?? 0);
    if (cnt > 0) {
      console.log(`  ✅  ${table.padEnd(40)} (${cnt} rows)`);
    } else {
      console.log(`  ❌  ${table.padEnd(40)} ⚠️  EMPTY — no accounts!`);
      hasError = true;
    }
  }

  // Show staff list
  console.log("\n── Staff accounts remaining ────────────────────────────────");
  const staffRows = await db.execute(sql.raw(
    `SELECT employeeCode, firstName, lastName, role, status FROM staff ORDER BY role, employeeCode`
  )) as any;
  const rows = Array.isArray(staffRows[0]) ? staffRows[0] : staffRows;
  for (const s of rows as any[]) {
    console.log(`  👤  ${String(s.employeeCode).padEnd(12)} ${String(s.firstName ?? '').padEnd(15)} role=${s.role}  status=${s.status}`);
  }

  // Show branch list
  console.log("\n── Branches remaining ──────────────────────────────────────");
  const branchRows = await db.execute(sql.raw(
    `SELECT branchCode, name, branchType, status FROM branches ORDER BY id`
  )) as any;
  const brows = Array.isArray(branchRows[0]) ? branchRows[0] : branchRows;
  for (const b of brows as any[]) {
    console.log(`  🏪  ${String(b.branchCode ?? '').padEnd(12)} ${String(b.name).padEnd(25)} type=${b.branchType}  status=${b.status}`);
  }

  console.log("\n" + (hasError
    ? "⚠️   Some issues found — review above"
    : "🎉  All good! Database is clean and staff/branches are intact."
  ));

  process.exit(hasError ? 1 : 0);
}

verify().catch((err) => { console.error("Fatal:", err); process.exit(1); });
