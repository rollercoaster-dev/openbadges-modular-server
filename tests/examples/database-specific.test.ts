/**
 * Example of Database-Specific Tests
 *
 * This file demonstrates how to use the database-test-filter helper
 * to run tests only for the connected database.
 */

import { describe, it, expect, beforeAll } from 'bun:test';
import { logger } from '@/utils/logging/logger.service';
import {
  describeSqlite,
  describePostgres,
  itSqlite,
  itPostgres
} from '../helpers/database-test-filter';

// Regular describe block that runs for all database types
describe('Database-Agnostic Tests', () => {
  it('should run regardless of database type', () => {
    expect(true).toBe(true);
  });
});

// Use an immediately-invoked async function to allow await in the top level
(async () => {
  // Get database-specific describe functions
  const describeSqliteTests = await describeSqlite();
  const describePostgresTests = await describePostgres();

  // SQLite-specific tests
  describeSqliteTests('SQLite-Specific Tests', () => {
    beforeAll(() => {
      logger.info('Running SQLite-specific tests');
    });

    it('should run only when SQLite is connected', () => {
      expect(process.env.DB_TYPE || 'sqlite').toBe('sqlite');
    });

    it('should test SQLite-specific functionality', () => {
      // Add SQLite-specific tests here
      expect(true).toBe(true);
    });
  });

  // PostgreSQL-specific tests
  describePostgresTests('PostgreSQL-Specific Tests', () => {
    beforeAll(() => {
      logger.info('Running PostgreSQL-specific tests');
    });

    it('should run only when PostgreSQL is connected', () => {
      expect(process.env.DB_TYPE).toBe('postgresql');
    });

    it('should test PostgreSQL-specific functionality', () => {
      // Add PostgreSQL-specific tests here
      expect(true).toBe(true);
    });
  });

  // Mixed tests with individual test cases for different databases
  // We need to use a separate async IIFE for the mixed tests
  (async () => {
    // Get database-specific it functions
    const itSqliteTest = await itSqlite();
    const itPostgresTest = await itPostgres();

    describe('Mixed Database Tests', () => {
      beforeAll(() => {
        logger.info('Running mixed database tests');
      });

      // This test only runs for SQLite
      itSqliteTest('should run only for SQLite', () => {
        expect(process.env.DB_TYPE || 'sqlite').toBe('sqlite');
      });

      // This test only runs for PostgreSQL
      itPostgresTest('should run only for PostgreSQL', () => {
        expect(process.env.DB_TYPE).toBe('postgresql');
      });

      // This test runs for all database types
      it('should run for all database types', () => {
        expect(true).toBe(true);
      });
    });
  })();
})();
