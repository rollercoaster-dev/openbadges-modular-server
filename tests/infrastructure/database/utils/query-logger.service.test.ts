/**
 * Tests for the QueryLoggerService
 */

import { describe, test, expect, spyOn, beforeEach, afterEach } from 'bun:test';
import { QueryLoggerService } from '@/infrastructure/database/utils/query-logger.service';
import { logger } from '@/utils/logging/logger.service';

describe('QueryLoggerService', () => {
  let warnSpy: ReturnType<typeof spyOn>;
  let debugSpy: ReturnType<typeof spyOn>;
  let originalEnv: NodeJS.ProcessEnv;
  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Set up logger spies
    warnSpy = spyOn(logger, 'warn');
    debugSpy = spyOn(logger, 'debug');

    // Clear logs and reset settings
    QueryLoggerService.clearLogs();
  });

  afterEach(() => {
    // Restore logger
    warnSpy.mockRestore();
    debugSpy.mockRestore();

    // Restore original environment
    process.env = originalEnv;
  });

  test('should log slow queries with warn level', () => {
    // Set a low threshold to ensure the query is considered slow
    QueryLoggerService.setSlowQueryThreshold(1);

    // Log a query with a duration above the threshold
    QueryLoggerService.logQuery('SELECT * FROM users', undefined, 10, 'sqlite');

    // Verify warn was called
    expect(warnSpy).toHaveBeenCalled();
    expect(
      warnSpy.mock.calls.some(
        ([msg, meta]: [string, { duration: string; database: string; query: string }]) =>
          msg === 'Slow query detected' &&
          meta.duration === '10ms' &&
          meta.database === 'sqlite' &&
          meta.query === 'SELECT * FROM users'
      )
    ).toBe(true);
  });

  test('should not log normal queries as slow', () => {
    // Set a high threshold
    QueryLoggerService.setSlowQueryThreshold(1000);

    // Log a query with a duration below the threshold
    QueryLoggerService.logQuery('SELECT * FROM users', undefined, 10, 'sqlite');

    // Verify warn was not called
    expect(warnSpy).not.toHaveBeenCalled();
  });

  test('should log all queries in debug mode when DEBUG_QUERIES is true', () => {
    // Set development environment and enable query debugging
    process.env.NODE_ENV = 'development';
    process.env.DEBUG_QUERIES = 'true';

    // Log a query
    QueryLoggerService.logQuery('SELECT * FROM users', undefined, 5, 'sqlite');

    // Verify debug was called
    expect(debugSpy).toHaveBeenCalled();
    expect(debugSpy.mock.calls.some((call: [string, { duration: string; database: string; query: string }]) =>
      call[0] === 'Database query executed' &&
      call[1].duration === '5ms' &&
      call[1].database === 'sqlite' &&
      call[1].query === 'SELECT * FROM users'
    )).toBe(true);
  });

  test('should not log all queries when DEBUG_QUERIES is false', () => {
    // Set development environment but disable query debugging
    process.env.NODE_ENV = 'development';
    process.env.DEBUG_QUERIES = 'false';

    // Log a query
    QueryLoggerService.logQuery('SELECT * FROM users', undefined, 5, 'sqlite');

    // Verify debug was not called
    expect(debugSpy).not.toHaveBeenCalled();
  });

  test('should include query parameters in logs', () => {
    // Set development environment and enable query debugging
    process.env.NODE_ENV = 'development';
    process.env.DEBUG_QUERIES = 'true';

    // Log a query with parameters
    const params = [123, 'test'];
    QueryLoggerService.logQuery('SELECT * FROM users WHERE id = ? AND name = ?', params, 5, 'sqlite');

    // Verify debug was called with parameters
    expect(debugSpy).toHaveBeenCalled();
    expect(debugSpy.mock.calls.some((call: [string, { params: string[] }]) =>
      call[0] === 'Database query executed' &&
      call[1].params.includes('123') &&
      call[1].params.includes('test')
    )).toBe(true);
  });
});
