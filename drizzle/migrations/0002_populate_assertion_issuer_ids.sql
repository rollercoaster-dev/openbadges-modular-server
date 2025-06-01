-- Migration: Populate issuer_id in assertions table from badge_classes (SQLite)
-- This migration populates the new issuer_id field by joining with badge_classes
-- to establish direct issuer relationships for existing assertions

-- Update assertions.issuer_id by joining with badge_classes.issuer_id
UPDATE "assertions" 
SET "issuer_id" = (
  SELECT bc."issuer_id" 
  FROM "badge_classes" bc 
  WHERE bc."id" = "assertions"."badge_class_id"
)
WHERE "issuer_id" IS NULL;

-- Verify migration success by checking for any remaining NULL issuer_id values
-- Note: SQLite doesn't support DO blocks, so we'll rely on application-level validation
