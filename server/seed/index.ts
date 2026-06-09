/**
 * Seed script for Hibi Matcha POS.
 *
 * Reads JSON files from hibi-seed-package/seed-data/ and inserts:
 *  - 6 branches (5 stores + Hibi House warehouse)
 *  - 3 demo accounts (HMC-0001 / HMC-ADMIN / HMC-STAFF) + 18 staff from staff.json
 *  - Universal PIN: 1234  (everyone)
 *  - Passwords by role: super_admin=super2026, staff_admin=admin2026, staff=staff2026
 *  - Inventory category tree
 *  - 45 tea catalog items
 *  - 394 inventory items from Agape_Set_up.xlsx
 *      • 88 consumables (สินค้าหมุนเวียน)
 *      • 62 equipment   (สินค้าหลัก)
 *      • 244 pack items (ชีต1)
 *  - 264 pricing rows (cost breakdown with VAT + margin from ชีต5)
 *  - Initial stock at Hibi House — real values from xlsx where available
 *  - 9 menu categories + 138 menu items + 38 option groups (from Hibi New Menu .xlsx)
 *  - 17 payment methods (cash + 6 QR + 4 EDC + transfer + 3 voucher + COD)
 *  - All items auto-linked to Hibi House (HQ) — distribute to others via UI
 *
 * Run with: npm run seed
 */

import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";
import { eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  branches,
  staff,
  staffBranches,
  posCategories,
  posMenuItems,
  posMenuItemOptionGroups,
  posBranchMenuItems,
  posInventoryCategories,
  posInventoryItems,
  posBranchInventoryStock,
  posOptionGroups,
  posOptions,
  posPaymentMethods,
} from "../../drizzle/schema";
import { hashPassword, hashPin } from "../lib/auth";

const SEED_DIR = join(process.cwd(), "hibi-seed-package", "seed-data");

const readJson = <T>(file: string): T =>
  JSON.parse(readFileSync(join(SEED_DIR, file), "utf-8"));

// Role mapping from old system → new schema enum
const ROLE_MAP: Record<string, "super_admin" | "staff_admin" | "staff"> = {
  super_admin: "super_admin",
  branch_owner: "staff_admin",
  branch_manager: "staff_admin",
  area_manager: "staff_admin",
  branch_staff: "staff",
};

// Unit normalization — must match the unitOfMeasure enum in schema:
// ["g", "kg", "ml", "l", "piece", "pack", "box", "bottle", "can", "bag"]
type UnitEnum = "g" | "kg" | "ml" | "l" | "piece" | "pack" | "box" | "bottle" | "can" | "bag";
const normalizeUnit = (u: string | null | undefined): UnitEnum => {
  if (!u) return "piece";
  const v = u.trim().toLowerCase();
  if (["g", "gram", "grams", "กรัม"].includes(v)) return "g";
  if (["kg", "kilogram", "kilograms", "กิโล", "กก."].includes(v)) return "kg";
  if (["ml", "millilitre", "milliliter", "มล."].includes(v)) return "ml";
  if (["l", "liter", "litre", "liters", "litres", "ลิตร"].includes(v)) return "l";
  if (["pack", "ห่อ", "แพ็ค", "แพค"].includes(v)) return "pack";
  if (["box", "กล่อง", "ลัง"].includes(v)) return "box";
  if (["bottle", "ขวด"].includes(v)) return "bottle";
  if (["can", "กระป๋อง", "ถัง"].includes(v)) return "can";
  if (["bag", "ถุง", "ซอง"].includes(v)) return "bag";
  // Everything else — แถว / ด้าม / ใบ / อัน / เครื่อง / ลูก / ตะแกรง / โหล / เซต / ชุด /
  // ม้วน / แผ่น / แก้ว / ผืน / ถาด / ถ้วย / ชิ้น / ข้าง / คัน / เล่ม → "piece"
  return "piece";
};

interface BranchSeed {
  id: string;
  name: string;
  province: string | null;
  isActive: boolean;
  locationType: "store" | "warehouse";
  branchCode: string;
}

interface StaffSeed {
  employeeCode: string;
  name: string;
  role: string;
  branchId: string | null;
}

interface StaffBranchSeed {
  staffId: string;
  branchId: string;
}

interface TeaSeed {
  code: string;
  category: string;
  supplier_name: string;
  name: string;
  full_name: string;
  type: "matcha" | "hojicha" | "genmaicha" | "tea";
}

interface InventoryFileShape {
  consumables: Array<Record<string, unknown>>;
  equipment: Array<Record<string, unknown>>;
  pack_items: Array<Record<string, unknown>>;
  pricing: Array<Record<string, unknown>>;
}

const INVENTORY_CATEGORIES = [
  { name: "Ingredients", nameThai: "วัตถุดิบ", children: [
    { name: "Matcha", nameThai: "มัทฉะ" },
    { name: "Hojicha", nameThai: "โฮจิฉะ" },
    { name: "Genmaicha", nameThai: "เก็นไมฉะ" },
    { name: "Tea", nameThai: "ชา" },
    { name: "Milk & Alternatives", nameThai: "นมและทดแทน" },
    { name: "Sweeteners", nameThai: "สารให้ความหวาน" },
    { name: "Toppings", nameThai: "ท็อปปิ้ง" },
    { name: "Other Ingredients", nameThai: "วัตถุดิบอื่นๆ" },
  ]},
  { name: "Packaging", nameThai: "แพ็คเกจจิ้ง", children: [
    { name: "Cups", nameThai: "แก้ว" },
    { name: "Lids", nameThai: "ฝา" },
    { name: "Straws", nameThai: "หลอด" },
    { name: "Bags", nameThai: "ถุง" },
    { name: "Paper Products", nameThai: "กระดาษ" },
  ]},
  { name: "Marketing Materials", nameThai: "สื่อการตลาด" },
  { name: "Equipment - General", nameThai: "อุปกรณ์ทั่วไป" },
  { name: "Equipment - Front of House", nameThai: "อุปกรณ์หน้าร้าน" },
  { name: "Equipment - Back of House", nameThai: "อุปกรณ์หลังร้าน" },
  { name: "Equipment - Electrical Small", nameThai: "เครื่องใช้ไฟฟ้าเล็ก" },
  { name: "Equipment - Electrical Large", nameThai: "เครื่องใช้ไฟฟ้าใหญ่" },
  { name: "Cleaning Supplies", nameThai: "อุปกรณ์ทำความสะอาด" },
  { name: "Brewing Tools", nameThai: "อุปกรณ์ชง" },
];

const CATEGORY_MAPPING: Record<string, string> = {
  "Matcha": "Matcha",
  "Hojicha": "Hojicha",
  "Genmaicha": "Genmaicha",
  "Tea": "Tea",
  "Matcha Cultiva": "Matcha",
  "วัตถุดิบหลัก": "Other Ingredients",
  "วัตถุดิบ": "Other Ingredients",
  "Package": "Packaging",
  "Re Package": "Packaging",
  "อุปกรณ์ PACK": "Packaging",
  "อุปกรณื PACK": "Packaging",
  "Marketing": "Marketing Materials",
  "อุปกรณ์ทำความสะอาด": "Cleaning Supplies",
  "อุปกรณ์ทั่วไป": "Equipment - General",
  "อุปกรณ์ ทั่วไป": "Equipment - General",
  "อุปกรณ์ใช้หน้าร้าน": "Equipment - Front of House",
  "อุปกรณ์ใช้หลังร้าน": "Equipment - Back of House",
  "อุปกรณ์ชง": "Brewing Tools",
  "เครื่องใช้ไฟฟ้าหน้าร้าน": "Equipment - Electrical Small",
  "เครื่องใช้ไฟฟ้าหลังร้าน": "Equipment - Electrical Large",
  "เครื่องใช้ไฟฟ้าเล็ก": "Equipment - Electrical Small",
  "เครื่องใช้ไฟฟ้าใหญ่": "Equipment - Electrical Large",
};

const OPTION_GROUPS: Array<{
  name: string; nameThai: string;
  selectionType: "single" | "multi" | "quantity";
  isRequired: boolean; maxSelections?: number;
  options: Array<{ name: string; nameThai?: string; priceAdjustment: number; isDefault?: boolean }>;
}> = [
  {
    name: "Size", nameThai: "ขนาด",
    selectionType: "single", isRequired: true,
    options: [
      { name: "Small", nameThai: "เล็ก", priceAdjustment: -20 },
      { name: "Medium", nameThai: "กลาง", priceAdjustment: 0, isDefault: true },
      { name: "Large", nameThai: "ใหญ่", priceAdjustment: 30 },
    ],
  },
  {
    name: "Sweetness", nameThai: "ความหวาน",
    selectionType: "single", isRequired: true,
    options: [
      { name: "0%", priceAdjustment: 0 },
      { name: "25%", priceAdjustment: 0 },
      { name: "50%", priceAdjustment: 0, isDefault: true },
      { name: "75%", priceAdjustment: 0 },
      { name: "100%", priceAdjustment: 0 },
    ],
  },
  {
    name: "Milk Type", nameThai: "ประเภทนม",
    selectionType: "single", isRequired: false,
    options: [
      { name: "Whole Milk", nameThai: "นมสด", priceAdjustment: 0, isDefault: true },
      { name: "Oat Milk", nameThai: "นมโอ๊ต", priceAdjustment: 20 },
      { name: "Almond Milk", nameThai: "นมอัลมอนด์", priceAdjustment: 20 },
      { name: "Soy Milk", nameThai: "นมถั่วเหลือง", priceAdjustment: 15 },
    ],
  },
  {
    name: "Temperature", nameThai: "อุณหภูมิ",
    selectionType: "single", isRequired: true,
    options: [
      { name: "Hot", nameThai: "ร้อน", priceAdjustment: 0 },
      { name: "Iced", nameThai: "เย็น", priceAdjustment: 0, isDefault: true },
    ],
  },
  {
    name: "Add-ons", nameThai: "ท็อปปิ้ง",
    selectionType: "multi", isRequired: false, maxSelections: 3,
    options: [
      { name: "Extra Espresso Shot", nameThai: "ช็อตเอสเปรสโซ่", priceAdjustment: 20 },
      { name: "Whipped Cream", nameThai: "วิปครีม", priceAdjustment: 15 },
      { name: "Boba Pearls", nameThai: "ไข่มุก", priceAdjustment: 10 },
      { name: "Extra Matcha", nameThai: "มัทฉะพิเศษ", priceAdjustment: 25 },
    ],
  },
];

// ─── POS Menu Categories (real Hibi menu — from Hibi New Menu .xlsx) ──────
// Each category has a specific visual identity. Items are loaded from
// menu-full.json (138 items from the source spreadsheet).
const MENU_CATEGORY_DEFS: Record<string, { name: string; nameThai: string; iconName: string; colorHex: string; sortOrder: number }> = {
  matcha_classic:     { name: "Matcha Classic",      nameThai: "มัทฉะคลาสสิก",       iconName: "IconWhisk",   colorHex: "#15803d", sortOrder: 1 },
  matcha_refreshers:  { name: "Matcha Refreshers",   nameThai: "เครื่องดื่มสดชื่น",   iconName: "IconCupIced", colorHex: "#0891b2", sortOrder: 2 },
  matcha_milk:        { name: "Matcha Milk & Rich",  nameThai: "เมนูนมครีมมี่",       iconName: "IconCupHot",  colorHex: "#a16207", sortOrder: 3 },
  fixed_recipe:       { name: "Fixed Recipe",        nameThai: "สูตรคงที่",          iconName: "IconBowl",    colorHex: "#7c2d12", sortOrder: 4 },
  signature:          { name: "Hibi Signature",      nameThai: "สูตรพิเศษของฮิบิ",   iconName: "IconHeart",   colorHex: "#16a34a", sortOrder: 5 },
  non_matcha:         { name: "Non Matcha",          nameThai: "เมนูไม่มีมัทฉะ",     iconName: "IconLeaf",    colorHex: "#65a30d", sortOrder: 6 },
  topping:            { name: "Toppings",            nameThai: "ท็อปปิ้ง",          iconName: "IconBox",     colorHex: "#d97706", sortOrder: 7 },
  fusion_dessert:     { name: "Fusion Dessert",      nameThai: "ขนมหวานฟิวชัน",      iconName: "IconCake",    colorHex: "#9333ea", sortOrder: 8 },
  pink_is_fine:       { name: "Pink is Fine",        nameThai: "พิงค์ คอลเลกชัน",    iconName: "IconHeart",   colorHex: "#e11d48", sortOrder: 9 },
};

const PAYMENT_METHODS = [
  // Cash
  { code: "cash", name: "Cash", nameThai: "เงินสด", type: "cash" as const, iconName: "IconCoin", sortOrder: 1 },
  // QR-based
  { code: "promptpay", name: "PromptPay QR", nameThai: "พร้อมเพย์ (QR)", type: "qr" as const, iconName: "IconQR", requiresReference: true, sortOrder: 2 },
  { code: "truemoney", name: "TrueMoney Wallet", nameThai: "ทรูมันนี่วอลเล็ต", type: "qr" as const, iconName: "IconQR", sortOrder: 3 },
  { code: "linepay", name: "LINE Pay", nameThai: "ไลน์เพย์", type: "qr" as const, iconName: "IconQR", sortOrder: 4 },
  { code: "shopeepay", name: "ShopeePay", nameThai: "ช้อปปี้เพย์", type: "qr" as const, iconName: "IconQR", sortOrder: 5 },
  { code: "alipay", name: "Alipay", nameThai: "อาลีเพย์", type: "qr" as const, iconName: "IconQR", sortOrder: 6 },
  { code: "wechatpay", name: "WeChat Pay", nameThai: "วีแชตเพย์", type: "qr" as const, iconName: "IconQR", sortOrder: 7 },
  // Card via EDC
  { code: "credit_card", name: "Credit Card (EDC)", nameThai: "บัตรเครดิต (EDC)", type: "card" as const, iconName: "IconWallet", feePercentage: "2.95", sortOrder: 10 },
  { code: "debit_card", name: "Debit Card (EDC)", nameThai: "บัตรเดบิต (EDC)", type: "card" as const, iconName: "IconWallet", feePercentage: "1.65", sortOrder: 11 },
  { code: "edc_unionpay", name: "EDC UnionPay", nameThai: "EDC ยูเนี่ยนเพย์", type: "card" as const, iconName: "IconWallet", feePercentage: "2.5", sortOrder: 12 },
  { code: "edc_jcb", name: "EDC JCB", nameThai: "EDC JCB", type: "card" as const, iconName: "IconWallet", feePercentage: "3.0", sortOrder: 13 },
  // Bank transfer
  { code: "bank_transfer", name: "Bank Transfer", nameThai: "โอนผ่านธนาคาร", type: "transfer" as const, iconName: "IconBank", requiresReference: true, sortOrder: 20 },
  // Voucher / gift card / employee
  { code: "voucher", name: "Voucher / Gift Card", nameThai: "วอลเชอร์ / บัตรของขวัญ", type: "voucher" as const, iconName: "IconDiscount", requiresReference: true, sortOrder: 30 },
  { code: "staff_meal", name: "Staff Meal Comp", nameThai: "อาหารพนักงาน", type: "voucher" as const, iconName: "IconDiscount", sortOrder: 31 },
  { code: "complimentary", name: "Complimentary", nameThai: "บริการฟรี", type: "voucher" as const, iconName: "IconDiscount", sortOrder: 32 },
  // Cash on delivery / split
  { code: "cod", name: "Cash on Delivery", nameThai: "เก็บเงินปลายทาง", type: "cash" as const, iconName: "IconCoin", sortOrder: 40 },
];

async function getInsertedId(result: any): Promise<number> {
  return (Array.isArray(result) ? result[0]?.insertId : result?.insertId) as number;
}

export async function seed() {
  const db = await getDb();
  if (!db) throw new Error("Database not available — set DATABASE_URL");

  console.log("Starting seed…");

  // ──────────────────────────────────────────────────────────────
  // 1. Branches
  // ──────────────────────────────────────────────────────────────
  console.log("→ Branches");
  const branchSeeds: BranchSeed[] = readJson("branches.json");
  const branchIdMap: Record<string, number> = {};

  for (const b of branchSeeds) {
    const existing = await db.select().from(branches)
      .where(eq(branches.branchCode, b.branchCode)).limit(1);
    let newId: number;
    if (existing[0]) {
      newId = existing[0].id;
    } else {
      const res = await db.insert(branches).values({
        name: b.name,
        branchCode: b.branchCode,
        branchType: b.locationType === "warehouse" ? "hq" : "company-owned",
        status: b.isActive ? "active" : "inactive",
        province: b.province ?? undefined,
        country: "Thailand",
        currency: "THB",
        taxRate: "7.00",
        timezone: "Asia/Bangkok",
      });
      newId = await getInsertedId(res);
    }
    branchIdMap[b.id] = newId;
  }
  const hibiHouseId = branchIdMap["150001"] ?? Object.values(branchIdMap)[0];
  console.log(`  ${Object.keys(branchIdMap).length} branches, Hibi House id=${hibiHouseId}`);

  // ──────────────────────────────────────────────────────────────
  // 2. Default credentials per role
  // ──────────────────────────────────────────────────────────────
  // Each role gets its own password — but PIN is the same (1234) for everyone
  // so all staff can log in quickly with a single PIN they share.
  //   super_admin  →  super2026   / PIN 1234
  //   staff_admin  →  admin2026   / PIN 1234
  //   staff        →  staff2026   / PIN 1234
  const UNIVERSAL_PIN = "1234";
  const ROLE_CREDS = {
    super_admin: { password: "super2026", pin: UNIVERSAL_PIN },
    staff_admin: { password: "admin2026", pin: UNIVERSAL_PIN },
    staff:       { password: "staff2026", pin: UNIVERSAL_PIN },
  } as const;
  const credCache = {
    super_admin: { passwordHash: hashPassword(ROLE_CREDS.super_admin.password), pinHash: hashPin(ROLE_CREDS.super_admin.pin) },
    staff_admin: { passwordHash: hashPassword(ROLE_CREDS.staff_admin.password), pinHash: hashPin(ROLE_CREDS.staff_admin.pin) },
    staff:       { passwordHash: hashPassword(ROLE_CREDS.staff.password),       pinHash: hashPin(ROLE_CREDS.staff.pin) },
  };

  // ──────────────────────────────────────────────────────────────
  // 3. Super admin master account (HMC-0001)
  // ──────────────────────────────────────────────────────────────
  console.log("→ Super admin (HMC-0001)");
  const adminExists = await db.select().from(staff).where(eq(staff.employeeCode, "HMC-0001")).limit(1);
  if (!adminExists[0]) {
    await db.insert(staff).values({
      employeeCode: "HMC-0001",
      firstName: "Super",
      lastName: "Admin",
      email: "admin@hibimatcha.com",
      role: "super_admin",
      primaryBranchId: hibiHouseId,
      status: "active",
      passwordHash: credCache.super_admin.passwordHash,
      pinHash: credCache.super_admin.pinHash,
    });
  }

  // ──────────────────────────────────────────────────────────────
  // 4. Demo staff_admin and staff accounts (always created)
  // ──────────────────────────────────────────────────────────────
  console.log("→ Demo staff_admin (HMC-ADMIN) + staff (HMC-STAFF)");
  const demoAccounts = [
    { code: "HMC-ADMIN", firstName: "Branch", lastName: "Admin", role: "staff_admin" as const, email: "branch-admin@hibimatcha.com" },
    { code: "HMC-STAFF", firstName: "Front", lastName: "Staff",  role: "staff" as const,       email: "staff@hibimatcha.com" },
  ];
  for (const d of demoAccounts) {
    const exists = await db.select().from(staff).where(eq(staff.employeeCode, d.code)).limit(1);
    if (!exists[0]) {
      await db.insert(staff).values({
        employeeCode: d.code,
        firstName: d.firstName,
        lastName: d.lastName,
        email: d.email,
        role: d.role,
        primaryBranchId: hibiHouseId,
        status: "active",
        passwordHash: credCache[d.role].passwordHash,
        pinHash: credCache[d.role].pinHash,
      });
    }
  }

  // ──────────────────────────────────────────────────────────────
  // 5. Imported staff (from staff.json) — credentials by mapped role
  // ──────────────────────────────────────────────────────────────
  console.log("→ Staff (from staff.json) — credentials assigned by role");
  const staffSeeds: StaffSeed[] = readJson("staff.json");
  const staffIdMap: Record<string, number> = {};
  const roleCount = { super_admin: 0, staff_admin: 0, staff: 0 };

  for (const s of staffSeeds) {
    if (!s.employeeCode) continue;
    const parts = s.name.trim().split(/\s+/);
    const firstName = parts[0] || s.employeeCode;
    const lastName = parts.slice(1).join(" ") || "";
    const mappedRole = ROLE_MAP[s.role] ?? "staff";
    const creds = credCache[mappedRole];

    // HBCN-03 is the designated HQ distribution manager → pin to Hibi House
    // and (super_admin already gives them full system access).
    const effectiveBranchId = s.employeeCode === "HBCN-03"
      ? hibiHouseId
      : (s.branchId ? branchIdMap[s.branchId] : undefined);

    const existing = await db.select().from(staff)
      .where(eq(staff.employeeCode, s.employeeCode)).limit(1);
    let newId: number;
    if (existing[0]) {
      newId = existing[0].id;
    } else {
      const res = await db.insert(staff).values({
        employeeCode: s.employeeCode,
        firstName,
        lastName,
        firstNameThai: s.name,
        role: mappedRole,
        primaryBranchId: effectiveBranchId,
        status: "active",
        passwordHash: creds.passwordHash,
        pinHash: creds.pinHash,
      });
      newId = await getInsertedId(res);
      roleCount[mappedRole]++;
    }
    staffIdMap[s.employeeCode] = newId;

    // Auto-assign primary branch to staff_branches
    if (effectiveBranchId) {
      await db.insert(staffBranches).values({
        staffId: newId,
        branchId: effectiveBranchId,
        isPrimary: true,
      }).onDuplicateKeyUpdate({ set: { isPrimary: true } });
    }
    // Super admins also get access to Hibi House (for distribution dashboard)
    if (mappedRole === "super_admin" && effectiveBranchId !== hibiHouseId) {
      await db.insert(staffBranches).values({
        staffId: newId,
        branchId: hibiHouseId,
        isPrimary: false,
      }).onDuplicateKeyUpdate({ set: { isPrimary: false } });
    }
  }
  console.log(`  ${Object.keys(staffIdMap).length} staff imported`);

  // ──────────────────────────────────────────────────────────────
  // 4. Inventory categories tree
  // ──────────────────────────────────────────────────────────────
  console.log("→ Inventory categories");
  const categoryIdMap: Record<string, number> = {};
  let sortOrder = 0;

  for (const top of INVENTORY_CATEGORIES) {
    const existing = await db.select().from(posInventoryCategories)
      .where(eq(posInventoryCategories.name, top.name)).limit(1);
    let parentId: number;
    if (existing[0]) {
      parentId = existing[0].id;
    } else {
      const res = await db.insert(posInventoryCategories).values({
        name: top.name,
        nameThai: top.nameThai,
        level: 0,
        sortOrder: sortOrder++,
        isActive: true,
      });
      parentId = await getInsertedId(res);
    }
    categoryIdMap[top.name] = parentId;

    for (const child of top.children ?? []) {
      const ce = await db.select().from(posInventoryCategories)
        .where(eq(posInventoryCategories.name, child.name)).limit(1);
      let childId: number;
      if (ce[0]) {
        childId = ce[0].id;
      } else {
        const res = await db.insert(posInventoryCategories).values({
          parentId,
          name: child.name,
          nameThai: child.nameThai,
          level: 1,
          sortOrder: sortOrder++,
          isActive: true,
        });
        childId = await getInsertedId(res);
      }
      categoryIdMap[child.name] = childId;
    }
  }
  console.log(`  ${Object.keys(categoryIdMap).length} categories`);

  // ──────────────────────────────────────────────────────────────
  // 5. Tea catalog → inventory items
  // ──────────────────────────────────────────────────────────────
  console.log("→ Tea catalog");
  const teas: TeaSeed[] = readJson("tea-catalog.json");
  let teaInserted = 0;
  for (const tea of teas) {
    const catName = tea.type === "matcha" ? "Matcha"
      : tea.type === "hojicha" ? "Hojicha"
      : tea.type === "genmaicha" ? "Genmaicha"
      : "Tea";
    const catId = categoryIdMap[catName];
    if (!catId) continue;

    const existing = await db.select().from(posInventoryItems)
      .where(eq(posInventoryItems.sku, tea.code)).limit(1);
    if (existing[0]) continue;

    await db.insert(posInventoryItems).values({
      sku: tea.code,
      name: tea.name,
      nameThai: tea.name,
      description: `Supplier: ${tea.supplier_name.trim()}`,
      categoryId: catId,
      unitOfMeasure: "g",
      sourceFlag: "hq_supply",
      isActive: true,
    });
    teaInserted++;
  }
  console.log(`  ${teaInserted} tea items inserted`);

  // ──────────────────────────────────────────────────────────────
  // 6. Inventory items
  // Source = hibi-seed-package/seed-data/inventory.json
  // (pre-extracted from Agape_Set_up.xlsx — all 4 sheets)
  //   consumables = 88   (สินค้าหมุนเวียน — Matcha, milk, syrup, etc.)
  //   equipment   = 62   (สินค้าหลัก — utensils, branded canisters)
  //   pack_items  = 244  (ชีต1 — cups, lids, paper, straws, bags)
  //   pricing     = 264  (ชีต5 — full cost breakdown with VAT + margin)
  // Total: 394 inventory items + 264 priced entries
  // ──────────────────────────────────────────────────────────────
  console.log("→ Inventory items (from Agape inventory file)");
  const inv: InventoryFileShape = readJson("inventory.json");
  const allItems = [...inv.consumables, ...inv.equipment, ...inv.pack_items];
  let invInserted = 0;
  let skuCounter = 1;
  // Track the stock-at-hand for each item so we can seed it at HQ in step 8
  const skuToCurrentStock: Record<string, number> = {};

  for (const it of allItems) {
    const name = (it.name as string)?.trim();
    if (!name) continue;
    const rawCategory = (it.category as string) ?? "";
    const englishCat = CATEGORY_MAPPING[rawCategory] ?? "Other Ingredients";
    const catId = categoryIdMap[englishCat];
    if (!catId) continue;

    const sku = (it.sku as string) || `AUTO-${String(skuCounter++).padStart(5, "0")}`;

    // Track current stock from source file (later used for HQ initial stock)
    const cs = it.current_stock as number | string | undefined;
    if (cs != null && cs !== "" && !isNaN(Number(cs))) {
      skuToCurrentStock[sku] = Number(cs);
    }
    const qty = it.quantity as number | string | undefined;
    if (qty != null && qty !== "" && !isNaN(Number(qty)) && !skuToCurrentStock[sku]) {
      skuToCurrentStock[sku] = Number(qty);
    }

    const existing = await db.select().from(posInventoryItems)
      .where(eq(posInventoryItems.sku, sku)).limit(1);
    if (existing[0]) continue;

    const reorderAlert = it.reorder_alert as number | undefined;
    const source = (it.source as string) === "House" ? "hq_supply" : "mixed";

    await db.insert(posInventoryItems).values({
      sku,
      name,
      nameThai: (it.name_thai as string) ?? (it.description as string) ?? undefined,
      description: (it.description as string) ?? undefined,
      categoryId: catId,
      unitOfMeasure: normalizeUnit(it.unit as string),
      sourceFlag: source as "hq_supply" | "mixed",
      minStockLevel: reorderAlert != null ? String(reorderAlert) : undefined,
      reorderPoint: reorderAlert != null ? String(reorderAlert) : undefined,
      isActive: true,
    });
    invInserted++;
  }
  console.log(`  ${invInserted} inventory items inserted`);

  // ──────────────────────────────────────────────────────────────
  // 7. Pricing updates
  // ──────────────────────────────────────────────────────────────
  console.log("→ Pricing updates");
  let priceUpdated = 0;
  for (const p of inv.pricing) {
    const sku = p.sku as string | null;
    if (!sku) continue;
    const cost = (p.cost_per_unit as number | undefined) ?? (p.price as number | undefined);
    const sell = p.selling_price as number | undefined;
    if (cost == null && sell == null) continue;

    await db.update(posInventoryItems).set({
      costPerUnit: cost != null ? String(cost) : undefined,
      sellingPricePerUnit: sell != null ? String(sell) : undefined,
    } as any).where(eq(posInventoryItems.sku, sku));
    priceUpdated++;
  }
  console.log(`  ${priceUpdated} prices updated`);

  // ──────────────────────────────────────────────────────────────
  // 8. Initial branch stock at Hibi House — load real values from xlsx
  //    Items without a stock value default to 0 (must be received before sale)
  // ──────────────────────────────────────────────────────────────
  console.log("→ Initial stock records (Hibi House) — real values from xlsx");
  const allInvItems = await db.select({ id: posInventoryItems.id, sku: posInventoryItems.sku }).from(posInventoryItems);
  let stockCreated = 0;
  let stockWithValue = 0;
  for (const item of allInvItems) {
    const realStock = (item.sku && skuToCurrentStock[item.sku]) || 0;
    if (realStock > 0) stockWithValue++;
    await db.insert(posBranchInventoryStock).values({
      branchId: hibiHouseId,
      inventoryItemId: item.id,
      currentStock: String(realStock),
      reservedStock: "0",
      lastReceivedAt: realStock > 0 ? new Date() : undefined,
    }).onDuplicateKeyUpdate({ set: {
      // Only update if record was newly created — preserve any later receiving/transfers
      currentStock: sql`\`currentStock\``,
    } });
    stockCreated++;
  }
  console.log(`  ${stockCreated} stock records (${stockWithValue} with non-zero stock from source)`);

  // ──────────────────────────────────────────────────────────────
  // 9. Option groups
  // ──────────────────────────────────────────────────────────────
  console.log("→ Option groups");
  let groupOrder = 0;
  for (const og of OPTION_GROUPS) {
    const existing = await db.select().from(posOptionGroups)
      .where(eq(posOptionGroups.name, og.name)).limit(1);
    let groupId: number;
    if (existing[0]) {
      groupId = existing[0].id;
    } else {
      const res = await db.insert(posOptionGroups).values({
        name: og.name,
        nameThai: og.nameThai,
        selectionType: og.selectionType,
        isRequired: og.isRequired,
        maxSelections: og.maxSelections,
        sortOrder: groupOrder++,
        isActive: true,
      });
      groupId = await getInsertedId(res);
    }

    let optOrder = 0;
    for (const opt of og.options) {
      const optExisting = await db.select().from(posOptions)
        .where(eq(posOptions.groupId, groupId)).limit(50);
      if (optExisting.some((o) => o.name === opt.name)) continue;
      await db.insert(posOptions).values({
        groupId,
        name: opt.name,
        nameThai: opt.nameThai,
        priceAdjustment: String(opt.priceAdjustment),
        sortOrder: optOrder++,
        isDefault: opt.isDefault ?? false,
        isActive: true,
      });
    }
  }
  console.log(`  ${OPTION_GROUPS.length} option groups`);

  // ──────────────────────────────────────────────────────────────
  // 9.5 — Real Hibi menu from `menu-full.json` (derived from Hibi New Menu .xlsx)
  // ──────────────────────────────────────────────────────────────
  // 9 categories, 138 items, 38 option groups, 108 options
  // Strategy:
  //   1. Insert categories (posCategories)
  //   2. Insert each item (posMenuItems) with the right categoryId
  //   3. Auto-link every item to Hibi House (posBranchMenuItems)
  //   4. Insert option groups from xlsx ("ตัวเลือก" sheet) into posOptionGroups
  //      + their options into posOptions
  //   5. Link items to their option groups (posMenuItemOptionGroups) by code
  console.log("→ Hibi real menu (from xlsx)");
  type MenuJson = {
    categories: Array<{ slug: string; name: string; nameThai: string; sortOrder: number }>;
    items: Array<{
      code: string; name: string; category_slug: string; category_name: string;
      price: number; priceDelivery: number | null; description: string;
      optionCodes: string[]; tea: string;
      imageUrl?: string | null;
    }>;
    optionGroups: Array<{ code: string; name: string; options: Array<{ name: string; price: number }> }>;
  };
  let menuJson: MenuJson | null = null;
  try { menuJson = readJson<MenuJson>("menu-full.json"); }
  catch { console.log("  (menu-full.json missing — skipping menu import)"); }

  if (menuJson) {
    // 1) Categories
    const menuCatIdMap: Record<string, number> = {};
    for (const cat of menuJson.categories) {
      const meta = MENU_CATEGORY_DEFS[cat.slug] ?? {
        name: cat.name, nameThai: cat.nameThai, iconName: "IconBox", colorHex: "#475569", sortOrder: cat.sortOrder,
      };
      const existing = await db.select().from(posCategories).where(eq(posCategories.name, meta.name)).limit(1);
      let id: number;
      if (existing[0]) { id = existing[0].id; }
      else {
        const res = await db.insert(posCategories).values({
          name: meta.name,
          nameThai: meta.nameThai,
          iconName: meta.iconName,
          colorHex: meta.colorHex,
          sortOrder: meta.sortOrder,
          isActive: true,
        });
        id = await getInsertedId(res);
      }
      menuCatIdMap[cat.slug] = id;
    }
    console.log(`  ${Object.keys(menuCatIdMap).length} menu categories`);

    // 2) Menu items
    let menuInserted = 0;
    const menuCodeToId: Record<string, number> = {};
    for (const item of menuJson.items) {
      const catId = menuCatIdMap[item.category_slug];
      const existing = await db.select().from(posMenuItems).where(eq(posMenuItems.sku, item.code)).limit(1);
      let menuId: number;
      if (existing[0]) {
        menuId = existing[0].id;
      } else {
        const res = await db.insert(posMenuItems).values({
          sku: item.code,
          name: item.name,
          description: item.description || undefined,
          categoryId: catId,
          basePrice: String(item.price),
          imageUrl: item.imageUrl || undefined,
          tags: item.tea ? [item.tea] : undefined,
          isActive: true,
        } as any);
        menuId = await getInsertedId(res);
        menuInserted++;
      }
      menuCodeToId[item.code] = menuId;

      // 3) Auto-link to Hibi House (HQ) so every menu item is sellable there
      await db.insert(posBranchMenuItems).values({
        branchId: hibiHouseId,
        menuItemId: menuId,
        isAvailable: true,
        priceOverride: item.priceDelivery ? String(item.priceDelivery) : null,
      }).onDuplicateKeyUpdate({ set: { isAvailable: true } });
    }
    console.log(`  ${menuInserted} menu items inserted (${menuJson.items.length} total, rest existed)`);

    // 4) Option groups from xlsx (Thai-language groups like B1/C1/D1/E2 etc.)
    const optGroupCodeToId: Record<string, number> = {};
    for (const og of menuJson.optionGroups) {
      // Use the xlsx group code as the unique "name" prefix so we can find it later
      const groupName = `${og.code} · ${og.name}`.slice(0, 100);
      const selectionType: "single" | "multi" | "quantity" =
        og.code.startsWith("G") ? "multi" : "single";
      const existing = await db.select().from(posOptionGroups).where(eq(posOptionGroups.name, groupName)).limit(1);
      let groupId: number;
      if (existing[0]) { groupId = existing[0].id; }
      else {
        const res = await db.insert(posOptionGroups).values({
          name: groupName,
          selectionType,
          isRequired: og.code.startsWith("A") || og.code.startsWith("B") || og.code.startsWith("D"),
          minSelections: 0,
          maxSelections: selectionType === "multi" ? 99 : 1,
          isActive: true,
        });
        groupId = await getInsertedId(res);

        // Insert options into the group
        for (let i = 0; i < og.options.length; i++) {
          const opt = og.options[i];
          await db.insert(posOptions).values({
            groupId,
            name: opt.name,
            priceAdjustment: String(opt.price),
            sortOrder: i,
            isDefault: i === 0,
            isActive: true,
          } as any);
        }
      }
      optGroupCodeToId[og.code] = groupId;
    }
    console.log(`  ${Object.keys(optGroupCodeToId).length} option groups from xlsx`);

    // 5) Link each menu item to its option groups (by codes like A1,C1,B3,D1,E2)
    let linkCount = 0;
    for (const item of menuJson.items) {
      const menuId = menuCodeToId[item.code];
      if (!menuId) continue;
      let sortIdx = 0;
      for (const optCode of item.optionCodes) {
        const code = optCode.trim().replace(/\s/g, "");
        const groupId = optGroupCodeToId[code];
        if (!groupId) continue;
        await db.insert(posMenuItemOptionGroups).values({
          menuItemId: menuId,
          optionGroupId: groupId,
          sortOrder: sortIdx++,
        }).onDuplicateKeyUpdate({ set: { sortOrder: sortIdx } });
        linkCount++;
      }
    }
    console.log(`  ${linkCount} item ↔ option-group links`);
  }

  // ──────────────────────────────────────────────────────────────
  // 10. Payment methods
  // ──────────────────────────────────────────────────────────────
  console.log("→ Payment methods");
  for (const pm of PAYMENT_METHODS) {
    const existing = await db.select().from(posPaymentMethods)
      .where(eq(posPaymentMethods.code, pm.code)).limit(1);
    if (existing[0]) continue;
    await db.insert(posPaymentMethods).values({
      code: pm.code,
      name: pm.name,
      nameThai: pm.nameThai,
      type: pm.type,
      requiresReference: (pm as any).requiresReference ?? false,
      sortOrder: pm.sortOrder,
      isActive: true,
    });
  }
  console.log(`  ${PAYMENT_METHODS.length} payment methods`);

  console.log("\n✅ Seed complete.");
  console.log("\n┌──────────────────────────────────────────────────────────────┐");
  console.log("│           DEFAULT CREDENTIALS BY ROLE                        │");
  console.log("├──────────────────────────────────────────────────────────────┤");
  console.log("│ Universal PIN for ALL staff:  1234                           │");
  console.log("├──────────────────────────────────────────────────────────────┤");
  console.log("│ SUPER ADMIN (full access — Backoffice + POS + Franchise)     │");
  console.log("│   Code:     HMC-0001  (or any imported super_admin)          │");
  console.log("│   Password: super2026                                        │");
  console.log("│   PIN:      1234                                             │");
  console.log("│   → Lands on Backoffice                                      │");
  console.log("├──────────────────────────────────────────────────────────────┤");
  console.log("│ STAFF ADMIN (branch manager / owner — mid-level)             │");
  console.log("│   Code:     HMC-ADMIN  (or any imported branch_manager)      │");
  console.log("│   Password: admin2026                                        │");
  console.log("│   PIN:      1234                                             │");
  console.log("│   → Backoffice access except Franchise / Audit / Approvals   │");
  console.log("├──────────────────────────────────────────────────────────────┤");
  console.log("│ STAFF (front-of-house — POS only)                            │");
  console.log("│   Code:     HMC-STAFF  (or any imported branch_staff)        │");
  console.log("│   Password: staff2026                                        │");
  console.log("│   PIN:      1234                                             │");
  console.log("│   → Auto-redirected to /pos/terminal on login                │");
  console.log("└──────────────────────────────────────────────────────────────┘");
  console.log(`\nImported from staff.json: super_admin=${roleCount.super_admin}, staff_admin=${roleCount.staff_admin}, staff=${roleCount.staff}`);
  console.log("⚠  Change these passwords in production!\n");
}

// Allow running directly
if (process.argv[1] && process.argv[1].endsWith("seed/index.ts")) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seed failed:", err);
      process.exit(1);
    });
}
