ALTER TABLE `pos_requisition_items` ADD `unitPrice` decimal(10,2);--> statement-breakpoint
ALTER TABLE `pos_requisitions` ADD `invoiceTotal` decimal(12,2);--> statement-breakpoint
ALTER TABLE `pos_requisitions` ADD `paymentStatus` enum('unpaid','paid') DEFAULT 'unpaid';--> statement-breakpoint
ALTER TABLE `pos_requisitions` ADD `paymentMethod` varchar(100);--> statement-breakpoint
ALTER TABLE `pos_requisitions` ADD `paidAmount` decimal(12,2);--> statement-breakpoint
ALTER TABLE `pos_requisitions` ADD `paidAt` timestamp;--> statement-breakpoint
ALTER TABLE `pos_requisitions` ADD `paidRef` varchar(200);