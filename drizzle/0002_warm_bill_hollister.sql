CREATE TABLE `pos_inventory_attribute_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attributeId` int NOT NULL,
	`value` varchar(100) NOT NULL,
	`labelTh` varchar(100),
	`labelEn` varchar(100),
	`sortOrder` int DEFAULT 0,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `pos_inventory_attribute_options_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pos_inventory_attributes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` int NOT NULL,
	`attributeKey` varchar(50) NOT NULL,
	`labelTh` varchar(100) NOT NULL,
	`labelEn` varchar(100) NOT NULL,
	`fieldType` enum('dropdown','text','number') NOT NULL DEFAULT 'dropdown',
	`isRequired` boolean DEFAULT false,
	`sortOrder` int DEFAULT 0,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `pos_inventory_attributes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `pos_inventory_items` ADD `attributes` json;