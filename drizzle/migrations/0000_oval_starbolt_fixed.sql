-- Create users table first to avoid circular references
CREATE TABLE `users` (
  `id` text PRIMARY KEY NOT NULL,
  `username` text NOT NULL,
  `email` text NOT NULL,
  `password_hash` text,
  `first_name` text,
  `last_name` text,
  `roles` text DEFAULT '[]' NOT NULL,
  `permissions` text DEFAULT '[]' NOT NULL,
  `is_active` integer DEFAULT 1 NOT NULL,
  `last_login` integer,
  `metadata` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `user_username_idx` ON `users` (`username`);--> statement-breakpoint
CREATE INDEX `user_email_idx` ON `users` (`email`);--> statement-breakpoint

-- Create roles table
CREATE TABLE `roles` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `description` text,
  `permissions` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roles_name_unique` ON `roles` (`name`);--> statement-breakpoint
CREATE INDEX `role_name_idx` ON `roles` (`name`);--> statement-breakpoint

-- Create API keys table
CREATE TABLE `api_keys` (
  `id` text PRIMARY KEY NOT NULL,
  `key` text NOT NULL,
  `name` text NOT NULL,
  `user_id` text NOT NULL,
  `description` text,
  `permissions` text NOT NULL,
  `revoked` integer DEFAULT 0 NOT NULL,
  `revoked_at` integer,
  `last_used` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_key_unique` ON `api_keys` (`key`);--> statement-breakpoint
CREATE INDEX `api_key_key_idx` ON `api_keys` (`key`);--> statement-breakpoint
CREATE INDEX `api_key_user_id_idx` ON `api_keys` (`user_id`);--> statement-breakpoint
CREATE INDEX `api_key_revoked_idx` ON `api_keys` (`revoked`);--> statement-breakpoint

-- Create issuers table
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
CREATE INDEX `issuer_created_at_idx` ON `issuers` (`created_at`);--> statement-breakpoint

-- Create badge classes table
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
  FOREIGN KEY (`issuer_id`) REFERENCES `issuers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `badge_class_issuer_idx` ON `badge_classes` (`issuer_id`);--> statement-breakpoint
CREATE INDEX `badge_class_name_idx` ON `badge_classes` (`name`);--> statement-breakpoint
CREATE INDEX `badge_class_created_at_idx` ON `badge_classes` (`created_at`);--> statement-breakpoint

-- Create assertions table
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
  FOREIGN KEY (`badge_class_id`) REFERENCES `badge_classes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `assertion_badge_class_idx` ON `assertions` (`badge_class_id`);--> statement-breakpoint
CREATE INDEX `assertion_issued_on_idx` ON `assertions` (`issued_on`);--> statement-breakpoint
CREATE INDEX `assertion_revoked_idx` ON `assertions` (`revoked`);--> statement-breakpoint
CREATE INDEX `assertion_expires_idx` ON `assertions` (`expires`);--> statement-breakpoint

-- Create platforms table
CREATE TABLE `platforms` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `description` text,
  `client_id` text NOT NULL,
  `public_key` text NOT NULL,
  `webhook_url` text,
  `status` text DEFAULT 'active' NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `platforms_name_unique` ON `platforms` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `platforms_client_id_unique` ON `platforms` (`client_id`);--> statement-breakpoint
CREATE INDEX `platform_name_idx` ON `platforms` (`name`);--> statement-breakpoint
CREATE INDEX `platform_client_id_idx` ON `platforms` (`client_id`);--> statement-breakpoint

-- Create platform users table
CREATE TABLE `platform_users` (
  `id` text PRIMARY KEY NOT NULL,
  `platform_id` text NOT NULL,
  `external_user_id` text NOT NULL,
  `display_name` text,
  `email` text,
  `metadata` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`platform_id`) REFERENCES `platforms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `platform_user_idx` ON `platform_users` (`platform_id`,`external_user_id`);--> statement-breakpoint
CREATE INDEX `platform_user_email_idx` ON `platform_users` (`email`);--> statement-breakpoint

-- Create user roles table
CREATE TABLE `user_roles` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `role_id` text NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_role_user_id_idx` ON `user_roles` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_role_role_id_idx` ON `user_roles` (`role_id`);--> statement-breakpoint
CREATE INDEX `user_role_user_id_role_id_idx` ON `user_roles` (`user_id`,`role_id`);--> statement-breakpoint

-- Create user assertions table
CREATE TABLE `user_assertions` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `assertion_id` text NOT NULL,
  `added_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  `status` text DEFAULT 'active' NOT NULL,
  `metadata` text,
  FOREIGN KEY (`user_id`) REFERENCES `platform_users`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`assertion_id`) REFERENCES `assertions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_assertion_idx` ON `user_assertions` (`user_id`,`assertion_id`);--> statement-breakpoint
CREATE INDEX `user_assertion_added_at_idx` ON `user_assertions` (`added_at`);--> statement-breakpoint
CREATE INDEX `user_assertion_updated_at_idx` ON `user_assertions` (`updated_at`);--> statement-breakpoint
