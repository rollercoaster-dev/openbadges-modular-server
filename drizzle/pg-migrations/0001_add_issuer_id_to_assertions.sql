-- Migration: Add issuer_id foreign key to assertions table
-- This migration adds the issuer_id column to the assertions table to support
-- direct issuer relationships for Open Badges v3.0 compliance

-- Add issuer_id column as nullable UUID (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'assertions' AND column_name = 'issuer_id'
    ) THEN
        ALTER TABLE "assertions" ADD COLUMN "issuer_id" uuid;
    END IF;
END $$;

-- Add foreign key constraint to issuers table (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'assertions_issuer_id_issuers_id_fk'
    ) THEN
        ALTER TABLE "assertions"
          ADD CONSTRAINT "assertions_issuer_id_issuers_id_fk"
          FOREIGN KEY ("issuer_id") REFERENCES "public"."issuers"("id")
          ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;

-- Create index on issuer_id for performance (only if it doesn't exist)
CREATE INDEX IF NOT EXISTS "assertion_issuer_idx" ON "assertions" USING btree ("issuer_id");
