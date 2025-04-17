import { sqliteTable, text, integer, blob } from 'drizzle-orm/sqlite-core';

// Issuers table (SQLite schema stub)
export const issuers = sqliteTable('issuers', {
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
});

// BadgeClasses table (SQLite schema stub)
export const badgeClasses = sqliteTable('badge_classes', {
  id: text('id').primaryKey(),
  issuerId: text('issuer_id').notNull().references(() => issuers.id),
  name: text('name').notNull(),
  description: text('description').notNull(),
  image: text('image').notNull(),
  criteria: text('criteria').notNull(), // JSON stored as text
  alignment: text('alignment'),
  tags: text('tags'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  additionalFields: text('additional_fields')
});

// Assertions table (SQLite schema stub)
export const assertions = sqliteTable('assertions', {
  id: text('id').primaryKey(),
  badgeClassId: text('badge_class_id').notNull().references(() => badgeClasses.id),
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
}); 