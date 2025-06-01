-- Migration: Populate issuer_id in assertions table from badge_classes
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

-- Verify that all assertions now have issuer_id populated
-- This query should return 0 if migration was successful
DO $$
DECLARE
    missing_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO missing_count 
    FROM "assertions" 
    WHERE "issuer_id" IS NULL;
    
    IF missing_count > 0 THEN
        RAISE EXCEPTION 'Migration failed: % assertions still missing issuer_id', missing_count;
    END IF;
    
    RAISE NOTICE 'Migration successful: All assertions now have issuer_id populated';
END $$;

-- Optional: Make issuer_id NOT NULL after data population
-- Uncomment the following line if you want to enforce the constraint
-- ALTER TABLE "assertions" ALTER COLUMN "issuer_id" SET NOT NULL;
