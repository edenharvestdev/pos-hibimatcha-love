CREATE TABLE `pos_order_recipe_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderItemId` int NOT NULL,
	`inventoryItemId` int NOT NULL,
	`quantityUsed` decimal(10,4) NOT NULL,
	`unit` varchar(20) NOT NULL,
	`unitCostSnapshot` decimal(10,4) DEFAULT '0.0000',
	`totalCostSnapshot` decimal(10,4) DEFAULT '0.0000',
	`branchId` int NOT NULL,
	`optionId` int,
	`effectSource` varchar(50) NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `pos_order_recipe_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `pos_recipe_ingredients` ADD `role` varchar(50);