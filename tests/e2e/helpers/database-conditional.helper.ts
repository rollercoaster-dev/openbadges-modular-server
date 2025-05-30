/**
 * Database Conditional Helper for E2E Tests
 *
 * This helper provides functions to conditionally run E2E tests based on database availability.
 * It prevents tests from failing when a specific database type is not available.
 */

import { describe, it } from 'bun:test';
import { logger } from '@/utils/logging/logger.service';
import { isPgAvailable } from '../setup-test-app';

/**
 * Get the current database type from environment
 */
export function getCurrentDatabaseType(): string {
  return process.env.DB_TYPE || 'sqlite';
}

/**
 * Check if PostgreSQL is available for testing
 */
export function isPostgresqlAvailable(): boolean {
  return getCurrentDatabaseType() === 'postgresql' && isPgAvailable;
}

/**
 * Check if SQLite is being used for testing
 */
export function isSqliteInUse(): boolean {
  return getCurrentDatabaseType() === 'sqlite';
}

/**
 * Conditional describe function that only runs if PostgreSQL is available
 * @param name Test suite name
 * @param fn Test suite function
 * @returns describe or describe.skip based on PostgreSQL availability
 */
export function describePostgreSQL(name: string, fn: () => void): void {
  if (isPostgresqlAvailable()) {
    logger.info(`Running PostgreSQL E2E test suite: ${name}`);
    describe(name, fn);
  } else {
    logger.info(
      `Skipping PostgreSQL E2E test suite: ${name} (PostgreSQL not available)`
    );
    describe.skip(name, fn);
  }
}

/**
 * Conditional describe function that only runs if SQLite is in use
 * @param name Test suite name
 * @param fn Test suite function
 * @returns describe or describe.skip based on SQLite usage
 */
export function describeSQLite(name: string, fn: () => void): void {
  if (isSqliteInUse()) {
    logger.info(`Running SQLite E2E test suite: ${name}`);
    describe(name, fn);
  } else {
    logger.info(`Skipping SQLite E2E test suite: ${name} (SQLite not in use)`);
    describe.skip(name, fn);
  }
}

/**
 * Conditional it function that only runs if PostgreSQL is available
 * @param name Test name
 * @param fn Test function
 * @returns it or it.skip based on PostgreSQL availability
 */
export function itPostgreSQL(
  name: string,
  fn: () => void | Promise<void>
): void {
  if (isPostgresqlAvailable()) {
    logger.debug(`Running PostgreSQL E2E test: ${name}`);
    it(name, fn);
  } else {
    logger.debug(
      `Skipping PostgreSQL E2E test: ${name} (PostgreSQL not available)`
    );
    it.skip(name, fn);
  }
}

/**
 * Conditional it function that only runs if SQLite is in use
 * @param name Test name
 * @param fn Test function
 * @returns it or it.skip based on SQLite usage
 */
export function itSQLite(name: string, fn: () => void | Promise<void>): void {
  if (isSqliteInUse()) {
    logger.debug(`Running SQLite E2E test: ${name}`);
    it(name, fn);
  } else {
    logger.debug(`Skipping SQLite E2E test: ${name} (SQLite not in use)`);
    it.skip(name, fn);
  }
}

/**
 * Conditional describe function that runs for any available database
 * This is useful for database-agnostic tests that should run regardless of the database type
 * @param name Test suite name
 * @param fn Test suite function
 */
export function describeAnyDatabase(name: string, fn: () => void): void {
  const dbType = getCurrentDatabaseType();
  if (dbType === 'postgresql' && !isPgAvailable) {
    logger.info(`Skipping E2E test suite: ${name} (PostgreSQL not available)`);
    describe.skip(name, fn);
  } else {
    logger.info(`Running E2E test suite: ${name} (using ${dbType})`);
    describe(name, fn);
  }
}

/**
 * Get a describe function based on database availability
 * @param requirePostgreSQL If true, only run when PostgreSQL is available
 * @param requireSQLite If true, only run when SQLite is in use
 * @returns describe or describe.skip function
 */
export function getConditionalDescribe(
  requirePostgreSQL = false,
  requireSQLite = false
): typeof describe {
  if (requirePostgreSQL && requireSQLite) {
    throw new Error('Cannot require both PostgreSQL and SQLite simultaneously');
  }

  if (requirePostgreSQL) {
    return isPostgresqlAvailable()
      ? describe
      : (describe.skip as typeof describe);
  }

  if (requireSQLite) {
    return isSqliteInUse() ? describe : (describe.skip as typeof describe);
  }

  // For database-agnostic tests, check if any database is available
  const dbType = getCurrentDatabaseType();
  if (dbType === 'postgresql' && !isPgAvailable) {
    return describe.skip as typeof describe;
  }

  return describe;
}

/**
 * Get an it function based on database availability
 * @param requirePostgreSQL If true, only run when PostgreSQL is available
 * @param requireSQLite If true, only run when SQLite is in use
 * @returns it or it.skip function
 */
export function getConditionalIt(
  requirePostgreSQL = false,
  requireSQLite = false
): typeof it {
  if (requirePostgreSQL && requireSQLite) {
    throw new Error('Cannot require both PostgreSQL and SQLite simultaneously');
  }

  if (requirePostgreSQL) {
    return isPostgresqlAvailable() ? it : (it.skip as typeof it);
  }

  if (requireSQLite) {
    return isSqliteInUse() ? it : (it.skip as typeof it);
  }

  // For database-agnostic tests, check if any database is available
  const dbType = getCurrentDatabaseType();
  if (dbType === 'postgresql' && !isPgAvailable) {
    return it.skip as typeof it;
  }

  return it;
}
