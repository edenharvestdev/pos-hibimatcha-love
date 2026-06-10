CREATE TABLE `accounts_receivable` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`customerId` int NOT NULL,
	`customerType` enum('corporate','franchise') NOT NULL DEFAULT 'corporate',
	`invoiceNumber` varchar(50) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`outstandingAmount` decimal(12,2) NOT NULL,
	`dueDate` date NOT NULL,
	`status` enum('pending','due_soon','overdue','paid') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `accounts_receivable_id` PRIMARY KEY(`id`),
	CONSTRAINT `accounts_receivable_invoiceNumber_unique` UNIQUE(`invoiceNumber`)
);
--> statement-breakpoint
CREATE TABLE `branch_payment_methods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`paymentMethodId` int NOT NULL,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `branch_payment_methods_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_branch_payment` UNIQUE(`branchId`,`paymentMethodId`)
);
--> statement-breakpoint
CREATE TABLE `franchise_compliance_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`month` varchar(7) NOT NULL,
	`sopCompliance` decimal(5,2) DEFAULT '100.00',
	`wasteRate` decimal(5,2) DEFAULT '0.00',
	`stockCountCompletion` decimal(5,2) DEFAULT '100.00',
	`expiryCompliance` decimal(5,2) DEFAULT '100.00',
	`revenueCompliance` decimal(5,2) DEFAULT '100.00',
	`overallScore` decimal(5,2) DEFAULT '100.00',
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `franchise_compliance_scores_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_franchise_compliance_month` UNIQUE(`branchId`,`month`)
);
--> statement-breakpoint
CREATE TABLE `franchise_royalties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`month` varchar(7) NOT NULL,
	`revenue` decimal(12,2) NOT NULL,
	`royaltyType` enum('percentage','fixed','hybrid') NOT NULL,
	`royaltyRate` decimal(10,2) NOT NULL,
	`calculatedAmount` decimal(12,2) NOT NULL,
	`status` enum('pending','paid','overdue') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `franchise_royalties_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_franchise_royalty_month` UNIQUE(`branchId`,`month`)
);
--> statement-breakpoint
CREATE TABLE `master_dropdown_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dropdownId` int NOT NULL,
	`value` varchar(100) NOT NULL,
	`labelTh` varchar(100),
	`labelEn` varchar(100),
	`isArchived` boolean DEFAULT false,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `master_dropdown_options_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `master_dropdowns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`nameThai` varchar(100),
	`code` varchar(50) NOT NULL,
	`isArchived` boolean DEFAULT false,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `master_dropdowns_id` PRIMARY KEY(`id`),
	CONSTRAINT `master_dropdowns_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `master_payment_methods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`nameThai` varchar(100),
	`type` varchar(50) NOT NULL,
	`iconName` varchar(50),
	`feePercentage` decimal(5,2) DEFAULT '0',
	`feeFixed` decimal(10,2) DEFAULT '0',
	`surchargePercentage` decimal(5,2) DEFAULT '0',
	`surchargeFixed` decimal(10,2) DEFAULT '0',
	`settlementDays` int DEFAULT 0,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `master_payment_methods_id` PRIMARY KEY(`id`),
	CONSTRAINT `master_payment_methods_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `pos_inventory_count_session_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`inventoryItemId` int NOT NULL,
	`systemQty` decimal(10,3) NOT NULL,
	`countedQty` decimal(10,3),
	`varianceQty` decimal(10,3),
	`varianceCost` decimal(12,2),
	`status` enum('pending','reviewed','approved','rejected') NOT NULL DEFAULT 'pending',
	CONSTRAINT `pos_inventory_count_session_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_inventory_count_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`assignedStaffId` int NOT NULL,
	`status` enum('draft','in_progress','variance_review','completed','closed') NOT NULL DEFAULT 'draft',
	`startedAt` timestamp DEFAULT (now()),
	`closedAt` timestamp,
	`approvedByStaffId` int,
	`approvedAt` timestamp,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pos_inventory_count_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_refunds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`refundNumber` varchar(50) NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`reason` text NOT NULL,
	`paymentMethodId` int,
	`status` enum('requested','approved','rejected','refunded') NOT NULL DEFAULT 'requested',
	`approvedByStaffId` int,
	`approvedAt` timestamp,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pos_refunds_id` PRIMARY KEY(`id`),
	CONSTRAINT `pos_refunds_refundNumber_unique` UNIQUE(`refundNumber`)
);
--> statement-breakpoint
CREATE TABLE `pos_waste_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`inventoryItemId` int NOT NULL,
	`category` enum('expired','damaged','spill','training','sampling','unknown') NOT NULL,
	`quantity` decimal(10,3) NOT NULL,
	`costPerUnit` decimal(10,4) NOT NULL,
	`totalCost` decimal(12,2) NOT NULL,
	`notes` text,
	`recordedByStaffId` int NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `pos_waste_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `branches` MODIFY COLUMN `royaltyType` enum('percentage','fixed','hybrid','none') DEFAULT 'none';--> statement-breakpoint
ALTER TABLE `pos_export_documents` MODIFY COLUMN `docType` enum('receipt_tax_invoice','shipping_note','pos_receipt','sales_receipt','full_tax_invoice','credit_note','debit_note','delivery_note','billing_statement','quotation','purchase_order','goods_receipt','transfer_document') NOT NULL;--> statement-breakpoint
ALTER TABLE `staff` MODIFY COLUMN `role` enum('super_admin','staff_admin','staff','owner','hq_admin','branch_admin','manager','cashier') DEFAULT 'staff';