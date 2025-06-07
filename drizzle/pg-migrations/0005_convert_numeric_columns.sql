-- Migration: Convert text columns to appropriate numeric types for better performance and type safety
-- This migration addresses the critical issue of storing numeric values as text in PostgreSQL

-- Convert status_lists table columns from text to numeric types
DO $$ 
BEGIN
    -- Convert status_size from text to smallint
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'status_lists' 
        AND column_name = 'status_size' 
        AND data_type = 'text'
    ) THEN
        -- First, drop the existing check constraint
        IF EXISTS (
            SELECT 1 FROM information_schema.check_constraints 
            WHERE constraint_name = 'status_lists_status_size_check'
        ) THEN
            ALTER TABLE "status_lists" DROP CONSTRAINT "status_lists_status_size_check";
        END IF;
        
        -- Convert the column type
        ALTER TABLE "status_lists" 
        ALTER COLUMN "status_size" TYPE SMALLINT USING "status_size"::SMALLINT;
        
        -- Add new check constraint for numeric values
        ALTER TABLE "status_lists" 
        ADD CONSTRAINT "status_lists_status_size_check" 
        CHECK ("status_size" IN (1, 2, 4, 8));
    END IF;
    
    -- Convert ttl from text to bigint
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'status_lists' 
        AND column_name = 'ttl' 
        AND data_type = 'text'
    ) THEN
        ALTER TABLE "status_lists" 
        ALTER COLUMN "ttl" TYPE BIGINT USING CASE 
            WHEN "ttl" IS NULL OR "ttl" = '' THEN NULL 
            ELSE "ttl"::BIGINT 
        END;
    END IF;
    
    -- Convert total_entries from text to integer
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'status_lists' 
        AND column_name = 'total_entries' 
        AND data_type = 'text'
    ) THEN
        ALTER TABLE "status_lists" 
        ALTER COLUMN "total_entries" TYPE INTEGER USING "total_entries"::INTEGER;
    END IF;
    
    -- Convert used_entries from text to integer
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'status_lists' 
        AND column_name = 'used_entries' 
        AND data_type = 'text'
    ) THEN
        ALTER TABLE "status_lists" 
        ALTER COLUMN "used_entries" TYPE INTEGER USING "used_entries"::INTEGER;
    END IF;
END $$;

-- Convert credential_status_entries table columns from text to numeric types
DO $$ 
BEGIN
    -- Convert status_list_index from text to bigint
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'credential_status_entries' 
        AND column_name = 'status_list_index' 
        AND data_type = 'text'
    ) THEN
        ALTER TABLE "credential_status_entries" 
        ALTER COLUMN "status_list_index" TYPE BIGINT USING "status_list_index"::BIGINT;
    END IF;
    
    -- Convert status_size from text to smallint
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'credential_status_entries' 
        AND column_name = 'status_size' 
        AND data_type = 'text'
    ) THEN
        -- First, drop the existing check constraint
        IF EXISTS (
            SELECT 1 FROM information_schema.check_constraints 
            WHERE constraint_name = 'credential_status_entries_status_size_check'
        ) THEN
            ALTER TABLE "credential_status_entries" DROP CONSTRAINT "credential_status_entries_status_size_check";
        END IF;
        
        -- Convert the column type
        ALTER TABLE "credential_status_entries" 
        ALTER COLUMN "status_size" TYPE SMALLINT USING "status_size"::SMALLINT;
        
        -- Add new check constraint for numeric values
        ALTER TABLE "credential_status_entries" 
        ADD CONSTRAINT "credential_status_entries_status_size_check" 
        CHECK ("status_size" IN (1, 2, 4, 8));
    END IF;
    
    -- Convert current_status from text to smallint
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'credential_status_entries' 
        AND column_name = 'current_status' 
        AND data_type = 'text'
    ) THEN
        ALTER TABLE "credential_status_entries" 
        ALTER COLUMN "current_status" TYPE SMALLINT USING "current_status"::SMALLINT;
    END IF;
END $$;

-- Update column defaults to use numeric values instead of text
DO $$ 
BEGIN
    -- Update status_lists defaults
    ALTER TABLE "status_lists" ALTER COLUMN "status_size" SET DEFAULT 1;
    ALTER TABLE "status_lists" ALTER COLUMN "total_entries" SET DEFAULT 131072;
    ALTER TABLE "status_lists" ALTER COLUMN "used_entries" SET DEFAULT 0;
    
    -- Update credential_status_entries defaults
    ALTER TABLE "credential_status_entries" ALTER COLUMN "status_size" SET DEFAULT 1;
    ALTER TABLE "credential_status_entries" ALTER COLUMN "current_status" SET DEFAULT 0;
END $$;

-- Add comments to document the changes
DO $$ 
BEGIN
    -- Update column comments for status_lists
    COMMENT ON COLUMN "status_lists"."status_size" IS 'Size of each status entry in bits (1, 2, 4, or 8) - stored as SMALLINT for performance';
    COMMENT ON COLUMN "status_lists"."ttl" IS 'Time-to-live in milliseconds - stored as BIGINT for large values';
    COMMENT ON COLUMN "status_lists"."total_entries" IS 'Total number of entries in the bitstring (minimum 131,072) - stored as INTEGER for performance';
    COMMENT ON COLUMN "status_lists"."used_entries" IS 'Number of currently used entries - stored as INTEGER for performance';
    
    -- Update column comments for credential_status_entries
    COMMENT ON COLUMN "credential_status_entries"."status_list_index" IS 'Position in the bitstring (0-based index) - stored as BIGINT for large values';
    COMMENT ON COLUMN "credential_status_entries"."status_size" IS 'Size of each status entry in bits (1, 2, 4, or 8) - stored as SMALLINT for performance';
    COMMENT ON COLUMN "credential_status_entries"."current_status" IS 'Current status value (0 = unset, 1+ = set) - stored as SMALLINT for performance';
END $$;

-- Add performance-oriented indexes on numeric columns
DO $$ 
BEGIN
    -- Add index on status_lists.total_entries for capacity queries
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'status_lists_total_entries_idx'
    ) THEN
        CREATE INDEX "status_lists_total_entries_idx" ON "status_lists" ("total_entries");
    END IF;
    
    -- Add index on status_lists.used_entries for capacity queries
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'status_lists_used_entries_idx'
    ) THEN
        CREATE INDEX "status_lists_used_entries_idx" ON "status_lists" ("used_entries");
    END IF;
    
    -- Add index on credential_status_entries.current_status for status queries
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'credential_status_entries_current_status_idx'
    ) THEN
        CREATE INDEX "credential_status_entries_current_status_idx" ON "credential_status_entries" ("current_status");
    END IF;
END $$;
