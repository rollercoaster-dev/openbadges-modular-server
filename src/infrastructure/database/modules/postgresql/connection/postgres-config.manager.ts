/**
 * PostgreSQL Configuration Manager
 *
 * Manages PostgreSQL database configuration settings and runtime parameters.
 * Provides centralized configuration management similar to SqlitePragmaManager.
 */

import postgres from 'postgres';
import { logger } from '@utils/logging/logger.service';

/**
 * PostgreSQL configuration settings
 */
export interface PostgresConfigSettings {
  // Connection settings
  maxConnections?: number;
  sharedBuffers?: string;
  effectiveCacheSize?: string;

  // Performance settings
  workMem?: string;
  maintenanceWorkMem?: string;
  randomPageCost?: number;

  // Logging settings
  logStatement?: 'none' | 'ddl' | 'mod' | 'all';
  logMinDurationStatement?: number;

  // WAL settings
  walLevel?: 'minimal' | 'replica' | 'logical';
  maxWalSize?: string;
  minWalSize?: string;

  // Checkpoint settings
  checkpointTimeout?: string;
  checkpointCompletionTarget?: number;

  // Lock settings
  deadlockTimeout?: string;
  lockTimeout?: string;
  statementTimeout?: string;
}

/**
 * PostgreSQL runtime configuration information
 */
export interface PostgresRuntimeConfig {
  version?: string;
  maxConnections?: number;
  sharedBuffers?: string;
  effectiveCacheSize?: string;
  workMem?: string;
  maintenanceWorkMem?: string;
  walLevel?: string;
  maxWalSize?: string;
  appliedSettings: {
    maxConnections: boolean;
    sharedBuffers: boolean;
    effectiveCacheSize: boolean;
    workMem: boolean;
    maintenanceWorkMem: boolean;
    walLevel: boolean;
    maxWalSize: boolean;
  };
}

/**
 * PostgreSQL Configuration Manager
 *
 * Provides centralized management of PostgreSQL configuration settings.
 * Note: Many PostgreSQL settings require server restart or superuser privileges,
 * so this manager focuses on session-level settings and monitoring.
 */
export class PostgresConfigManager {
  private client: postgres.Sql;

  constructor(client: postgres.Sql) {
    this.client = client;
  }

  /**
   * Applies session-level configuration settings
   * Note: Many PostgreSQL settings require server restart or superuser privileges
   */
  async applySessionSettings(settings: PostgresConfigSettings): Promise<void> {
    const appliedSettings: string[] = [];

    try {
      // Apply session-level settings that can be changed without restart
      if (settings.workMem) {
        await this.setSessionParameter('work_mem', settings.workMem);
        appliedSettings.push(`work_mem = ${settings.workMem}`);
      }

      if (settings.statementTimeout !== undefined) {
        await this.setSessionParameter(
          'statement_timeout',
          settings.statementTimeout.toString()
        );
        appliedSettings.push(
          `statement_timeout = ${settings.statementTimeout}`
        );
      }

      if (settings.lockTimeout) {
        await this.setSessionParameter('lock_timeout', settings.lockTimeout);
        appliedSettings.push(`lock_timeout = ${settings.lockTimeout}`);
      }

      if (settings.randomPageCost !== undefined) {
        await this.setSessionParameter(
          'random_page_cost',
          settings.randomPageCost.toString()
        );
        appliedSettings.push(`random_page_cost = ${settings.randomPageCost}`);
      }

      if (appliedSettings.length > 0) {
        logger.info('Applied PostgreSQL session settings', {
          settings: appliedSettings,
        });
      }
    } catch (error) {
      logger.error('Failed to apply PostgreSQL session settings', {
        error: error instanceof Error ? error.message : String(error),
        attemptedSettings: appliedSettings,
      });
      throw error;
    }
  }

  /**
   * Sets a session-level parameter
   * Uses proper identifier quoting to prevent SQL injection
   */
  private async setSessionParameter(
    parameter: string,
    value: string
  ): Promise<void> {
    // Validate parameter name to prevent injection
    if (!this.isValidParameterName(parameter)) {
      throw new Error(`Invalid PostgreSQL parameter name: ${parameter}`);
    }

    try {
      // Use postgres.unsafe for identifier quoting to prevent SQL injection
      // The parameter name must be treated as an identifier, not a value
      await this.client.unsafe(`SET ${parameter} = $1`, [value]);
    } catch (error) {
      logger.warn(`Failed to set PostgreSQL parameter ${parameter}`, {
        parameter,
        value,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Validates PostgreSQL parameter names to prevent injection
   */
  private isValidParameterName(parameter: string): boolean {
    // PostgreSQL parameter names must be valid identifiers
    // They can contain letters, digits, and underscores, and must start with a letter or underscore
    const parameterPattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    return parameterPattern.test(parameter) && parameter.length <= 63; // PostgreSQL identifier length limit
  }

  /**
   * Gets current runtime configuration
   */
  async getRuntimeConfig(): Promise<PostgresRuntimeConfig> {
    const config: PostgresRuntimeConfig = {
      appliedSettings: {
        maxConnections: false,
        sharedBuffers: false,
        effectiveCacheSize: false,
        workMem: false,
        maintenanceWorkMem: false,
        walLevel: false,
        maxWalSize: false,
      },
    };

    try {
      // Get PostgreSQL version
      const versionResult = await this.client`SELECT version() as version`;
      if (versionResult[0]?.version) {
        config.version = versionResult[0].version as string;
      }

      // Get configuration parameters
      await this.populateConfigParameter(
        config,
        'max_connections',
        'maxConnections'
      );
      await this.populateConfigParameter(
        config,
        'shared_buffers',
        'sharedBuffers'
      );
      await this.populateConfigParameter(
        config,
        'effective_cache_size',
        'effectiveCacheSize'
      );
      await this.populateConfigParameter(config, 'work_mem', 'workMem');
      await this.populateConfigParameter(
        config,
        'maintenance_work_mem',
        'maintenanceWorkMem'
      );
      await this.populateConfigParameter(config, 'wal_level', 'walLevel');
      await this.populateConfigParameter(config, 'max_wal_size', 'maxWalSize');
    } catch (error) {
      logger.warn('Error getting PostgreSQL runtime configuration', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return config;
  }

  /**
   * Helper method to populate a configuration parameter
   */
  private async populateConfigParameter(
    config: PostgresRuntimeConfig,
    parameterName: string,
    configKey: keyof Omit<PostgresRuntimeConfig, 'appliedSettings'>
  ): Promise<void> {
    try {
      const result = await this.client`
        SELECT setting, unit
        FROM pg_settings
        WHERE name = ${parameterName}
      `;

      if (result[0]?.setting) {
        const setting = result[0].setting as string;
        const unit = result[0].unit as string | null;

        // Combine setting with unit if available
        const value = unit ? `${setting}${unit}` : setting;

        // Type assertion is safe here because we control the mapping
        (config as unknown as Record<string, unknown>)[configKey] = value;

        // Mark as successfully retrieved
        const appliedKey = this.getAppliedSettingKey(configKey);
        if (appliedKey) {
          config.appliedSettings[appliedKey] = true;
        }
      }
    } catch (error) {
      logger.debug(`Failed to get PostgreSQL parameter ${parameterName}`, {
        parameter: parameterName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Maps config keys to applied settings keys
   */
  private getAppliedSettingKey(
    configKey: keyof Omit<PostgresRuntimeConfig, 'appliedSettings'>
  ): keyof PostgresRuntimeConfig['appliedSettings'] | null {
    const mapping: Record<
      string,
      keyof PostgresRuntimeConfig['appliedSettings']
    > = {
      maxConnections: 'maxConnections',
      sharedBuffers: 'sharedBuffers',
      effectiveCacheSize: 'effectiveCacheSize',
      workMem: 'workMem',
      maintenanceWorkMem: 'maintenanceWorkMem',
      walLevel: 'walLevel',
      maxWalSize: 'maxWalSize',
    };

    return mapping[configKey] || null;
  }

  /**
   * Gets database statistics
   */
  async getDatabaseStats(): Promise<Record<string, unknown>> {
    try {
      // Get basic database statistics
      const stats = await this.client`
        SELECT
          datname as database_name,
          numbackends as active_connections,
          xact_commit as transactions_committed,
          xact_rollback as transactions_rolled_back,
          blks_read as blocks_read,
          blks_hit as blocks_hit,
          tup_returned as tuples_returned,
          tup_fetched as tuples_fetched,
          tup_inserted as tuples_inserted,
          tup_updated as tuples_updated,
          tup_deleted as tuples_deleted
        FROM pg_stat_database
        WHERE datname = current_database()
      `;

      return stats[0] || {};
    } catch (error) {
      logger.warn('Failed to get PostgreSQL database statistics', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {};
    }
  }

  /**
   * Gets connection information
   */
  async getConnectionInfo(): Promise<Record<string, unknown>> {
    try {
      // Get connection information
      const connectionInfo = await this.client`
        SELECT
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections,
          count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
        FROM pg_stat_activity
        WHERE datname = current_database()
      `;

      return connectionInfo[0] || {};
    } catch (error) {
      logger.warn('Failed to get PostgreSQL connection information', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {};
    }
  }

  /**
   * Validates configuration settings
   */
  validateSettings(settings: PostgresConfigSettings): string[] {
    const errors: string[] = [];

    // Validate work_mem format
    if (settings.workMem && !this.isValidMemorySize(settings.workMem)) {
      errors.push(
        `Invalid work_mem format: ${settings.workMem}. Expected format: number + unit (e.g., '4MB', '256kB')`
      );
    }

    // Validate maintenance_work_mem format
    if (
      settings.maintenanceWorkMem &&
      !this.isValidMemorySize(settings.maintenanceWorkMem)
    ) {
      errors.push(
        `Invalid maintenance_work_mem format: ${settings.maintenanceWorkMem}. Expected format: number + unit (e.g., '64MB', '1GB')`
      );
    }

    // Validate random_page_cost range
    if (
      settings.randomPageCost !== undefined &&
      (settings.randomPageCost < 0 || settings.randomPageCost > 100)
    ) {
      errors.push(
        `Invalid random_page_cost: ${settings.randomPageCost}. Must be between 0 and 100`
      );
    }

    // Validate timeout values (PostgreSQL timeout values can be strings like '30s', '5min', or numbers in milliseconds)
    if (
      settings.statementTimeout !== undefined &&
      !this.isValidTimeout(settings.statementTimeout)
    ) {
      errors.push(
        `Invalid statement_timeout: ${settings.statementTimeout}. Expected format: number (ms) or string with unit (e.g., '30s', '5min')`
      );
    }

    return errors;
  }

  /**
   * Validates memory size format (e.g., '4MB', '256kB', '1GB')
   */
  private isValidMemorySize(value: string): boolean {
    const memoryPattern = /^\d+(\.\d+)?(kB|MB|GB|TB|B)$/i;
    return memoryPattern.test(value);
  }

  /**
   * Validates timeout format (e.g., '30s', '5min', '1h', or plain numbers)
   */
  private isValidTimeout(value: string): boolean {
    // PostgreSQL accepts timeout values as:
    // - Plain numbers (interpreted as milliseconds)
    // - Numbers with units: ms, s, min, h, d
    const timeoutPattern = /^\d+(\.\d+)?(ms|s|min|h|d)?$/i;
    return timeoutPattern.test(value);
  }
}
