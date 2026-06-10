CREATE TABLE `pos_batch_production_ingredients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`batchProductionId` int NOT NULL,
	`inventoryItemId` int NOT NULL,
	`plannedQty` decimal(10,3) NOT NULL,
	`actualQty` decimal(10,3) NOT NULL,
	`unitOfMeasure` varchar(20),
	CONSTRAINT `pos_batch_production_ingredients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_batch_productions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`inventoryItemId` int NOT NULL,
	`batchNumber` varchar(100) NOT NULL,
	`plannedQty` decimal(10,3) NOT NULL,
	`actualQty` decimal(10,3),
	`status` enum('draft','in_production','completed','cancelled') NOT NULL DEFAULT 'draft',
	`notes` text,
	`manufactureDate` date,
	`expiryDate` date,
	`createdByStaffId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pos_batch_productions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_inventory_lots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`inventoryItemId` int NOT NULL,
	`expenseReceiptId` int,
	`lotNumber` varchar(100),
	`manufactureDate` date,
	`expiryDate` date,
	`quantity` decimal(10,3) NOT NULL,
	`remainingQty` decimal(10,3) NOT NULL,
	`unitOfMeasure` varchar(20),
	`costPerUnit` decimal(10,4),
	`status` enum('active','expiring_soon','expired','depleted') NOT NULL DEFAULT 'active',
	`alertSentAt` timestamp,
	`notes` text,
	`createdByStaffId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pos_inventory_lots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `pos_expense_receipt_items` ADD `inventoryItemId` int;--> statement-breakpoint
ALTER TABLE `pos_expense_receipt_items` ADD `manufactureDate` date;--> statement-breakpoint
ALTER TABLE `pos_expense_receipt_items` ADD `expiryDate` date;