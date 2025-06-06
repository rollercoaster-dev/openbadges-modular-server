-- Migration to add StatusList2021 (Bitstring Status List) support to SQLite
-- This migration adds tables and indexes for managing credential status using bitstring status lists

-- Create status_lists table
CREATE TABLE IF NOT EXISTS "status_lists" (
     "id" text PRIMARY KEY,
     "issuer_id" text NOT NULL,
     "purpose" text NOT NULL,
    "status_size" integer NOT NULL DEFAULT 1,
     "encoded_list" text NOT NULL,
    "ttl" integer,
    "total_entries" integer NOT NULL DEFAULT 131072,
    "used_entries" integer NOT NULL DEFAULT 0,
    "metadata" json,
     "created_at" integer NOT NULL,
     "updated_at" integer NOT NULL,
     FOREIGN KEY ("issuer_id") REFERENCES "issuers"("id") ON DELETE cascade,
     CHECK ("purpose" IN ('revocation', 'suspension', 'refresh', 'message')),
    CHECK ("status_size" IN (1, 2, 4, 8))
 );

-- Create credential_status_entries table
CREATE TABLE IF NOT EXISTS "credential_status_entries" (
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
     FOREIGN KEY ("status_list_id") REFERENCES "status_lists"("id") ON DELETE cascade,
     CHECK ("purpose" IN ('revocation', 'suspension', 'refresh', 'message')),
    CHECK ("status_size" IN (1, 2, 4, 8))
 );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "status_lists_issuer_id_idx" ON "status_lists" ("issuer_id");
CREATE INDEX IF NOT EXISTS "status_lists_purpose_idx" ON "status_lists" ("purpose");
CREATE INDEX IF NOT EXISTS "status_lists_issuer_purpose_idx" ON "status_lists" ("issuer_id", "purpose");

CREATE INDEX IF NOT EXISTS "credential_status_entries_credential_id_idx" ON "credential_status_entries" ("credential_id");
CREATE INDEX IF NOT EXISTS "credential_status_entries_status_list_id_idx" ON "credential_status_entries" ("status_list_id");
CREATE INDEX IF NOT EXISTS "credential_status_entries_status_list_index_idx" ON "credential_status_entries" ("status_list_id", "status_list_index");

-- Create unique index to prevent duplicate entries for the same credential and purpose
CREATE UNIQUE INDEX IF NOT EXISTS "credential_status_entries_credential_purpose_unique" ON "credential_status_entries" ("credential_id", "purpose");
