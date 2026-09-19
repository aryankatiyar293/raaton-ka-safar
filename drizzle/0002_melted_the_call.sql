CREATE TABLE `adminAccounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`mustChangePassword` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `adminAccounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `adminAccounts_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `adminSessions` (
	`tokenHash` varchar(128) NOT NULL,
	`adminId` int NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `adminSessions_tokenHash` PRIMARY KEY(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(80) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `playlistTracks` (
	`playlistId` int NOT NULL,
	`trackId` varchar(32) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `playlists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text,
	`coverUrl` text,
	`status` varchar(16) NOT NULL DEFAULT 'published',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `playlists_id` PRIMARY KEY(`id`),
	CONSTRAINT `playlists_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
ALTER TABLE `tracks` ADD `album` varchar(160);--> statement-breakpoint
ALTER TABLE `tracks` ADD `description` text;--> statement-breakpoint
ALTER TABLE `tracks` ADD `coverUrl` text;--> statement-breakpoint
ALTER TABLE `tracks` ADD `language` varchar(40);--> statement-breakpoint
ALTER TABLE `tracks` ADD `releaseYear` int;--> statement-breakpoint
ALTER TABLE `tracks` ADD `status` varchar(16) DEFAULT 'published' NOT NULL;--> statement-breakpoint
ALTER TABLE `tracks` ADD `playCount` int DEFAULT 0 NOT NULL;