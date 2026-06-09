CREATE TABLE `pos_expense_receipt_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`receiptId` int NOT NULL,
	`itemName` varchar(300) NOT NULL,
	`quantity` decimal(10,3) NOT NULL,
	`unit` varchar(50),
	`unitPrice` decimal(12,2) NOT NULL,
	`totalPrice` decimal(12,2) NOT NULL,
	`category` varchar(100),
	`notes` text,
	CONSTRAINT `pos_expense_receipt_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_expense_receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`vendor` varchar(200) NOT NULL,
	`vendorBranch` varchar(200),
	`receiptNumber` varchar(100),
	`receiptDate` date NOT NULL,
	`category` enum('ingredients','packaging','equipment','cleaning','utilities','marketing','delivery_fee','other') NOT NULL DEFAULT 'ingredients',
	`paymentMethod` enum('cash','transfer','credit_card','corporate_card','cod','other') NOT NULL DEFAULT 'transfer',
	`subtotal` decimal(12,2) NOT NULL,
	`vatAmount` decimal(12,2) DEFAULT '0',
	`discountAmount` decimal(12,2) DEFAULT '0',
	`deliveryFee` decimal(12,2) DEFAULT '0',
	`grandTotal` decimal(12,2) NOT NULL,
	`receiptImageUrl` text,
	`notes` text,
	`status` enum('draft','confirmed','voided') NOT NULL DEFAULT 'draft',
	`createdByStaffId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pos_expense_receipts_id` PRIMARY KEY(`id`)
);
