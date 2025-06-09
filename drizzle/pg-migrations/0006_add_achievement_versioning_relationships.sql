-- Migration: Add achievement versioning and relationship fields to badge_classes table
-- This migration adds support for Open Badges 3.0 achievement versioning and relationships
-- Adds: version, previous_version, related, and endorsement fields

-- Add version field for achievement versioning
ALTER TABLE badge_classes ADD COLUMN version TEXT;

-- Add previous_version field for version chain tracking
-- Self-referencing foreign key to badge_classes.id
ALTER TABLE badge_classes ADD COLUMN previous_version UUID REFERENCES badge_classes(id);

-- Add related field for achievement relationships (JSONB array)
-- Stores array of Related objects as per OB 3.0 specification
ALTER TABLE badge_classes ADD COLUMN related JSONB;

-- Add endorsement field for achievement endorsements (JSONB array)
-- Stores array of EndorsementCredential objects as per OB 3.0 specification
ALTER TABLE badge_classes ADD COLUMN endorsement JSONB;

-- Create indexes for performance optimization

-- Index on version field for version-based queries
CREATE INDEX IF NOT EXISTS badge_class_version_idx ON badge_classes (version);

-- Index on previous_version for version chain traversal
CREATE INDEX IF NOT EXISTS badge_class_previous_version_idx ON badge_classes (previous_version);

-- GIN indexes on JSONB fields for efficient JSON queries
CREATE INDEX IF NOT EXISTS badge_class_related_gin_idx ON badge_classes USING GIN (related);
CREATE INDEX IF NOT EXISTS badge_class_endorsement_gin_idx ON badge_classes USING GIN (endorsement);

-- Composite index for issuer + version queries (common pattern)
CREATE INDEX IF NOT EXISTS badge_class_issuer_version_idx ON badge_classes (issuer_id, version);

-- Specific JSONB indexes for common query patterns

-- Index for finding achievements with related content
-- Supports queries like: WHERE related IS NOT NULL AND jsonb_array_length(related) > 0
CREATE INDEX IF NOT EXISTS badge_class_related_content_idx ON badge_classes USING GIN (related) WHERE related IS NOT NULL;

-- Index for finding achievements with endorsements
-- Supports queries like: WHERE endorsement IS NOT NULL AND jsonb_array_length(endorsement) > 0
CREATE INDEX IF NOT EXISTS badge_class_endorsement_content_idx ON badge_classes USING GIN (endorsement) WHERE endorsement IS NOT NULL;

-- Comments for documentation
-- version: Optional string field for achievement version (e.g., "1.0", "2.1", "v3.0-beta")
-- previous_version: Optional UUID reference to previous version of this achievement (creates version chain)
-- related: Optional JSONB array of Related objects linking to other achievements
-- endorsement: Optional JSONB array of EndorsementCredential objects for third-party endorsements

-- All new fields are nullable to maintain backward compatibility
-- Existing badge classes will have NULL values for these fields
-- Only Open Badges 3.0 output will include these fields when present

-- Example related field structure:
-- [
--   {
--     "id": "https://example.edu/achievements/123",
--     "type": ["Related"],
--     "inLanguage": "es",
--     "version": "2.0"
--   }
-- ]

-- Example endorsement field structure:
-- [
--   {
--     "@context": ["https://www.w3.org/2018/credentials/v1", "https://purl.imsglobal.org/spec/ob/v3p0/context.json"],
--     "id": "https://example.org/endorsements/456",
--     "type": ["VerifiableCredential", "EndorsementCredential"],
--     "issuer": {
--       "id": "https://example.org/issuers/789",
--       "type": ["Profile"]
--     },
--     "validFrom": "2023-01-01T00:00:00Z",
--     "credentialSubject": {
--       "id": "https://example.edu/achievements/123",
--       "type": ["Achievement"],
--       "endorsementComment": "This achievement demonstrates excellent skills in..."
--     }
--   }
-- ]
