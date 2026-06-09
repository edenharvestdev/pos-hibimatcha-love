CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorType` enum('staff','system') DEFAULT 'staff',
	`actorId` int,
	`actorName` varchar(255),
	`branchId` int,
	`action` varchar(100),
	`entity` varchar(100),
	`entityId` int,
	`details` text,
	`beforeData` json,
	`afterData` json,
	`ipAddress` varchar(45),
	`userAgent` varchar(500),
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `branches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`branchCode` varchar(20),
	`branchType` enum('hq','company-owned','franchise') DEFAULT 'company-owned',
	`status` enum('active','inactive','closed') DEFAULT 'active',
	`phone` varchar(20),
	`email` varchar(255),
	`address` text,
	`province` varchar(100),
	`district` varchar(100),
	`postalCode` varchar(10),
	`country` varchar(100) DEFAULT 'Thailand',
	`latitude` decimal(10,8),
	`longitude` decimal(11,8),
	`timezone` varchar(50) DEFAULT 'Asia/Bangkok',
	`currency` varchar(3) DEFAULT 'THB',
	`taxRate` decimal(5,2) DEFAULT '7.00',
	`taxInclusive` boolean DEFAULT false,
	`operatingHours` json,
	`franchiseOwnerId` int,
	`openingDate` date,
	`contractStartDate` date,
	`contractEndDate` date,
	`royaltyType` enum('percentage','fixed','none') DEFAULT 'none',
	`royaltyValue` decimal(10,2),
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `branches_id` PRIMARY KEY(`id`),
	CONSTRAINT `branches_branchCode_unique` UNIQUE(`branchCode`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staffId` int,
	`type` varchar(50),
	`title` varchar(500),
	`message` text,
	`relatedEntity` varchar(50),
	`relatedEntityId` int,
	`isRead` boolean DEFAULT false,
	`readAt` timestamp,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_branch_inventory_stock` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`inventoryItemId` int NOT NULL,
	`currentStock` decimal(10,3) DEFAULT '0',
	`reservedStock` decimal(10,3) DEFAULT '0',
	`lastCountedAt` timestamp,
	`lastReceivedAt` timestamp,
	CONSTRAINT `pos_branch_inventory_stock_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_branch_item` UNIQUE(`branchId`,`inventoryItemId`)
);
--> statement-breakpoint
CREATE TABLE `pos_branch_menu_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`menuItemId` int NOT NULL,
	`isAvailable` boolean DEFAULT true,
	`priceOverride` decimal(10,2),
	`stockLevel` int,
	CONSTRAINT `pos_branch_menu_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_branch_item` UNIQUE(`branchId`,`menuItemId`)
);
--> statement-breakpoint
CREATE TABLE `pos_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int,
	`name` varchar(100) NOT NULL,
	`nameThai` varchar(100),
	`description` text,
	`iconName` varchar(50),
	`colorHex` varchar(7),
	`sortOrder` int DEFAULT 0,
	`isActive` boolean DEFAULT true,
	`isArchived` boolean DEFAULT false,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pos_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_daily_summaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`summaryDate` date NOT NULL,
	`totalOrders` int DEFAULT 0,
	`totalRevenue` decimal(12,2) DEFAULT '0',
	`totalDiscounts` decimal(10,2) DEFAULT '0',
	`totalTax` decimal(10,2) DEFAULT '0',
	`averageOrderValue` decimal(10,2) DEFAULT '0',
	`paymentBreakdown` json,
	`topItems` json,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pos_daily_summaries_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_branch_date` UNIQUE(`branchId`,`summaryDate`)
);
--> statement-breakpoint
CREATE TABLE `pos_discounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50),
	`name` varchar(200),
	`description` text,
	`discountType` enum('percentage','fixed','bogo','free_item'),
	`value` decimal(10,2),
	`minOrderAmount` decimal(10,2),
	`maxDiscountAmount` decimal(10,2),
	`applicableCategories` json,
	`applicableMenuItems` json,
	`maxUses` int,
	`maxUsesPerCustomer` int,
	`usedCount` int DEFAULT 0,
	`startDate` timestamp,
	`endDate` timestamp,
	`daysOfWeek` json,
	`startTime` time,
	`endTime` time,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pos_discounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `pos_discounts_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `pos_inventory_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`parentId` int,
	`name` varchar(100) NOT NULL,
	`nameThai` varchar(100),
	`level` int DEFAULT 0,
	`sortOrder` int DEFAULT 0,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pos_inventory_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_inventory_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sku` varchar(50),
	`barcode` varchar(50),
	`name` varchar(200) NOT NULL,
	`nameThai` varchar(200),
	`description` text,
	`imageUrl` varchar(500),
	`categoryId` int,
	`unitOfMeasure` enum('g','kg','ml','l','piece','pack','box','bottle','can','bag'),
	`sourceFlag` enum('hq_supply','customer_supplied','mixed') DEFAULT 'hq_supply',
	`costPerUnit` decimal(10,4),
	`sellingPricePerUnit` decimal(10,4),
	`retailPrice` decimal(10,2),
	`minStockLevel` decimal(10,3),
	`reorderPoint` decimal(10,3),
	`reorderQuantity` decimal(10,3),
	`primarySupplierId` int,
	`leadTimeDays` int,
	`shelfLifeDays` int,
	`storageRequirements` text,
	`allergens` json,
	`isActive` boolean DEFAULT true,
	`isArchived` boolean DEFAULT false,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pos_inventory_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `pos_inventory_items_sku_unique` UNIQUE(`sku`)
);
--> statement-breakpoint
CREATE TABLE `pos_inventory_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`inventoryItemId` int NOT NULL,
	`movementType` enum('received','used','transferred_in','transferred_out','adjusted','wasted','expired'),
	`quantity` decimal(10,3) NOT NULL,
	`unitOfMeasure` varchar(20),
	`referenceType` enum('purchase_order','order','transfer','count','manual'),
	`referenceId` int,
	`notes` text,
	`performedByStaffId` int,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `pos_inventory_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_kitchen_tickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`ticketNumber` varchar(20),
	`station` enum('drinks','food','desserts','all') DEFAULT 'all',
	`status` enum('pending','preparing','ready','served') DEFAULT 'pending',
	`priority` enum('normal','urgent') DEFAULT 'normal',
	`printedAt` timestamp,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `pos_kitchen_tickets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_menu_item_option_groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`menuItemId` int NOT NULL,
	`optionGroupId` int NOT NULL,
	`sortOrder` int DEFAULT 0,
	CONSTRAINT `pos_menu_item_option_groups_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_item_group` UNIQUE(`menuItemId`,`optionGroupId`)
);
--> statement-breakpoint
CREATE TABLE `pos_menu_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sku` varchar(50),
	`barcode` varchar(50),
	`name` varchar(200) NOT NULL,
	`nameThai` varchar(200),
	`nameJapanese` varchar(200),
	`description` text,
	`descriptionThai` text,
	`imageUrl` varchar(500),
	`categoryId` int,
	`tags` json,
	`basePrice` decimal(10,2) NOT NULL,
	`costPrice` decimal(10,2),
	`memberPrice` decimal(10,2),
	`isActive` boolean DEFAULT true,
	`isArchived` boolean DEFAULT false,
	`isFeatured` boolean DEFAULT false,
	`availableFrom` time,
	`availableTo` time,
	`trackInventory` boolean DEFAULT false,
	`prepTimeMinutes` int,
	`cookTimeMinutes` int,
	`recipeNotes` text,
	`sopId` int,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pos_menu_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `pos_menu_items_sku_unique` UNIQUE(`sku`)
);
--> statement-breakpoint
CREATE TABLE `pos_option_groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100),
	`nameThai` varchar(100),
	`selectionType` enum('single','multi','quantity') DEFAULT 'single',
	`isRequired` boolean DEFAULT false,
	`minSelections` int DEFAULT 0,
	`maxSelections` int,
	`sortOrder` int DEFAULT 0,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pos_option_groups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`name` varchar(100),
	`nameThai` varchar(100),
	`priceAdjustment` decimal(10,2) DEFAULT '0',
	`sortOrder` int DEFAULT 0,
	`isDefault` boolean DEFAULT false,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `pos_options_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_order_item_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderItemId` int NOT NULL,
	`optionId` int,
	`optionName` varchar(100),
	`priceAdjustment` decimal(10,2),
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `pos_order_item_options_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`menuItemId` int,
	`menuItemName` varchar(200),
	`menuItemPrice` decimal(10,2),
	`quantity` int DEFAULT 1,
	`unitPrice` decimal(10,2),
	`totalPrice` decimal(10,2),
	`kitchenStatus` enum('pending','preparing','ready','served') DEFAULT 'pending',
	`notes` text,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `pos_order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_order_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`paymentMethodId` int,
	`amount` decimal(10,2),
	`referenceNumber` varchar(100),
	`status` enum('pending','completed','failed','refunded') DEFAULT 'completed',
	`paidAt` timestamp DEFAULT (now()),
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `pos_order_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(20),
	`branchId` int,
	`staffId` int,
	`orderType` enum('dine-in','takeaway','delivery') DEFAULT 'dine-in',
	`tableNumber` varchar(20),
	`customerName` varchar(200),
	`customerPhone` varchar(20),
	`deliveryPlatform` enum('in_house','grab','lineman','shopeefood','foodpanda','robinhood','other') DEFAULT 'in_house',
	`externalOrderId` varchar(100),
	`deliveryAddress` text,
	`deliveryFee` decimal(10,2) DEFAULT '0',
	`platformCommissionPct` decimal(5,2),
	`platformPayout` decimal(10,2),
	`riderName` varchar(100),
	`riderPhone` varchar(20),
	`status` enum('draft','pending','preparing','ready','served','completed','cancelled','refunded') DEFAULT 'pending',
	`subtotal` decimal(10,2) NOT NULL,
	`discountAmount` decimal(10,2) DEFAULT '0',
	`discountId` int,
	`taxAmount` decimal(10,2) DEFAULT '0',
	`serviceCharge` decimal(10,2) DEFAULT '0',
	`totalAmount` decimal(10,2) NOT NULL,
	`notes` text,
	`createdAt` timestamp DEFAULT (now()),
	`preparingAt` timestamp,
	`readyAt` timestamp,
	`servedAt` timestamp,
	`completedAt` timestamp,
	`cancelledAt` timestamp,
	`cancelReason` text,
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pos_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `pos_orders_orderNumber_unique` UNIQUE(`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `pos_payment_methods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50),
	`name` varchar(100),
	`nameThai` varchar(100),
	`type` enum('cash','qr','card','voucher','transfer','other'),
	`iconName` varchar(50),
	`feePercentage` decimal(5,2) DEFAULT '0',
	`feeFixed` decimal(10,2) DEFAULT '0',
	`requiresReference` boolean DEFAULT false,
	`sortOrder` int DEFAULT 0,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `pos_payment_methods_id` PRIMARY KEY(`id`),
	CONSTRAINT `pos_payment_methods_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `pos_purchase_order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchaseOrderId` int NOT NULL,
	`inventoryItemId` int,
	`quantityOrdered` decimal(10,3),
	`quantityReceived` decimal(10,3) DEFAULT '0',
	`unitOfMeasure` varchar(20),
	`unitCost` decimal(10,4),
	`totalCost` decimal(10,2),
	`notes` text,
	CONSTRAINT `pos_purchase_order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_purchase_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`poNumber` varchar(30),
	`supplierId` int,
	`branchId` int,
	`orderDate` date,
	`requiredDate` date,
	`expectedDeliveryDate` date,
	`priority` enum('low','normal','high','urgent') DEFAULT 'normal',
	`status` enum('draft','pending_approval','approved','sent','partial','received','closed','cancelled') DEFAULT 'draft',
	`subtotal` decimal(10,2) DEFAULT '0',
	`discountAmount` decimal(10,2) DEFAULT '0',
	`shippingCost` decimal(10,2) DEFAULT '0',
	`taxAmount` decimal(10,2) DEFAULT '0',
	`totalAmount` decimal(10,2) DEFAULT '0',
	`paymentTerms` varchar(50),
	`shippingMethod` varchar(100),
	`trackingNumber` varchar(100),
	`notesToSupplier` text,
	`internalNotes` text,
	`approvedByStaffId` int,
	`approvedAt` timestamp,
	`createdByStaffId` int,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pos_purchase_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `pos_purchase_orders_poNumber_unique` UNIQUE(`poNumber`)
);
--> statement-breakpoint
CREATE TABLE `pos_recipe_ingredients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`menuItemId` int NOT NULL,
	`inventoryItemId` int NOT NULL,
	`quantity` decimal(10,4),
	`unitOfMeasure` varchar(20),
	`notes` text,
	CONSTRAINT `pos_recipe_ingredients_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_recipe` UNIQUE(`menuItemId`,`inventoryItemId`)
);
--> statement-breakpoint
CREATE TABLE `pos_sop_acknowledgments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sopId` int NOT NULL,
	`staffId` int NOT NULL,
	`branchId` int,
	`acknowledgedAt` timestamp DEFAULT (now()),
	`ipAddress` varchar(45),
	`notes` text,
	CONSTRAINT `pos_sop_acknowledgments_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_sop_staff` UNIQUE(`sopId`,`staffId`)
);
--> statement-breakpoint
CREATE TABLE `pos_sop_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`nameThai` varchar(100),
	`parentId` int,
	`sortOrder` int DEFAULT 0,
	`iconName` varchar(50),
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pos_sop_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_sop_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sopId` int NOT NULL,
	`staffId` int NOT NULL,
	`dueDate` date,
	`status` enum('pending','in_progress','completed','overdue') DEFAULT 'pending',
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `pos_sop_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_sop_variant_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`masterSopId` int NOT NULL,
	`branchId` int NOT NULL,
	`proposedContent` json,
	`changeReason` text,
	`changesSummary` text,
	`requestedByStaffId` int,
	`status` enum('pending','approved','rejected','withdrawn') DEFAULT 'pending',
	`reviewedByStaffId` int,
	`reviewedAt` timestamp,
	`reviewNotes` text,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `pos_sop_variant_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_sops` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(200),
	`title` varchar(500) NOT NULL,
	`titleThai` varchar(500),
	`subtitle` varchar(500),
	`subtitleThai` varchar(500),
	`coverImageUrl` varchar(500),
	`categoryId` int,
	`content` json,
	`tags` json,
	`requiresAcknowledgment` boolean DEFAULT false,
	`requiredRoles` json,
	`acknowledgmentDeadlineDays` int,
	`version` int DEFAULT 1,
	`previousVersionId` int,
	`changeReason` text,
	`status` enum('draft','review','published','archived') DEFAULT 'draft',
	`authorStaffId` int,
	`publishedAt` timestamp,
	`effectiveDate` date,
	`reviewDate` date,
	`allowBranchVariants` boolean DEFAULT false,
	`masterSopId` int,
	`branchId` int,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pos_sops_id` PRIMARY KEY(`id`),
	CONSTRAINT `pos_sops_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `pos_suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50),
	`companyName` varchar(255) NOT NULL,
	`companyNameThai` varchar(255),
	`contactPerson` varchar(200),
	`email` varchar(255),
	`phone` varchar(50),
	`lineId` varchar(100),
	`address` text,
	`province` varchar(100),
	`country` varchar(100) DEFAULT 'Thailand',
	`paymentTerms` varchar(50),
	`currency` varchar(3) DEFAULT 'THB',
	`bankAccountInfo` json,
	`performanceRating` decimal(3,2),
	`notes` text,
	`status` enum('active','inactive') DEFAULT 'active',
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pos_suppliers_id` PRIMARY KEY(`id`),
	CONSTRAINT `pos_suppliers_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `staff` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employeeCode` varchar(20) NOT NULL,
	`firstName` varchar(100),
	`lastName` varchar(100),
	`firstNameThai` varchar(100),
	`lastNameThai` varchar(100),
	`email` varchar(255),
	`phone` varchar(20),
	`avatar` varchar(500),
	`passwordHash` varchar(255),
	`pinHash` varchar(255),
	`role` enum('super_admin','staff_admin','staff') DEFAULT 'staff',
	`primaryBranchId` int,
	`employmentType` enum('full-time','part-time','contract') DEFAULT 'full-time',
	`hireDate` date,
	`status` enum('active','inactive','terminated') DEFAULT 'active',
	`emergencyContactName` varchar(200),
	`emergencyContactPhone` varchar(20),
	`lastLoginAt` timestamp,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `staff_id` PRIMARY KEY(`id`),
	CONSTRAINT `staff_employeeCode_unique` UNIQUE(`employeeCode`),
	CONSTRAINT `staff_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `staff_branches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`staffId` int NOT NULL,
	`branchId` int NOT NULL,
	`isPrimary` boolean DEFAULT false,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `staff_branches_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_staff_branch` UNIQUE(`staffId`,`branchId`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
