-- Migration: Add achievement versioning and relationship fields to badge_classes table
-- This migration adds support for Open Badges 3.0 achievement versioning and relationships
-- Adds: version, previous_version, related, and endorsement fields

-- Add version field for achievement versioning
ALTER TABLE badge_classes ADD COLUMN version TEXT;

-- Add previous_version field for version chain tracking
-- Self-referencing foreign key to badge_classes.id
ALTER TABLE badge_classes ADD COLUMN previous_version TEXT REFERENCES badge_classes(id);

-- Add related field for achievement relationships (JSON array)
-- Stores array of Related objects as per OB 3.0 specification
ALTER TABLE badge_classes ADD COLUMN related TEXT;

-- Add endorsement field for achievement endorsements (JSON array)
-- Stores array of EndorsementCredential objects as per OB 3.0 specification
ALTER TABLE badge_classes ADD COLUMN endorsement TEXT;

-- Create indexes for performance optimization

-- Index on version field for version-based queries
CREATE INDEX IF NOT EXISTS badge_class_version_idx ON badge_classes (version);

-- Index on previous_version for version chain traversal
CREATE INDEX IF NOT EXISTS badge_class_previous_version_idx ON badge_classes (previous_version);

-- Index on related field for relationship queries (SQLite JSON support)
CREATE INDEX IF NOT EXISTS badge_class_related_idx ON badge_classes (related);

-- Index on endorsement field for endorsement queries (SQLite JSON support)
CREATE INDEX IF NOT EXISTS badge_class_endorsement_idx ON badge_classes (endorsement);

-- Composite index for issuer + version queries (common pattern)
CREATE INDEX IF NOT EXISTS badge_class_issuer_version_idx ON badge_classes (issuer_id, version);

-- Comments for documentation
-- version: Optional string field for achievement version (e.g., "1.0", "2.1", "v3.0-beta")
-- previous_version: Optional reference to previous version of this achievement (creates version chain)
-- related: Optional JSON array of Related objects linking to other achievements
-- endorsement: Optional JSON array of EndorsementCredential objects for third-party endorsements

-- All new fields are nullable to maintain backward compatibility
-- Existing badge classes will have NULL values for these fields
-- Only Open Badges 3.0 output will include these fields when present
