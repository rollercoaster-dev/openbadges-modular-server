/**
 * SQLite schema definitions for Open Badges API
 *
 * This file defines the database schema for the SQLite module using Drizzle ORM.
 * It includes tables for Issuers, BadgeClasses, Assertions, API Keys, Users, and Roles following the Open Badges 3.0 specification.
 *
 * Note: SQLite stores JSON as text and timestamps as integers (epoch milliseconds).
 */

import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

// Users table - defined first to avoid circular references
export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    username: text('username').notNull().unique(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash'),
    firstName: text('first_name'),
    lastName: text('last_name'),
    roles: text('roles').notNull().default('[]'), // JSON stored as text
    permissions: text('permissions').notNull().default('[]'), // JSON stored as text
    isActive: integer('is_active').notNull().default(1),
    lastLogin: integer('last_login'),
    metadata: text('metadata'), // JSON stored as text
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => {
    return {
      // Add index on username for faster lookups
      usernameIdx: index('user_username_idx').on(table.username),
      // Add index on email for faster lookups
      emailIdx: index('user_email_idx').on(table.email),
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

// API Keys table
export const apiKeys = sqliteTable(
  'api_keys',
  {
    id: text('id').primaryKey(),
    key: text('key').notNull().unique(),
    name: text('name').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
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
    additionalFields: text('additional_fields'), // JSON stored as text
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
      createdAtIdx: index('issuer_created_at_idx').on(table.createdAt),
    };
  }
);

// BadgeClasses table
export const badgeClasses = sqliteTable(
  'badge_classes',
  {
    id: text('id').primaryKey(),
    issuerId: text('issuer_id')
      .notNull()
      .references(() => issuers.id, { onDelete: 'cascade' }),
    // Add index on issuerId for faster lookups by issuer
    name: text('name').notNull(),
    description: text('description').notNull(),
    image: text('image').notNull(),
    criteria: text('criteria').notNull(), // JSON stored as text
    alignment: text('alignment'),
    tags: text('tags'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    additionalFields: text('additional_fields'),
  },
  (table) => {
    return {
      // Add index on issuerId for faster lookups by issuer
      issuerIdx: index('badge_class_issuer_idx').on(table.issuerId),
      // Add index on name for faster searches
      nameIdx: index('badge_class_name_idx').on(table.name),
      // Add index on creation date for sorting
      createdAtIdx: index('badge_class_created_at_idx').on(table.createdAt),
    };
  }
);

// Assertions table
export const assertions = sqliteTable(
  'assertions',
  {
    id: text('id').primaryKey(),
    badgeClassId: text('badge_class_id')
      .notNull()
      .references(() => badgeClasses.id, { onDelete: 'cascade' }),
    // Add index on badgeClassId for faster lookups by badge class
    recipient: text('recipient').notNull(), // JSON stored as text
    issuedOn: integer('issued_on').notNull(),
    expires: integer('expires'),
    evidence: text('evidence'),
    verification: text('verification'),
    credentialSchema: text('credential_schema'), // JSON stored as text
    revoked: integer('revoked'),
    revocationReason: text('revocation_reason'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    additionalFields: text('additional_fields'),
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
      expiresIdx: index('assertion_expires_idx').on(table.expires),
    };
  }
);

// Platforms table - for registering external platforms
export const platforms = sqliteTable(
  'platforms',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull().unique(),
    description: text('description'),
    clientId: text('client_id').notNull().unique(),
    publicKey: text('public_key').notNull(), // For JWT verification
    webhookUrl: text('webhook_url'),
    status: text('status').notNull().default('active'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => {
    return {
      nameIdx: index('platform_name_idx').on(table.name),
      clientIdIdx: index('platform_client_id_idx').on(table.clientId),
    };
  }
);

// Platform Users table - for storing external users
export const platformUsers = sqliteTable(
  'platform_users',
  {
    id: text('id').primaryKey(),
    platformId: text('platform_id')
      .notNull()
      .references(() => platforms.id, { onDelete: 'cascade' }),
    externalUserId: text('external_user_id').notNull(), // User ID in the external platform
    displayName: text('display_name'),
    email: text('email'),
    metadata: text('metadata'), // JSON stored as text
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => {
    return {
      platformUserIdx: index('platform_user_idx').on(
        table.platformId,
        table.externalUserId
      ),
      emailIdx: index('platform_user_email_idx').on(table.email),
    };
  }
);

// User Roles table (many-to-many relationship)
export const userRoles = sqliteTable(
  'user_roles',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: text('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at').notNull(),
  },
  (table) => {
    return {
      // Add index on userId for faster lookups
      userIdIdx: index('user_role_user_id_idx').on(table.userId),
      // Add index on roleId for faster lookups
      roleIdIdx: index('user_role_role_id_idx').on(table.roleId),
      // Add index on userId and roleId
      userRoleIdx: index('user_role_user_id_role_id_idx').on(
        table.userId,
        table.roleId
      ),
    };
  }
);

// User Assertions table (Backpack) - links users to assertions
export const userAssertions = sqliteTable(
  'user_assertions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => platformUsers.id, { onDelete: 'cascade' }),
    assertionId: text('assertion_id')
      .notNull()
      .references(() => assertions.id, { onDelete: 'cascade' }),
    addedAt: integer('added_at').notNull(),
    updatedAt: integer('updated_at').notNull(), // epoch ms
    status: text('status').notNull().default('active'), // active, hidden, etc.
    metadata: text('metadata'), // JSON stored as text
  },
  (table) => {
    return {
      userAssertionIdx: uniqueIndex('user_assertion_idx').on(
        table.userId,
        table.assertionId
      ),
      addedAtIdx: index('user_assertion_added_at_idx').on(table.addedAt),
      updatedAtIdx: index('user_assertion_updated_at_idx').on(table.updatedAt),
    };
  }
);
