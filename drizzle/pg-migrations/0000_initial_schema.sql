-- Initial schema migration for PostgreSQL
-- This migration creates the initial tables for the Open Badges API

-- Create issuers table
CREATE TABLE IF NOT EXISTS "issuers" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "email" TEXT,
  "description" TEXT,
  "image" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "public_key" TEXT,
  "additional_properties" JSONB
);

-- Create badge_classes table
CREATE TABLE IF NOT EXISTS "badge_classes" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "issuer_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "image" TEXT NOT NULL,
  "criteria" TEXT NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "tags" TEXT[],
  "alignment" JSONB,
  "additional_properties" JSONB,
  FOREIGN KEY ("issuer_id") REFERENCES "issuers" ("id") ON DELETE CASCADE
);

-- Create assertions table
CREATE TABLE IF NOT EXISTS "assertions" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "badge_class_id" TEXT NOT NULL,
  "recipient" JSONB NOT NULL,
  "issued_on" TIMESTAMP WITH TIME ZONE NOT NULL,
  "expires" TIMESTAMP WITH TIME ZONE,
  "evidence" JSONB,
  "verification" JSONB,
  "revoked" BOOLEAN DEFAULT FALSE,
  "revocation_reason" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "additional_properties" JSONB,
  FOREIGN KEY ("badge_class_id") REFERENCES "badge_classes" ("id") ON DELETE CASCADE
);

-- Create indexes for issuers table
CREATE INDEX IF NOT EXISTS "issuers_name_idx" ON "issuers" ("name");
CREATE INDEX IF NOT EXISTS "issuers_url_idx" ON "issuers" ("url");
CREATE INDEX IF NOT EXISTS "issuers_email_idx" ON "issuers" ("email");
CREATE INDEX IF NOT EXISTS "issuers_created_at_idx" ON "issuers" ("created_at");

-- Create indexes for badge_classes table
CREATE INDEX IF NOT EXISTS "badge_classes_issuer_id_idx" ON "badge_classes" ("issuer_id");
CREATE INDEX IF NOT EXISTS "badge_classes_name_idx" ON "badge_classes" ("name");
CREATE INDEX IF NOT EXISTS "badge_classes_created_at_idx" ON "badge_classes" ("created_at");
CREATE INDEX IF NOT EXISTS "badge_classes_tags_idx" ON "badge_classes" USING GIN ("tags");

-- Create indexes for assertions table
CREATE INDEX IF NOT EXISTS "assertions_badge_class_id_idx" ON "assertions" ("badge_class_id");
CREATE INDEX IF NOT EXISTS "assertions_issued_on_idx" ON "assertions" ("issued_on");
CREATE INDEX IF NOT EXISTS "assertions_expires_idx" ON "assertions" ("expires");
CREATE INDEX IF NOT EXISTS "assertions_revoked_idx" ON "assertions" ("revoked");

-- Create indexes for JSON fields in assertions table
CREATE INDEX IF NOT EXISTS "assertion_recipient_email_idx" ON "assertions" ((recipient->>'email'));
CREATE INDEX IF NOT EXISTS "assertion_recipient_identity_idx" ON "assertions" ((recipient->>'identity'));
CREATE INDEX IF NOT EXISTS "assertion_recipient_type_idx" ON "assertions" ((recipient->>'type'));
