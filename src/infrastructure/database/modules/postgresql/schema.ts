/**
 * PostgreSQL schema definitions for Open Badges API
 *
 * This file defines the database schema for the PostgreSQL module using Drizzle ORM.
 * It includes tables for Issuers, BadgeClasses, Assertions, API Keys, Users, and Roles following the Open Badges 3.0 specification.
 *
 * Note: PostgreSQL natively supports UUID, JSONB, and timestamp types.
 */

import { pgTable, text, timestamp, uuid, jsonb, index, boolean, varchar, integer } from 'drizzle-orm/pg-core';

// Users table - defined first to avoid circular references
const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    username: varchar('username', { length: 50 }).notNull().unique(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: text('password_hash'),
    firstName: varchar('first_name', { length: 50 }),
    lastName: varchar('last_name', { length: 50 }),
    roles: jsonb('roles').notNull().default('[]'),
    permissions: jsonb('permissions').notNull().default('[]'),
    isActive: boolean('is_active').notNull().default(true),
    lastLogin: timestamp('last_login'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
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
const roles = pgTable(
  'roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull().unique(),
    description: text('description'),
    permissions: jsonb('permissions').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      // Add index on name for faster lookups
      nameIdx: index('role_name_idx').on(table.name),
    };
  }
);

// API Keys table
const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: text('key').notNull().unique(),
    name: text('name').notNull(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    description: text('description'),
    permissions: jsonb('permissions').notNull(),
    revoked: boolean('revoked').default(false).notNull(),
    revokedAt: timestamp('revoked_at'),
    lastUsed: timestamp('last_used'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
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

// Issuer table
const issuers = pgTable(
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
const badgeClasses = pgTable(
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
const assertions = pgTable(
  'assertions',
  {
  id: uuid('id').primaryKey().defaultRandom(),
  badgeClassId: uuid('badge_class_id').notNull().references(() => badgeClasses.id, { onDelete: 'cascade' }),
  issuerId: uuid('issuer_id').references(() => issuers.id, { onDelete: 'cascade' }), // Add issuer_id foreign key
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
      // Add index on issuerId for faster lookups by issuer
      issuerIdx: index('assertion_issuer_idx').on(table.issuerId),
      // Add index on issuedOn for sorting
      issuedOnIdx: index('assertion_issued_on_idx').on(table.issuedOn),
      // Add index on revoked for filtering
      revokedIdx: index('assertion_revoked_idx').on(table.revoked),
      // Add index on expires for filtering expired assertions
      expiresIdx: index('assertion_expires_idx').on(table.expires)
    };
  }
);

// Platforms table - for registering external platforms
const platforms = pgTable(
  'platforms',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull().unique(),
    description: text('description'),
    clientId: text('client_id').notNull().unique(),
    publicKey: text('public_key').notNull(), // For JWT verification
    webhookUrl: text('webhook_url'),
    status: text('status').notNull().default('active'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      nameIdx: index('platform_name_idx').on(table.name),
      clientIdIdx: index('platform_client_id_idx').on(table.clientId),
    };
  }
);

// Platform Users table - for storing external users
const platformUsers = pgTable(
  'platform_users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    platformId: uuid('platform_id').notNull().references(() => platforms.id, { onDelete: 'cascade' }),
    externalUserId: text('external_user_id').notNull(), // User ID in the external platform
    displayName: text('display_name'),
    email: text('email'),
    metadata: jsonb('metadata'), // Additional user data
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      platformUserIdx: index('platform_user_idx').on(table.platformId, table.externalUserId),
      emailIdx: index('platform_user_email_idx').on(table.email),
    };
  }
);

// User Roles table (many-to-many relationship)
const userRoles = pgTable(
  'user_roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
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

// User Assertions table (Backpack) - links users to assertions
const userAssertions = pgTable(
  'user_assertions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => platformUsers.id, { onDelete: 'cascade' }),
    assertionId: uuid('assertion_id').notNull().references(() => assertions.id, { onDelete: 'cascade' }),
    addedAt: timestamp('added_at').defaultNow().notNull(),
    status: text('status').notNull().default('active'), // active, hidden, etc.
    metadata: jsonb('metadata'), // Additional data about this user-assertion relationship
  },
  (table) => {
    return {
      userAssertionIdx: index('user_assertion_idx').on(table.userId, table.assertionId),
      addedAtIdx: index('user_assertion_added_at_idx').on(table.addedAt),
    };
  }
);

// Status Lists table - for StatusList2021 implementation
const statusLists = pgTable(
  'status_lists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    issuerId: uuid('issuer_id').notNull().references(() => issuers.id, { onDelete: 'cascade' }),
    purpose: text('purpose').notNull(), // 'revocation' or 'suspension'
    bitstring: text('bitstring').notNull(), // base64url encoded, gzip compressed bitstring
    size: integer('size').notNull().default(16384), // number of bits in the list
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      // Add index on issuerId for faster lookups by issuer
      issuerIdx: index('status_list_issuer_idx').on(table.issuerId),
      // Add index on purpose for faster lookups by purpose
      purposeIdx: index('status_list_purpose_idx').on(table.purpose),
      // Add composite index on issuer and purpose for unique status lists per issuer/purpose
      issuerPurposeIdx: index('status_list_issuer_purpose_idx').on(
        table.issuerId,
        table.purpose
      ),
      // Add index on creation date for sorting
      createdAtIdx: index('status_list_created_at_idx').on(table.createdAt),
    };
  }
);

// Credential Status Entries table - tracks individual credential status within status lists
const credentialStatusEntries = pgTable(
  'credential_status_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    credentialId: uuid('credential_id').notNull().references(() => assertions.id, { onDelete: 'cascade' }),
    statusListId: uuid('status_list_id').notNull().references(() => statusLists.id, { onDelete: 'cascade' }),
    statusListIndex: integer('status_list_index').notNull(), // index within the bitstring
    status: integer('status').notNull().default(0), // 0 = valid, 1 = revoked/suspended
    reason: text('reason'), // optional reason for status change
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      // Add unique index on credentialId to ensure one status entry per credential
      credentialIdx: index('credential_status_credential_idx').on(table.credentialId),
      // Add index on statusListId for faster lookups by status list
      statusListIdx: index('credential_status_list_idx').on(table.statusListId),
      // Add unique index on statusListId and statusListIndex to prevent duplicate indexes
      statusListIndexIdx: index('credential_status_list_index_idx').on(
        table.statusListId,
        table.statusListIndex
      ),
      // Add index on status for filtering by status
      statusIdx: index('credential_status_status_idx').on(table.status),
      // Add index on updated date for sorting
      updatedAtIdx: index('credential_status_updated_at_idx').on(table.updatedAt),
    };
  }
);

// Export all tables for use in other modules
export {
  users,
  roles,
  apiKeys,
  issuers,
  badgeClasses,
  assertions,
  platforms,
  platformUsers,
  userRoles,
  userAssertions,
  statusLists,
  credentialStatusEntries
};