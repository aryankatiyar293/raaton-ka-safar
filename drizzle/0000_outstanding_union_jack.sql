CREATE TABLE `listenerPreferences` (
	`visitorKey` varchar(64) NOT NULL,
	`currentTrackId` varchar(32) NOT NULL DEFAULT '01',
	`favoriteTrackIds` text NOT NULL DEFAULT ('[]'),
	`volume` int NOT NULL DEFAULT 72,
	`muted` int NOT NULL DEFAULT 0,
	`repeatMode` varchar(8) NOT NULL DEFAULT 'off',
	`shuffleEnabled` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `listenerPreferences_visitorKey` PRIMARY KEY(`visitorKey`)
);
--> statement-breakpoint
CREATE TABLE `tracks` (
	`id` varchar(32) NOT NULL,
	`title` varchar(160) NOT NULL,
	`artist` varchar(160) NOT NULL,
	`duration` varchar(12) NOT NULL,
	`audio` text NOT NULL,
	`category` varchar(40) NOT NULL,
	`palette` varchar(16) NOT NULL,
	`note` varchar(160) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tracks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
