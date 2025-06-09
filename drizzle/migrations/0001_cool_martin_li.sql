-- Add achievement versioning fields to badge_classes table
ALTER TABLE `badge_classes` ADD `version` text;--> statement-breakpoint
ALTER TABLE `badge_classes` ADD `previous_version` text REFERENCES badge_classes(id);--> statement-breakpoint
ALTER TABLE `badge_classes` ADD `related` text;--> statement-breakpoint
ALTER TABLE `badge_classes` ADD `endorsement` text;--> statement-breakpoint
CREATE INDEX `badge_class_version_idx` ON `badge_classes` (`version`);--> statement-breakpoint
CREATE INDEX `badge_class_previous_version_idx` ON `badge_classes` (`previous_version`);--> statement-breakpoint
CREATE INDEX `badge_class_issuer_version_idx` ON `badge_classes` (`issuer_id`,`version`);--> statement-breakpoint
CREATE INDEX `badge_class_related_idx` ON `badge_classes` (`related`);--> statement-breakpoint
CREATE INDEX `badge_class_endorsement_idx` ON `badge_classes` (`endorsement`);