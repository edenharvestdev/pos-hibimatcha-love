ALTER TABLE `staff` ADD `totpSecret` varchar(255);--> statement-breakpoint
ALTER TABLE `staff` ADD `totpEnabled` boolean DEFAULT false;
