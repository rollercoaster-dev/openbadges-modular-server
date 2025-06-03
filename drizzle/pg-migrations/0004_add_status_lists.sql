-- Migration to add StatusList2021 (Bitstring Status List) support to PostgreSQL
-- This migration adds tables and indexes for managing credential status using bitstring status lists

-- Create status_lists table
DO $$ 
BEGIN
    -- Create status_lists table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'status_lists') THEN
        CREATE TABLE "status_lists" (
            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "issuer_id" uuid NOT NULL,
            "purpose" text NOT NULL,
            "status_size" text NOT NULL DEFAULT '1',
            "encoded_list" text NOT NULL,
            "ttl" text,
            "total_entries" text NOT NULL DEFAULT '131072',
            "used_entries" text NOT NULL DEFAULT '0',
            "metadata" jsonb,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL
        );
    END IF;
END $$;

-- Create credential_status_entries table
DO $$ 
BEGIN
    -- Create credential_status_entries table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'credential_status_entries') THEN
        CREATE TABLE "credential_status_entries" (
            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            "credential_id" uuid NOT NULL,
            "status_list_id" uuid NOT NULL,
            "status_list_index" text NOT NULL,
            "status_size" text NOT NULL DEFAULT '1',
            "purpose" text NOT NULL,
            "current_status" text NOT NULL DEFAULT '0',
            "status_reason" text,
            "created_at" timestamp DEFAULT now() NOT NULL,
            "updated_at" timestamp DEFAULT now() NOT NULL
        );
    END IF;
END $$;

-- Add foreign key constraints
DO $$ 
BEGIN
    -- Add foreign key constraint from status_lists to issuers
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'status_lists_issuer_id_issuers_id_fk') THEN
        ALTER TABLE "status_lists" 
        ADD CONSTRAINT "status_lists_issuer_id_issuers_id_fk" 
        FOREIGN KEY ("issuer_id") REFERENCES "public"."issuers"("id") 
        ON DELETE cascade ON UPDATE no action;
    END IF;
    
    -- Add foreign key constraint from credential_status_entries to assertions
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'credential_status_entries_credential_id_assertions_id_fk') THEN
        ALTER TABLE "credential_status_entries" 
        ADD CONSTRAINT "credential_status_entries_credential_id_assertions_id_fk" 
        FOREIGN KEY ("credential_id") REFERENCES "public"."assertions"("id") 
        ON DELETE cascade ON UPDATE no action;
    END IF;
    
    -- Add foreign key constraint from credential_status_entries to status_lists
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'credential_status_entries_status_list_id_status_lists_id_fk') THEN
        ALTER TABLE "credential_status_entries" 
        ADD CONSTRAINT "credential_status_entries_status_list_id_status_lists_id_fk" 
        FOREIGN KEY ("status_list_id") REFERENCES "public"."status_lists"("id") 
        ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;

-- Add indexes for performance
DO $$ 
BEGIN
    -- Add issuer_id index for status_lists table
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'status_lists_issuer_id_idx') THEN
        CREATE INDEX "status_lists_issuer_id_idx" ON "status_lists" USING btree ("issuer_id");
    END IF;
    
    -- Add purpose index for status_lists table
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'status_lists_purpose_idx') THEN
        CREATE INDEX "status_lists_purpose_idx" ON "status_lists" USING btree ("purpose");
    END IF;
    
    -- Add composite index for issuer_id and purpose
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'status_lists_issuer_purpose_idx') THEN
        CREATE INDEX "status_lists_issuer_purpose_idx" ON "status_lists" USING btree ("issuer_id", "purpose");
    END IF;
    
    -- Add credential_id index for credential_status_entries table
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'credential_status_entries_credential_id_idx') THEN
        CREATE INDEX "credential_status_entries_credential_id_idx" ON "credential_status_entries" USING btree ("credential_id");
    END IF;
    
    -- Add status_list_id index for credential_status_entries table
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'credential_status_entries_status_list_id_idx') THEN
        CREATE INDEX "credential_status_entries_status_list_id_idx" ON "credential_status_entries" USING btree ("status_list_id");
    END IF;
    
    -- Add composite index for status_list_id and status_list_index
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'credential_status_entries_status_list_index_idx') THEN
        CREATE INDEX "credential_status_entries_status_list_index_idx" ON "credential_status_entries" USING btree ("status_list_id", "status_list_index");
    END IF;
    
    -- Add unique index to prevent duplicate entries for the same credential and purpose
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'credential_status_entries_credential_purpose_unique') THEN
        CREATE UNIQUE INDEX "credential_status_entries_credential_purpose_unique" ON "credential_status_entries" USING btree ("credential_id", "purpose");
    END IF;
END $$;

-- Add check constraints for data validation
DO $$ 
BEGIN
    -- Add check constraint for valid status purposes
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'status_lists_purpose_check') THEN
        ALTER TABLE "status_lists" 
        ADD CONSTRAINT "status_lists_purpose_check" 
        CHECK ("purpose" IN ('revocation', 'suspension', 'refresh', 'message'));
    END IF;
    
    -- Add check constraint for valid status sizes
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'status_lists_status_size_check') THEN
        ALTER TABLE "status_lists" 
        ADD CONSTRAINT "status_lists_status_size_check" 
        CHECK ("status_size" IN ('1', '2', '4', '8'));
    END IF;
    
    -- Add check constraint for credential_status_entries purpose
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'credential_status_entries_purpose_check') THEN
        ALTER TABLE "credential_status_entries" 
        ADD CONSTRAINT "credential_status_entries_purpose_check" 
        CHECK ("purpose" IN ('revocation', 'suspension', 'refresh', 'message'));
    END IF;
    
    -- Add check constraint for credential_status_entries status size
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'credential_status_entries_status_size_check') THEN
        ALTER TABLE "credential_status_entries" 
        ADD CONSTRAINT "credential_status_entries_status_size_check" 
        CHECK ("status_size" IN ('1', '2', '4', '8'));
    END IF;
END $$;

-- Add comments for documentation
DO $$ 
BEGIN
    -- Add table comments
    COMMENT ON TABLE "status_lists" IS 'Bitstring Status Lists for managing credential status according to W3C Bitstring Status List v1.0 specification';
    COMMENT ON TABLE "credential_status_entries" IS 'Individual credential status entries that reference positions in status lists';
    
    -- Add column comments for status_lists
    COMMENT ON COLUMN "status_lists"."purpose" IS 'Status purpose: revocation, suspension, refresh, or message';
    COMMENT ON COLUMN "status_lists"."status_size" IS 'Size of each status entry in bits (1, 2, 4, or 8)';
    COMMENT ON COLUMN "status_lists"."encoded_list" IS 'GZIP-compressed, base64url-encoded bitstring';
    COMMENT ON COLUMN "status_lists"."ttl" IS 'Time-to-live in milliseconds';
    COMMENT ON COLUMN "status_lists"."total_entries" IS 'Total number of entries in the bitstring (minimum 131,072)';
    COMMENT ON COLUMN "status_lists"."used_entries" IS 'Number of currently used entries';
    
    -- Add column comments for credential_status_entries
    COMMENT ON COLUMN "credential_status_entries"."status_list_index" IS 'Position in the bitstring (0-based index)';
    COMMENT ON COLUMN "credential_status_entries"."current_status" IS 'Current status value (0 = unset, 1+ = set)';
    COMMENT ON COLUMN "credential_status_entries"."status_reason" IS 'Human-readable reason for the current status';
END $$;
