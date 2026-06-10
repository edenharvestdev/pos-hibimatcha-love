import "dotenv/config";
import { getDb } from "./db";
import { branches, posMenuItems, posRecipeIngredients, posInventoryItems, posBranchInventoryStock, posInventoryMovements, posOrders, posOrderItems } from "../drizzle/schema";
import { eq, like, and, sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    return;
  }

  console.log("=== 1. BRANCHES ===");
  const allBranches = await db.select().from(branches);
  console.log("Branches in DB:");
  allBranches.forEach(b => {
    console.log(`ID: ${b.id} | Code: ${b.branchCode} | Name: ${b.name}`);
  });

  console.log("\n=== 2. ALL MENU ITEMS (Top 30) ===");
  const allMenuItems = await db.select().from(posMenuItems).limit(30);
  allMenuItems.forEach(mi => {
    console.log(`ID: ${mi.id} | SKU: ${mi.sku} | Name: ${mi.name} | NameThai: ${mi.nameThai} | BasePrice: ${mi.basePrice} | SOP ID: ${mi.sopId}`);
  });

  console.log("\n=== 3. SEARCHING FOR LATTE OR MATCHA MENU ITEMS ===");
  const menuItems = await db.select().from(posMenuItems).where(like(posMenuItems.name, "%Matcha%"));
  console.log(`Found ${menuItems.length} Matcha items:`);
  menuItems.forEach(mi => {
    console.log(`ID: ${mi.id} | SKU: ${mi.sku} | Name: ${mi.name} | SOP ID: ${mi.sopId}`);
  });

  // Pick first Matcha Latte if exists
  const targetMenuId = menuItems.find(mi => mi.name.toLowerCase().includes("latte"))?.id || menuItems[0]?.id;
  if (targetMenuId) {
    console.log(`\n=== 4. RECIPE INGREDIENTS FOR MENU ITEM ID ${targetMenuId} ===`);
    const recipe = await db.select({
      id: posRecipeIngredients.id,
      inventoryItemId: posRecipeIngredients.inventoryItemId,
      quantity: posRecipeIngredients.quantity,
      unitOfMeasure: posRecipeIngredients.unitOfMeasure,
      itemName: posInventoryItems.name,
      itemSku: posInventoryItems.sku,
    }).from(posRecipeIngredients)
      .leftJoin(posInventoryItems, eq(posRecipeIngredients.inventoryItemId, posInventoryItems.id))
      .where(eq(posRecipeIngredients.menuItemId, targetMenuId));
    
    if (recipe.length === 0) {
      console.log("No recipe ingredients linked to this menu item!");
    } else {
      recipe.forEach(r => {
        console.log(`Inventory ID: ${r.inventoryItemId} | Name: ${r.itemName} | Qty: ${r.quantity} | Unit: ${r.unitOfMeasure}`);
      });
    }
  }

  // Find Lad Phrao branch row
  const lpBranch = allBranches.find(b => b.name.includes("ลาดพร้าว") || (b.branchCode && b.branchCode.includes("107")) || (b.branchCode && b.branchCode.includes("HB01")));
  if (lpBranch) {
    console.log(`\n=== 5. STOCK AT BRANCH "${lpBranch.name}" (ID: ${lpBranch.id}) ===`);
    const stocks = await db.select({
      itemId: posBranchInventoryStock.inventoryItemId,
      currentStock: posBranchInventoryStock.currentStock,
      itemName: posInventoryItems.name,
      itemSku: posInventoryItems.sku,
      unit: posInventoryItems.unitOfMeasure,
    }).from(posBranchInventoryStock)
      .leftJoin(posInventoryItems, eq(posBranchInventoryStock.inventoryItemId, posInventoryItems.id))
      .where(eq(posBranchInventoryStock.branchId, lpBranch.id));

    if (stocks.length === 0) {
      console.log("No stock entries found for this branch!");
    } else {
      console.log(`Total stock rows: ${stocks.length}`);
      // Show first 20 entries
      stocks.slice(0, 20).forEach(s => {
        console.log(`Item ID: ${s.itemId} | Name: ${s.itemName} | Stock: ${s.currentStock} | Unit: ${s.unit}`);
      });
    }

    console.log(`\n=== 6. RECENT STOCK MOVEMENTS AT BRANCH ID ${lpBranch.id} ===`);
    const movements = await db.select({
      id: posInventoryMovements.id,
      itemId: posInventoryMovements.inventoryItemId,
      quantity: posInventoryMovements.quantity,
      type: posInventoryMovements.movementType,
      refType: posInventoryMovements.referenceType,
      refId: posInventoryMovements.referenceId,
      notes: posInventoryMovements.notes,
      createdAt: posInventoryMovements.createdAt,
      itemName: posInventoryItems.name,
    }).from(posInventoryMovements)
      .leftJoin(posInventoryItems, eq(posInventoryMovements.inventoryItemId, posInventoryItems.id))
      .where(eq(posInventoryMovements.branchId, lpBranch.id))
      .orderBy(sql`${posInventoryMovements.createdAt} DESC`)
      .limit(15);
    
    if (movements.length === 0) {
      console.log("No movements found!");
    } else {
      movements.forEach(m => {
        console.log(`[${m.createdAt?.toISOString()}] Item: ${m.itemName} (ID ${m.itemId}) | Qty: ${m.quantity} | Type: ${m.type} | Ref: ${m.refType} #${m.refId} | Notes: ${m.notes}`);
      });
    }

    console.log(`\n=== 7. RECENT ORDERS AT BRANCH ID ${lpBranch.id} ===`);
    const orders = await db.select().from(posOrders).where(eq(posOrders.branchId, lpBranch.id)).orderBy(sql`${posOrders.createdAt} DESC`).limit(5);
    if (orders.length === 0) {
      console.log("No orders found!");
    } else {
      for (const o of orders) {
        const items = await db.select().from(posOrderItems).where(eq(posOrderItems.orderId, o.id));
        console.log(`Order #${o.id} | No: ${o.orderNumber} | Status: ${o.status} | Total: ${o.totalAmount} | Date: ${o.createdAt?.toISOString()}`);
        items.forEach(it => {
          console.log(`  - ${it.quantity}x ${it.menuItemName} (Menu ID: ${it.menuItemId})`);
        });
      }
    }
  } else {
    console.log("Lad Phrao 107 branch not found in DB list!");
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
