-- Migration: Add StatusList2021 tables for Open Badges v3.0 compliance
-- Created: 2024-01-XX
-- Description: Adds status_lists and credential_status_entries tables to support StatusList2021 specification

-- Create status_lists table
CREATE TABLE IF NOT EXISTS "status_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issuer_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"bitstring" text NOT NULL,
	"size" integer DEFAULT 16384 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create credential_status_entries table
CREATE TABLE IF NOT EXISTS "credential_status_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"credential_id" uuid NOT NULL,
	"status_list_id" uuid NOT NULL,
	"status_list_index" integer NOT NULL,
	"status" integer DEFAULT 0 NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "status_lists" ADD CONSTRAINT "status_lists_issuer_id_issuers_id_fk" FOREIGN KEY ("issuer_id") REFERENCES "issuers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "credential_status_entries" ADD CONSTRAINT "credential_status_entries_credential_id_assertions_id_fk" FOREIGN KEY ("credential_id") REFERENCES "assertions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "credential_status_entries" ADD CONSTRAINT "credential_status_entries_status_list_id_status_lists_id_fk" FOREIGN KEY ("status_list_id") REFERENCES "status_lists"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create indexes for status_lists table
CREATE INDEX IF NOT EXISTS "status_list_issuer_idx" ON "status_lists" ("issuer_id");
CREATE INDEX IF NOT EXISTS "status_list_purpose_idx" ON "status_lists" ("purpose");
CREATE INDEX IF NOT EXISTS "status_list_issuer_purpose_idx" ON "status_lists" ("issuer_id","purpose");
CREATE INDEX IF NOT EXISTS "status_list_created_at_idx" ON "status_lists" ("created_at");

-- Create indexes for credential_status_entries table
CREATE INDEX IF NOT EXISTS "credential_status_credential_idx" ON "credential_status_entries" ("credential_id");
CREATE INDEX IF NOT EXISTS "credential_status_list_idx" ON "credential_status_entries" ("status_list_id");
CREATE INDEX IF NOT EXISTS "credential_status_list_index_idx" ON "credential_status_entries" ("status_list_id","status_list_index");
CREATE INDEX IF NOT EXISTS "credential_status_status_idx" ON "credential_status_entries" ("status");
CREATE INDEX IF NOT EXISTS "credential_status_updated_at_idx" ON "credential_status_entries" ("updated_at");
