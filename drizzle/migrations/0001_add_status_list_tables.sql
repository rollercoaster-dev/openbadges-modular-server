-- Migration: Add StatusList2021 tables for Open Badges v3.0 compliance
-- Created: 2024-01-XX
-- Description: Adds status_lists and credential_status_entries tables to support StatusList2021 specification

-- Create status_lists table
CREATE TABLE IF NOT EXISTS `status_lists` (
	`id` text PRIMARY KEY NOT NULL,
	`issuer_id` text NOT NULL,
	`purpose` text NOT NULL,
	`bitstring` text NOT NULL,
	`size` integer DEFAULT 16384 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`issuer_id`) REFERENCES `issuers`(`id`) ON UPDATE no action ON DELETE cascade
);

-- Create credential_status_entries table
CREATE TABLE IF NOT EXISTS `credential_status_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`credential_id` text NOT NULL,
	`status_list_id` text NOT NULL,
	`status_list_index` integer NOT NULL,
	`status` integer DEFAULT 0 NOT NULL,
	`reason` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`credential_id`) REFERENCES `assertions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`status_list_id`) REFERENCES `status_lists`(`id`) ON UPDATE no action ON DELETE cascade
);

-- Create indexes for status_lists table
CREATE INDEX IF NOT EXISTS `status_list_issuer_idx` ON `status_lists` (`issuer_id`);
CREATE INDEX IF NOT EXISTS `status_list_purpose_idx` ON `status_lists` (`purpose`);
CREATE INDEX IF NOT EXISTS `status_list_issuer_purpose_idx` ON `status_lists` (`issuer_id`,`purpose`);
CREATE INDEX IF NOT EXISTS `status_list_created_at_idx` ON `status_lists` (`created_at`);

-- Create indexes for credential_status_entries table
CREATE UNIQUE INDEX IF NOT EXISTS `credential_status_credential_idx` ON `credential_status_entries` (`credential_id`);
CREATE INDEX IF NOT EXISTS `credential_status_list_idx` ON `credential_status_entries` (`status_list_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `credential_status_list_index_idx` ON `credential_status_entries` (`status_list_id`,`status_list_index`);
CREATE INDEX IF NOT EXISTS `credential_status_status_idx` ON `credential_status_entries` (`status`);
CREATE INDEX IF NOT EXISTS `credential_status_updated_at_idx` ON `credential_status_entries` (`updated_at`);
