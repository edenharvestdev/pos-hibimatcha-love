CREATE TABLE `pos_branch_payment_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`promptpayId` varchar(50),
	`promptpayName` varchar(200),
	`promptpayType` enum('phone','tax_id','ewallet') DEFAULT 'phone',
	`bankAccountNumber` varchar(50),
	`bankName` varchar(100),
	`bankAccountName` varchar(200),
	`taxId` varchar(20),
	`companyName` varchar(200),
	`companyAddress` text,
	`receiptHeaderImage` varchar(500),
	`receiptFooterText` text,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pos_branch_payment_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_printer_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`printerName` varchar(100) NOT NULL,
	`printerType` enum('order_slip','label','kitchen','receipt') NOT NULL,
	`connection` enum('usb','network','bluetooth','browser') DEFAULT 'browser',
	`ipAddress` varchar(45),
	`port` int DEFAULT 9100,
	`paperWidth` int DEFAULT 80,
	`charactersPerLine` int DEFAULT 48,
	`isDefault` boolean DEFAULT false,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pos_printer_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `pos_orders` ADD `paymentQrPayload` text;--> statement-breakpoint
ALTER TABLE `pos_orders` ADD `paymentQrAmount` decimal(10,2);--> statement-breakpoint
ALTER TABLE `pos_orders` ADD `paymentRefNumber` varchar(100);--> statement-breakpoint
ALTER TABLE `pos_orders` ADD `orderSlipPrintedAt` timestamp;--> statement-breakpoint
ALTER TABLE `pos_orders` ADD `labelsPrintedAt` timestamp;--> statement-breakpoint
ALTER TABLE `pos_orders` ADD `kitchenTicketPrintedAt` timestamp;--> statement-breakpoint
ALTER TABLE `pos_orders` ADD `receiptPrintedAt` timestamp;