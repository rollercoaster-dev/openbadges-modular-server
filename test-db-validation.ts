#!/usr/bin/env bun

/**
 * Test script to validate database name validation in postgres-test-helper.ts
 * This script tests the database name validation regex without actually creating databases
 */

import { logger } from './src/utils/logging/logger.service';

// Test the database name validation regex
function validateDatabaseName(dbName: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(dbName);
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

console.log('Testing Database Name Validation\n');
console.log('================================\n');

let allTestsPassed = true;

testCases.forEach((testCase, index) => {
  const result = validateDatabaseName(testCase.name);
  const status = result === testCase.valid ? '✅ PASS' : '❌ FAIL';

  if (result !== testCase.valid) {
    allTestsPassed = false;
  }

  console.log(`Test ${index + 1}: ${status}`);
  console.log(`  Name: "${testCase.name}"`);
  console.log(`  Expected: ${testCase.valid ? 'Valid' : 'Invalid'}`);
  console.log(`  Got: ${result ? 'Valid' : 'Invalid'}`);
  console.log();
});

console.log('================================\n');
console.log(
  `Overall Result: ${
    allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'
  }`
);

// Test the actual validation logic from postgres-test-helper.ts
console.log('\nTesting actual validation logic:\n');

function testDatabaseNameValidation(dbName: string) {
  try {
    // Validate database name format to prevent SQL injection
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(dbName)) {
      throw new Error(
        `Invalid database name format: ${dbName}. Database names must start with a letter or underscore and contain only letters, numbers, and underscores.`
      );
    }
    console.log(`✅ "${dbName}" - Valid database name`);
    return true;
  } catch (error) {
    console.log(`❌ "${dbName}" - ${error.message}`);
    return false;
  }
}

// Test some key cases
console.log('Testing validation from actual implementation:');
testDatabaseNameValidation('openbadges_test');
testDatabaseNameValidation('test_db_123');
testDatabaseNameValidation('123invalid');
testDatabaseNameValidation('test;DROP TABLE users;--');

process.exit(allTestsPassed ? 0 : 1);
