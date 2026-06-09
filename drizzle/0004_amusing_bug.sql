CREATE TABLE `pos_requisition_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requisitionId` int NOT NULL,
	`itemType` enum('inventory','menu') NOT NULL,
	`itemId` int NOT NULL,
	`itemName` varchar(200) NOT NULL,
	`requestedQty` decimal(10,2) NOT NULL,
	`approvedQty` decimal(10,2),
	`unit` varchar(30),
	`notes` text,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	CONSTRAINT `pos_requisition_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_requisitions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestNumber` varchar(30) NOT NULL,
	`requestingBranchId` int NOT NULL,
	`sourceBranchId` int NOT NULL,
	`requestedByStaffId` int NOT NULL,
	`type` enum('stock','menu','supplies') NOT NULL,
	`status` enum('pending','approved','partially_approved','rejected','cancelled','fulfilled') NOT NULL DEFAULT 'pending',
	`priority` enum('low','normal','urgent') NOT NULL DEFAULT 'normal',
	`notes` text,
	`approvedByStaffId` int,
	`approvedAt` timestamp,
	`rejectionReason` text,
	`fulfilledAt` timestamp,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()),
	CONSTRAINT `pos_requisitions_id` PRIMARY KEY(`id`)
);
