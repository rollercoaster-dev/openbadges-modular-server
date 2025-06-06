-- Migration: Convert text columns to appropriate numeric types for better performance and type safety
-- This migration addresses the critical issue of storing numeric values as text in SQLite
-- Note: SQLite stores all data as text internally but performs automatic type conversion

-- For SQLite, we need to recreate tables to change column types
-- This is done safely by creating new tables, copying data, and renaming

-- Create new status_lists table with numeric types
CREATE TABLE IF NOT EXISTS "status_lists_new" (
    "id" text PRIMARY KEY,
    "issuer_id" text NOT NULL,
    "purpose" text NOT NULL,
    "status_size" integer NOT NULL DEFAULT 1,
    "encoded_list" text NOT NULL,
    "ttl" integer,
    "total_entries" integer NOT NULL DEFAULT 131072,
    "used_entries" integer NOT NULL DEFAULT 0,
    "metadata" text,
    "created_at" integer NOT NULL,
    "updated_at" integer NOT NULL,
    FOREIGN KEY ("issuer_id") REFERENCES "issuers"("id") ON DELETE cascade,
    CHECK ("purpose" IN ('revocation', 'suspension', 'refresh', 'message')),
    CHECK ("status_size" IN (1, 2, 4, 8))
);

-- Copy data from old table to new table, converting text to numeric
INSERT INTO "status_lists_new" (
    "id", "issuer_id", "purpose", "status_size", "encoded_list", 
    "ttl", "total_entries", "used_entries", "metadata", "created_at", "updated_at"
)
SELECT 
    "id", 
    "issuer_id", 
    "purpose", 
    CAST("status_size" AS INTEGER), 
    "encoded_list",
    CASE WHEN "ttl" IS NULL OR "ttl" = '' THEN NULL ELSE CAST("ttl" AS INTEGER) END,
    CAST("total_entries" AS INTEGER),
    CAST("used_entries" AS INTEGER),
    "metadata",
    "created_at",
    "updated_at"
FROM "status_lists"
WHERE EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='status_lists');

-- Create new credential_status_entries table with numeric types
CREATE TABLE IF NOT EXISTS "credential_status_entries_new" (
    "id" text PRIMARY KEY,
    "credential_id" text NOT NULL,
    "status_list_id" text NOT NULL,
    "status_list_index" integer NOT NULL,
    "status_size" integer NOT NULL DEFAULT 1,
    "purpose" text NOT NULL,
    "current_status" integer NOT NULL DEFAULT 0,
    "status_reason" text,
    "created_at" integer NOT NULL,
    "updated_at" integer NOT NULL,
    FOREIGN KEY ("credential_id") REFERENCES "assertions"("id") ON DELETE cascade,
    FOREIGN KEY ("status_list_id") REFERENCES "status_lists_new"("id") ON DELETE cascade,
    CHECK ("purpose" IN ('revocation', 'suspension', 'refresh', 'message')),
    CHECK ("status_size" IN (1, 2, 4, 8))
);

-- Copy data from old table to new table, converting text to numeric
INSERT INTO "credential_status_entries_new" (
    "id", "credential_id", "status_list_id", "status_list_index", 
    "status_size", "purpose", "current_status", "status_reason", 
    "created_at", "updated_at"
)
SELECT 
    "id", 
    "credential_id", 
    "status_list_id", 
    CAST("status_list_index" AS INTEGER),
    CAST("status_size" AS INTEGER),
    "purpose",
    CAST("current_status" AS INTEGER),
    "status_reason",
    "created_at",
    "updated_at"
FROM "credential_status_entries"
WHERE EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='credential_status_entries');

-- Drop old tables if they exist
DROP TABLE IF EXISTS "credential_status_entries";
DROP TABLE IF EXISTS "status_lists";

-- Rename new tables to original names
ALTER TABLE "status_lists_new" RENAME TO "status_lists";
ALTER TABLE "credential_status_entries_new" RENAME TO "credential_status_entries";

-- Recreate indexes for status_lists
CREATE INDEX IF NOT EXISTS "status_lists_issuer_id_idx" ON "status_lists" ("issuer_id");
CREATE INDEX IF NOT EXISTS "status_lists_purpose_idx" ON "status_lists" ("purpose");
CREATE INDEX IF NOT EXISTS "status_lists_issuer_purpose_idx" ON "status_lists" ("issuer_id", "purpose");

-- Add performance-oriented indexes on numeric columns
CREATE INDEX IF NOT EXISTS "status_lists_total_entries_idx" ON "status_lists" ("total_entries");
CREATE INDEX IF NOT EXISTS "status_lists_used_entries_idx" ON "status_lists" ("used_entries");

-- Recreate indexes for credential_status_entries
CREATE INDEX IF NOT EXISTS "credential_status_entries_credential_id_idx" ON "credential_status_entries" ("credential_id");
CREATE INDEX IF NOT EXISTS "credential_status_entries_status_list_id_idx" ON "credential_status_entries" ("status_list_id");
CREATE INDEX IF NOT EXISTS "credential_status_entries_status_list_index_idx" ON "credential_status_entries" ("status_list_id", "status_list_index");
CREATE INDEX IF NOT EXISTS "credential_status_entries_credential_purpose_unique" ON "credential_status_entries" ("credential_id", "purpose");

-- Add performance-oriented index on current_status
CREATE INDEX IF NOT EXISTS "credential_status_entries_current_status_idx" ON "credential_status_entries" ("current_status");
