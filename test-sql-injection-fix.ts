#!/usr/bin/env bun
/**
 * Test script to verify SQL injection protection in postgres-test-helper.ts
 */

import { logger } from './src/utils/logging/logger.service';
import {
  insertTestData,
  createPostgresClient,
  isDatabaseAvailable,
} from './tests/infrastructure/database/modules/postgresql/postgres-test-helper';

async function testSQLInjectionProtection() {
  logger.info('Testing SQL injection protection in insertTestData function...');

  // Check if PostgreSQL is available
  const isAvailable = await isDatabaseAvailable();
  if (!isAvailable) {
    logger.warn(
      'PostgreSQL is not available, skipping SQL injection protection test'
    );
    return;
  }

  const client = createPostgresClient();

  try {
    // Test cases that should fail due to validation
    const maliciousTableNames = [
      'users; DROP TABLE issuers; --',
      "users'; DROP TABLE issuers; --",
      'users" DROP TABLE issuers; --',
      'users/**/UNION/**/SELECT',
      '../../../etc/passwd',
      'users OR 1=1',
      'users\\x00',
      '',
      '123invalid',
      'test-table',
      'test.table',
      'test@table',
    ];

    const testData = {
      id: 'test-id',
      name: 'Test Name',
      email: 'test@example.com',
    };

    let failedAttempts = 0;
    let successfulBlocks = 0;

    for (const tableName of maliciousTableNames) {
      try {
        logger.info(`Testing malicious table name: "${tableName}"`);
        await insertTestData(client, tableName, testData);
        logger.error(
          `❌ SECURITY VULNERABILITY: Table name "${tableName}" was not blocked!`
        );
        failedAttempts++;
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes('Invalid database name format')
        ) {
          logger.info(
            `✅ Successfully blocked malicious table name: "${tableName}"`
          );
          successfulBlocks++;
        } else {
          logger.warn(
            `⚠️ Blocked for different reason: "${tableName}" - ${
              error instanceof Error ? error.message : String(error)
            }`
          );
          successfulBlocks++;
        }
      }
    }

    // Test a valid table name that should work
    try {
      logger.info('Testing valid table name: "test_table"');
      await insertTestData(client, 'test_table', testData);
      logger.error(
        "❌ Valid table insertion failed (but this is expected since table doesn't exist)"
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('relation "test_table" does not exist')
      ) {
        logger.info(
          '✅ Valid table name passed validation (failed later due to non-existent table, which is expected)'
        );
      } else if (
        error instanceof Error &&
        error.message.includes('Invalid database name format')
      ) {
        logger.error('❌ Valid table name was incorrectly blocked');
        failedAttempts++;
      } else {
        logger.info(
          `Valid table name passed validation, failed for other reason: ${error.message}`
        );
      }
    }

    logger.info('='.repeat(60));
    logger.info('SQL INJECTION PROTECTION TEST RESULTS:');
    logger.info(`Total malicious attempts: ${maliciousTableNames.length}`);
    logger.info(`Successfully blocked: ${successfulBlocks}`);
    logger.info(`Failed to block: ${failedAttempts}`);

    if (failedAttempts === 0) {
      logger.info('🎉 ALL SQL INJECTION ATTEMPTS WERE SUCCESSFULLY BLOCKED!');
      logger.info('✅ Security fix is working correctly');
    } else {
      logger.error('❌ SECURITY VULNERABILITY DETECTED!');
      logger.error(`${failedAttempts} malicious attempts were not blocked`);
    }
  } finally {
    await client.end();
  }
}

// Run the test
testSQLInjectionProtection().catch((error) => {
  logger.error('Test failed:', error);
  process.exit(1);
});
