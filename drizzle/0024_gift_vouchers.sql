CREATE TABLE `pos_gift_vouchers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`initialBalance` decimal(10,2) NOT NULL,
	`currentBalance` decimal(10,2) NOT NULL,
	`branchId` int,
	`isActive` boolean DEFAULT true,
	`expiresAt` timestamp,
	`notes` text,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pos_gift_vouchers_id` PRIMARY KEY(`id`),
	CONSTRAINT `pos_gift_vouchers_code_unique` UNIQUE(`code`)
);
