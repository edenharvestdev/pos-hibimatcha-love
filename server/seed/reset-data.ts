/**
 * reset-data.ts
 *
 * Clears ALL business data from the database while preserving:
 *  - branches (สาขา)
 *  - staff + staffBranches (accounts / login credentials)
 *
 * Tables cleared (in FK-safe order):
 *  Menu: pos_order_item_options, pos_order_items, pos_order_payments,
 *        pos_kitchen_tickets, pos_orders, pos_daily_summaries,
 *        pos_branch_menu_items, pos_menu_item_option_groups,
 *        pos_menu_items, pos_options, pos_option_groups, pos_categories
 *
 *  Inventory: pos_branch_inventory_stock, pos_inventory_movements,
 *             pos_recipe_ingredients, pos_inventory_items,
 *             pos_inventory_categories,
 *             pos_inventory_attribute_options, pos_inventory_attributes
 *
 *  Purchases: pos_purchase_order_items, pos_purchase_orders, pos_suppliers
 *
 *  Requisitions: pos_requisition_items, pos_requisitions
 *
 *  SOP: pos_sop_acknowledgments, pos_sop_variant_requests,
 *       pos_sop_tasks, pos_sops, pos_sop_categories
 *
 *  Misc: pos_discounts, pos_payment_methods, pos_printer_configs,
 *        pos_branch_payment_settings, pos_export_documents,
 *        pos_expense_receipt_items, pos_expense_receipts
 *
 * Run with: npx tsx server/seed/reset-data.ts
 */

import "dotenv/config";
import { sql } from "drizzle-orm";
import { getDb } from "../db";

const TABLES_TO_CLEAR = [
  // ── Order detail (children first) ─────────────────────────────────
  "pos_order_item_options",
  "pos_order_items",
  "pos_order_payments",
  "pos_kitchen_tickets",
  "pos_orders",
  "pos_daily_summaries",

  // ── Menu ──────────────────────────────────────────────────────────
  "pos_branch_menu_items",
  "pos_menu_item_option_groups",
  "pos_menu_items",
  "pos_options",
  "pos_option_groups",
  "pos_categories",

  // ── Inventory ─────────────────────────────────────────────────────
  "pos_branch_inventory_stock",
  "pos_inventory_movements",
  "pos_recipe_ingredients",
  "pos_inventory_items",
  "pos_inventory_categories",
  "pos_inventory_attribute_options",
  "pos_inventory_attributes",

  // ── Purchasing ────────────────────────────────────────────────────
  "pos_purchase_order_items",
  "pos_purchase_orders",
  "pos_suppliers",

  // ── Requisitions ──────────────────────────────────────────────────
  "pos_requisition_items",
  "pos_requisitions",

  // ── SOP ───────────────────────────────────────────────────────────
  "pos_sop_acknowledgments",
  "pos_sop_variant_requests",
  "pos_sop_tasks",
  "pos_sops",
  "pos_sop_categories",

  // ── Misc ──────────────────────────────────────────────────────────
  "pos_discounts",
  "pos_payment_methods",
  "pos_printer_configs",
  "pos_branch_payment_settings",
  "pos_export_documents",
  "pos_expense_receipt_items",
  "pos_expense_receipts",
];

async function resetData() {
  const db = await getDb();
  if (!db) {
    console.error("❌  Cannot connect to database");
    process.exit(1);
  }

  console.log("⚠️   Starting data reset — branches & staff will be KEPT");
  console.log(`    Clearing ${TABLES_TO_CLEAR.length} tables...\n`);

  // Disable FK checks so we can truncate in any order safely
  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);

  for (const table of TABLES_TO_CLEAR) {
    try {
      await db.execute(sql.raw(`DELETE FROM \`${table}\``));
      // Reset auto-increment
      await db.execute(sql.raw(`ALTER TABLE \`${table}\` AUTO_INCREMENT = 1`));
      console.log(`  ✅  Cleared ${table}`);
    } catch (err: any) {
      console.warn(`  ⚠️  Skipped ${table}: ${err?.message ?? err}`);
    }
  }

  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);

  console.log("\n🎉  Reset complete!");
  console.log("    Staff accounts and branches are unchanged.");
  console.log("    You can now log in as admin and enter your own data.\n");

  process.exit(0);
}

resetData().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
