-- Migration: Add issuer_id foreign key to assertions table
-- This migration adds the issuer_id column to the assertions table to support
-- direct issuer relationships for Open Badges v3.0 compliance

-- Add issuer_id column as nullable UUID
ALTER TABLE "assertions" 
  ADD COLUMN "issuer_id" uuid;

-- Add foreign key constraint to issuers table
ALTER TABLE "assertions" 
  ADD CONSTRAINT "assertions_issuer_id_issuers_id_fk" 
  FOREIGN KEY ("issuer_id") REFERENCES "public"."issuers"("id") 
  ON DELETE cascade ON UPDATE no action;

-- Create index on issuer_id for performance
CREATE INDEX IF NOT EXISTS "assertion_issuer_idx" ON "assertions" USING btree ("issuer_id");
