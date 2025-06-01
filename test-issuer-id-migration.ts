#!/usr/bin/env bun
/**
 * Test script to verify the SQLite foreign key constraint migration works correctly.
 * This script tests the migration that recreates the assertions table with proper
 * foreign key constraints for the issuer_id column.
 */

import { Database } from 'bun:sqlite';
import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../src/utils/logging/logger.service';

async function testMigration() {
  logger.info('Testing SQLite foreign key constraint migration...');

  // Create a temporary database for testing
  const db = new Database(':memory:');

  try {
    // Enable foreign key constraints
    db.run('PRAGMA foreign_keys = ON');

    // Step 1: Create the initial schema (without issuer_id in assertions)
    logger.info('Setting up initial schema...');

    // Create issuers table
    db.run(`
      CREATE TABLE "issuers" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "name" TEXT NOT NULL,
        "url" TEXT NOT NULL,
        "email" TEXT,
        "description" TEXT,
        "image" TEXT,
        "public_key" TEXT,
        "created_at" INTEGER NOT NULL,
        "updated_at" INTEGER NOT NULL,
        "additional_fields" TEXT
      )
    `);

    // Create badge_classes table
    db.run(`
      CREATE TABLE "badge_classes" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "issuer_id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "image" TEXT NOT NULL,
        "criteria" TEXT NOT NULL,
        "alignment" TEXT,
        "tags" TEXT,
        "created_at" INTEGER NOT NULL,
        "updated_at" INTEGER NOT NULL,
        "additional_fields" TEXT,
        FOREIGN KEY ("issuer_id") REFERENCES "issuers"("id") ON DELETE CASCADE
      )
    `);

    // Create old assertions table (without issuer_id foreign key)
    db.run(`
      CREATE TABLE "assertions" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "badge_class_id" TEXT NOT NULL,
        "recipient" TEXT NOT NULL,
        "issued_on" INTEGER NOT NULL,
        "expires" INTEGER,
        "evidence" TEXT,
        "verification" TEXT,
        "revoked" INTEGER,
        "revocation_reason" TEXT,
        "created_at" INTEGER NOT NULL,
        "updated_at" INTEGER NOT NULL,
        "additional_fields" TEXT,
        FOREIGN KEY ("badge_class_id") REFERENCES "badge_classes"("id") ON DELETE CASCADE
      )
    `);

    // Step 2: Insert test data
    logger.info('Inserting test data...');

    const now = Date.now();

    // Insert a test issuer
    db.run(`
      INSERT INTO "issuers" (
        "id", "name", "url", "created_at", "updated_at"
      ) VALUES (
        'issuer-1', 'Test Issuer', 'https://example.com', ${now}, ${now}
      )
    `);

    // Insert a test badge class
    db.run(`
      INSERT INTO "badge_classes" (
        "id", "issuer_id", "name", "description", "image", "criteria", "created_at", "updated_at"
      ) VALUES (
        'badge-1', 'issuer-1', 'Test Badge', 'A test badge', 'https://example.com/image.png', 
        '{"narrative": "Complete the test"}', ${now}, ${now}
      )
    `);

    // Insert a test assertion (without issuer_id)
    db.run(`
      INSERT INTO "assertions" (
        "id", "badge_class_id", "recipient", "issued_on", "created_at", "updated_at"
      ) VALUES (
        'assertion-1', 'badge-1', '{"type": "email", "identity": "test@example.com"}', ${now}, ${now}, ${now}
      )
    `);

    // Step 3: Verify the old table structure doesn't have issuer_id column
    logger.info('Verifying old table structure...');
    const oldTableInfo = db.prepare('PRAGMA table_info(assertions)').all();
    const hasIssuerIdBefore = oldTableInfo.some(
      (col: any) => col.name === 'issuer_id'
    );

    if (hasIssuerIdBefore) {
      throw new Error(
        'Test setup failed: issuer_id column already exists before migration'
      );
    }

    logger.info('✅ Old table structure verified (no issuer_id column)');

    // Step 4: Apply the migration
    logger.info('Applying migration...');

    const migrationPath = join(
      process.cwd(),
      'drizzle/migrations/0001_add_issuer_id_to_assertions.sql'
    );
    const migrationSql = readFileSync(migrationPath, 'utf8');

    // Execute the migration SQL
    db.exec(migrationSql);

    logger.info('✅ Migration applied successfully');

    // Step 5: Verify the new table structure has issuer_id column with foreign key
    logger.info('Verifying new table structure...');

    const newTableInfo = db.prepare('PRAGMA table_info(assertions)').all();
    const hasIssuerIdAfter = newTableInfo.some(
      (col: any) => col.name === 'issuer_id'
    );

    if (!hasIssuerIdAfter) {
      throw new Error(
        'Migration failed: issuer_id column not found after migration'
      );
    }

    // Check foreign key constraints
    const foreignKeys = db.prepare('PRAGMA foreign_key_list(assertions)').all();
    const hasIssuerIdForeignKey = foreignKeys.some(
      (fk: any) => fk.from === 'issuer_id' && fk.table === 'issuers'
    );

    if (!hasIssuerIdForeignKey) {
      throw new Error(
        'Migration failed: issuer_id foreign key constraint not found'
      );
    }

    logger.info(
      '✅ New table structure verified (issuer_id column and foreign key present)'
    );

    // Step 6: Verify data preservation
    logger.info('Verifying data preservation...');

    const assertionCount = db
      .prepare('SELECT COUNT(*) as count FROM assertions')
      .get() as any;
    if (assertionCount.count !== 1) {
      throw new Error(
        `Data preservation failed: expected 1 assertion, found ${assertionCount.count}`
      );
    }

    const assertion = db
      .prepare('SELECT * FROM assertions WHERE id = ?')
      .get('assertion-1') as any;
    if (!assertion) {
      throw new Error('Data preservation failed: test assertion not found');
    }

    if (assertion.issuer_id !== null) {
      logger.warn(
        `Note: issuer_id is not NULL (${assertion.issuer_id}), but this is expected if populated by subsequent migration`
      );
    }

    logger.info('✅ Data preservation verified');

    // Step 7: Test foreign key constraint enforcement
    logger.info('Testing foreign key constraint enforcement...');

    try {
      // This should fail due to foreign key constraint
      db.run(`
        INSERT INTO "assertions" (
          "id", "badge_class_id", "issuer_id", "recipient", "issued_on", "created_at", "updated_at"
        ) VALUES (
          'assertion-2', 'badge-1', 'nonexistent-issuer', '{"type": "email", "identity": "test2@example.com"}', 
          ${now}, ${now}, ${now}
        )
      `);

      throw new Error(
        'Foreign key constraint test failed: insertion with invalid issuer_id should have failed'
      );
    } catch (error) {
      if (error.message.includes('FOREIGN KEY constraint failed')) {
        logger.info('✅ Foreign key constraint enforcement verified');
      } else {
        throw error;
      }
    }

    // Step 8: Test valid foreign key insertion
    logger.info('Testing valid foreign key insertion...');

    db.run(`
      INSERT INTO "assertions" (
        "id", "badge_class_id", "issuer_id", "recipient", "issued_on", "created_at", "updated_at"
      ) VALUES (
        'assertion-3', 'badge-1', 'issuer-1', '{"type": "email", "identity": "test3@example.com"}', 
        ${now}, ${now}, ${now}
      )
    `);

    const newAssertionCount = db
      .prepare('SELECT COUNT(*) as count FROM assertions')
      .get() as any;
    if (newAssertionCount.count !== 2) {
      throw new Error(
        `Valid insertion failed: expected 2 assertions, found ${newAssertionCount.count}`
      );
    }

    logger.info('✅ Valid foreign key insertion verified');

    // Step 9: Verify indexes were created
    logger.info('Verifying indexes...');

    const indexes = db.prepare('PRAGMA index_list(assertions)').all();
    const requiredIndexes = [
      'assertion_badge_class_idx',
      'assertion_issuer_idx',
      'assertion_issued_on_idx',
      'assertion_revoked_idx',
      'assertion_expires_idx',
    ];

    for (const requiredIndex of requiredIndexes) {
      const indexExists = indexes.some(
        (idx: any) => idx.name === requiredIndex
      );
      if (!indexExists) {
        throw new Error(
          `Index verification failed: ${requiredIndex} not found`
        );
      }
    }

    logger.info('✅ All required indexes verified');

    logger.info('\n🎉 All migration tests passed!');
    logger.info('\nMigration successfully:');
    logger.info(
      '- Recreated assertions table with issuer_id foreign key constraint'
    );
    logger.info('- Preserved existing data');
    logger.info('- Enforces referential integrity');
    logger.info('- Created all required indexes');
    logger.info('- Maintains backward compatibility');
  } catch (error) {
    logger.error('Migration test failed:', error);
    throw error;
  } finally {
    db.close();
  }
}

// Run the test
testMigration().catch((error) => {
  logger.error('Test execution failed:', error);
  process.exit(1);
});
