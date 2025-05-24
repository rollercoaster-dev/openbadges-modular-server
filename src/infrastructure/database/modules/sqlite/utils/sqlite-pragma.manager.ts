/**
 * SQLite PRAGMA Manager
 *
 * Centralized utility for managing SQLite PRAGMA settings with proper error handling
 * and categorization of critical vs optional settings.
 */

import type { Database } from 'bun:sqlite';
import { logger } from '@utils/logging/logger.service';
import { sanitizeObject } from '@utils/logging/sanitize';
import type { SqliteConnectionConfig } from '../types/sqlite-database.types';

/**
 * Result of applying PRAGMA settings
 */
export interface PragmaApplicationResult {
  /** Settings that were successfully applied */
  appliedSettings: Record<string, string | number | boolean>;
  /** Non-critical settings that failed to apply */
  failedSettings: Array<{ setting: string; error: string; category: 'CRITICAL' | 'OPTIONAL' }>;
  /** Whether all critical settings were applied successfully */
  criticalSettingsApplied: boolean;
}

/**
 * PRAGMA setting definition
 */
interface PragmaSetting {
  name: string;
  value: string | number;
  category: 'CRITICAL' | 'OPTIONAL';
  description: string;
}

/**
 * Centralized SQLite PRAGMA management utility
 */
export class SqlitePragmaManager {
  /**
   * Applies all SQLite PRAGMA settings from configuration
   * @param client SQLite database client
   * @param config SQLite connection configuration
   * @returns Result of PRAGMA application
   * @throws Error if critical PRAGMA settings fail to apply
   */
  static applyPragmas(
    client: Database,
    config: SqliteConnectionConfig
  ): PragmaApplicationResult {
    const result: PragmaApplicationResult = {
      appliedSettings: {},
      failedSettings: [],
      criticalSettingsApplied: true,
    };

    // Build PRAGMA settings from configuration
    const pragmaSettings = this.buildPragmaSettings(config);

    // Apply each PRAGMA setting
    for (const setting of pragmaSettings) {
      try {
        this.applySinglePragma(client, setting);
        result.appliedSettings[setting.name] = setting.value;
      } catch (error) {
        const errorMsg = `Failed to set ${setting.name} (${setting.category}): ${
          error instanceof Error ? error.message : String(error)
        }`;

        result.failedSettings.push({
          setting: setting.name,
          error: errorMsg,
          category: setting.category,
        });

        if (setting.category === 'CRITICAL') {
          result.criticalSettingsApplied = false;
          logger.error(errorMsg, {
            setting: setting.name,
            requestedValue: setting.value,
            category: setting.category,
            description: setting.description,
          });
          // Critical settings failure should halt initialization
          throw new Error(errorMsg);
        } else {
          // Log optional setting failures as warnings
          logger.warn(errorMsg, {
            setting: setting.name,
            requestedValue: setting.value,
            category: setting.category,
            description: setting.description,
          });
        }
      }
    }

    // Log results in development mode
    if (process.env.NODE_ENV !== 'production') {
      this.logPragmaResults(result);
    }

    return result;
  }

  /**
   * Builds PRAGMA settings array from configuration
   */
  private static buildPragmaSettings(config: SqliteConnectionConfig): PragmaSetting[] {
    const settings: PragmaSetting[] = [];

    // Critical settings for data integrity and concurrency
    if (typeof config.sqliteBusyTimeout === 'number' && config.sqliteBusyTimeout > 0) {
      settings.push({
        name: 'busy_timeout',
        value: config.sqliteBusyTimeout,
        category: 'CRITICAL',
        description: 'Timeout for database locks - critical for concurrency',
      });
    }

    if (config.sqliteSyncMode) {
      settings.push({
        name: 'synchronous',
        value: config.sqliteSyncMode,
        category: 'CRITICAL',
        description: 'Synchronization mode - critical for data integrity',
      });
    }

    // Always set these critical settings for proper operation
    settings.push(
      {
        name: 'journal_mode',
        value: 'WAL',
        category: 'CRITICAL',
        description: 'Write-Ahead Logging for better concurrency',
      },
      {
        name: 'foreign_keys',
        value: 'ON',
        category: 'CRITICAL',
        description: 'Enable foreign key constraints',
      }
    );

    // Optional performance settings
    if (typeof config.sqliteCacheSize === 'number' && config.sqliteCacheSize > 0) {
      settings.push({
        name: 'cache_size',
        value: -Math.abs(config.sqliteCacheSize), // Negative value means KB
        category: 'OPTIONAL',
        description: 'Cache size for better performance',
      });
    }

    settings.push(
      {
        name: 'temp_store',
        value: 'MEMORY',
        category: 'OPTIONAL',
        description: 'Store temporary tables in memory for performance',
      },
      {
        name: 'mmap_size',
        value: 268435456, // 256MB
        category: 'OPTIONAL',
        description: 'Memory-mapped I/O size for performance',
      }
    );

    return settings;
  }

  /**
   * Applies a single PRAGMA setting
   */
  private static applySinglePragma(client: Database, setting: PragmaSetting): void {
    const pragmaStatement = `PRAGMA ${setting.name} = ${setting.value};`;
    client.exec(pragmaStatement);
  }

  /**
   * Logs PRAGMA application results
   */
  private static logPragmaResults(result: PragmaApplicationResult): void {
    logger.info('SQLite PRAGMA settings applied:', {
      appliedSettings: result.appliedSettings,
      criticalSettingsApplied: result.criticalSettingsApplied,
    });

    if (result.failedSettings.length > 0) {
      const criticalFailures = result.failedSettings.filter(f => f.category === 'CRITICAL');
      const optionalFailures = result.failedSettings.filter(f => f.category === 'OPTIONAL');

      if (criticalFailures.length > 0) {
        logger.error(`${criticalFailures.length} critical PRAGMA settings failed`, {
          failedSettings: criticalFailures,
        });
      }

      if (optionalFailures.length > 0) {
        logger.warn(`${optionalFailures.length} optional PRAGMA settings failed`, {
          failedSettings: optionalFailures,
        });
      }
    }
  }

  /**
   * Validates PRAGMA settings by reading them back from the database
   * @param client SQLite database client
   * @param expectedSettings Settings that should be applied
   * @returns Validation results
   */
  static validatePragmas(
    client: Database,
    expectedSettings: Record<string, string | number>
  ): { valid: boolean; mismatches: Array<{ setting: string; expected: string | number; actual: string | number }> } {
    const mismatches: Array<{ setting: string; expected: string | number; actual: string | number }> = [];

    for (const [setting, expectedValue] of Object.entries(expectedSettings)) {
      try {
        const result = client.query(`PRAGMA ${setting};`).get() as Record<string, unknown>;
        const actualValue = Object.values(result)[0];

        // Normalize values for comparison
        const normalizedExpected = String(expectedValue).toUpperCase();
        const normalizedActual = String(actualValue).toUpperCase();

        if (normalizedExpected !== normalizedActual) {
          mismatches.push({
            setting,
            expected: expectedValue,
            actual: actualValue as string | number,
          });
        }
      } catch (error) {
        logger.warn(`Failed to validate PRAGMA ${setting}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      valid: mismatches.length === 0,
      mismatches,
    };
  }
}
