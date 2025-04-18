-- Initial schema migration for SQLite
-- This migration creates the initial tables for the Open Badges API

-- Create issuers table
CREATE TABLE IF NOT EXISTS "issuers" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "url" text NOT NULL,
  "email" text,
  "description" text,
  "image" text,
  "created_at" text DEFAULT (datetime('now')),
  "updated_at" text DEFAULT (datetime('now')),
  "public_key" text,
  "additional_properties" text
);

-- Create badge_classes table
CREATE TABLE IF NOT EXISTS "badge_classes" (
  "id" text PRIMARY KEY NOT NULL,
  "issuer_id" text NOT NULL,
  "name" text NOT NULL,
  "description" text NOT NULL,
  "image" text NOT NULL,
  "criteria" text NOT NULL,
  "created_at" text DEFAULT (datetime('now')),
  "updated_at" text DEFAULT (datetime('now')),
  "tags" text,
  "alignment" text,
  "additional_properties" text,
  FOREIGN KEY ("issuer_id") REFERENCES "issuers" ("id") ON DELETE CASCADE
);

-- Create assertions table
CREATE TABLE IF NOT EXISTS "assertions" (
  "id" text PRIMARY KEY NOT NULL,
  "badge_class_id" text NOT NULL,
  "recipient" text NOT NULL,
  "issued_on" text NOT NULL,
  "expires" text,
  "evidence" text,
  "verification" text,
  "revoked" integer DEFAULT 0,
  "revocation_reason" text,
  "created_at" text DEFAULT (datetime('now')),
  "updated_at" text DEFAULT (datetime('now')),
  "additional_properties" text,
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

-- Create indexes for assertions table
CREATE INDEX IF NOT EXISTS "assertions_badge_class_id_idx" ON "assertions" ("badge_class_id");
CREATE INDEX IF NOT EXISTS "assertions_issued_on_idx" ON "assertions" ("issued_on");
CREATE INDEX IF NOT EXISTS "assertions_expires_idx" ON "assertions" ("expires");
CREATE INDEX IF NOT EXISTS "assertions_revoked_idx" ON "assertions" ("revoked");

-- Create custom indexes for JSON fields
CREATE INDEX IF NOT EXISTS "assertion_recipient_email_idx" ON "assertions" (json_extract(recipient, '$.email'));
CREATE INDEX IF NOT EXISTS "assertion_recipient_identity_idx" ON "assertions" (json_extract(recipient, '$.identity'));
CREATE INDEX IF NOT EXISTS "assertion_recipient_type_idx" ON "assertions" (json_extract(recipient, '$.type'));
CREATE INDEX IF NOT EXISTS "badge_class_tags_idx" ON "badge_classes" ("tags");
