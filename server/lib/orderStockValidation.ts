import { TRPCError } from "@trpc/server";
import { eq, and, inArray } from "drizzle-orm";
import {
  posMenuItems,
  posOptions,
  posRecipeIngredients,
  posBranchInventoryStock,
  posInventoryItems,
} from "../../drizzle/schema";
import type { getDb } from "../db";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export type CartStockItem = {
  menuItemId: number;
  quantity: number;
  options?: Array<{ optionId: number }>;
};

function compileRecipeDeductions(
  itemRecipes: Array<{ inventoryItemId: number; quantity: string | null; unitOfMeasure: string | null; role: string | null }>,
  optionEffects: Array<{
    type: string;
    targetRole?: string;
    targetInventoryItemId?: number | null;
    inventoryItemId?: number | null;
    role?: string;
    quantity?: number | null;
    unit?: string;
    optionId: number;
  }>,
  orderQty: number,
): Map<number, number> {
  const deductions = new Map<number, number>();

  let compiled: Array<{
    inventoryItemId: number;
    quantity: number;
    unit: string;
    role: string;
    optionId: number | null;
    effectSource: "base" | "option";
  }> = itemRecipes.map((r) => ({
    inventoryItemId: r.inventoryItemId,
    quantity: Number(r.quantity ?? 0),
    unit: r.unitOfMeasure || "pcs",
    role: r.role || "",
    optionId: null as number | null,
    effectSource: "base" as const,
  }));

  for (const ef of optionEffects.filter((e) => e.type === "REPLACE")) {
    const idx = compiled.findIndex((r) =>
      (ef.targetRole && r.role === ef.targetRole) ||
      (ef.targetInventoryItemId && r.inventoryItemId === ef.targetInventoryItemId)
    );
    if (idx !== -1) {
      const original = compiled[idx];
      compiled[idx] = {
        inventoryItemId: Number(ef.inventoryItemId),
        quantity: ef.quantity ?? original.quantity,
        unit: ef.unit || original.unit,
        role: ef.role || original.role,
        optionId: ef.optionId,
        effectSource: "option",
      };
    }
  }

  for (const ef of optionEffects.filter((e) => e.type === "REMOVE")) {
    compiled = compiled.filter((r) => {
      const matchRole = ef.targetRole && r.role === ef.targetRole;
      const matchId = ef.targetInventoryItemId && r.inventoryItemId === ef.targetInventoryItemId;
      return !(matchRole || matchId);
    });
  }

  for (const ef of optionEffects.filter((e) => e.type === "SET_QUANTITY")) {
    compiled = compiled.map((r) => {
      const matchRole = ef.targetRole && r.role === ef.targetRole;
      const matchId = ef.targetInventoryItemId && r.inventoryItemId === ef.targetInventoryItemId;
      if (matchRole || matchId) {
        return { ...r, quantity: ef.quantity ?? r.quantity, unit: ef.unit || r.unit, optionId: ef.optionId, effectSource: "option" as const };
      }
      return r;
    });
  }

  for (const ef of optionEffects.filter((e) => e.type === "ADD")) {
    compiled.push({
      inventoryItemId: Number(ef.inventoryItemId),
      quantity: ef.quantity ?? 1,
      unit: ef.unit || "pcs",
      role: ef.role || "",
      optionId: ef.optionId,
      effectSource: "option",
    });
  }

  const grouped = new Map<string, typeof compiled[0]>();
  for (const r of compiled) {
    const key = `${r.inventoryItemId}:${r.unit}:${r.optionId}:${r.effectSource}`;
    const existing = grouped.get(key);
    if (existing) existing.quantity += r.quantity;
    else grouped.set(key, { ...r });
  }

  for (const ing of grouped.values()) {
    if (ing.quantity > 0) {
      const total = ing.quantity * orderQty;
      deductions.set(ing.inventoryItemId, (deductions.get(ing.inventoryItemId) ?? 0) + total);
    }
  }

  return deductions;
}

/** Validate trackInventory + recipe + branch stock before order create. */
export async function validateCartStockAvailability(
  db: Db,
  branchId: number,
  items: CartStockItem[],
): Promise<void> {
  if (items.length === 0) return;

  const menuItemIds = [...new Set(items.map((i) => i.menuItemId))];
  const menuRows = await db.select().from(posMenuItems)
    .where(inArray(posMenuItems.id, menuItemIds));
  const menuMap = new Map(menuRows.map((m) => [m.id, m]));

  const recipes = await db.select().from(posRecipeIngredients)
    .where(inArray(posRecipeIngredients.menuItemId, menuItemIds));
  const recipesByMenu = new Map<number, typeof recipes>();
  for (const r of recipes) {
    const arr = recipesByMenu.get(r.menuItemId) ?? [];
    arr.push(r);
    recipesByMenu.set(r.menuItemId, arr);
  }

  const optionIds = [...new Set(items.flatMap((i) => (i.options ?? []).map((o) => o.optionId)))];
  const optionRows = optionIds.length > 0
    ? await db.select().from(posOptions).where(inArray(posOptions.id, optionIds))
    : [];
  const optionMap = new Map(optionRows.map((o) => [o.id, o]));

  const totalDeductions = new Map<number, number>();
  const missingRecipes: string[] = [];

  for (const item of items) {
    const menu = menuMap.get(item.menuItemId);
    if (!menu) continue;
    const itemRecipes = recipesByMenu.get(item.menuItemId) ?? [];

    if (menu.trackInventory && itemRecipes.length === 0) {
      missingRecipes.push(menu.nameThai || menu.name);
      continue;
    }

    const effects: Array<{
      type: string;
      targetRole?: string;
      targetInventoryItemId?: number | null;
      inventoryItemId?: number | null;
      role?: string;
      quantity?: number | null;
      unit?: string;
      optionId: number;
    }> = [];

    for (const opt of item.options ?? []) {
      const row = optionMap.get(opt.optionId);
      if (!row?.stockEffects) continue;
      const raw = Array.isArray(row.stockEffects) ? row.stockEffects : [];
      for (const ef of raw as any[]) {
        effects.push({
          type: ef.type,
          targetRole: ef.targetRole,
          targetInventoryItemId: ef.targetInventoryItemId,
          inventoryItemId: ef.inventoryItemId,
          role: ef.role,
          quantity: ef.quantity != null && ef.quantity !== "" ? Number(ef.quantity) : null,
          unit: ef.unit || "pcs",
          optionId: opt.optionId,
        });
      }
    }

    const itemDeductions = compileRecipeDeductions(itemRecipes, effects, item.quantity);
    for (const [invId, qty] of itemDeductions) {
      totalDeductions.set(invId, (totalDeductions.get(invId) ?? 0) + qty);
    }
  }

  if (missingRecipes.length > 0) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `เมนูต่อไปนี้เปิด track inventory แต่ยังไม่มีสูตร (recipe): ${missingRecipes.join(", ")}`,
    });
  }

  if (totalDeductions.size === 0) return;

  const inventoryItemIds = [...totalDeductions.keys()];
  const stockRows = await db.select({
    inventoryItemId: posBranchInventoryStock.inventoryItemId,
    currentStock: posBranchInventoryStock.currentStock,
  }).from(posBranchInventoryStock)
    .where(and(
      eq(posBranchInventoryStock.branchId, branchId),
      inArray(posBranchInventoryStock.inventoryItemId, inventoryItemIds),
    ));

  const stockMap = new Map(stockRows.map((r) => [r.inventoryItemId, Number(r.currentStock ?? 0)]));
  const names = await db.select({
    id: posInventoryItems.id,
    name: posInventoryItems.name,
    nameThai: posInventoryItems.nameThai,
    unitOfMeasure: posInventoryItems.unitOfMeasure,
  }).from(posInventoryItems).where(inArray(posInventoryItems.id, inventoryItemIds));
  const nameMap = new Map(names.map((n) => [n.id, n]));

  const insufficient: string[] = [];
  for (const [itemId, required] of totalDeductions) {
    const available = stockMap.get(itemId) ?? 0;
    if (available < required) {
      const info = nameMap.get(itemId);
      insufficient.push(
        `${info?.nameThai || info?.name || `#${itemId}`}: ต้องการ ${required} ${info?.unitOfMeasure || "unit"} แต่มี ${Math.max(0, available)}`
      );
    }
  }

  if (insufficient.length > 0) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `วัตถุดิบไม่เพียงพอ: ${insufficient.join("; ")}`,
    });
  }
}
