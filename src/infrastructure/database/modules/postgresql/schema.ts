/**
 * PostgreSQL schema definitions for Open Badges API
 * 
 * This file defines the database schema for the PostgreSQL module using Drizzle ORM.
 * It includes tables for Issuers, BadgeClasses, and Assertions following the Open Badges 3.0 specification.
 */

import { pgTable, text, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core';

// Issuer table
export const issuers = pgTable('issuers', {
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
});

// BadgeClass table
export const badgeClasses = pgTable('badge_classes', {
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
});

// Assertion table
export const assertions = pgTable('assertions', {
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
});
