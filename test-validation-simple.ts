#!/usr/bin/env bun
/**
 * Simple test script to verify SQL injection protection in postgres-test-helper.ts
 */

import { validateDatabaseName } from './tests/infrastructure/database/modules/postgresql/postgres-test-helper';

// Simple logger for this script to avoid console usage
const logger = {
  info: (message: string) => process.stdout.write(`[INFO] ${message}\n`),
  warn: (message: string) => process.stdout.write(`[WARN] ${message}\n`),
  error: (message: string) => process.stderr.write(`[ERROR] ${message}\n`),
  success: (message: string) => process.stdout.write(`[SUCCESS] ${message}\n`),
};

logger.info(
  'Testing SQL injection protection in validateDatabaseName function...'
);
logger.info('='.repeat(60));

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

// Valid table names that should pass
const validTableNames = [
  'users',
  'test_table',
  'TestTable',
  '_private_table',
  'table123',
  'my_test_table_2023',
];

let failedAttempts = 0;
let successfulBlocks = 0;
let validPassed = 0;
let validFailed = 0;

logger.info('Testing malicious table names (should be blocked):');
for (const tableName of maliciousTableNames) {
  try {
    logger.info(`Testing: "${tableName}"`);
    validateDatabaseName(tableName);
    logger.error(
      `❌ SECURITY VULNERABILITY: Table name "${tableName}" was not blocked!`
    );
    failedAttempts++;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('Invalid database name format')
    ) {
      logger.infos(`✅ Successfully blocked: "${tableName}"`);
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

logger.info('\nTesting valid table names (should pass):');
for (const tableName of validTableNames) {
  try {
    logger.info(`Testing: "${tableName}"`);
    validateDatabaseName(tableName);
    logger.infos(`✅ Valid table name passed: "${tableName}"`);
    validPassed++;
  } catch (error) {
    logger.error(
      `❌ Valid table name incorrectly blocked: "${tableName}" - ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    validFailed++;
  }
}

logger.info('\n' + '='.repeat(60));
logger.info('SQL INJECTION PROTECTION TEST RESULTS:');
logger.info(`Total malicious attempts: ${maliciousTableNames.length}`);
logger.info(`Successfully blocked: ${successfulBlocks}`);
logger.info(`Failed to block: ${failedAttempts}`);
logger.info(`Valid names tested: ${validTableNames.length}`);
logger.info(`Valid names passed: ${validPassed}`);
logger.info(`Valid names incorrectly blocked: ${validFailed}`);

if (failedAttempts === 0 && validFailed === 0) {
  logger.infos('🎉 ALL TESTS PASSED!');
  logger.infos('✅ Security fix is working correctly');
  logger.infos('✅ All malicious attempts were blocked');
  logger.infos('✅ All valid table names were accepted');
} else {
  logger.error('❌ SOME TESTS FAILED!');
  if (failedAttempts > 0) {
    logger.error(`❌ ${failedAttempts} malicious attempts were not blocked`);
  }
  if (validFailed > 0) {
    logger.error(
      `❌ ${validFailed} valid table names were incorrectly blocked`
    );
  }
}
