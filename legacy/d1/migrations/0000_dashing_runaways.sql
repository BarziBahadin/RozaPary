CREATE TABLE `events` (
	`slug` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `opens` (
	`event_slug` text NOT NULL,
	`guest_token` text NOT NULL,
	`opened_at` text NOT NULL,
	PRIMARY KEY(`event_slug`, `guest_token`),
	FOREIGN KEY (`event_slug`) REFERENCES `events`(`slug`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`hits` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `responses` (
	`id` text PRIMARY KEY NOT NULL,
	`event_slug` text NOT NULL,
	`guest_token` text NOT NULL,
	`name` text NOT NULL,
	`attendance` text NOT NULL,
	`plus_ones` integer DEFAULT 0 NOT NULL,
	`dietary` text DEFAULT '' NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`event_slug`) REFERENCES `events`(`slug`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_responses_event` ON `responses` (`event_slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_responses_guest` ON `responses` (`event_slug`,`guest_token`);