CREATE TABLE `pos_export_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`docType` enum('receipt_tax_invoice','shipping_note') NOT NULL,
	`documentNumber` varchar(50) NOT NULL,
	`branchId` int,
	`customerName` varchar(300),
	`grandTotal` decimal(12,2),
	`data` json,
	`createdBy` int,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pos_export_documents_id` PRIMARY KEY(`id`)
);
