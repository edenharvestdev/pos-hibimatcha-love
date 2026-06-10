CREATE TABLE `pos_cash_closings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`staffId` int NOT NULL,
	`openingCash` decimal(12,2) NOT NULL,
	`cashSales` decimal(12,2) DEFAULT '0.00',
	`cashRefunds` decimal(12,2) DEFAULT '0.00',
	`cashIn` decimal(12,2) DEFAULT '0.00',
	`cashOut` decimal(12,2) DEFAULT '0.00',
	`expectedCash` decimal(12,2) NOT NULL,
	`actualCountedCash` decimal(12,2) NOT NULL,
	`variance` decimal(12,2) NOT NULL,
	`varianceReason` enum('short_change','counting_mistake','drawer_mistake','refund_mistake','theft_suspected','other'),
	`photoUrl` varchar(500),
	`managerApprovedByStaffId` int,
	`notes` text,
	`closedAt` timestamp DEFAULT (now()),
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `pos_cash_closings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_document_sequences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`docType` varchar(50) NOT NULL,
	`prefix` varchar(20) NOT NULL,
	`includeBranchCode` boolean DEFAULT true,
	`includeDate` boolean DEFAULT true,
	`currentSequence` int NOT NULL DEFAULT 0,
	`lastResetDate` date,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pos_document_sequences_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_branch_doc_seq` UNIQUE(`branchId`,`docType`)
);
--> statement-breakpoint
CREATE TABLE `pos_payment_settlements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`paymentMethodId` int NOT NULL,
	`orderPaymentId` int,
	`providerName` varchar(100),
	`grossAmount` decimal(12,2) NOT NULL,
	`feeAmount` decimal(12,2) DEFAULT '0.00',
	`netAmount` decimal(12,2) NOT NULL,
	`expectedSettlementDate` date,
	`actualSettlementDate` date,
	`status` enum('pending','expected_today','settled','short_paid','over_paid','disputed') NOT NULL DEFAULT 'pending',
	`settlementReference` varchar(100),
	`bankAccount` varchar(100),
	`reconciledByStaffId` int,
	`reconciledAt` timestamp,
	`slipImageUrl` varchar(500),
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pos_payment_settlements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `master_payment_methods` ADD `roleAvailability` json;--> statement-breakpoint
ALTER TABLE `master_payment_methods` ADD `requiresManagerPin` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `master_payment_methods` ADD `requiresSlipUpload` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `master_payment_methods` ADD `requiresReference` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `master_payment_methods` ADD `requiresSettlement` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `master_payment_methods` ADD `feeType` enum('none','fixed','percentage') DEFAULT 'none';--> statement-breakpoint
ALTER TABLE `master_payment_methods` ADD `feeAmount` decimal(10,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `master_payment_methods` ADD `providerName` varchar(100);--> statement-breakpoint
ALTER TABLE `master_payment_methods` ADD `externalAccountId` varchar(100);--> statement-breakpoint
ALTER TABLE `master_payment_methods` ADD `displayOrder` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `master_payment_methods` ADD `color` varchar(50);--> statement-breakpoint
ALTER TABLE `master_payment_methods` ADD `isDeliveryPlatform` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `master_payment_methods` ADD `isCashEquivalent` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `master_payment_methods` ADD `isCreditAccount` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `pos_order_payments` ADD `qrPayload` text;--> statement-breakpoint
ALTER TABLE `pos_order_payments` ADD `qrGeneratedAmount` decimal(10,2);--> statement-breakpoint
ALTER TABLE `pos_order_payments` ADD `slipImageUrl` text;--> statement-breakpoint
ALTER TABLE `pos_order_payments` ADD `bankReference` varchar(100);--> statement-breakpoint
ALTER TABLE `pos_order_payments` ADD `payerName` varchar(100);--> statement-breakpoint
ALTER TABLE `pos_order_payments` ADD `transferTime` timestamp;--> statement-breakpoint
ALTER TABLE `pos_order_payments` ADD `verificationStatus` enum('not_required','pending','verified','rejected','manual_review') DEFAULT 'not_required';--> statement-breakpoint
ALTER TABLE `pos_order_payments` ADD `verifiedBy` int;--> statement-breakpoint
ALTER TABLE `pos_order_payments` ADD `verifiedAt` timestamp;