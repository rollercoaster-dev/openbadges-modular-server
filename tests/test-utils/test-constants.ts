/**
 * Test Constants
 *
 * This file contains constants used across test files.
 * Centralizing these values makes them easier to maintain and update.
 */

// Authentication test constants
export const TEST_AUTH = {
  API_KEYS: {
    VALID: 'test-api-key',
    INVALID: 'invalid-api-key',
    ADMIN: 'admin-api-key',
    E2E: 'verysecretkeye2e'
  },
  TOKENS: {
    VALID: 'valid-token',
    INVALID: 'invalid-token',
    ADMIN: 'admin-token',
    EXPIRED: 'expired-token'
  },
  USERS: {
    ADMIN: {
      id: 'admin-user-id',
      username: 'admin',
      email: 'admin@example.com',
      roles: ['admin']
    },
    REGULAR: {
      id: 'regular-user-id',
      username: 'user',
      email: 'user@example.com',
      roles: ['user']
    },
    TEST: {
      id: 'test-user-id',
      username: 'test',
      email: 'test@example.com',
      roles: ['user']
    }
  },
  CREDENTIALS: {
    ADMIN: {
      username: 'admin',
      password: 'admin-password'
    },
    USER: {
      username: 'user',
      password: 'user-password'
    }
  }
};

// Database test constants
export const TEST_DATABASE = {
  POSTGRES: {
    CONNECTION_STRING: 'postgresql://testuser:testpassword@localhost:5433/openbadges_test',
    USER: 'testuser',
    PASSWORD: 'testpassword',
    HOST: 'localhost',
    PORT: 5433,
    DATABASE: 'openbadges_test'
  },
  SQLITE: {
    FILE_PATH: './tests/e2e/test_database.sqlite',
    MEMORY: ':memory:'
  }
};

// Test server constants
export const TEST_SERVER = {
  HOST: 'localhost',
  PORT: 3001,
  BASE_URL: 'http://localhost:3001',
  API_PREFIX: '/api/v1'
};

// Test data constants
export const TEST_DATA = {
  ISSUER: {
    NAME: 'Test Issuer',
    URL: 'https://example.com',
    EMAIL: 'issuer@example.com',
    DESCRIPTION: 'Test issuer for testing'
  },
  BADGE_CLASS: {
    NAME: 'Test Badge',
    DESCRIPTION: 'Test badge for testing',
    IMAGE: 'https://example.com/badge.png',
    CRITERIA: {
      narrative: 'Complete the test'
    }
  },
  ASSERTION: {
    RECIPIENT: {
      TYPE: 'email',
      IDENTITY: 'recipient@example.com',
      HASHED: false
    },
    ISSUED_ON: new Date().toISOString()
  }
};
