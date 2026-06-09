CREATE TABLE `customer_order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerOrderId` int NOT NULL,
	`menuItemId` int NOT NULL,
	`menuItemName` varchar(200) NOT NULL,
	`unitPrice` decimal(10,2) NOT NULL,
	`quantity` int DEFAULT 1,
	`totalPrice` decimal(10,2) NOT NULL,
	`options` json,
	`notes` text,
	CONSTRAINT `customer_order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customer_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(30),
	`memberId` int,
	`branchId` int NOT NULL,
	`orderType` enum('pickup','delivery') DEFAULT 'pickup',
	`pickupTime` timestamp,
	`deliveryAddress` text,
	`deliveryLat` decimal(10,8),
	`deliveryLng` decimal(11,8),
	`customerName` varchar(200),
	`customerPhone` varchar(20),
	`notes` text,
	`status` enum('pending','confirmed','preparing','ready','completed','cancelled') DEFAULT 'pending',
	`subtotal` decimal(10,2) DEFAULT '0',
	`discountAmount` decimal(10,2) DEFAULT '0',
	`pointsRedeemed` decimal(10,2) DEFAULT '0',
	`pointsEarned` decimal(10,2) DEFAULT '0',
	`taxAmount` decimal(10,2) DEFAULT '0',
	`totalAmount` decimal(10,2) DEFAULT '0',
	`paymentMethod` enum('promptpay','credit_card','cash') DEFAULT 'promptpay',
	`paymentStatus` enum('pending','paid','refunded') DEFAULT 'pending',
	`paymentRef` varchar(100),
	`posOrderId` int,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customer_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `customer_orders_orderNumber_unique` UNIQUE(`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `member_points` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`branchId` int NOT NULL,
	`type` enum('earn','redeem','expire','adjust') NOT NULL,
	`points` decimal(10,2) NOT NULL,
	`balanceBefore` decimal(10,2) DEFAULT '0',
	`balanceAfter` decimal(10,2) DEFAULT '0',
	`orderId` int,
	`expiresAt` timestamp,
	`notes` text,
	`createdByStaffId` int,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `member_points_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(20) NOT NULL,
	`email` varchar(255),
	`firstName` varchar(100),
	`lastName` varchar(100),
	`lineUid` varchar(100),
	`googleUid` varchar(100),
	`avatarUrl` varchar(500),
	`birthDate` date,
	`pdpaConsentAt` timestamp,
	`pdpaConsentVersion` varchar(10) DEFAULT '1.0',
	`isVerified` boolean DEFAULT false,
	`status` enum('active','suspended') DEFAULT 'active',
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `members_id` PRIMARY KEY(`id`),
	CONSTRAINT `members_phone_unique` UNIQUE(`phone`),
	CONSTRAINT `members_email_unique` UNIQUE(`email`),
	CONSTRAINT `members_lineUid_unique` UNIQUE(`lineUid`),
	CONSTRAINT `members_googleUid_unique` UNIQUE(`googleUid`)
);
--> statement-breakpoint
CREATE TABLE `pdpa_consents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int,
	`staffId` int,
	`consentType` enum('member_registration','marketing','data_sharing') NOT NULL,
	`consentVersion` varchar(10) DEFAULT '1.0',
	`consentGiven` boolean DEFAULT false,
	`consentAt` timestamp DEFAULT (now()),
	`ipAddress` varchar(45),
	`userAgent` text,
	CONSTRAINT `pdpa_consents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supplier_payment_installments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleId` int NOT NULL,
	`installmentNumber` int NOT NULL,
	`dueDate` date NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`paidAt` timestamp,
	`paymentRef` varchar(100),
	`status` enum('pending','paid','overdue') DEFAULT 'pending',
	`notes` text,
	CONSTRAINT `supplier_payment_installments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supplier_payment_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplierId` int NOT NULL,
	`purchaseOrderId` int,
	`totalAmount` decimal(12,2) NOT NULL,
	`paidAmount` decimal(12,2) DEFAULT '0',
	`remainingAmount` decimal(12,2) NOT NULL,
	`installments` int DEFAULT 1,
	`notes` text,
	`status` enum('active','completed','overdue') DEFAULT 'active',
	`createdByStaffId` int,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supplier_payment_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `branches` ADD `loyaltyEnabled` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `branches` ADD `loyaltyPointsPerBaht` decimal(5,2) DEFAULT '0.04';--> statement-breakpoint
ALTER TABLE `branches` ADD `loyaltyRedeemRate` decimal(5,2) DEFAULT '1.00';--> statement-breakpoint
ALTER TABLE `branches` ADD `loyaltyPointExpireDays` int DEFAULT 365;--> statement-breakpoint
ALTER TABLE `branches` ADD `loyaltyMinOrderForPoints` decimal(10,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `branches` ADD `commissionEnabled` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `branches` ADD `commissionRate` decimal(5,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `branches` ADD `commissionType` enum('percentage','fixed_per_order') DEFAULT 'percentage';--> statement-breakpoint
ALTER TABLE `branches` ADD `logoUrl` varchar(500);