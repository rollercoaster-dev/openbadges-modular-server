-- Migration: Add issuer_id foreign key to assertions table (SQLite)
-- This migration adds the issuer_id column to the assertions table to support
-- direct issuer relationships for Open Badges v3.0 compliance

-- Add issuer_id column as nullable TEXT
ALTER TABLE "assertions" 
  ADD COLUMN "issuer_id" TEXT;

-- Create index on issuer_id for performance
CREATE INDEX IF NOT EXISTS "assertion_issuer_idx" ON "assertions" ("issuer_id");

-- Note: SQLite foreign key constraints are enforced at runtime if PRAGMA foreign_keys=ON
-- The foreign key constraint is defined in the schema and will be enforced for new tables
