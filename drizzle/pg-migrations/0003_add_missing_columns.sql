-- Migration to add missing columns to existing PostgreSQL tables
-- This migration adds columns that exist in SQLite but are missing from PostgreSQL

-- Add missing columns to issuers table
DO $$ 
BEGIN
    -- Add email column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'issuers' AND column_name = 'email') THEN
        ALTER TABLE "issuers" ADD COLUMN "email" text;
    END IF;
    
    -- Add description column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'issuers' AND column_name = 'description') THEN
        ALTER TABLE "issuers" ADD COLUMN "description" text;
    END IF;
    
    -- Add image column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'issuers' AND column_name = 'image') THEN
        ALTER TABLE "issuers" ADD COLUMN "image" text;
    END IF;
    
    -- Add public_key column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'issuers' AND column_name = 'public_key') THEN
        ALTER TABLE "issuers" ADD COLUMN "public_key" text;
    END IF;
    
    -- Add additional_fields column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'issuers' AND column_name = 'additional_fields') THEN
        ALTER TABLE "issuers" ADD COLUMN "additional_fields" jsonb;
    END IF;
END $$;

-- Add missing columns to badge_classes table
DO $$ 
BEGIN
    -- Add description column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'badge_classes' AND column_name = 'description') THEN
        ALTER TABLE "badge_classes" ADD COLUMN "description" text NOT NULL DEFAULT '';
    END IF;
    
    -- Add image column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'badge_classes' AND column_name = 'image') THEN
        ALTER TABLE "badge_classes" ADD COLUMN "image" text NOT NULL DEFAULT '';
    END IF;
    
    -- Add criteria column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'badge_classes' AND column_name = 'criteria') THEN
        ALTER TABLE "badge_classes" ADD COLUMN "criteria" text NOT NULL DEFAULT '';
    END IF;
    
    -- Add alignment column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'badge_classes' AND column_name = 'alignment') THEN
        ALTER TABLE "badge_classes" ADD COLUMN "alignment" text;
    END IF;
    
    -- Add tags column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'badge_classes' AND column_name = 'tags') THEN
        ALTER TABLE "badge_classes" ADD COLUMN "tags" text;
    END IF;
    
    -- Add additional_fields column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'badge_classes' AND column_name = 'additional_fields') THEN
        ALTER TABLE "badge_classes" ADD COLUMN "additional_fields" jsonb;
    END IF;
END $$;

-- Add missing columns to assertions table
DO $$ 
BEGIN
    -- Add issuer_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'assertions'
          AND column_name = 'issuer_id'
    ) THEN
        ALTER TABLE "assertions" ADD COLUMN "issuer_id" uuid;
    END IF;
    
    -- Add expires column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'assertions'
          AND column_name = 'expires'
    ) THEN
        ALTER TABLE "assertions" ADD COLUMN "expires" timestamp;
    END IF;
    
    -- Add evidence column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'assertions'
          AND column_name = 'evidence'
    ) THEN
        ALTER TABLE "assertions" ADD COLUMN "evidence" jsonb;
    END IF;
    
    -- Add verification column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'assertions'
          AND column_name = 'verification'
    ) THEN
        ALTER TABLE "assertions" ADD COLUMN "verification" jsonb;
    END IF;
    
    -- Add revoked column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'assertions'
          AND column_name = 'revoked'
    ) THEN
        ALTER TABLE "assertions"
          ADD COLUMN "revoked" boolean DEFAULT false NOT NULL;
    END IF;
    
    -- Add revocation_reason column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'assertions'
          AND column_name = 'revocation_reason'
    ) THEN
        ALTER TABLE "assertions" ADD COLUMN "revocation_reason" text;
    END IF;
    
    -- Add additional_fields column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'assertions'
          AND column_name = 'additional_fields'
    ) THEN
        ALTER TABLE "assertions" ADD COLUMN "additional_fields" jsonb;
    END IF;
END $$;

-- Add missing columns to api_keys table
DO $$ 
BEGIN
    -- Add revoked column if it doesn't exist (should be boolean, not jsonb)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'revoked') THEN
        ALTER TABLE "api_keys" ADD COLUMN "revoked" boolean DEFAULT false NOT NULL;
    END IF;
END $$;

-- Add foreign key constraints if they don't exist
DO $$ 
BEGIN
    -- Add issuer_id foreign key constraint for assertions table
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'assertions_issuer_id_issuers_id_fk') THEN
        ALTER TABLE "assertions" 
        ADD CONSTRAINT "assertions_issuer_id_issuers_id_fk" 
        FOREIGN KEY ("issuer_id") REFERENCES "public"."issuers"("id") 
        ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;

-- Add missing indexes
DO $$ 
BEGIN
    -- Add issuer_id index for assertions table
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'assertion_issuer_idx') THEN
        CREATE INDEX "assertion_issuer_idx" ON "assertions" USING btree ("issuer_id");
    END IF;
    
    -- Add expires index for assertions table
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'assertion_expires_idx') THEN
        CREATE INDEX "assertion_expires_idx" ON "assertions" USING btree ("expires");
    END IF;
    
    -- Add revoked index for assertions table
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'assertion_revoked_idx') THEN
        CREATE INDEX "assertion_revoked_idx" ON "assertions" USING btree ("revoked");
    END IF;
    
    -- Add email index for issuers table
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'issuer_email_idx') THEN
        CREATE INDEX "issuer_email_idx" ON "issuers" USING btree ("email");
    END IF;
END $$;
