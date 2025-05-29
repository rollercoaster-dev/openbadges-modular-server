#!/usr/bin/env bun

/**
 * Test script to validate database name validation in postgres-test-helper.ts
 * This script tests the database name validation logic without actually creating databases
 */

import { logger } from './src/utils/logging/logger.service';
import { validateDatabaseName } from './tests/infrastructure/database/modules/postgresql/postgres-test-helper';

// Test the database name validation using the actual function from postgres-test-helper.ts
function testValidateDatabaseName(dbName: string): boolean {
  try {
    validateDatabaseName(dbName);
    return true;
  } catch (_error) {
    return false;
  }
}

// Test cases
const testCases = [
  // Valid names
  { name: 'openbadges_test', valid: true },
  { name: 'test_db', valid: true },
  { name: 'TestDB', valid: true },
  { name: '_private_db', valid: true },
  { name: 'db123', valid: true },
  { name: 'my_test_database_2023', valid: true },

  // Invalid names
  { name: '123invalid', valid: false }, // starts with number
  { name: 'test-db', valid: false }, // contains dash
  { name: 'test db', valid: false }, // contains space
  { name: 'test.db', valid: false }, // contains dot
  { name: 'test@db', valid: false }, // contains special character
  { name: '', valid: false }, // empty string
  { name: 'test;DROP TABLE users;--', valid: false }, // SQL injection attempt
];

logger.info('Starting database name validation tests');

let allTestsPassed = true;

testCases.forEach((testCase, index) => {
  const result = testValidateDatabaseName(testCase.name);
  const passed = result === testCase.valid;

  if (!passed) {
    allTestsPassed = false;
    logger.error('Database name validation test failed', {
      testNumber: index + 1,
      name: testCase.name,
      expected: testCase.valid,
      actual: result,
    });
  }
});

logger.info('Database name validation tests completed', {
  totalTests: testCases.length,
  passed: allTestsPassed,
});

// Test the actual validation logic from postgres-test-helper.ts
function testDatabaseNameValidation(dbName: string): boolean {
  try {
    // Use the actual validation function from postgres-test-helper.ts
    validateDatabaseName(dbName);
    return true;
  } catch (_error) {
    logger.warn('Database name validation failed', {
      dbName,
      error: _error instanceof Error ? _error.message : String(_error),
    });
    return false;
  }
}

// Test implementation validation
logger.info('Testing implementation validation logic');
const implementationTests = [
  'openbadges_test',
  'test_db_123',
  '123invalid',
  'test;DROP TABLE users;--',
];

implementationTests.forEach((dbName) => {
  testDatabaseNameValidation(dbName);
});

process.exit(allTestsPassed ? 0 : 1);
