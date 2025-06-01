-- Migration: Add issuer_id foreign key to assertions table (SQLite)
-- This migration adds the issuer_id column to the assertions table to support
-- direct issuer relationships for Open Badges v3.0 compliance
-- Since SQLite doesn't support adding foreign key constraints via ALTER TABLE,
-- we need to recreate the table with the proper foreign key constraint.

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Start a transaction for safety
BEGIN;

-- Step 1: Create a new assertions table with the issuer_id column and foreign key constraint
CREATE TABLE "assertions_new" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "badge_class_id" TEXT NOT NULL,
  "issuer_id" TEXT,
  "recipient" TEXT NOT NULL,
  "issued_on" INTEGER NOT NULL,
  "expires" INTEGER,
  "evidence" TEXT,
  "verification" TEXT,
  "revoked" INTEGER,
  "revocation_reason" TEXT,
  "created_at" INTEGER NOT NULL,
  "updated_at" INTEGER NOT NULL,
  "additional_fields" TEXT,
  -- Foreign key constraints
  FOREIGN KEY ("badge_class_id") REFERENCES "badge_classes"("id") ON DELETE CASCADE,
  FOREIGN KEY ("issuer_id") REFERENCES "issuers"("id") ON DELETE CASCADE
);

-- Step 2: Copy existing data from the old table to the new table
-- Note: issuer_id will be NULL for existing records and populated by a subsequent migration
INSERT INTO "assertions_new" (
  "id", "badge_class_id", "issuer_id", "recipient", "issued_on", "expires", 
  "evidence", "verification", "revoked", "revocation_reason", 
  "created_at", "updated_at", "additional_fields"
)
SELECT 
  "id", "badge_class_id", NULL as "issuer_id", "recipient", "issued_on", "expires",
  "evidence", "verification", "revoked", "revocation_reason",
  "created_at", "updated_at", "additional_fields"
FROM "assertions";

-- Step 3: Drop the old table
DROP TABLE "assertions";

-- Step 4: Rename the new table to the original name
ALTER TABLE "assertions_new" RENAME TO "assertions";

-- Step 5: Recreate indexes for performance
CREATE INDEX IF NOT EXISTS "assertion_badge_class_idx" ON "assertions" ("badge_class_id");
CREATE INDEX IF NOT EXISTS "assertion_issuer_idx" ON "assertions" ("issuer_id");
CREATE INDEX IF NOT EXISTS "assertion_issued_on_idx" ON "assertions" ("issued_on");
CREATE INDEX IF NOT EXISTS "assertion_revoked_idx" ON "assertions" ("revoked");
CREATE INDEX IF NOT EXISTS "assertion_expires_idx" ON "assertions" ("expires");

-- Commit the transaction
COMMIT;

-- Verify the migration by checking the table structure
-- This will show the new table structure with foreign key constraints
PRAGMA table_info(assertions);
