import "dotenv/config";
import { getDb } from "../server/db";
import { sql } from "drizzle-orm";
import * as schema from "../drizzle/schema";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Database connection failed");
    return;
  }
  
  const tables = [
    { name: "branches", table: schema.branches },
    { name: "staff", table: schema.staff },
    { name: "staff_branches", table: schema.staffBranches },
    { name: "pos_categories", table: schema.posCategories },
    { name: "pos_menu_items", table: schema.posMenuItems },
    { name: "pos_branch_menu_items", table: schema.posBranchMenuItems },
    { name: "pos_payment_methods", table: schema.posPaymentMethods },
    { name: "pos_orders", table: schema.posOrders },
    { name: "pos_order_items", table: schema.posOrderItems },
    { name: "pos_order_payments", table: schema.posOrderPayments },
    { name: "pos_kitchen_tickets", table: schema.posKitchenTickets },
    { name: "pos_inventory_categories", table: schema.posInventoryCategories },
    { name: "pos_inventory_items", table: schema.posInventoryItems },
    { name: "pos_branch_inventory_stock", table: schema.posBranchInventoryStock },
    { name: "pos_inventory_movements", table: schema.posInventoryMovements },
    { name: "pos_recipe_ingredients", table: schema.posRecipeIngredients },
    { name: "pos_suppliers", table: schema.posSuppliers },
    { name: "pos_purchase_orders", table: schema.posPurchaseOrders },
    { name: "pos_sops", table: schema.posSops },
    { name: "pos_sop_acknowledgments", table: schema.posSopAcknowledgments },
    { name: "members", table: schema.members },
    { name: "member_points", table: schema.memberPoints },
    { name: "pos_branch_payment_settings", table: schema.posBranchPaymentSettings }
  ];

  console.log("Database Row Counts:");
  for (const t of tables) {
    try {
      const [countRes] = await db.select({ count: sql<number>`count(*)` }).from(t.table);
      console.log(`- ${t.name}: ${countRes?.count ?? 0} rows`);
    } catch (err: any) {
      console.error(`Error counting ${t.name}:`, err.message);
    }
  }
  process.exit(0);
}

main();
