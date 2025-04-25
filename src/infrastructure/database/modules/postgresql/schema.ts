/**
 * PostgreSQL schema definitions for Open Badges API
 *
 * This file defines the database schema for the PostgreSQL module using Drizzle ORM.
 * It includes tables for Issuers, BadgeClasses, and Assertions following the Open Badges 3.0 specification.
 *
 * Note: PostgreSQL natively supports UUID, JSONB, and timestamp types.
 */

import { pgTable, text, timestamp, uuid, jsonb, index } from 'drizzle-orm/pg-core';

// Issuer table
export const issuers = pgTable(
  'issuers',
  {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  url: text('url').notNull(),
  email: text('email'),
  description: text('description'),
  image: text('image'),
  publicKey: jsonb('public_key'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  // Store additional JSON-LD fields
  additionalFields: jsonb('additional_fields')
  },
  (table) => {
    return {
      // Add index on name for faster searches
      nameIdx: index('issuer_name_idx').on(table.name),
      // Add index on url for faster lookups
      urlIdx: index('issuer_url_idx').on(table.url),
      // Add index on email for faster lookups
      emailIdx: index('issuer_email_idx').on(table.email),
      // Add index on creation date for sorting
      createdAtIdx: index('issuer_created_at_idx').on(table.createdAt)
    };
  }
);

// BadgeClass table
export const badgeClasses = pgTable(
  'badge_classes',
  {
  id: uuid('id').primaryKey().defaultRandom(),
  issuerId: uuid('issuer_id').notNull().references(() => issuers.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').notNull(),
  image: text('image').notNull(),
  criteria: jsonb('criteria').notNull(),
  alignment: jsonb('alignment'),
  tags: jsonb('tags'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  // Store additional JSON-LD fields
  additionalFields: jsonb('additional_fields')
  },
  (table) => {
    return {
      // Add index on issuerId for faster lookups by issuer
      issuerIdx: index('badge_class_issuer_idx').on(table.issuerId),
      // Add index on name for faster searches
      nameIdx: index('badge_class_name_idx').on(table.name),
      // Add index on creation date for sorting
      createdAtIdx: index('badge_class_created_at_idx').on(table.createdAt)
    };
  }
);

// Assertion table
export const assertions = pgTable(
  'assertions',
  {
  id: uuid('id').primaryKey().defaultRandom(),
  badgeClassId: uuid('badge_class_id').notNull().references(() => badgeClasses.id, { onDelete: 'cascade' }),
  recipient: jsonb('recipient').notNull(),
  issuedOn: timestamp('issued_on').defaultNow().notNull(),
  expires: timestamp('expires'),
  evidence: jsonb('evidence'),
  verification: jsonb('verification'),
  revoked: jsonb('revoked'),
  revocationReason: text('revocation_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  // Store additional JSON-LD fields
  additionalFields: jsonb('additional_fields')
  },
  (table) => {
    return {
      // Add index on badgeClassId for faster lookups by badge class
      badgeClassIdx: index('assertion_badge_class_idx').on(table.badgeClassId),
      // Add index on issuedOn for sorting
      issuedOnIdx: index('assertion_issued_on_idx').on(table.issuedOn),
      // Add index on revoked for filtering
      revokedIdx: index('assertion_revoked_idx').on(table.revoked),
      // Add index on expires for filtering expired assertions
      expiresIdx: index('assertion_expires_idx').on(table.expires)
    };
  }
);