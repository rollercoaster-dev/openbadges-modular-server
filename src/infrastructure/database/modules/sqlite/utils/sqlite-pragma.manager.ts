/**
 * SQLite PRAGMA Manager
 *
 * Centralized utility for applying SQLite PRAGMA settings consistently
 * across the SQLite module and connection manager.
 */

import type { Database } from 'bun:sqlite';
import { logger } from '@utils/logging/logger.service';
import { sanitizeObject } from '@utils/security/sanitize';

/**
 * Configuration interface for SQLite PRAGMA settings
 */
export interface SqlitePragmaConfig {
  maxConnectionAttempts: number;
  connectionRetryDelayMs: number;
  sqliteBusyTimeout: number;
  sqliteSyncMode: 'OFF' | 'NORMAL' | 'FULL';
  sqliteCacheSize?: number; // Make optional to match SqliteConnectionConfig
}

/**
 * Result of applying PRAGMA settings
 */
export interface SqlitePragmaResult {
  appliedSettings: {
    journalMode?: boolean;
    busyTimeout?: boolean;
    syncMode?: boolean;
    cacheSize?: boolean;
    foreignKeys?: boolean;
    tempStore?: boolean;
  };
  criticalSettingsApplied: boolean;
  failedSettings: Array<{ setting: string; error: string; critical: boolean }>;
}

/**
 * Centralized SQLite PRAGMA manager
 */
export class SqlitePragmaManager {
  /**
   * Applies all SQLite PRAGMA settings to the given client
   * @param client The SQLite database client
   * @param config The configuration containing PRAGMA settings
   * @returns Result indicating which settings were applied and any failures
   */
  static applyPragmas(
    client: Database,
    config: SqlitePragmaConfig
  ): SqlitePragmaResult {
    const result: SqlitePragmaResult = {
      appliedSettings: {},
      criticalSettingsApplied: true,
      failedSettings: [],
    };

    try {
      // Apply critical settings first
      this.applyCriticalSettings(client, config, result);

      // Apply important but non-critical settings
      this.applyImportantSettings(client, result);

      // Apply optional performance settings
      this.applyOptionalSettings(client, config, result);

      // Mark overall success only if no critical failures were recorded
      result.criticalSettingsApplied = result.failedSettings.every(
        (f) => !f.critical
      );

      // Log results in development
      if (process.env.NODE_ENV !== 'production') {
        this.logPragmaResults(result);
      }
    } catch (error) {
      // Critical error occurred
      result.criticalSettingsApplied = false;
      const errorMsg = `Critical SQLite PRAGMA settings failed: ${
        error instanceof Error ? error.message : String(error)
      }`;

      logger.error(errorMsg, {
        error: sanitizeObject({
          error: error instanceof Error ? error.stack : String(error),
          message: error instanceof Error ? error.message : String(error),
        }),
      });

      throw new Error(errorMsg);
    }

    return result;
  }

  /**
   * Applies critical PRAGMA settings that must succeed
   */
  private static applyCriticalSettings(
    client: Database,
    config: SqlitePragmaConfig,
    result: SqlitePragmaResult
  ): void {
    // Set journal mode to WAL for better concurrency (CRITICAL)
    try {
      client.exec('PRAGMA journal_mode = WAL;');
      result.appliedSettings.journalMode = true;
    } catch (error) {
      const errorMsg = `Failed to set journal_mode to WAL: ${
        error instanceof Error ? error.message : String(error)
      }`;
      result.failedSettings.push({
        setting: 'journal_mode',
        error: errorMsg,
        critical: true,
      });
      logger.error(errorMsg, {
        setting: 'journal_mode',
        error: sanitizeObject({
          error: error instanceof Error ? error.message : String(error),
        }),
      });
      // Allow initialization to continue - connection manager will retry
      // Note: criticalSettingsApplied will be set to false after all settings are applied
    }

    // Apply busy timeout setting (CRITICAL for concurrency)
    const busyTimeout = Math.max(100, config.sqliteBusyTimeout);
    try {
      client.exec(`PRAGMA busy_timeout = ${busyTimeout};`);
      result.appliedSettings.busyTimeout = true;
    } catch (error) {
      const errorMsg = `Failed to set SQLite busy_timeout (CRITICAL for concurrency): ${
        error instanceof Error ? error.message : String(error)
      }`;
      result.failedSettings.push({
        setting: 'busy_timeout',
        error: errorMsg,
        critical: true,
      });
      logger.error(errorMsg, {
        requestedValue: busyTimeout,
        category: 'CRITICAL_SETTING',
      });
      throw new Error(errorMsg); // Critical setting - halt initialization
    }

    // Apply synchronous mode setting (CRITICAL for data integrity)
    const allowedSync = ['OFF', 'NORMAL', 'FULL'] as const;
    const syncModeRaw =
      config.sqliteSyncMode.toUpperCase() as (typeof allowedSync)[number];
    const syncMode = allowedSync.includes(syncModeRaw) ? syncModeRaw : 'NORMAL';

    try {
      client.exec(`PRAGMA synchronous = ${syncMode};`);
      result.appliedSettings.syncMode = true;
    } catch (error) {
      const errorMsg = `Failed to set SQLite synchronous mode (CRITICAL for data integrity): ${
        error instanceof Error ? error.message : String(error)
      }`;
      result.failedSettings.push({
        setting: 'synchronous',
        error: errorMsg,
        critical: true,
      });
      logger.error(errorMsg, {
        requestedValue: syncMode,
        category: 'CRITICAL_SETTING',
      });
      throw new Error(errorMsg); // Critical setting - halt initialization
    }
  }

  /**
   * Applies important but non-critical PRAGMA settings
   */
  private static applyImportantSettings(
    client: Database,
    result: SqlitePragmaResult
  ): void {
    // Enable foreign keys constraint checking (IMPORTANT)
    try {
      client.exec('PRAGMA foreign_keys = ON;');
      result.appliedSettings.foreignKeys = true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      result.failedSettings.push({
        setting: 'foreign_keys',
        error: errorMessage,
        critical: false,
      });
      logger.warn(
        'Failed to enable SQLite foreign_keys (continuing with SQLite default)',
        {
          errorMessage,
          category: 'IMPORTANT_SETTING',
        }
      );
    }
  }

  /**
   * Applies optional performance PRAGMA settings
   */
  private static applyOptionalSettings(
    client: Database,
    config: SqlitePragmaConfig,
    result: SqlitePragmaResult
  ): void {
    // Apply cache size setting (OPTIONAL - performance only)
    if (
      typeof config.sqliteCacheSize === 'number' &&
      config.sqliteCacheSize > 0
    ) {
      const cacheSize = Math.max(1000, config.sqliteCacheSize);
      try {
        client.exec(`PRAGMA cache_size = ${cacheSize};`);
        result.appliedSettings.cacheSize = true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        result.failedSettings.push({
          setting: 'cache_size',
          error: errorMessage,
          critical: false,
        });
        logger.warn(
          'Failed to set SQLite cache_size (continuing with SQLite default)',
          {
            errorMessage,
            requestedValue: cacheSize,
            category: 'OPTIONAL_SETTING',
          }
        );
      }
    }

    // Set temp store to memory for better performance (OPTIONAL)
    try {
      client.exec('PRAGMA temp_store = MEMORY;');
      result.appliedSettings.tempStore = true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      result.failedSettings.push({
        setting: 'temp_store',
        error: errorMessage,
        critical: false,
      });
      logger.warn(
        'Failed to set SQLite temp_store to MEMORY (continuing with SQLite default)',
        {
          errorMessage,
          category: 'OPTIONAL_SETTING',
        }
      );
    }
  }

  /**
   * Logs the results of PRAGMA application in development mode
   */
  private static logPragmaResults(result: SqlitePragmaResult): void {
    logger.info('SQLite PRAGMA settings applied:', {
      appliedSettings: result.appliedSettings,
      criticalSettingsApplied: result.criticalSettingsApplied,
      failedSettingsCount: result.failedSettings.length,
    });

    if (result.failedSettings.length > 0) {
      const criticalFailures = result.failedSettings.filter((f) => f.critical);
      const nonCriticalFailures = result.failedSettings.filter(
        (f) => !f.critical
      );

      if (criticalFailures.length > 0) {
        logger.error(
          `${criticalFailures.length} critical SQLite PRAGMA settings failed`,
          { criticalFailures }
        );
      }

      if (nonCriticalFailures.length > 0) {
        logger.warn(
          `${nonCriticalFailures.length} non-critical SQLite PRAGMA settings failed`,
          { nonCriticalFailures }
        );
      }
    }
  }
}
