import {
  boolean,
  date,
  decimal,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  time,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Manus OAuth users (kept for backward compat) ─────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Branches ─────────────────────────────────────────────────────────────────
export const branches = mysqlTable("branches", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  branchCode: varchar("branchCode", { length: 20 }).unique(),
  branchType: mysqlEnum("branchType", ["hq", "company-owned", "franchise"]).default("company-owned"),
  status: mysqlEnum("status", ["active", "inactive", "closed"]).default("active"),

  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),

  address: text("address"),
  province: varchar("province", { length: 100 }),
  district: varchar("district", { length: 100 }),
  postalCode: varchar("postalCode", { length: 10 }),
  country: varchar("country", { length: 100 }).default("Thailand"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),

  timezone: varchar("timezone", { length: 50 }).default("Asia/Bangkok"),
  currency: varchar("currency", { length: 3 }).default("THB"),
  taxRate: decimal("taxRate", { precision: 5, scale: 2 }).default("7.00"),
  taxInclusive: boolean("taxInclusive").default(false),
  operatingHours: json("operatingHours"),

  franchiseOwnerId: int("franchiseOwnerId"),
  openingDate: date("openingDate"),
  contractStartDate: date("contractStartDate"),
  contractEndDate: date("contractEndDate"),
  royaltyType: mysqlEnum("royaltyType", ["percentage", "fixed", "hybrid", "none"]).default("none"),
  royaltyValue: decimal("royaltyValue", { precision: 10, scale: 2 }),

  accessCode: varchar("accessCode", { length: 20 }),

  // Loyalty program settings per branch
  loyaltyEnabled: boolean("loyaltyEnabled").default(false),
  loyaltyPointsPerBaht: decimal("loyaltyPointsPerBaht", { precision: 5, scale: 2 }).default("0.04"), // 25 baht = 1 point
  loyaltyRedeemRate: decimal("loyaltyRedeemRate", { precision: 5, scale: 2 }).default("1.00"), // 1 point = 1 baht
  loyaltyPointExpireDays: int("loyaltyPointExpireDays").default(365),
  loyaltyMinOrderForPoints: decimal("loyaltyMinOrderForPoints", { precision: 10, scale: 2 }).default("0"),

  // Staff commission settings
  commissionEnabled: boolean("commissionEnabled").default(false),
  commissionRate: decimal("commissionRate", { precision: 5, scale: 2 }).default("0"),
  commissionType: mysqlEnum("commissionType", ["percentage", "fixed_per_order"]).default("percentage"),

  // Logo / branding per branch
  logoUrl: varchar("logoUrl", { length: 500 }),

  // Business Model & Ownership details
  businessModel: varchar("businessModel", { length: 100 }),
  ownershipType: varchar("ownershipType", { length: 100 }),
  ownerName: varchar("ownerName", { length: 255 }),
  ownerPhone: varchar("ownerPhone", { length: 100 }),
  ownerEmail: varchar("ownerEmail", { length: 255 }),
  ownerAddress: text("ownerAddress"),
  ownerTaxId: varchar("ownerTaxId", { length: 100 }),
  ownerCitizenId: varchar("ownerCitizenId", { length: 100 }),

  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});
export type Branch = typeof branches.$inferSelect;
export type InsertBranch = typeof branches.$inferInsert;

// ─── Staff ────────────────────────────────────────────────────────────────────
export const staff = mysqlTable("staff", {
  id: int("id").autoincrement().primaryKey(),
  employeeCode: varchar("employeeCode", { length: 20 }).notNull().unique(),

  firstName: varchar("firstName", { length: 100 }),
  lastName: varchar("lastName", { length: 100 }),
  firstNameThai: varchar("firstNameThai", { length: 100 }),
  lastNameThai: varchar("lastNameThai", { length: 100 }),
  email: varchar("email", { length: 255 }).unique(),
  phone: varchar("phone", { length: 20 }),
  avatar: varchar("avatar", { length: 500 }),

  passwordHash: varchar("passwordHash", { length: 255 }),
  pinHash: varchar("pinHash", { length: 255 }),

  role: mysqlEnum("role", ["super_admin", "staff_admin", "staff", "owner", "hq_admin", "branch_admin", "manager", "cashier"]).default("staff"),
  primaryBranchId: int("primaryBranchId"),

  employmentType: mysqlEnum("employmentType", ["full-time", "part-time", "contract"]).default("full-time"),
  hireDate: date("hireDate"),
  status: mysqlEnum("status", ["active", "inactive", "terminated"]).default("active"),

  emergencyContactName: varchar("emergencyContactName", { length: 200 }),
  emergencyContactPhone: varchar("emergencyContactPhone", { length: 20 }),

  lastLoginAt: timestamp("lastLoginAt"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});
export type Staff = typeof staff.$inferSelect;
export type InsertStaff = typeof staff.$inferInsert;

// ─── Staff ↔ Branches ─────────────────────────────────────────────────────────
export const staffBranches = mysqlTable("staff_branches", {
  id: int("id").autoincrement().primaryKey(),
  staffId: int("staffId").notNull(),
  branchId: int("branchId").notNull(),
  isPrimary: boolean("isPrimary").default(false),
  createdAt: timestamp("createdAt").defaultNow(),
}, (t) => [unique("uniq_staff_branch").on(t.staffId, t.branchId)]);

// ─── POS Categories ───────────────────────────────────────────────────────────
export const posCategories = mysqlTable("pos_categories", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId"),
  name: varchar("name", { length: 100 }).notNull(),
  nameThai: varchar("nameThai", { length: 100 }),
  description: text("description"),
  iconName: varchar("iconName", { length: 50 }),
  colorHex: varchar("colorHex", { length: 7 }),
  sortOrder: int("sortOrder").default(0),
  isActive: boolean("isActive").default(true),
  isArchived: boolean("isArchived").default(false),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});
export type PosCategory = typeof posCategories.$inferSelect;
export type InsertPosCategory = typeof posCategories.$inferInsert;

// ─── POS Option Groups ────────────────────────────────────────────────────────
export const posOptionGroups = mysqlTable("pos_option_groups", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }),
  nameThai: varchar("nameThai", { length: 100 }),
  selectionType: mysqlEnum("selectionType", ["single", "multi", "quantity"]).default("single"),
  isRequired: boolean("isRequired").default(false),
  minSelections: int("minSelections").default(0),
  maxSelections: int("maxSelections"),
  sortOrder: int("sortOrder").default(0),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});
export type PosOptionGroup = typeof posOptionGroups.$inferSelect;

// ─── POS Options ──────────────────────────────────────────────────────────────
export const posOptions = mysqlTable("pos_options", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  name: varchar("name", { length: 100 }),
  nameThai: varchar("nameThai", { length: 100 }),
  priceAdjustment: decimal("priceAdjustment", { precision: 10, scale: 2 }).default("0"),
  costAdjustment: decimal("costAdjustment", { precision: 10, scale: 2 }).default("0"),
  stockEffects: json("stockEffects"), // Array of StockEffect objects
  sortOrder: int("sortOrder").default(0),
  isDefault: boolean("isDefault").default(false),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow(),
});
export type PosOption = typeof posOptions.$inferSelect;

// ─── Menu Items ───────────────────────────────────────────────────────────────
export const posMenuItems = mysqlTable("pos_menu_items", {
  id: int("id").autoincrement().primaryKey(),
  sku: varchar("sku", { length: 50 }).unique(),
  barcode: varchar("barcode", { length: 50 }),

  name: varchar("name", { length: 200 }).notNull(),
  nameThai: varchar("nameThai", { length: 200 }),
  nameJapanese: varchar("nameJapanese", { length: 200 }),
  description: text("description"),
  descriptionThai: text("descriptionThai"),
  imageUrl: varchar("imageUrl", { length: 500 }),

  categoryId: int("categoryId"),
  tags: json("tags").$type<string[]>(),

  basePrice: decimal("basePrice", { precision: 10, scale: 2 }).notNull(),
  costPrice: decimal("costPrice", { precision: 10, scale: 2 }),
  memberPrice: decimal("memberPrice", { precision: 10, scale: 2 }),

  isActive: boolean("isActive").default(true),
  isArchived: boolean("isArchived").default(false),
  isFeatured: boolean("isFeatured").default(false),
  availableFrom: time("availableFrom"),
  availableTo: time("availableTo"),

  trackInventory: boolean("trackInventory").default(false),

  prepTimeMinutes: int("prepTimeMinutes"),
  cookTimeMinutes: int("cookTimeMinutes"),
  recipeNotes: text("recipeNotes"),

  // Link to the SOP that explains how to prepare this item (optional)
  sopId: int("sopId"),

  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});
export type PosMenuItem = typeof posMenuItems.$inferSelect;
export type InsertPosMenuItem = typeof posMenuItems.$inferInsert;

// ─── Menu Item ↔ Option Groups ────────────────────────────────────────────────
export const posMenuItemOptionGroups = mysqlTable("pos_menu_item_option_groups", {
  id: int("id").autoincrement().primaryKey(),
  menuItemId: int("menuItemId").notNull(),
  optionGroupId: int("optionGroupId").notNull(),
  sortOrder: int("sortOrder").default(0),
}, (t) => [unique("uniq_item_group").on(t.menuItemId, t.optionGroupId)]);

// ─── Per-Branch Menu Availability ─────────────────────────────────────────────
export const posBranchMenuItems = mysqlTable("pos_branch_menu_items", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").notNull(),
  menuItemId: int("menuItemId").notNull(),
  isAvailable: boolean("isAvailable").default(true),
  priceOverride: decimal("priceOverride", { precision: 10, scale: 2 }),
  stockLevel: int("stockLevel"),
}, (t) => [unique("uniq_branch_item").on(t.branchId, t.menuItemId)]);

// ─── Discounts ────────────────────────────────────────────────────────────────
export const posDiscounts = mysqlTable("pos_discounts", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).unique(),
  name: varchar("name", { length: 200 }),
  description: text("description"),

  discountType: mysqlEnum("discountType", ["percentage", "fixed", "bogo", "free_item"]),
  value: decimal("value", { precision: 10, scale: 2 }),

  minOrderAmount: decimal("minOrderAmount", { precision: 10, scale: 2 }),
  maxDiscountAmount: decimal("maxDiscountAmount", { precision: 10, scale: 2 }),
  applicableCategories: json("applicableCategories").$type<number[]>(),
  applicableMenuItems: json("applicableMenuItems").$type<number[]>(),

  maxUses: int("maxUses"),
  maxUsesPerCustomer: int("maxUsesPerCustomer"),
  usedCount: int("usedCount").default(0),

  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  daysOfWeek: json("daysOfWeek").$type<number[]>(),
  startTime: time("startTime"),
  endTime: time("endTime"),

  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});
export type PosDiscount = typeof posDiscounts.$inferSelect;

// ─── Payment Methods ──────────────────────────────────────────────────────────
export const posPaymentMethods = mysqlTable("pos_payment_methods", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).unique(),
  name: varchar("name", { length: 100 }),
  nameThai: varchar("nameThai", { length: 100 }),
  type: mysqlEnum("type", ["cash", "qr", "card", "voucher", "transfer", "other"]),
  iconName: varchar("iconName", { length: 50 }),
  feePercentage: decimal("feePercentage", { precision: 5, scale: 2 }).default("0"),
  feeFixed: decimal("feeFixed", { precision: 10, scale: 2 }).default("0"),
  requiresReference: boolean("requiresReference").default(false),
  sortOrder: int("sortOrder").default(0),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow(),
});
export type PosPaymentMethod = typeof posPaymentMethods.$inferSelect;

// ─── Orders ───────────────────────────────────────────────────────────────────
export const posOrders = mysqlTable("pos_orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 50 }).unique(),
  branchId: int("branchId"),
  staffId: int("staffId"),

  orderType: mysqlEnum("orderType", ["dine-in", "takeaway", "delivery"]).default("dine-in"),
  tableNumber: varchar("tableNumber", { length: 20 }),
  customerName: varchar("customerName", { length: 200 }),
  customerPhone: varchar("customerPhone", { length: 20 }),

  // Delivery / 3rd-party platform fields (set when orderType === "delivery")
  deliveryPlatform: mysqlEnum("deliveryPlatform", [
    "in_house", "grab", "lineman", "shopeefood", "foodpanda", "robinhood", "other",
  ]).default("in_house"),
  externalOrderId: varchar("externalOrderId", { length: 100 }),  // Grab/Shopee order id
  deliveryAddress: text("deliveryAddress"),
  deliveryFee: decimal("deliveryFee", { precision: 10, scale: 2 }).default("0"),
  platformCommissionPct: decimal("platformCommissionPct", { precision: 5, scale: 2 }),
  platformPayout: decimal("platformPayout", { precision: 10, scale: 2 }),  // net amount after platform cut
  riderName: varchar("riderName", { length: 100 }),
  riderPhone: varchar("riderPhone", { length: 20 }),

  status: mysqlEnum("status", [
    "draft", "pending", "preparing", "ready",
    "served", "completed", "cancelled", "refunded",
  ]).default("pending"),

  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal("discountAmount", { precision: 10, scale: 2 }).default("0"),
  discountId: int("discountId"),
  taxAmount: decimal("taxAmount", { precision: 10, scale: 2 }).default("0"),
  serviceCharge: decimal("serviceCharge", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),

  notes: text("notes"),

  createdAt: timestamp("createdAt").defaultNow(),
  preparingAt: timestamp("preparingAt"),
  readyAt: timestamp("readyAt"),
  servedAt: timestamp("servedAt"),
  completedAt: timestamp("completedAt"),
  cancelledAt: timestamp("cancelledAt"),
  cancelReason: text("cancelReason"),

  // Print tracking
  paymentQrPayload: text("paymentQrPayload"),
  paymentQrAmount: decimal("paymentQrAmount", { precision: 10, scale: 2 }),
  paymentRefNumber: varchar("paymentRefNumber", { length: 100 }),
  orderSlipPrintedAt: timestamp("orderSlipPrintedAt"),
  labelsPrintedAt: timestamp("labelsPrintedAt"),
  kitchenTicketPrintedAt: timestamp("kitchenTicketPrintedAt"),
  receiptPrintedAt: timestamp("receiptPrintedAt"),
  memberId: int("memberId"),

  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});
export type PosOrder = typeof posOrders.$inferSelect;
export type InsertPosOrder = typeof posOrders.$inferInsert;

// ─── Order Items ──────────────────────────────────────────────────────────────
export const posOrderItems = mysqlTable("pos_order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  menuItemId: int("menuItemId"),

  menuItemName: varchar("menuItemName", { length: 200 }),
  menuItemPrice: decimal("menuItemPrice", { precision: 10, scale: 2 }),

  quantity: int("quantity").default(1),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }),
  totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }),

  kitchenStatus: mysqlEnum("kitchenStatus", ["pending", "preparing", "ready", "served"]).default("pending"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow(),
});
export type PosOrderItem = typeof posOrderItems.$inferSelect;

// ─── Order Item Options ───────────────────────────────────────────────────────
export const posOrderItemOptions = mysqlTable("pos_order_item_options", {
  id: int("id").autoincrement().primaryKey(),
  orderItemId: int("orderItemId").notNull(),
  optionId: int("optionId"),
  optionName: varchar("optionName", { length: 100 }),
  priceAdjustment: decimal("priceAdjustment", { precision: 10, scale: 2 }),
  costAdjustment: decimal("costAdjustment", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("createdAt").defaultNow(),
});

// ─── Order Payments ───────────────────────────────────────────────────────────
export const posOrderPayments = mysqlTable("pos_order_payments", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  paymentMethodId: int("paymentMethodId"),
  amount: decimal("amount", { precision: 10, scale: 2 }),
  referenceNumber: varchar("referenceNumber", { length: 100 }),
  status: mysqlEnum("status", ["pending", "completed", "failed", "refunded"]).default("completed"),
  paidAt: timestamp("paidAt").defaultNow(),
  createdAt: timestamp("createdAt").defaultNow(),

  // Slip & QR verification columns
  qrPayload: text("qrPayload"),
  qrGeneratedAmount: decimal("qrGeneratedAmount", { precision: 10, scale: 2 }),
  slipImageUrl: text("slipImageUrl"),
  bankReference: varchar("bankReference", { length: 100 }),
  payerName: varchar("payerName", { length: 100 }),
  transferTime: timestamp("transferTime"),
  verificationStatus: mysqlEnum("verificationStatus", ["not_required", "pending", "verified", "rejected", "manual_review"]).default("not_required"),
  verifiedBy: int("verifiedBy"),
  verifiedAt: timestamp("verifiedAt"),
});
export type PosOrderPayment = typeof posOrderPayments.$inferSelect;

// ─── Kitchen Tickets ──────────────────────────────────────────────────────────
export const posKitchenTickets = mysqlTable("pos_kitchen_tickets", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  ticketNumber: varchar("ticketNumber", { length: 20 }),
  station: mysqlEnum("station", ["drinks", "food", "desserts", "all"]).default("all"),
  status: mysqlEnum("status", ["pending", "preparing", "ready", "served"]).default("pending"),
  priority: mysqlEnum("priority", ["normal", "urgent"]).default("normal"),
  printedAt: timestamp("printedAt"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow(),
});
export type PosKitchenTicket = typeof posKitchenTickets.$inferSelect;

// ─── Daily Summaries ──────────────────────────────────────────────────────────
export const posDailySummaries = mysqlTable("pos_daily_summaries", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").notNull(),
  summaryDate: date("summaryDate").notNull(),

  totalOrders: int("totalOrders").default(0),
  totalRevenue: decimal("totalRevenue", { precision: 12, scale: 2 }).default("0"),
  totalDiscounts: decimal("totalDiscounts", { precision: 10, scale: 2 }).default("0"),
  totalTax: decimal("totalTax", { precision: 10, scale: 2 }).default("0"),
  averageOrderValue: decimal("averageOrderValue", { precision: 10, scale: 2 }).default("0"),

  paymentBreakdown: json("paymentBreakdown"),
  topItems: json("topItems"),

  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
}, (t) => [unique("uniq_branch_date").on(t.branchId, t.summaryDate)]);

// ─── Inventory Categories ─────────────────────────────────────────────────────
export const posInventoryCategories = mysqlTable("pos_inventory_categories", {
  id: int("id").autoincrement().primaryKey(),
  parentId: int("parentId"),
  name: varchar("name", { length: 100 }).notNull(),
  nameThai: varchar("nameThai", { length: 100 }),
  level: int("level").default(0),
  sortOrder: int("sortOrder").default(0),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});
export type PosInventoryCategory = typeof posInventoryCategories.$inferSelect;

// ─── Inventory Items ──────────────────────────────────────────────────────────
export const posInventoryItems = mysqlTable("pos_inventory_items", {
  id: int("id").autoincrement().primaryKey(),
  sku: varchar("sku", { length: 50 }).unique(),
  barcode: varchar("barcode", { length: 50 }),

  name: varchar("name", { length: 200 }).notNull(),
  nameThai: varchar("nameThai", { length: 200 }),
  description: text("description"),
  imageUrl: varchar("imageUrl", { length: 500 }),

  categoryId: int("categoryId"),
  unitOfMeasure: mysqlEnum("unitOfMeasure", ["g", "kg", "ml", "l", "piece", "pack", "box", "bottle", "can", "bag"]),
  sourceFlag: mysqlEnum("sourceFlag", ["hq_supply", "customer_supplied", "mixed"]).default("hq_supply"),

  costPerUnit: decimal("costPerUnit", { precision: 10, scale: 4 }),
  sellingPricePerUnit: decimal("sellingPricePerUnit", { precision: 10, scale: 4 }),
  retailPrice: decimal("retailPrice", { precision: 10, scale: 2 }),

  minStockLevel: decimal("minStockLevel", { precision: 10, scale: 3 }),
  reorderPoint: decimal("reorderPoint", { precision: 10, scale: 3 }),
  reorderQuantity: decimal("reorderQuantity", { precision: 10, scale: 3 }),

  primarySupplierId: int("primarySupplierId"),
  leadTimeDays: int("leadTimeDays"),
  shelfLifeDays: int("shelfLifeDays"),

  storageRequirements: text("storageRequirements"),
  allergens: json("allergens").$type<string[]>(),

  attributes: json("attributes").$type<Record<string, string | number | null>>(),

  isActive: boolean("isActive").default(true),
  isArchived: boolean("isArchived").default(false),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});
export type PosInventoryItem = typeof posInventoryItems.$inferSelect;
export type InsertPosInventoryItem = typeof posInventoryItems.$inferInsert;

// ─── Branch Inventory Stock ───────────────────────────────────────────────────
export const posBranchInventoryStock = mysqlTable("pos_branch_inventory_stock", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").notNull(),
  inventoryItemId: int("inventoryItemId").notNull(),
  currentStock: decimal("currentStock", { precision: 10, scale: 3 }).default("0"),
  reservedStock: decimal("reservedStock", { precision: 10, scale: 3 }).default("0"),
  averageCost: decimal("averageCost", { precision: 10, scale: 4 }).default("0"),
  totalStockValue: decimal("totalStockValue", { precision: 12, scale: 2 }).default("0"),
  lastCountedAt: timestamp("lastCountedAt"),
  lastReceivedAt: timestamp("lastReceivedAt"),
}, (t) => [unique("uniq_branch_item").on(t.branchId, t.inventoryItemId)]);
export type PosBranchInventoryStock = typeof posBranchInventoryStock.$inferSelect;

// ─── Inventory Movements ──────────────────────────────────────────────────────
export const posInventoryMovements = mysqlTable("pos_inventory_movements", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").notNull(),
  inventoryItemId: int("inventoryItemId").notNull(),
  movementType: mysqlEnum("movementType", [
    "received", "used", "transferred_in", "transferred_out",
    "adjusted", "wasted", "expired", "sold",
  ]),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  unitOfMeasure: varchar("unitOfMeasure", { length: 20 }),
  costPerUnit: decimal("costPerUnit", { precision: 10, scale: 4 }),
  totalCost: decimal("totalCost", { precision: 12, scale: 2 }),
  referenceType: mysqlEnum("referenceType", ["purchase_order", "order", "transfer", "count", "manual"]),
  referenceId: int("referenceId"),
  notes: text("notes"),
  performedByStaffId: int("performedByStaffId"),
  createdAt: timestamp("createdAt").defaultNow(),
});
export type PosInventoryMovement = typeof posInventoryMovements.$inferSelect;

// ─── Recipe Ingredients ───────────────────────────────────────────────────────
export const posRecipeIngredients = mysqlTable("pos_recipe_ingredients", {
  id: int("id").autoincrement().primaryKey(),
  menuItemId: int("menuItemId").notNull(),
  inventoryItemId: int("inventoryItemId").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 4 }),
  unitOfMeasure: varchar("unitOfMeasure", { length: 20 }),
  role: varchar("role", { length: 50 }),
  notes: text("notes"),
}, (t) => [unique("uniq_recipe").on(t.menuItemId, t.inventoryItemId)]);

// ─── Order Recipe Snapshots ──────────────────────────────────────────────────
export const posOrderRecipeSnapshots = mysqlTable("pos_order_recipe_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  orderItemId: int("orderItemId").notNull(),
  inventoryItemId: int("inventoryItemId").notNull(),
  quantityUsed: decimal("quantityUsed", { precision: 10, scale: 4 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull(),
  unitCostSnapshot: decimal("unitCostSnapshot", { precision: 10, scale: 4 }).default("0.0000"),
  totalCostSnapshot: decimal("totalCostSnapshot", { precision: 10, scale: 4 }).default("0.0000"),
  branchId: int("branchId").notNull(),
  optionId: int("optionId"),
  effectSource: varchar("effectSource", { length: 50 }).notNull(), // 'base' | 'option'
  createdAt: timestamp("createdAt").defaultNow(),
});
export type PosOrderRecipeSnapshot = typeof posOrderRecipeSnapshots.$inferSelect;

// ─── Suppliers ────────────────────────────────────────────────────────────────
export const posSuppliers = mysqlTable("pos_suppliers", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).unique(),
  companyName: varchar("companyName", { length: 255 }).notNull(),
  companyNameThai: varchar("companyNameThai", { length: 255 }),
  contactPerson: varchar("contactPerson", { length: 200 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  lineId: varchar("lineId", { length: 100 }),
  address: text("address"),
  province: varchar("province", { length: 100 }),
  country: varchar("country", { length: 100 }).default("Thailand"),
  paymentTerms: varchar("paymentTerms", { length: 50 }),
  currency: varchar("currency", { length: 3 }).default("THB"),
  bankAccountInfo: json("bankAccountInfo"),
  performanceRating: decimal("performanceRating", { precision: 3, scale: 2 }),
  notes: text("notes"),
  status: mysqlEnum("status", ["active", "inactive"]).default("active"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});
export type PosSupplier = typeof posSuppliers.$inferSelect;
export type InsertPosSupplier = typeof posSuppliers.$inferInsert;

// ─── Purchase Orders ──────────────────────────────────────────────────────────
export const posPurchaseOrders = mysqlTable("pos_purchase_orders", {
  id: int("id").autoincrement().primaryKey(),
  poNumber: varchar("poNumber", { length: 30 }).unique(),
  supplierId: int("supplierId"),
  branchId: int("branchId"),

  orderDate: date("orderDate"),
  requiredDate: date("requiredDate"),
  expectedDeliveryDate: date("expectedDeliveryDate"),

  priority: mysqlEnum("priority", ["low", "normal", "high", "urgent"]).default("normal"),
  status: mysqlEnum("status", [
    "draft", "pending_approval", "approved", "sent",
    "partial", "received", "closed", "cancelled",
  ]).default("draft"),

  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).default("0"),
  discountAmount: decimal("discountAmount", { precision: 10, scale: 2 }).default("0"),
  shippingCost: decimal("shippingCost", { precision: 10, scale: 2 }).default("0"),
  taxAmount: decimal("taxAmount", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).default("0"),

  paymentTerms: varchar("paymentTerms", { length: 50 }),
  shippingMethod: varchar("shippingMethod", { length: 100 }),
  trackingNumber: varchar("trackingNumber", { length: 100 }),

  notesToSupplier: text("notesToSupplier"),
  internalNotes: text("internalNotes"),

  approvedByStaffId: int("approvedByStaffId"),
  approvedAt: timestamp("approvedAt"),
  createdByStaffId: int("createdByStaffId"),

  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});
export type PosPurchaseOrder = typeof posPurchaseOrders.$inferSelect;
export type InsertPosPurchaseOrder = typeof posPurchaseOrders.$inferInsert;

// ─── Purchase Order Items ─────────────────────────────────────────────────────
export const posPurchaseOrderItems = mysqlTable("pos_purchase_order_items", {
  id: int("id").autoincrement().primaryKey(),
  purchaseOrderId: int("purchaseOrderId").notNull(),
  inventoryItemId: int("inventoryItemId"),
  quantityOrdered: decimal("quantityOrdered", { precision: 10, scale: 3 }),
  quantityReceived: decimal("quantityReceived", { precision: 10, scale: 3 }).default("0"),
  unitOfMeasure: varchar("unitOfMeasure", { length: 20 }),
  unitCost: decimal("unitCost", { precision: 10, scale: 4 }),
  totalCost: decimal("totalCost", { precision: 10, scale: 2 }),
  notes: text("notes"),
});
export type PosPurchaseOrderItem = typeof posPurchaseOrderItems.$inferSelect;

// ─── SOP Categories ───────────────────────────────────────────────────────────
export const posSopCategories = mysqlTable("pos_sop_categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  nameThai: varchar("nameThai", { length: 100 }),
  parentId: int("parentId"),
  sortOrder: int("sortOrder").default(0),
  iconName: varchar("iconName", { length: 50 }),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});
export type PosSopCategory = typeof posSopCategories.$inferSelect;

// ─── SOPs ─────────────────────────────────────────────────────────────────────
export const posSops = mysqlTable("pos_sops", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 200 }).unique(),

  title: varchar("title", { length: 500 }).notNull(),
  titleThai: varchar("titleThai", { length: 500 }),
  subtitle: varchar("subtitle", { length: 500 }),
  subtitleThai: varchar("subtitleThai", { length: 500 }),
  coverImageUrl: varchar("coverImageUrl", { length: 500 }),
  videoUrl: varchar("videoUrl", { length: 500 }),

  categoryId: int("categoryId"),
  content: json("content"),
  tags: json("tags").$type<string[]>(),

  requiresAcknowledgment: boolean("requiresAcknowledgment").default(false),
  requiredRoles: json("requiredRoles").$type<string[]>(),
  acknowledgmentDeadlineDays: int("acknowledgmentDeadlineDays"),

  version: int("version").default(1),
  previousVersionId: int("previousVersionId"),
  changeReason: text("changeReason"),

  status: mysqlEnum("status", ["draft", "review", "published", "archived"]).default("draft"),
  authorStaffId: int("authorStaffId"),
  publishedAt: timestamp("publishedAt"),
  effectiveDate: date("effectiveDate"),
  reviewDate: date("reviewDate"),

  allowBranchVariants: boolean("allowBranchVariants").default(false),
  masterSopId: int("masterSopId"),
  branchId: int("branchId"),

  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});
export type PosSop = typeof posSops.$inferSelect;
export type InsertPosSop = typeof posSops.$inferInsert;

// ─── SOP Acknowledgments ──────────────────────────────────────────────────────
export const posSopAcknowledgments = mysqlTable("pos_sop_acknowledgments", {
  id: int("id").autoincrement().primaryKey(),
  sopId: int("sopId").notNull(),
  staffId: int("staffId").notNull(),
  branchId: int("branchId"),
  acknowledgedAt: timestamp("acknowledgedAt").defaultNow(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  notes: text("notes"),
}, (t) => [unique("uniq_sop_staff").on(t.sopId, t.staffId)]);
export type PosSopAcknowledgment = typeof posSopAcknowledgments.$inferSelect;

// ─── SOP Variant Requests ─────────────────────────────────────────────────────
export const posSopVariantRequests = mysqlTable("pos_sop_variant_requests", {
  id: int("id").autoincrement().primaryKey(),
  masterSopId: int("masterSopId").notNull(),
  branchId: int("branchId").notNull(),
  proposedContent: json("proposedContent"),
  changeReason: text("changeReason"),
  changesSummary: text("changesSummary"),
  requestedByStaffId: int("requestedByStaffId"),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "withdrawn"]).default("pending"),
  reviewedByStaffId: int("reviewedByStaffId"),
  reviewedAt: timestamp("reviewedAt"),
  reviewNotes: text("reviewNotes"),
  createdAt: timestamp("createdAt").defaultNow(),
});
export type PosSopVariantRequest = typeof posSopVariantRequests.$inferSelect;

// ─── SOP Tasks ────────────────────────────────────────────────────────────────
export const posSopTasks = mysqlTable("pos_sop_tasks", {
  id: int("id").autoincrement().primaryKey(),
  sopId: int("sopId").notNull(),
  staffId: int("staffId").notNull(),
  dueDate: date("dueDate"),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "overdue"]).default("pending"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow(),
});
export type PosSopTask = typeof posSopTasks.$inferSelect;

// ─── Audit Logs ───────────────────────────────────────────────────────────────
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  actorType: mysqlEnum("actorType", ["staff", "system"]).default("staff"),
  actorId: int("actorId"),
  actorName: varchar("actorName", { length: 255 }),
  branchId: int("branchId"),

  action: varchar("action", { length: 100 }),
  entity: varchar("entity", { length: 100 }),
  entityId: int("entityId"),

  details: text("details"),
  beforeData: json("beforeData"),
  afterData: json("afterData"),

  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: varchar("userAgent", { length: 500 }),

  createdAt: timestamp("createdAt").defaultNow(),
});
export type AuditLog = typeof auditLogs.$inferSelect;

// ─── Notifications ────────────────────────────────────────────────────────────
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  staffId: int("staffId"),
  type: varchar("type", { length: 50 }),
  title: varchar("title", { length: 500 }),
  message: text("message"),
  relatedEntity: varchar("relatedEntity", { length: 50 }),
  relatedEntityId: int("relatedEntityId"),
  isRead: boolean("isRead").default(false),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow(),
});
export type Notification = typeof notifications.$inferSelect;

// ─── Printer Configurations ───────────────────────────────────────────────────
export const posPrinterConfigs = mysqlTable("pos_printer_configs", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").notNull(),
  printerName: varchar("printerName", { length: 100 }).notNull(),
  printerType: mysqlEnum("printerType", ["order_slip", "label", "kitchen", "receipt"]).notNull(),
  connection: mysqlEnum("connection", ["usb", "network", "bluetooth", "browser"]).default("browser"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  port: int("port").default(9100),
  paperWidth: int("paperWidth").default(80),
  charactersPerLine: int("charactersPerLine").default(48),
  isDefault: boolean("isDefault").default(false),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});
export type PosPrinterConfig = typeof posPrinterConfigs.$inferSelect;

// ─── Branch Payment Settings (PromptPay, Tax, Receipt) ────────────────────────
export const posBranchPaymentSettings = mysqlTable("pos_branch_payment_settings", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").notNull(),
  promptpayId: varchar("promptpayId", { length: 50 }),
  promptpayName: varchar("promptpayName", { length: 200 }),
  promptpayType: mysqlEnum("promptpayType", ["phone", "tax_id", "ewallet"]).default("phone"),
  bankAccountNumber: varchar("bankAccountNumber", { length: 50 }),
  bankName: varchar("bankName", { length: 100 }),
  bankAccountName: varchar("bankAccountName", { length: 200 }),
  taxId: varchar("taxId", { length: 20 }),
  companyName: varchar("companyName", { length: 200 }),
  companyAddress: text("companyAddress"),
  receiptHeaderImage: varchar("receiptHeaderImage", { length: 500 }),
  receiptFooterText: text("receiptFooterText"),
  autoPrintOrderSlip: boolean("autoPrintOrderSlip").default(false),
  autoPrintKitchenTicket: boolean("autoPrintKitchenTicket").default(false),
  autoPrintLabels: boolean("autoPrintLabels").default(false),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});
export type PosBranchPaymentSetting = typeof posBranchPaymentSettings.$inferSelect;


// ─── Inventory Attributes (dynamic per-category fields) ──────────────────────
export const posInventoryAttributes = mysqlTable("pos_inventory_attributes", {
  id: int("id").autoincrement().primaryKey(),
  categoryId: int("categoryId").notNull(),
  attributeKey: varchar("attributeKey", { length: 50 }).notNull(),
  labelTh: varchar("labelTh", { length: 100 }).notNull(),
  labelEn: varchar("labelEn", { length: 100 }).notNull(),
  fieldType: mysqlEnum("fieldType", ["dropdown", "text", "number"]).default("dropdown").notNull(),
  isRequired: boolean("isRequired").default(false),
  sortOrder: int("sortOrder").default(0),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow(),
});
export type PosInventoryAttribute = typeof posInventoryAttributes.$inferSelect;

// ─── Inventory Attribute Options (dropdown choices) ──────────────────────────
export const posInventoryAttributeOptions = mysqlTable("pos_inventory_attribute_options", {
  id: int("id").autoincrement().primaryKey(),
  attributeId: int("attributeId").notNull(),
  value: varchar("value", { length: 100 }).notNull(),
  labelTh: varchar("labelTh", { length: 100 }),
  labelEn: varchar("labelEn", { length: 100 }),
  sortOrder: int("sortOrder").default(0),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow(),
});
export type PosInventoryAttributeOption = typeof posInventoryAttributeOptions.$inferSelect;

// ─── Branch Requisitions (สาขาขอสั่งจาก HQ) ─────────────────────────────────
export const posRequisitions = mysqlTable("pos_requisitions", {
  id: int("id").autoincrement().primaryKey(),
  requestNumber: varchar("requestNumber", { length: 30 }).notNull(),
  requestingBranchId: int("requestingBranchId").notNull(),
  sourceBranchId: int("sourceBranchId").notNull(), // usually HQ
  requestedByStaffId: int("requestedByStaffId").notNull(),
  type: mysqlEnum("type", ["stock", "menu", "supplies"]).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "partially_approved", "rejected", "cancelled", "fulfilled"]).default("pending").notNull(),
  priority: mysqlEnum("priority", ["low", "normal", "urgent"]).default("normal").notNull(),
  notes: text("notes"),
  approvedByStaffId: int("approvedByStaffId"),
  approvedAt: timestamp("approvedAt"),
  rejectionReason: text("rejectionReason"),
  fulfilledAt: timestamp("fulfilledAt"),
  invoiceTotal: decimal("invoiceTotal", { precision: 12, scale: 2 }),
  paymentStatus: mysqlEnum("paymentStatus", ["unpaid", "paid"]).default("unpaid"),
  paymentMethod: varchar("paymentMethod", { length: 100 }),
  paidAmount: decimal("paidAmount", { precision: 12, scale: 2 }),
  paidAt: timestamp("paidAt"),
  paidRef: varchar("paidRef", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});
export type PosRequisition = typeof posRequisitions.$inferSelect;

export const posRequisitionItems = mysqlTable("pos_requisition_items", {
  id: int("id").autoincrement().primaryKey(),
  requisitionId: int("requisitionId").notNull(),
  itemType: mysqlEnum("itemType", ["inventory", "menu"]).notNull(),
  itemId: int("itemId").notNull(), // references pos_inventory_items.id or pos_menu_items.id
  itemName: varchar("itemName", { length: 200 }).notNull(),
  requestedQty: decimal("requestedQty", { precision: 10, scale: 2 }).notNull(),
  approvedQty: decimal("approvedQty", { precision: 10, scale: 2 }),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }),
  unit: varchar("unit", { length: 30 }),
  notes: text("notes"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
});
export type PosRequisitionItem = typeof posRequisitionItems.$inferSelect;

// ─── Export Documents (ใบเสร็จรับเงิน/ใบกำกับภาษี + ใบขนส่งสินค้า) ──────────
export const posExportDocuments = mysqlTable("pos_export_documents", {
  id: int("id").autoincrement().primaryKey(),
  docType: mysqlEnum("docType", ["receipt_tax_invoice", "shipping_note", "pos_receipt", "sales_receipt", "full_tax_invoice", "credit_note", "debit_note", "delivery_note", "billing_statement", "quotation", "purchase_order", "goods_receipt", "transfer_document"]).notNull(),
  documentNumber: varchar("documentNumber", { length: 50 }).notNull(),
  branchId: int("branchId"),
  customerName: varchar("customerName", { length: 300 }),
  grandTotal: decimal("grandTotal", { precision: 12, scale: 2 }),
  data: json("data"), // Full document data (all fields)
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});
export type PosExportDocument = typeof posExportDocuments.$inferSelect;
export type InsertPosExportDocument = typeof posExportDocuments.$inferInsert;


// ─── External Purchase Receipts / Expense Bills ──────────────────────────────
export const posExpenseReceipts = mysqlTable("pos_expense_receipts", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").notNull(),
  vendor: varchar("vendor", { length: 200 }).notNull(), // e.g. Makro, Shopee, Lazada, LINE Shopping, อื่นๆ
  vendorBranch: varchar("vendorBranch", { length: 200 }), // e.g. Makro สาขาลาดพร้าว
  receiptNumber: varchar("receiptNumber", { length: 100 }), // เลขที่ใบเสร็จ
  receiptDate: date("receiptDate").notNull(), // วันที่ในใบเสร็จ
  category: mysqlEnum("category", [
    "ingredients",      // วัตถุดิบ
    "packaging",        // บรรจุภัณฑ์
    "equipment",        // อุปกรณ์
    "cleaning",         // ทำความสะอาด
    "utilities",        // ค่าสาธารณูปโภค
    "marketing",        // การตลาด
    "delivery_fee",     // ค่าส่ง
    "other",            // อื่นๆ
  ]).default("ingredients").notNull(),
  paymentMethod: mysqlEnum("paymentMethod", [
    "cash", "transfer", "credit_card", "corporate_card", "cod", "other"
  ]).default("transfer").notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  vatAmount: decimal("vatAmount", { precision: 12, scale: 2 }).default("0"),
  discountAmount: decimal("discountAmount", { precision: 12, scale: 2 }).default("0"),
  deliveryFee: decimal("deliveryFee", { precision: 12, scale: 2 }).default("0"),
  grandTotal: decimal("grandTotal", { precision: 12, scale: 2 }).notNull(),
  receiptImageUrl: text("receiptImageUrl"), // URL of uploaded receipt image
  notes: text("notes"),
  status: mysqlEnum("status", ["draft", "confirmed", "voided"]).default("draft").notNull(),
  createdByStaffId: int("createdByStaffId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PosExpenseReceipt = typeof posExpenseReceipts.$inferSelect;
export type InsertPosExpenseReceipt = typeof posExpenseReceipts.$inferInsert;

export const posExpenseReceiptItems = mysqlTable("pos_expense_receipt_items", {
  id: int("id").autoincrement().primaryKey(),
  receiptId: int("receiptId").notNull(),
  itemName: varchar("itemName", { length: 300 }).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 50 }), // กก., ชิ้น, แพ็ค, ขวด, etc.
  unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).notNull(),
  totalPrice: decimal("totalPrice", { precision: 12, scale: 2 }).notNull(),
  category: varchar("category", { length: 100 }), // sub-category for the item
  notes: text("notes"),
  // ─── Expiry tracking fields ───
  inventoryItemId: int("inventoryItemId"),     // link to pos_inventory_items
  manufactureDate: date("manufactureDate"),     // วันที่ผลิต
  expiryDate: date("expiryDate"),               // วันหมดอายุ
});
export type PosExpenseReceiptItem = typeof posExpenseReceiptItems.$inferSelect;
export type InsertPosExpenseReceiptItem = typeof posExpenseReceiptItems.$inferInsert;

// ─── Inventory Lots (Batch/Expiry Tracking) ───────────────────────────────────
// Each lot represents one batch of an ingredient received, with manufacture & expiry dates.
export const posInventoryLots = mysqlTable("pos_inventory_lots", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").notNull(),
  inventoryItemId: int("inventoryItemId").notNull(),   // → pos_inventory_items
  expenseReceiptId: int("expenseReceiptId"),           // → pos_expense_receipts (if from receipt)
  lotNumber: varchar("lotNumber", { length: 100 }),   // LOT-2025-001, batch code, etc.
  manufactureDate: date("manufactureDate"),             // วันที่ผลิต
  expiryDate: date("expiryDate"),                      // วันหมดอายุ (required for ingredients)
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),       // จำนวนที่รับเข้า
  remainingQty: decimal("remainingQty", { precision: 10, scale: 3 }).notNull(), // จำนวนที่เหลือ
  unitOfMeasure: varchar("unitOfMeasure", { length: 20 }),
  costPerUnit: decimal("costPerUnit", { precision: 10, scale: 4 }),
  // Status auto-updated by cron / on-read:
  status: mysqlEnum("status", ["active", "expiring_soon", "expired", "depleted"]).default("active").notNull(),
  alertSentAt: timestamp("alertSentAt"),               // last time alert was sent
  notes: text("notes"),
  createdByStaffId: int("createdByStaffId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PosInventoryLot = typeof posInventoryLots.$inferSelect;
export type InsertPosInventoryLot = typeof posInventoryLots.$inferInsert;

// ─── Members (Customer App) ───────────────────────────────────────────────────
export const members = mysqlTable("members", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  email: varchar("email", { length: 255 }).unique(),
  firstName: varchar("firstName", { length: 100 }),
  lastName: varchar("lastName", { length: 100 }),
  lineUid: varchar("lineUid", { length: 100 }).unique(),
  googleUid: varchar("googleUid", { length: 100 }).unique(),
  avatarUrl: varchar("avatarUrl", { length: 500 }),
  birthDate: date("birthDate"),
  pdpaConsentAt: timestamp("pdpaConsentAt"),
  pdpaConsentVersion: varchar("pdpaConsentVersion", { length: 10 }).default("1.0"),
  isVerified: boolean("isVerified").default(false),
  status: mysqlEnum("status", ["active", "suspended"]).default("active"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});
export type Member = typeof members.$inferSelect;
export type InsertMember = typeof members.$inferInsert;

// ─── Member Points (Loyalty Ledger) ──────────────────────────────────────────
export const memberPoints = mysqlTable("member_points", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId").notNull(),
  branchId: int("branchId").notNull(), // Branch-locked: earned at A, redeem at A only
  type: mysqlEnum("type", ["earn", "redeem", "expire", "adjust"]).notNull(),
  points: decimal("points", { precision: 10, scale: 2 }).notNull(),
  balanceBefore: decimal("balanceBefore", { precision: 10, scale: 2 }).default("0"),
  balanceAfter: decimal("balanceAfter", { precision: 10, scale: 2 }).default("0"),
  orderId: int("orderId"),           // linked POS order
  expiresAt: timestamp("expiresAt"), // for earn transactions
  notes: text("notes"),
  createdByStaffId: int("createdByStaffId"),
  createdAt: timestamp("createdAt").defaultNow(),
});
export type MemberPoint = typeof memberPoints.$inferSelect;

// ─── Customer Orders (E-catalog Pre-orders) ───────────────────────────────────
export const customerOrders = mysqlTable("customer_orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 30 }).unique(),
  memberId: int("memberId"),          // null if guest
  branchId: int("branchId").notNull(),
  orderType: mysqlEnum("orderType", ["pickup", "delivery"]).default("pickup"),
  pickupTime: timestamp("pickupTime"),
  deliveryAddress: text("deliveryAddress"),
  deliveryLat: decimal("deliveryLat", { precision: 10, scale: 8 }),
  deliveryLng: decimal("deliveryLng", { precision: 11, scale: 8 }),
  customerName: varchar("customerName", { length: 200 }),
  customerPhone: varchar("customerPhone", { length: 20 }),
  notes: text("notes"),
  status: mysqlEnum("status", [
    "pending", "confirmed", "preparing", "ready", "completed", "cancelled",
  ]).default("pending"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).default("0"),
  discountAmount: decimal("discountAmount", { precision: 10, scale: 2 }).default("0"),
  pointsRedeemed: decimal("pointsRedeemed", { precision: 10, scale: 2 }).default("0"),
  pointsEarned: decimal("pointsEarned", { precision: 10, scale: 2 }).default("0"),
  taxAmount: decimal("taxAmount", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).default("0"),
  paymentMethod: mysqlEnum("paymentMethod", ["promptpay", "credit_card", "cash"]).default("promptpay"),
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "paid", "refunded"]).default("pending"),
  paymentRef: varchar("paymentRef", { length: 100 }),
  posOrderId: int("posOrderId"), // linked POS order after pickup
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});
export type CustomerOrder = typeof customerOrders.$inferSelect;

export const customerOrderItems = mysqlTable("customer_order_items", {
  id: int("id").autoincrement().primaryKey(),
  customerOrderId: int("customerOrderId").notNull(),
  menuItemId: int("menuItemId").notNull(),
  menuItemName: varchar("menuItemName", { length: 200 }).notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  quantity: int("quantity").default(1),
  totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }).notNull(),
  options: json("options"), // selected option names + price adjustments
  notes: text("notes"),
});

// ─── PDPA Consents ────────────────────────────────────────────────────────────
export const pdpaConsents = mysqlTable("pdpa_consents", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId"),
  staffId: int("staffId"),    // if staff consent during onboarding
  consentType: mysqlEnum("consentType", ["member_registration", "marketing", "data_sharing"]).notNull(),
  consentVersion: varchar("consentVersion", { length: 10 }).default("1.0"),
  consentGiven: boolean("consentGiven").default(false),
  consentAt: timestamp("consentAt").defaultNow(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
});
export type PdpaConsent = typeof pdpaConsents.$inferSelect;

// ─── Supplier Payment Schedule (ผ่อนจ่าย Supplier) ──────────────────────────
export const supplierPaymentSchedules = mysqlTable("supplier_payment_schedules", {
  id: int("id").autoincrement().primaryKey(),
  supplierId: int("supplierId").notNull(),
  purchaseOrderId: int("purchaseOrderId"),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).notNull(),
  paidAmount: decimal("paidAmount", { precision: 12, scale: 2 }).default("0"),
  remainingAmount: decimal("remainingAmount", { precision: 12, scale: 2 }).notNull(),
  installments: int("installments").default(1),   // จำนวนงวด
  notes: text("notes"),
  status: mysqlEnum("status", ["active", "completed", "overdue"]).default("active"),
  createdByStaffId: int("createdByStaffId"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});
export type SupplierPaymentSchedule = typeof supplierPaymentSchedules.$inferSelect;

export const supplierPaymentInstallments = mysqlTable("supplier_payment_installments", {
  id: int("id").autoincrement().primaryKey(),
  scheduleId: int("scheduleId").notNull(),
  installmentNumber: int("installmentNumber").notNull(),
  dueDate: date("dueDate").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paidAt: timestamp("paidAt"),
  paymentRef: varchar("paymentRef", { length: 100 }),
  status: mysqlEnum("status", ["pending", "paid", "overdue"]).default("pending"),
  notes: text("notes"),
});
export type SupplierPaymentInstallment = typeof supplierPaymentInstallments.$inferSelect;

// ─── Batch Production (Volume 10) ─────────────────────────────────────────────
export const posBatchProductions = mysqlTable("pos_batch_productions", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").notNull(),
  inventoryItemId: int("inventoryItemId").notNull(), // Target house-made inventory item (e.g. Matcha Base, Syrup)
  batchNumber: varchar("batchNumber", { length: 100 }).notNull(),
  plannedQty: decimal("plannedQty", { precision: 10, scale: 3 }).notNull(),
  actualQty: decimal("actualQty", { precision: 10, scale: 3 }),
  status: mysqlEnum("status", ["draft", "in_production", "completed", "cancelled"]).default("draft").notNull(),
  notes: text("notes"),
  manufactureDate: date("manufactureDate"),
  expiryDate: date("expiryDate"),
  createdByStaffId: int("createdByStaffId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PosBatchProduction = typeof posBatchProductions.$inferSelect;
export type InsertPosBatchProduction = typeof posBatchProductions.$inferInsert;

export const posBatchProductionIngredients = mysqlTable("pos_batch_production_ingredients", {
  id: int("id").autoincrement().primaryKey(),
  batchProductionId: int("batchProductionId").notNull(),
  inventoryItemId: int("inventoryItemId").notNull(), // Ingredient consumed
  plannedQty: decimal("plannedQty", { precision: 10, scale: 3 }).notNull(),
  actualQty: decimal("actualQty", { precision: 10, scale: 3 }).notNull(),
  unitOfMeasure: varchar("unitOfMeasure", { length: 20 }),
});
export type PosBatchProductionIngredient = typeof posBatchProductionIngredients.$inferSelect;
export type InsertPosBatchProductionIngredient = typeof posBatchProductionIngredients.$inferInsert;


// ─── Dynamic Payment Methods ──────────────────────────────────────────────────
export const masterPaymentMethods = mysqlTable("master_payment_methods", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).unique().notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  nameThai: varchar("nameThai", { length: 100 }),
  type: varchar("type", { length: 50 }).notNull(), // cash, card, transfer, qr, voucher, loyalty, credit, billing, etc.
  iconName: varchar("iconName", { length: 50 }),
  feePercentage: decimal("feePercentage", { precision: 5, scale: 2 }).default("0"),
  feeFixed: decimal("feeFixed", { precision: 10, scale: 2 }).default("0"),
  surchargePercentage: decimal("surchargePercentage", { precision: 5, scale: 2 }).default("0"),
  surchargeFixed: decimal("surchargeFixed", { precision: 10, scale: 2 }).default("0"),
  settlementDays: int("settlementDays").default(0),
  isActive: boolean("isActive").default(true),

  // New role availability, requirements and tags
  roleAvailability: json("roleAvailability").$type<string[]>(), // allowed roles: ["cashier", "manager", "branch_admin", "super_admin"]
  requiresManagerPin: boolean("requiresManagerPin").default(false),
  requiresSlipUpload: boolean("requiresSlipUpload").default(false),
  requiresReference: boolean("requiresReference").default(false),
  requiresSettlement: boolean("requiresSettlement").default(false),
  feeType: mysqlEnum("feeType", ["none", "fixed", "percentage"]).default("none"),
  feeAmount: decimal("feeAmount", { precision: 10, scale: 2 }).default("0.00"),
  providerName: varchar("providerName", { length: 100 }),
  externalAccountId: varchar("externalAccountId", { length: 100 }),
  displayOrder: int("displayOrder").default(0),
  color: varchar("color", { length: 50 }),
  isDeliveryPlatform: boolean("isDeliveryPlatform").default(false),
  isCashEquivalent: boolean("isCashEquivalent").default(false),
  isCreditAccount: boolean("isCreditAccount").default(false),

  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export const branchPaymentMethods = mysqlTable("branch_payment_methods", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").notNull(),
  paymentMethodId: int("paymentMethodId").notNull(),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow(),
}, (t) => [unique("uniq_branch_payment").on(t.branchId, t.paymentMethodId)]);

// ─── Refund System ────────────────────────────────────────────────────────────
export const posRefunds = mysqlTable("pos_refunds", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  refundNumber: varchar("refundNumber", { length: 50 }).unique().notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  paymentMethodId: int("paymentMethodId"),
  status: mysqlEnum("status", ["requested", "approved", "rejected", "refunded"]).default("requested").notNull(),
  approvedByStaffId: int("approvedByStaffId"),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

// ─── Master Dropdowns ──────────────────────────────────────────────────────────
export const masterDropdowns = mysqlTable("master_dropdowns", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  nameThai: varchar("nameThai", { length: 100 }),
  code: varchar("code", { length: 50 }).unique().notNull(),
  isArchived: boolean("isArchived").default(false),
  createdAt: timestamp("createdAt").defaultNow(),
});

export const masterDropdownOptions = mysqlTable("master_dropdown_options", {
  id: int("id").autoincrement().primaryKey(),
  dropdownId: int("dropdownId").notNull(),
  value: varchar("value", { length: 100 }).notNull(),
  labelTh: varchar("labelTh", { length: 100 }),
  labelEn: varchar("labelEn", { length: 100 }),
  isArchived: boolean("isArchived").default(false),
  createdAt: timestamp("createdAt").defaultNow(),
});

// ─── Waste Management ──────────────────────────────────────────────────────────
export const posWasteRecords = mysqlTable("pos_waste_records", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").notNull(),
  inventoryItemId: int("inventoryItemId").notNull(),
  category: mysqlEnum("category", ["expired", "damaged", "spill", "training", "sampling", "unknown"]).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  costPerUnit: decimal("costPerUnit", { precision: 10, scale: 4 }).notNull(),
  totalCost: decimal("totalCost", { precision: 12, scale: 2 }).notNull(),
  notes: text("notes"),
  recordedByStaffId: int("recordedByStaffId").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
});

// ─── Physical Count Session ───────────────────────────────────────────────────
export const posInventoryCountSessions = mysqlTable("pos_inventory_count_sessions", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").notNull(),
  assignedStaffId: int("assignedStaffId").notNull(),
  status: mysqlEnum("status", ["draft", "in_progress", "variance_review", "completed", "closed"]).default("draft").notNull(),
  startedAt: timestamp("startedAt").defaultNow(),
  closedAt: timestamp("closedAt"),
  approvedByStaffId: int("approvedByStaffId"),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export const posInventoryCountSessionItems = mysqlTable("pos_inventory_count_session_items", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  inventoryItemId: int("inventoryItemId").notNull(),
  systemQty: decimal("systemQty", { precision: 10, scale: 3 }).notNull(),
  countedQty: decimal("countedQty", { precision: 10, scale: 3 }),
  varianceQty: decimal("varianceQty", { precision: 10, scale: 3 }),
  varianceCost: decimal("varianceCost", { precision: 12, scale: 2 }),
  status: mysqlEnum("status", ["pending", "reviewed", "approved", "rejected"]).default("pending").notNull(),
});

// ─── Accounts Receivable ──────────────────────────────────────────────────────
export const accountsReceivable = mysqlTable("accounts_receivable", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").notNull(),
  customerId: int("customerId").notNull(),
  customerType: mysqlEnum("customerType", ["corporate", "franchise"]).default("corporate").notNull(),
  invoiceNumber: varchar("invoiceNumber", { length: 50 }).unique().notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  outstandingAmount: decimal("outstandingAmount", { precision: 12, scale: 2 }).notNull(),
  dueDate: date("dueDate").notNull(),
  status: mysqlEnum("status", ["pending", "due_soon", "overdue", "paid"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

// ─── Franchise Royalty & Compliance ───────────────────────────────────────────
export const franchiseRoyalties = mysqlTable("franchise_royalties", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").notNull(),
  month: varchar("month", { length: 7 }).notNull(), // YYYY-MM
  revenue: decimal("revenue", { precision: 12, scale: 2 }).notNull(),
  royaltyType: mysqlEnum("royaltyType", ["percentage", "fixed", "hybrid"]).notNull(),
  royaltyRate: decimal("royaltyRate", { precision: 10, scale: 2 }).notNull(),
  calculatedAmount: decimal("calculatedAmount", { precision: 12, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "paid", "overdue"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
}, (t) => [unique("uniq_franchise_royalty_month").on(t.branchId, t.month)]);

export const franchiseComplianceScores = mysqlTable("franchise_compliance_scores", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").notNull(),
  month: varchar("month", { length: 7 }).notNull(), // YYYY-MM
  sopCompliance: decimal("sopCompliance", { precision: 5, scale: 2 }).default("100.00"),
  wasteRate: decimal("wasteRate", { precision: 5, scale: 2 }).default("0.00"),
  stockCountCompletion: decimal("stockCountCompletion", { precision: 5, scale: 2 }).default("100.00"),
  expiryCompliance: decimal("expiryCompliance", { precision: 5, scale: 2 }).default("100.00"),
  revenueCompliance: decimal("revenueCompliance", { precision: 5, scale: 2 }).default("100.00"),
  overallScore: decimal("overallScore", { precision: 5, scale: 2 }).default("100.00"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
}, (t) => [unique("uniq_franchise_compliance_month").on(t.branchId, t.month)]);

// ─── Document Numbering Configuration ──────────────────────────────────────────
export const posDocumentSequences = mysqlTable("pos_document_sequences", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").notNull(),
  docType: varchar("docType", { length: 50 }).notNull(), // receipt_tax_invoice, shipping_note, full_tax_invoice, credit_note, debit_note, delivery_note, billing_statement
  prefix: varchar("prefix", { length: 20 }).notNull(),
  includeBranchCode: boolean("includeBranchCode").default(true),
  includeDate: boolean("includeDate").default(true),
  currentSequence: int("currentSequence").default(0).notNull(),
  lastResetDate: date("lastResetDate"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
}, (t) => [unique("uniq_branch_doc_seq").on(t.branchId, t.docType)]);

// ─── Settlement System Ledger ──────────────────────────────────────────────────
export const posPaymentSettlements = mysqlTable("pos_payment_settlements", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").notNull(),
  paymentMethodId: int("paymentMethodId").notNull(),
  orderPaymentId: int("orderPaymentId"),
  providerName: varchar("providerName", { length: 100 }),
  grossAmount: decimal("grossAmount", { precision: 12, scale: 2 }).notNull(),
  feeAmount: decimal("feeAmount", { precision: 12, scale: 2 }).default("0.00"),
  netAmount: decimal("netAmount", { precision: 12, scale: 2 }).notNull(),
  expectedSettlementDate: date("expectedSettlementDate"),
  actualSettlementDate: date("actualSettlementDate"),
  status: mysqlEnum("status", ["pending", "expected_today", "settled", "short_paid", "over_paid", "disputed"]).default("pending").notNull(),
  settlementReference: varchar("settlementReference", { length: 100 }),
  bankAccount: varchar("bankAccount", { length: 100 }),
  reconciledByStaffId: int("reconciledByStaffId"),
  reconciledAt: timestamp("reconciledAt"),
  slipImageUrl: varchar("slipImageUrl", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

// ─── Cash Closings Upgrade ─────────────────────────────────────────────────────
export const posCashClosings = mysqlTable("pos_cash_closings", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").notNull(),
  staffId: int("staffId").notNull(), // cashier who counts
  openingCash: decimal("openingCash", { precision: 12, scale: 2 }).notNull(),
  cashSales: decimal("cashSales", { precision: 12, scale: 2 }).default("0.00"),
  cashRefunds: decimal("cashRefunds", { precision: 12, scale: 2 }).default("0.00"),
  cashIn: decimal("cashIn", { precision: 12, scale: 2 }).default("0.00"),
  cashOut: decimal("cashOut", { precision: 12, scale: 2 }).default("0.00"),
  expectedCash: decimal("expectedCash", { precision: 12, scale: 2 }).notNull(),
  actualCountedCash: decimal("actualCountedCash", { precision: 12, scale: 2 }).notNull(),
  variance: decimal("variance", { precision: 12, scale: 2 }).notNull(),
  varianceReason: mysqlEnum("varianceReason", ["short_change", "counting_mistake", "drawer_mistake", "refund_mistake", "theft_suspected", "other"]),
  photoUrl: varchar("photoUrl", { length: 500 }),
  managerApprovedByStaffId: int("managerApprovedByStaffId"),
  notes: text("notes"),
  closedAt: timestamp("closedAt").defaultNow(),
  createdAt: timestamp("createdAt").defaultNow(),
});



