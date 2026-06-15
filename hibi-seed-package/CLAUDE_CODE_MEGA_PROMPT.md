# 🍵 HIBI MATCHA POS V2 — Complete System Build (with Seed Data)
## Mega Prompt for Claude Code — FINAL VERSION

**Project:** pos-hibimatcha-love
**Stack:** React 19 + Vite + Express + tRPC v11 + Drizzle ORM + TiDB MySQL
**Goal:** Complete working POS + Backoffice system, all flows functional, with REAL seed data imported

---

## 🎯 MISSION

You are building a complete Point of Sale + Backoffice management system for "Hibi Matcha" — a Japanese matcha cafe franchise in Thailand.

The UI is **already built and applied** (37 pages, design system complete). Your job is to:

1. **Build the complete backend** (database schema, tRPC routers, business logic)
2. **Wire ALL frontend pages to backend** (replace mock data with real API calls)
3. **Implement ALL workflows end-to-end** (POS ordering, kitchen, inventory, SOP, etc.)
4. **Build authentication system** (PIN for POS, Employee Code + Password for Backoffice)
5. **Import real seed data** from provided files (Tea Catalog + Inventory)

---

## 📦 SEED DATA PROVIDED

In the `seed-data/` folder, you have:

### File 1: `tea-catalog.json` (45 items)
Hibi Matcha tea inventory catalog:
- 37 Matcha varieties (M01-M42)
- 6 Hojicha varieties (H01-H06)
- 1 Genmaicha (G01)
- 1 Tea (T01)

Each item: `code`, `category`, `supplier_name`, `name`, `full_name`, `type`

### File 2: `inventory.json` (393 items + 162 pricing)
4 sections: `consumables`, `equipment`, `pack_items`, `pricing`

### File 3: `branches.json` (6 real Hibi branches) ⭐ NEW
```
HB01-Ladprao107 (สาขาลาดพร้าว107)
HB02-Samyan (สาขาสามย่าน)
HB03-Nawamin111 (สาขานวมินทร์ 111)
HB04-Saphan Khwai
HB05-Nak Niwat48
Hibi House (warehouse, code: 0000)
```

### File 4: `staff.json` (20 active staff) ⭐ NEW
Roles distribution:
- 8 super_admin
- 5 branch_manager
- 1 area_manager
- 1 branch_owner
- 5 branch_staff

**Note:** No passwords/phones included (PII removed). All staff need to:
- Receive temporary password from admin
- Set their own PIN on first POS login

### File 5: `staff_branches.json` (13 mappings)
Staff-to-branch assignments

### Files 6-7: Original sources (CSV/XLSX)

---

## 📋 CURRENT STATE

### What Exists
```
client/
├── index.html
├── src/
│   ├── main.jsx
│   ├── App.jsx                         # Hash routing (37 routes)
│   ├── styles/tokens.css               # Design tokens
│   ├── icons/index.jsx                 # 87 custom icons
│   ├── components/
│   │   ├── index.jsx                   # 24 shared components
│   │   └── Shell.jsx                   # AppLayout + POSShell
│   └── pages/
│       ├── Landing.jsx
│       ├── Auth.jsx
│       ├── Dashboard.jsx
│       ├── POS.jsx
│       ├── Admin.jsx
│       ├── Inventory.jsx
│       ├── SuppliersAndFranchise.jsx
│       ├── SOP.jsx
│       └── Settings.jsx

server/  (Express + tRPC scaffold)
drizzle/  (Drizzle config, only users table)
seed-data/  ← NEW: imported data ready to use
```

---

## 🏗 ARCHITECTURE

```
React Client (Vite) → tRPC Client → Express Server → tRPC Routers → Drizzle ORM → TiDB MySQL
```

---

## 📊 COMPLETE DATABASE SCHEMA (32 Tables)

Build in `drizzle/schema.ts` using Drizzle ORM MySQL/TiDB dialect.

### Core Tables

**1. branches** (สาขา)
```typescript
id, name, branchCode (unique), branchType (hq/company-owned/franchise),
status, phone, email, address, province, district, postalCode, country,
latitude, longitude, timezone, currency, taxRate, taxInclusive,
operatingHours (json), franchiseOwnerId (fk staff), openingDate,
contractStartDate, contractEndDate, royaltyType, royaltyValue,
createdAt, updatedAt
```

**2. staff** (พนักงาน)
```typescript
id, employeeCode (unique), firstName, lastName, firstNameThai, lastNameThai,
email (unique), phone, avatar, passwordHash, pinHash,
role (super_admin/staff_admin/staff), primaryBranchId (fk),
employmentType, hireDate, status, emergencyContactName, emergencyContactPhone,
lastLoginAt, createdAt, updatedAt
```

**3. staff_branches** (M-to-M)
```typescript
id, staffId (fk), branchId (fk), isPrimary, createdAt
UNIQUE(staffId, branchId)
```

### POS Tables

**4. pos_categories**
```typescript
id, branchId (fk, null=global), name, nameThai, description, iconName,
colorHex, sortOrder, isActive, isArchived, createdAt, updatedAt
```

**5. pos_option_groups** (Size, Sweetness, Toppings, etc.)
```typescript
id, name, nameThai, selectionType (single/multi/quantity), isRequired,
minSelections, maxSelections, sortOrder, isActive, createdAt, updatedAt
```

**6. pos_options** (individual options within group)
```typescript
id, groupId (fk), name, nameThai, priceAdjustment, sortOrder,
isDefault, isActive, createdAt
```

**7. pos_menu_items**
```typescript
id, sku (unique), barcode, name, nameThai, nameJapanese,
description, descriptionThai, imageUrl, categoryId (fk), tags (json),
basePrice, costPrice, memberPrice, isActive, isArchived, isFeatured,
availableFrom (time), availableTo (time), trackInventory,
prepTimeMinutes, cookTimeMinutes, recipeNotes, sortOrder,
createdAt, updatedAt
```

**8. pos_menu_item_option_groups**
```typescript
id, menuItemId (fk), optionGroupId (fk), sortOrder
UNIQUE(menuItemId, optionGroupId)
```

**9. pos_branch_menu_items**
```typescript
id, branchId (fk), menuItemId (fk), isAvailable, priceOverride, stockLevel
UNIQUE(branchId, menuItemId)
```

**10. pos_discounts**
```typescript
id, code (unique), name, description, discountType (percentage/fixed/bogo/free_item),
value, minOrderAmount, maxDiscountAmount, applicableCategories (json),
applicableMenuItems (json), maxUses, maxUsesPerCustomer, usedCount,
startDate, endDate, daysOfWeek (json), startTime, endTime,
isActive, createdAt, updatedAt
```

**11. pos_payment_methods**
```typescript
id, code (unique), name, nameThai, type (cash/qr/card/voucher/transfer/other),
iconName, feePercentage, feeFixed, requiresReference, sortOrder,
isActive, createdAt
```

**12. pos_orders**
```typescript
id, orderNumber (unique), branchId (fk), staffId (fk),
orderType (dine-in/takeaway/delivery), tableNumber, customerName, customerPhone,
status (draft/pending/preparing/ready/served/completed/cancelled/refunded),
subtotal, discountAmount, discountId (fk), taxAmount, serviceCharge, totalAmount,
notes, createdAt, preparingAt, readyAt, servedAt, completedAt,
cancelledAt, cancelReason, updatedAt
```

**13. pos_order_items**
```typescript
id, orderId (fk), menuItemId (fk),
menuItemName (snapshot), menuItemPrice (snapshot),
quantity, unitPrice, totalPrice,
kitchenStatus (pending/preparing/ready/served), notes, createdAt
```

**14. pos_order_item_options**
```typescript
id, orderItemId (fk), optionId (fk),
optionName (snapshot), priceAdjustment (snapshot), createdAt
```

**15. pos_order_payments**
```typescript
id, orderId (fk), paymentMethodId (fk),
amount, referenceNumber, status (pending/completed/failed/refunded),
paidAt, createdAt
```

**16. pos_kitchen_tickets**
```typescript
id, orderId (fk), ticketNumber,
station (drinks/food/desserts/all), status, priority (normal/urgent),
printedAt, startedAt, completedAt, createdAt
```

**17. pos_daily_summaries**
```typescript
id, branchId (fk), summaryDate, totalOrders, totalRevenue, totalDiscounts,
totalTax, averageOrderValue, paymentBreakdown (json), topItems (json),
createdAt, updatedAt
UNIQUE(branchId, summaryDate)
```

### Inventory Tables

**18. pos_inventory_categories** (hierarchical)
```typescript
id, parentId (self-fk), name, nameThai, level, sortOrder,
iconName, isActive, createdAt, updatedAt
```

**19. pos_inventory_items**
```typescript
id, sku (unique), barcode, name, nameThai, description, imageUrl,
categoryId (fk), unitOfMeasure (g/kg/ml/l/piece/pack/box/แถว/etc),
sourceFlag (hq_supply/customer_supplied/mixed),
costPerUnit, sellingPricePerUnit, retailPrice,
minStockLevel, reorderPoint, reorderQuantity,
primarySupplierId (fk), leadTimeDays, shelfLifeDays,
storageRequirements, allergens (json),
isActive, isArchived, createdAt, updatedAt
```

**20. pos_branch_inventory_stock**
```typescript
id, branchId (fk), inventoryItemId (fk),
currentStock, reservedStock, lastCountedAt, lastReceivedAt
UNIQUE(branchId, inventoryItemId)
```

**21. pos_inventory_movements**
```typescript
id, branchId (fk), inventoryItemId (fk),
movementType (received/used/transferred_in/transferred_out/adjusted/wasted/expired),
quantity (positive=in, negative=out), unitOfMeasure,
referenceType, referenceId, notes,
performedByStaffId (fk), createdAt
```

**22. pos_recipe_ingredients**
```typescript
id, menuItemId (fk), inventoryItemId (fk),
quantity, unitOfMeasure, notes
```

### Supplier Tables

**23. pos_suppliers**
```typescript
id, code (unique), companyName, companyNameThai,
contactPerson, email, phone, lineId,
address, province, country,
paymentTerms, currency, bankAccountInfo (json),
performanceRating, notes, status (active/inactive),
createdAt, updatedAt
```

**24. pos_purchase_orders**
```typescript
id, poNumber (unique), supplierId (fk), branchId (fk),
orderDate, requiredDate, expectedDeliveryDate,
priority (low/normal/high/urgent),
status (draft/pending_approval/approved/sent/partial/received/closed/cancelled),
subtotal, discountAmount, shippingCost, taxAmount, totalAmount,
paymentTerms, shippingMethod, trackingNumber,
notesToSupplier, internalNotes,
approvedByStaffId (fk), approvedAt,
createdByStaffId (fk), createdAt, updatedAt
```

**25. pos_purchase_order_items**
```typescript
id, purchaseOrderId (fk), inventoryItemId (fk),
quantityOrdered, quantityReceived,
unitOfMeasure, unitCost, totalCost, notes
```

### SOP Tables

**26. pos_sop_categories**
```typescript
id, name, nameThai, parentId (self-fk), sortOrder, iconName,
isActive, createdAt, updatedAt
```

**27. pos_sops**
```typescript
id, slug (unique), title, titleThai, subtitle, subtitleThai,
coverImageUrl, categoryId (fk), content (json), tags (json),
requiresAcknowledgment, requiredRoles (json), acknowledgmentDeadlineDays,
version, previousVersionId (self-fk), changeReason,
status (draft/review/published/archived),
authorStaffId (fk), publishedAt, effectiveDate, reviewDate,
allowBranchVariants, masterSopId (self-fk), branchId (fk),
createdAt, updatedAt
```

**28. pos_sop_acknowledgments**
```typescript
id, sopId (fk), staffId (fk), branchId (fk),
acknowledgedAt, ipAddress, notes
UNIQUE(sopId, staffId)
```

**29. pos_sop_variant_requests**
```typescript
id, masterSopId (fk), branchId (fk),
proposedContent (json), changeReason, changesSummary,
requestedByStaffId (fk),
status (pending/approved/rejected/withdrawn),
reviewedByStaffId (fk), reviewedAt, reviewNotes, createdAt
```

**30. pos_sop_tasks**
```typescript
id, sopId (fk), staffId (fk), dueDate,
status (pending/in_progress/completed/overdue),
startedAt, completedAt
```

### System Tables

**31. audit_logs**
```typescript
id, actorType (staff/system), actorId, actorName, branchId,
action, entity, entityId, details, beforeData (json), afterData (json),
ipAddress, userAgent, createdAt
```

**32. notifications**
```typescript
id, staffId (fk), type, title, message,
relatedEntity, relatedEntityId, isRead, readAt, createdAt
```

---

## 🔌 COMPLETE tRPC ROUTERS

Build in `server/routers/`. Use tRPC v11.

### Router List (17 routers, 200+ procedures)

**auth** — login, logout, session, password/PIN management, branch switch

**branches** — CRUD, list my branches, operating hours

**staff** — CRUD, role/permission management, branch assignment, PIN reset

**categories** — CRUD, reorder, bulk archive

**menu** — CRUD, list available (by branch), recipe management, option linking, CSV import/export, duplicate, bulk operations

**options** — CRUD groups + options, reorder

**discounts** — CRUD, code validation, toggle active

**payments** — Payment methods CRUD

**orders** — Create, list, getById, addItem, removeItem, updateItem, applyDiscount, addPayment, complete, cancel, refund, printReceipt, hold/resume

**kitchen** — List tickets, markPreparing, markReady, markServed, subscribe (real-time)

**inventory** — Categories CRUD, items CRUD, stock management, receive/count/transfer, movements log, CSV import

**suppliers** — CRUD, link inventory items

**purchaseOrders** — CRUD, submit/approve/reject, receive items, status workflow

**sop** — Categories, CRUD (draft/publish/archive), versioning, acknowledgments, variant requests, tasks, compliance report

**franchise** — Branch list/detail, open new (7-step wizard), contract management, royalty report

**reports** — Dashboard stats, revenue, top items, staff performance, inventory, customer cohorts, export

**audit** — List with filters, getById

**notifications** — List, mark read, subscribe (real-time)

(Full procedure list in original spec — implement all of them)

---

## 🌱 SEED DATA IMPORT — CRITICAL PHASE

After schema is created, run seed script that:

### Step 1: Create Initial Branches (6 real branches)
```typescript
// From seed-data/branches.json
const branches = JSON.parse(readFileSync('seed-data/branches.json', 'utf-8'));

const branchIdMap = {}; // old_id → new_id

for (const oldBranch of branches) {
  const isHQ = oldBranch.name.includes('Hibi House');
  
  const inserted = await db.insert(branches).values({
    name: oldBranch.name,
    branchCode: oldBranch.branchCode,
    branchType: isHQ ? 'hq' : 'company-owned',
    status: oldBranch.isActive ? 'active' : 'inactive',
    province: oldBranch.province,
    country: 'Thailand',
    currency: 'THB',
    taxRate: 7.00,
    timezone: 'Asia/Bangkok',
  }).returning();
  
  branchIdMap[oldBranch.id] = inserted[0].id;
}

// Result:
// HQ:     Hibi House (warehouse)
// Stores: HB01, HB02, HB03, HB04, HB05
```

### Step 2: Create Initial Super Admin (default user)
```typescript
// Default super admin account
await db.insert(staff).values({
  employeeCode: 'HMC-0001',
  firstName: 'Super',
  lastName: 'Admin',
  role: 'super_admin',
  primaryBranchId: branchIdMap[150001] || hibiHouseId, // Hibi House
  status: 'active',
  passwordHash: await bcrypt.hash('changeme123', 12),
  pinHash: await bcrypt.hash('0000', 12),
});
```

### Step 3: Import Real Staff (20 active staff)
```typescript
// From seed-data/staff.json
const staffData = JSON.parse(readFileSync('seed-data/staff.json', 'utf-8'));

// Role mapping (old → new)
const roleMap = {
  'super_admin': 'super_admin',
  'branch_owner': 'staff_admin',
  'branch_manager': 'staff_admin',
  'area_manager': 'staff_admin',
  'branch_staff': 'staff',
};

// Default password (staff change on first login)
const defaultPasswordHash = await bcrypt.hash('hibi2026', 12);
const defaultPinHash = await bcrypt.hash('0000', 12);

const staffIdMap = {}; // for staff_branches mapping

for (const s of staffData) {
  if (!s.employeeCode) continue; // skip if no code
  
  const inserted = await db.insert(staff).values({
    employeeCode: s.employeeCode,
    firstName: s.name.split(' ')[0],
    lastName: s.name.split(' ').slice(1).join(' ') || '',
    firstNameThai: s.name,
    role: roleMap[s.role] || 'staff',
    primaryBranchId: s.branchId ? branchIdMap[s.branchId] : null,
    status: 'active',
    passwordHash: defaultPasswordHash,
    pinHash: defaultPinHash,
  }).returning();
  
  staffIdMap[s.employeeCode] = inserted[0].id;
}
```

### Step 4: Import Staff-Branch Mappings
```typescript
// From seed-data/staff_branches.json
const mappings = JSON.parse(readFileSync('seed-data/staff_branches.json', 'utf-8'));

for (const m of mappings) {
  const newStaffId = staffIdMap_byOldId[m.staffId];
  const newBranchId = branchIdMap[m.branchId];
  
  if (!newStaffId || !newBranchId) continue;
  
  await db.insert(staff_branches).values({
    staffId: newStaffId,
    branchId: newBranchId,
    isPrimary: false,
  });
}
```

### Step 5: Create Inventory Categories Tree
```typescript
// Top level
[
  { name: 'Ingredients', nameThai: 'วัตถุดิบ', children: [
    { name: 'Matcha', nameThai: 'มัทฉะ' },
    { name: 'Hojicha', nameThai: 'โฮจิฉะ' },
    { name: 'Genmaicha', nameThai: 'เก็นไมฉะ' },
    { name: 'Tea', nameThai: 'ชา' },
    { name: 'Milk & Alternatives', nameThai: 'นมและทดแทน' },
    { name: 'Sweeteners', nameThai: 'สารให้ความหวาน' },
    { name: 'Toppings', nameThai: 'ท็อปปิ้ง' },
    { name: 'Other Ingredients', nameThai: 'วัตถุดิบอื่นๆ' },
  ]},
  { name: 'Packaging', nameThai: 'แพ็คเกจจิ้ง', children: [
    { name: 'Cups', nameThai: 'แก้ว' },
    { name: 'Lids', nameThai: 'ฝา' },
    { name: 'Straws', nameThai: 'หลอด' },
    { name: 'Bags', nameThai: 'ถุง' },
    { name: 'Paper Products', nameThai: 'กระดาษ' },
  ]},
  { name: 'Marketing Materials', nameThai: 'สื่อการตลาด' },
  { name: 'Equipment - General', nameThai: 'อุปกรณ์ทั่วไป' },
  { name: 'Equipment - Front of House', nameThai: 'อุปกรณ์หน้าร้าน' },
  { name: 'Equipment - Back of House', nameThai: 'อุปกรณ์หลังร้าน' },
  { name: 'Equipment - Electrical Small', nameThai: 'เครื่องใช้ไฟฟ้าเล็ก' },
  { name: 'Equipment - Electrical Large', nameThai: 'เครื่องใช้ไฟฟ้าใหญ่' },
  { name: 'Cleaning Supplies', nameThai: 'อุปกรณ์ทำความสะอาด' },
  { name: 'Brewing Tools', nameThai: 'อุปกรณ์ชง' },
]
```

### Step 6: Import Tea Catalog → pos_inventory_items
```typescript
// From seed-data/tea-catalog.json
for (const tea of teaCatalog) {
  const categoryName = tea.type === 'matcha' ? 'Matcha' :
                       tea.type === 'hojicha' ? 'Hojicha' :
                       tea.type === 'genmaicha' ? 'Genmaicha' : 'Tea';
  
  await db.insert(pos_inventory_items).values({
    sku: tea.code,                              // M01, H01, etc.
    name: tea.name,                             // "Kagoshima Chiran Asanoka"
    nameThai: tea.name,
    description: `Supplier: ${tea.supplier_name}`,
    categoryId: categoryMap[categoryName],
    unitOfMeasure: 'g',                         // grams
    sourceFlag: 'hq_supply',                    // HQ supplies tea to branches
    isActive: true,
  });
}
```

### Step 7: Import Inventory (Consumables + Equipment + Pack Items)
```typescript
// From seed-data/inventory.json
const allItems = [
  ...inventoryData.consumables,
  ...inventoryData.equipment,
  ...inventoryData.pack_items,
];

// Map Thai category names to category IDs
const categoryMapping = {
  'Matcha': 'Matcha',
  'วัตถุดิบหลัก': 'Other Ingredients',
  'Package': 'Packaging',
  'Re Package': 'Packaging',
  'อุปกรณ์ PACK': 'Packaging',
  'อุปกรณื PACK': 'Packaging',   // typo in source
  'Marketing': 'Marketing Materials',
  'อุปกรณ์ทำความสะอาด': 'Cleaning Supplies',
  'อุปกรณ์ทั่วไป': 'Equipment - General',
  'อุปกรณ์ ทั่วไป': 'Equipment - General',
  'อุปกรณ์ใช้หน้าร้าน': 'Equipment - Front of House',
  'อุปกรณ์ใช้หลังร้าน': 'Equipment - Back of House',
  'อุปกรณ์ชง': 'Brewing Tools',
  'เครื่องใช้ไฟฟ้าหน้าร้าน': 'Equipment - Electrical Small',
  'เครื่องใช้ไฟฟ้าหลังร้าน': 'Equipment - Electrical Large',
  'เครื่องใช้ไฟฟ้าเล็ก': 'Equipment - Electrical Small',
  'เครื่องใช้ไฟฟ้าใหญ่': 'Equipment - Electrical Large',
};

for (const item of allItems) {
  if (!item.name || !item.category) continue;
  const categoryEnglishName = categoryMapping[item.category] || 'Other Ingredients';
  
  await db.insert(pos_inventory_items).values({
    sku: item.sku || generateSku(item.name),
    name: item.name,
    nameThai: item.name_thai || item.description || null,
    description: item.description,
    categoryId: categoryMap[categoryEnglishName],
    unitOfMeasure: mapUnit(item.unit),  // "g" → "g", "แถว" → "row", etc.
    sourceFlag: item.source === 'House' ? 'hq_supply' : 'mixed',
    minStockLevel: item.reorder_alert,
    reorderPoint: item.reorder_alert,
    isActive: true,
  });
}
```

### Step 8: Import Pricing Data
```typescript
// From inventoryData.pricing — match by SKU and update cost
for (const price of pricingData) {
  const sku = price.sku;
  if (!sku) continue;
  
  await db.update(pos_inventory_items)
    .set({
      costPerUnit: price.cost_per_unit || price.price,
      sellingPricePerUnit: price.selling_price,
    })
    .where(eq(pos_inventory_items.sku, sku));
}
```

### Step 9: Create Initial Branch Stock Records
```typescript
// For each inventory item, create initial stock = 0 at Hibi House
const allItems = await db.select().from(pos_inventory_items);
for (const item of allItems) {
  await db.insert(pos_branch_inventory_stock).values({
    branchId: 1,                  // Hibi House
    inventoryItemId: item.id,
    currentStock: 0,              // Start at 0 - owner inputs via receiving
    reservedStock: 0,
  });
}
```

### Step 10: Create Standard Option Groups
```typescript
// Common matcha drink options
const optionGroups = [
  {
    name: 'Size',
    nameThai: 'ขนาด',
    selectionType: 'single',
    isRequired: true,
    options: [
      { name: 'Small', nameThai: 'เล็ก', priceAdjustment: -20 },
      { name: 'Medium', nameThai: 'กลาง', priceAdjustment: 0, isDefault: true },
      { name: 'Large', nameThai: 'ใหญ่', priceAdjustment: 30 },
    ]
  },
  {
    name: 'Sweetness',
    nameThai: 'ความหวาน',
    selectionType: 'single',
    isRequired: true,
    options: [
      { name: '0%', priceAdjustment: 0 },
      { name: '25%', priceAdjustment: 0 },
      { name: '50%', priceAdjustment: 0, isDefault: true },
      { name: '75%', priceAdjustment: 0 },
      { name: '100%', priceAdjustment: 0 },
    ]
  },
  {
    name: 'Milk Type',
    nameThai: 'ประเภทนม',
    selectionType: 'single',
    options: [
      { name: 'Whole Milk', nameThai: 'นมสด', priceAdjustment: 0, isDefault: true },
      { name: 'Oat Milk', nameThai: 'นมโอ๊ต', priceAdjustment: 20 },
      { name: 'Almond Milk', nameThai: 'นมอัลมอนด์', priceAdjustment: 20 },
      { name: 'Soy Milk', nameThai: 'นมถั่วเหลือง', priceAdjustment: 15 },
    ]
  },
  {
    name: 'Temperature',
    nameThai: 'อุณหภูมิ',
    selectionType: 'single',
    isRequired: true,
    options: [
      { name: 'Hot', nameThai: 'ร้อน', priceAdjustment: 0 },
      { name: 'Iced', nameThai: 'เย็น', priceAdjustment: 0, isDefault: true },
    ]
  },
  {
    name: 'Add-ons',
    nameThai: 'ท็อปปิ้ง',
    selectionType: 'multi',
    isRequired: false,
    maxSelections: 3,
    options: [
      { name: 'Extra Espresso Shot', nameThai: 'ช็อตเอสเปรสโซ่', priceAdjustment: 20 },
      { name: 'Whipped Cream', nameThai: 'วิปครีม', priceAdjustment: 15 },
      { name: 'Boba Pearls', nameThai: 'ไข่มุก', priceAdjustment: 10 },
      { name: 'Extra Matcha', nameThai: 'มัทฉะพิเศษ', priceAdjustment: 25 },
    ]
  },
];
```

### Step 11: Create Standard Payment Methods
```typescript
const paymentMethods = [
  { code: 'cash', name: 'Cash', nameThai: 'เงินสด', type: 'cash', sortOrder: 1 },
  { code: 'promptpay', name: 'PromptPay', nameThai: 'พร้อมเพย์', type: 'qr', requiresReference: true, sortOrder: 2 },
  { code: 'card', name: 'Credit/Debit Card', nameThai: 'บัตรเครดิต/เดบิต', type: 'card', sortOrder: 3 },
  { code: 'truemoney', name: 'TrueMoney Wallet', nameThai: 'ทรูมันนี่', type: 'qr', sortOrder: 4 },
  { code: 'linepay', name: 'LINE Pay', nameThai: 'ไลน์เพย์', type: 'qr', sortOrder: 5 },
  { code: 'bank_transfer', name: 'Bank Transfer', nameThai: 'โอนผ่านธนาคาร', type: 'transfer', requiresReference: true, sortOrder: 6 },
];
```

### Step 12: DO NOT Import
- Sample menu items (owner creates these)
- Sample orders (these come from actual sales)
- Sample customers (anonymized — start empty)
- Sample SOPs (owner creates these)

---

## 🎯 COMPLETE PAGE WIRING

For EACH page, wire UI to tRPC. Replace ALL mock data.

### POS App Pages

**`/pos/login`**
- Modes: Employee Code+Password / PIN
- Wire to `auth.loginWithEmployeeCode` and `auth.loginWithPin`
- Store JWT in localStorage + HttpOnly cookie

**`/pos/terminal`**
- Load menu: `menu.listAvailable({ branchId })`
- Load categories: `categories.list({ branchId })`
- Load options on item click: `menu.getById`
- Cart in local state (useState)
- Checkout → `/pos/payment`
- Hold/Resume: `orders.holdOrder` / `orders.resumeOrder`

**`/pos/payment`**
- Load methods: `payments.listMethods`
- Create order: `orders.create` → `orders.addPayment`
- Validate discount: `discounts.validateCode`

**`/pos/receipt`**
- `orders.getById`
- `orders.printReceipt`

**`/pos/kitchen`**
- `kitchen.listTickets({ branchId })`
- Real-time: `kitchen.subscribeToTickets`
- Actions: `kitchen.markReady`

**`/pos/orders`**
- `orders.list` with filters + pagination

### Backoffice App Pages (27 pages)

**`/backoffice`** — Dashboard
- `reports.getDashboardStats`
- `reports.getRevenueReport`
- `reports.getTopItemsReport`
- `inventory.listStock({ lowStockOnly: true })`
- `audit.list({ limit: 10 })`

**`/backoffice/menu`** — Full CRUD via `menu.*`
**`/backoffice/categories`** — Full CRUD via `categories.*`
**`/backoffice/options`** — Full CRUD via `options.*`
**`/backoffice/discounts`** — Full CRUD via `discounts.*`
**`/backoffice/payments`** — Full CRUD via `payments.*`
**`/backoffice/staff`** — Full CRUD via `staff.*`
**`/backoffice/reports`** — All `reports.*` endpoints
**`/backoffice/orders`** — `orders.list` with admin actions
**`/backoffice/audit-log`** — `audit.list` with filters

**Inventory pages:**
- `/backoffice/inventory` — Overview stats
- `/backoffice/inventory/items` — Full CRUD via `inventory.*`
- `/backoffice/inventory/receiving` — `inventory.receiveStock`
- `/backoffice/inventory/count` — `inventory.countStock` (wizard)
- `/backoffice/inventory/transfer` — `inventory.transferStock`
- `/backoffice/inventory/movements` — `inventory.listMovements`

**`/backoffice/suppliers`** — Full CRUD via `suppliers.*`
**`/backoffice/suppliers/[id]`** — Tabs with stats
**`/backoffice/purchase-orders`** — Full workflow via `purchaseOrders.*`

**Franchise pages (Super Admin):**
- `/backoffice/franchise` — `franchise.listBranches`
- `/backoffice/franchise/new` — 7-step wizard `franchise.openNewBranch`
- `/backoffice/franchise/[id]` — `franchise.getBranchDetail`

**SOP pages:**
- `/backoffice/sop` — `sop.list`
- `/backoffice/sop/[id]` — `sop.getById` + `sop.acknowledge`
- `/backoffice/sop/new` — Block editor + `sop.create/publish`
- `/backoffice/sop/approval-queue` — `sop.listVariants` (super admin)
- `/backoffice/sop/compliance` — `sop.getComplianceReport`
- `/backoffice/sop/my-variants` — `sop.listVariants`
- `/backoffice/sop/my-tasks` — `sop.listMyTasks`

**`/backoffice/settings`** — All tabs wired

---

## 🔐 AUTH FLOW

### PIN Login (POS)
```
1. User selects branch on /pos/login
2. Enters 4-digit PIN
3. Server: bcrypt.compare(pin, staff.pinHash)
4. If match → JWT with { staffId, branchId, role: 'staff_pin' }
5. JWT stored in localStorage + HttpOnly cookie
6. Redirect to /pos/terminal
```

### Employee Login (Backoffice)
```
1. /backoffice/login: employeeCode + password
2. bcrypt.compare(password, staff.passwordHash)
3. JWT with { staffId, role, primaryBranchId }
4. Redirect to /backoffice
```

### Session Middleware
- Verify JWT from authorization header
- Attach to ctx: `ctx.staff`, `ctx.permissions`
- Use `ctx.staff` in procedures for permission checks

### Permission Matrix
- **super_admin** — Everything across all branches
- **staff_admin** — Their branch only + read-only HQ
- **staff** — POS only + read SOPs

---

## 🎯 IMPLEMENTATION PLAN

### Phase 1: Database Foundation (Hour 1-2)
1. Configure Drizzle for TiDB MySQL
2. Create `drizzle/schema.ts` with ALL 32 tables
3. Generate + apply migrations
4. Verify tables in TiDB

### Phase 2: Seed Data Import (Hour 2-3) ⭐ CRITICAL
1. Create `server/seed/index.ts`
2. Run import in order:
   - Initial branch (Hibi House)
   - Super admin user
   - Inventory categories tree
   - Tea catalog (45 items)
   - Inventory items (393 items)
   - Pricing updates
   - Initial stock records
   - Standard option groups
   - Standard payment methods
3. Add `npm run seed` script
4. Verify counts: 1 branch, 1 staff, 24 categories, 438+ items, 5 option groups, 6 payment methods

### Phase 3: Auth System (Hour 3-4)
- Auth utilities (bcrypt, JWT)
- Session middleware
- Auth router
- Wire login pages

### Phase 4: Core Data Routers (Hour 4-7)
- branches, staff, categories, options, menu, discounts, payments

### Phase 5: POS Flow (Hour 7-10)
- orders, kitchen routers
- Wire all POS pages

### Phase 6: Backoffice CRUD (Hour 10-13)
- Wire all `/backoffice/*` pages

### Phase 7: Inventory System (Hour 13-15)
- inventory, suppliers, purchaseOrders routers
- Wire all inventory pages

### Phase 8: SOP System (Hour 15-17)
- sop router
- Wire all SOP pages

### Phase 9: Franchise + System (Hour 17-18)
- franchise, audit, notifications routers
- Wire remaining pages

### Phase 10: Polish + Testing (Hour 18-20)
- Error handling
- Loading states
- Toast notifications
- End-to-end testing
- Bug fixes

---

## ⚡ CRITICAL RULES

### DO
✅ Use TypeScript for ALL new files
✅ Use Drizzle ORM for ALL queries
✅ Use tRPC for ALL endpoints
✅ Use Zod for input validation
✅ Use bcrypt rounds: 12
✅ Use JWT with 7-day expiry
✅ Add proper error handling (TRPCError)
✅ Add loading + error states in every page
✅ Use Tailwind classes for new components (Tailwind 4)
✅ Keep existing UI design EXACTLY
✅ Use existing icons from @/icons
✅ Show toast on every action
✅ Support Thai language where text shown
✅ Make all forms work with EMPTY database
✅ **Import seed data on `npm run seed`**

### DO NOT
❌ Do NOT add fake/dummy menu items (owner adds these)
❌ Do NOT add fake orders, customers, sales
❌ Do NOT change visual design
❌ Do NOT use raw SQL (use Drizzle)
❌ Do NOT skip validation
❌ Do NOT bypass auth checks
❌ Do NOT hardcode IDs
❌ Do NOT use browser storage in artifacts

---

## 🧪 VERIFICATION CHECKLIST

```
□ npm run build — 0 errors
□ npx tsc --noEmit — 0 errors
□ All 32 tables exist in TiDB
□ npm run seed — completes successfully
□ Database has: 6 branches, 21 staff (1 super admin + 20 imported), 24 categories, 438+ inventory items, 5 option groups, 6 payment methods
□ Can login with Super Admin: HMC-0001 / changeme123
□ Can login with PIN: 0000
□ /pos/terminal loads menu (empty if no menu items)
□ /backoffice/inventory/items shows imported items
□ Can create menu item → appears in POS
□ Can create order → appears in kitchen
□ Can complete order → updates inventory
□ Can create supplier
□ Can create PO → approval workflow works
□ Can create SOP → publish → acknowledge
□ Audit log records every action
□ Light/Dark mode works
□ Role switching shows correct sidebar
□ Branch switching changes context
□ Multi-language (TH/EN) works
```

---

## 📦 FINAL DELIVERABLES

When done, provide:

1. **Complete codebase** with all changes committed
2. **Migration files** in `drizzle/`
3. **Seed script** at `server/seed/index.ts`
4. **Updated package.json** with new scripts:
   - `npm run dev`
   - `npm run build`
   - `npm run db:push` (Drizzle)
   - `npm run seed`
5. **`.env.example`** with all required vars
6. **README.md** with:
   - Setup instructions
   - First-time login credentials
   - How to run seed
   - How to deploy
7. **Summary report**:
   - tables created
   - routers created
   - pages wired
   - seed data imported (counts)
   - known issues

---

## 🚀 DEFAULT CREDENTIALS (for first login)

### Super Admin (สร้างใหม่):
```
Employee Code: HMC-0001
Password:      changeme123
PIN:           0000
```

### Imported Staff (20 คนจากระบบเก่า):
```
Default Password:  hibi2026
Default PIN:       0000

Employee Codes:
- HBHQ-00 (Updated Staff) - super_admin
- HBHQ-01 (Nitiruj) - super_admin
- HBCN-01, HBCN-02, HBCN-03, HBCN-04 - super_admin/branch_manager
- HB01-01 (Punpun), HB01-02 (เอ๊ะ), HB01-04 (เมย์) - HB01 Ladprao
- HB02-01 (Orrawan), HB02-02 (Oraphan) - HB02 Samyan
- HB03-01 (aneesah) - HB03 Nawamin
- HB04-01 (นัดดา) - HB04 Saphan Khwai
- HB05-01 (เนย) - HB05 Nak Niwat
- EM007 (วาส), EM009 (Dev.Paul) - super_admin
- TMD000 (พี่ชาติ) - super_admin

⚠️ ALL STAFF MUST:
- Change password on first login
- Set new PIN on first POS login
- Update profile info
```

---

## 💪 LET'S BUILD THIS

You have:
- Complete UI (37 pages) ✅
- Database schema spec (32 tables) ✅
- Router spec (17 routers, 200+ procedures) ✅
- Real seed data (45 teas + 393 inventory items + 162 prices) ✅
- Standard option groups + payment methods ✅
- Clear phase plan ✅

**Build the entire system. Make it work. Import the seed data. Production-ready. 🍵**

---

## 📂 FILES IN seed-data/

```
seed-data/
├── branches.json              # 6 real Hibi branches
├── staff.json                 # 20 active staff (no PII)
├── staff_branches.json        # 13 staff-branch mappings
├── tea-catalog.json           # 45 Hibi tea varieties
├── inventory.json             # 393 inventory items + 162 pricing
├── Hibi_New_Menu_-_รหัสชา.csv # Original tea CSV
└── Agape_Set_up.xlsx          # Original inventory Excel
```

Read these files in the seed script using `fs.readFileSync` and `JSON.parse`.

---

🍵 Build it. Import it. Ship it.
