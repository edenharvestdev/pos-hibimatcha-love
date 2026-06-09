ALTER TABLE `pos_branch_inventory_stock` ADD `averageCost` decimal(10,4) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `pos_branch_inventory_stock` ADD `totalStockValue` decimal(12,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE `pos_inventory_movements` ADD `costPerUnit` decimal(10,4);--> statement-breakpoint
ALTER TABLE `pos_inventory_movements` ADD `totalCost` decimal(12,2);