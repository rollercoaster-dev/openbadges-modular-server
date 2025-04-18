CREATE TABLE `assertions` (
	`id` text PRIMARY KEY NOT NULL,
	`badge_class_id` text NOT NULL,
	`recipient` text NOT NULL,
	`issued_on` integer NOT NULL,
	`expires` integer,
	`evidence` text,
	`verification` text,
	`revoked` integer,
	`revocation_reason` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`additional_fields` text,
	FOREIGN KEY (`badge_class_id`) REFERENCES `badge_classes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `assertion_badge_class_idx` ON `assertions` (`badge_class_id`);--> statement-breakpoint
CREATE INDEX `assertion_issued_on_idx` ON `assertions` (`issued_on`);--> statement-breakpoint
CREATE INDEX `assertion_revoked_idx` ON `assertions` (`revoked`);--> statement-breakpoint
CREATE INDEX `assertion_expires_idx` ON `assertions` (`expires`);--> statement-breakpoint
CREATE TABLE `badge_classes` (
	`id` text PRIMARY KEY NOT NULL,
	`issuer_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`image` text NOT NULL,
	`criteria` text NOT NULL,
	`alignment` text,
	`tags` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`additional_fields` text,
	FOREIGN KEY (`issuer_id`) REFERENCES `issuers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `badge_class_issuer_idx` ON `badge_classes` (`issuer_id`);--> statement-breakpoint
CREATE INDEX `badge_class_name_idx` ON `badge_classes` (`name`);--> statement-breakpoint
CREATE INDEX `badge_class_created_at_idx` ON `badge_classes` (`created_at`);--> statement-breakpoint
CREATE TABLE `issuers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`email` text,
	`description` text,
	`image` text,
	`public_key` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`additional_fields` text
);
--> statement-breakpoint
CREATE INDEX `issuer_name_idx` ON `issuers` (`name`);--> statement-breakpoint
CREATE INDEX `issuer_url_idx` ON `issuers` (`url`);--> statement-breakpoint
CREATE INDEX `issuer_email_idx` ON `issuers` (`email`);--> statement-breakpoint
CREATE INDEX `issuer_created_at_idx` ON `issuers` (`created_at`);