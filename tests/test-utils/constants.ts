/**
 * Test Constants
 *
 * This file contains constants used across test files.
 * Centralizing these values makes them easier to maintain and update.
 */

// Authentication test constants
export const TEST_TOKENS = {
  VALID_TOKEN: 'valid-token',
  INVALID_TOKEN: 'invalid-token',
  MOCK_JWT_TOKEN: 'mock-jwt-token',
  ADMIN_TOKEN: 'admin-token',
  ISSUER_TOKEN: 'issuer-token'
};

// Database test constants
export const TEST_DATABASE = {
  POSTGRES_CONNECTION: 'postgres://postgres:postgres@localhost:5432/openbadges_test',
  SQLITE_FILE: ':memory:'
};

// Test user constants
export const TEST_USERS = {
  ADMIN_USER: {
    id: 'test-admin-id',
    username: 'admin',
    email: 'admin@example.com',
    roles: ['admin']
  },
  REGULAR_USER: {
    id: 'test-user-id',
    username: 'user',
    email: 'user@example.com',
    roles: ['user']
  }
};
