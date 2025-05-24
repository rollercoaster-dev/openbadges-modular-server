/**
 * Test for production logging behavior in SQLite PRAGMA Manager
 */

import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { Database } from 'bun:sqlite';
import { SqlitePragmaManager } from '@infrastructure/database/modules/sqlite/utils/sqlite-pragma.manager';
import { logger } from '@utils/logging/logger.service';

describe('SqlitePragmaManager Production Logging', () => {
  let originalNodeEnv: string | undefined;
  let loggerInfoSpy: ReturnType<typeof spyOn>;
  let loggerWarnSpy: ReturnType<typeof spyOn>;
  let loggerErrorSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    // Store original NODE_ENV
    originalNodeEnv = process.env.NODE_ENV;

    // Set up logger spies
    loggerInfoSpy = spyOn(logger, 'info');
    loggerWarnSpy = spyOn(logger, 'warn');
    loggerErrorSpy = spyOn(logger, 'error');
  });

  afterEach(() => {
    // Restore original NODE_ENV
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      process.env.NODE_ENV = undefined;
    }

    // Restore spies
    loggerInfoSpy?.mockRestore();
    loggerWarnSpy?.mockRestore();
    loggerErrorSpy?.mockRestore();
  });

  it('should log detailed information in development mode', () => {
    // Set development environment
    process.env.NODE_ENV = 'development';

    const client = new Database(':memory:');
    const config = {
      sqliteBusyTimeout: 5000,
      sqliteSyncMode: 'NORMAL' as const,
      sqliteCacheSize: 10000,
    };

    SqlitePragmaManager.applyPragmas(client, config);

    // Should log detailed info in development
    expect(loggerInfoSpy).toHaveBeenCalledWith(
      'SQLite PRAGMA settings applied:',
      expect.objectContaining({
        appliedSettings: expect.any(Object),
        criticalSettingsApplied: expect.any(Boolean),
        failedSettingsCount: expect.any(Number),
      })
    );

    client.close();
  });

  it('should only log failures in production mode', () => {
    // Set production environment
    process.env.NODE_ENV = 'production';

    const client = new Database(':memory:');
    const config = {
      sqliteBusyTimeout: 5000,
      sqliteSyncMode: 'NORMAL' as const,
      sqliteCacheSize: 10000,
    };

    SqlitePragmaManager.applyPragmas(client, config);

    // Should NOT log detailed info in production when everything succeeds
    expect(loggerInfoSpy).not.toHaveBeenCalledWith(
      'SQLite PRAGMA settings applied:',
      expect.any(Object)
    );

    // Should not have any warnings or errors for successful application
    expect(loggerWarnSpy).not.toHaveBeenCalled();
    expect(loggerErrorSpy).not.toHaveBeenCalled();

    client.close();
  });

  it('should log production-friendly failure messages', () => {
    // Set production environment
    process.env.NODE_ENV = 'production';

    // Create a mock client that will fail on certain PRAGMA settings
    const client = new Database(':memory:');

    // Mock the exec method to simulate a failure on foreign_keys
    const originalExec = client.exec.bind(client);
    client.exec = (sql: string) => {
      if (sql.includes('foreign_keys')) {
        throw new Error('Simulated foreign_keys failure');
      }
      return originalExec(sql);
    };

    const config = {
      sqliteBusyTimeout: 5000,
      sqliteSyncMode: 'NORMAL' as const,
      sqliteCacheSize: 10000,
    };

    SqlitePragmaManager.applyPragmas(client, config);

    // Should log warning for non-critical failure with production-friendly format
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('non-critical SQLite PRAGMA settings failed'),
      expect.objectContaining({
        nonCriticalFailureCount: expect.any(Number),
        failedSettings: expect.arrayContaining(['foreign_keys']),
      })
    );

    // Should NOT log detailed failure information in production
    expect(loggerWarnSpy).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        nonCriticalFailures: expect.any(Array),
      })
    );

    client.close();
  });
});
