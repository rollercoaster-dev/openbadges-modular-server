/**
 * SQLite schema definitions for Open Badges API
 *
 * This file defines the database schema for the SQLite module using Drizzle ORM.
 * It includes tables for Issuers, BadgeClasses, Assertions, API Keys, and Roles following the Open Badges 3.0 specification.
 *
 * Note: SQLite stores JSON as text and timestamps as integers (epoch milliseconds).
 */

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

// Issuers table
export const issuers = sqliteTable(
  'issuers',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    url: text('url').notNull(),
    email: text('email'),
    description: text('description'),
    image: text('image'),
    publicKey: text('public_key'), // JSON stored as text
    createdAt: integer('created_at').notNull(), // epoch ms
    updatedAt: integer('updated_at').notNull(),
    additionalFields: text('additional_fields') // JSON stored as text
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

// BadgeClasses table
export const badgeClasses = sqliteTable(
  'badge_classes',
  {
    id: text('id').primaryKey(),
    issuerId: text('issuer_id').notNull().references(() => issuers.id),
    // Add index on issuerId for faster lookups by issuer
    name: text('name').notNull(),
    description: text('description').notNull(),
    image: text('image').notNull(),
    criteria: text('criteria').notNull(), // JSON stored as text
    alignment: text('alignment'),
    tags: text('tags'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    additionalFields: text('additional_fields')
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

// Assertions table
export const assertions = sqliteTable(
  'assertions',
  {
    id: text('id').primaryKey(),
    badgeClassId: text('badge_class_id').notNull().references(() => badgeClasses.id),
    // Add index on badgeClassId for faster lookups by badge class
    recipient: text('recipient').notNull(), // JSON stored as text
    issuedOn: integer('issued_on').notNull(),
    expires: integer('expires'),
    evidence: text('evidence'),
    verification: text('verification'),
    revoked: integer('revoked'),
    revocationReason: text('revocation_reason'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    additionalFields: text('additional_fields')
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

// API Keys table
export const apiKeys = sqliteTable(
  'api_keys',
  {
    id: text('id').primaryKey(),
    key: text('key').notNull().unique(),
    name: text('name').notNull(),
    userId: text('user_id').notNull(),
    description: text('description'),
    permissions: text('permissions').notNull(), // JSON stored as text
    revoked: integer('revoked').notNull().default(0),
    revokedAt: integer('revoked_at'),
    lastUsed: integer('last_used'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => {
    return {
      // Add index on key for faster lookups
      keyIdx: index('api_key_key_idx').on(table.key),
      // Add index on userId for faster lookups
      userIdIdx: index('api_key_user_id_idx').on(table.userId),
      // Add index on revoked for filtering
      revokedIdx: index('api_key_revoked_idx').on(table.revoked),
    };
  }
);

// Roles table
export const roles = sqliteTable(
  'roles',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull().unique(),
    description: text('description'),
    permissions: text('permissions').notNull(), // JSON stored as text
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => {
    return {
      // Add index on name for faster lookups
      nameIdx: index('role_name_idx').on(table.name),
    };
  }
);

// User Roles table (many-to-many relationship)
export const userRoles = sqliteTable(
  'user_roles',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    roleId: text('role_id').notNull().references(() => roles.id),
    createdAt: integer('created_at').notNull(),
  },
  (table) => {
    return {
      // Add index on userId for faster lookups
      userIdIdx: index('user_role_user_id_idx').on(table.userId),
      // Add index on roleId for faster lookups
      roleIdIdx: index('user_role_role_id_idx').on(table.roleId),
      // Add index on userId and roleId
      userRoleIdx: index('user_role_user_id_role_id_idx').on(table.userId, table.roleId),
    };
  }
);