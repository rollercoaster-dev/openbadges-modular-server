#!/usr/bin/env bun
/**
 * Simple test script to verify SQL injection protection in postgres-test-helper.ts
 */

import { validateDatabaseName } from './tests/infrastructure/database/modules/postgresql/postgres-test-helper';

console.log(
  'Testing SQL injection protection in validateDatabaseName function...'
);
console.log('=' * 60);

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

console.log('Testing malicious table names (should be blocked):');
for (const tableName of maliciousTableNames) {
  try {
    console.log(`Testing: "${tableName}"`);
    validateDatabaseName(tableName);
    console.log(
      `❌ SECURITY VULNERABILITY: Table name "${tableName}" was not blocked!`
    );
    failedAttempts++;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('Invalid database name format')
    ) {
      console.log(`✅ Successfully blocked: "${tableName}"`);
      successfulBlocks++;
    } else {
      console.log(
        `⚠️ Blocked for different reason: "${tableName}" - ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      successfulBlocks++;
    }
  }
}

console.log('\nTesting valid table names (should pass):');
for (const tableName of validTableNames) {
  try {
    console.log(`Testing: "${tableName}"`);
    validateDatabaseName(tableName);
    console.log(`✅ Valid table name passed: "${tableName}"`);
    validPassed++;
  } catch (error) {
    console.log(
      `❌ Valid table name incorrectly blocked: "${tableName}" - ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    validFailed++;
  }
}

console.log('\n' + '='.repeat(60));
console.log('SQL INJECTION PROTECTION TEST RESULTS:');
console.log(`Total malicious attempts: ${maliciousTableNames.length}`);
console.log(`Successfully blocked: ${successfulBlocks}`);
console.log(`Failed to block: ${failedAttempts}`);
console.log(`Valid names tested: ${validTableNames.length}`);
console.log(`Valid names passed: ${validPassed}`);
console.log(`Valid names incorrectly blocked: ${validFailed}`);

if (failedAttempts === 0 && validFailed === 0) {
  console.log('🎉 ALL TESTS PASSED!');
  console.log('✅ Security fix is working correctly');
  console.log('✅ All malicious attempts were blocked');
  console.log('✅ All valid table names were accepted');
} else {
  console.log('❌ SOME TESTS FAILED!');
  if (failedAttempts > 0) {
    console.log(`❌ ${failedAttempts} malicious attempts were not blocked`);
  }
  if (validFailed > 0) {
    console.log(`❌ ${validFailed} valid table names were incorrectly blocked`);
  }
}
