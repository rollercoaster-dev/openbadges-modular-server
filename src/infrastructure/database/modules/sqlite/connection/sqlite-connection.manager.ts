/**
 * SQLite Connection Manager
 *
 * This class handles SQLite database connection management with proper type safety,
 * error handling, and connection state management.
 */

import { drizzle } from 'drizzle-orm/bun-sqlite';
import type { Database } from 'bun:sqlite';
import { logger } from '@utils/logging/logger.service';
import {
  SqliteConnectionConfig,
  SqliteConnectionState,
  SqliteDatabaseClient,
  SqliteConnectionError,
  SqliteDatabaseHealth,
} from '../types/sqlite-database.types';

/**
 * Manages SQLite database connections with type safety and proper error handling
 */
export class SqliteConnectionManager {
  private connectionState: SqliteConnectionState = 'disconnected';
  private connectionPromise: Promise<void> | null = null;
  private connectionAttempts = 0;
  private lastConnectionTime = 0;
  private lastError: Error | null = null;
  private readonly startTime = Date.now();

  private readonly client: Database;
  private readonly db: ReturnType<typeof drizzle>;
  private readonly config: SqliteConnectionConfig;

  constructor(client: Database, config: SqliteConnectionConfig) {
    this.client = client;
    this.db = drizzle(client);
    this.config = config;

    // Apply SQLite configuration parameters using PRAGMA statements
    this.applyConfigurationPragmas();
  }

  /**
   * Establishes a connection to the SQLite database
   */
  async connect(): Promise<void> {
    const startTime = Date.now();

    // If already connected, return immediately
    if (this.connectionState === 'connected') {
      return;
    }

    // If currently connecting, wait for the existing connection attempt
    if (this.connectionState === 'connecting' && this.connectionPromise) {
      return this.connectionPromise;
    }

    // Start new connection attempt
    this.connectionState = 'connecting';
    this.connectionPromise = this.performConnection();

    try {
      await this.connectionPromise;
      this.connectionState = 'connected';
      this.lastConnectionTime = Date.now();
      this.lastError = null;

      if (process.env.NODE_ENV !== 'production') {
        logger.info('SQLite database connected successfully', {
          attempts: this.connectionAttempts + 1,
          duration: Date.now() - startTime,
        });
      }
    } catch (error) {
      this.connectionState = 'error';
      this.lastError =
        error instanceof Error ? error : new Error(String(error));
      throw error;
    } finally {
      this.connectionPromise = null;
    }
  }

  /**
   * Performs the actual connection with retry logic
   */
  private async performConnection(): Promise<void> {
    for (
      let attempt = 1;
      attempt <= this.config.maxConnectionAttempts;
      attempt++
    ) {
      this.connectionAttempts = attempt;

      try {
        await this.testConnection();
        this.connectionAttempts = 0; // Reset on success
        return;
      } catch (error) {
        const isLastAttempt = attempt === this.config.maxConnectionAttempts;

        if (isLastAttempt) {
          const errorMessage = `Failed to connect to SQLite database after ${attempt} attempts`;
          logger.logError(errorMessage, error, {
            error: error instanceof Error ? error.message : String(error),
            attempts: attempt,
            maxAttempts: this.config.maxConnectionAttempts,
          });

          throw new SqliteConnectionError(
            `${errorMessage}: ${
              error instanceof Error ? error.message : String(error)
            }`,
            attempt
          );
        }

        // Calculate exponential backoff delay
        const delay =
          this.config.connectionRetryDelayMs * Math.pow(2, attempt - 1);

        logger.warn('SQLite connection attempt failed, retrying', {
          attempt,
          maxAttempts: this.config.maxConnectionAttempts,
          retryDelay: `${delay}ms`,
          errorMessage: error instanceof Error ? error.message : String(error),
        });

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Tests the database connection by executing a simple query
   */
  private async testConnection(): Promise<void> {
    try {
      // Test the connection with a simple query
      this.client.prepare('SELECT 1 as test').get();
    } catch (error) {
      throw new Error(
        `SQLite connection test failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Disconnects from the SQLite database
   * Note: This method doesn't fully close the client to allow for reconnection
   */
  async disconnect(): Promise<void> {
    if (this.connectionState === 'disconnected') {
      return;
    }

    try {
      // Perform WAL checkpoint to ensure all data is written
      try {
        this.client.prepare('PRAGMA wal_checkpoint(FULL)').run();
      } catch (checkpointError) {
        logger.warn('Error during WAL checkpoint', {
          errorMessage:
            checkpointError instanceof Error
              ? checkpointError.message
              : String(checkpointError),
        });
      }

      // Mark the connection as logically disconnected without closing the client
      // This allows the client to be reused for reconnection
      this.connectionState = 'disconnected';
      this.connectionAttempts = 0;
      this.lastError = null;

      if (process.env.NODE_ENV !== 'production') {
        logger.info('SQLite database disconnected successfully');
      }
    } catch (error) {
      this.connectionState = 'error';
      this.lastError =
        error instanceof Error ? error : new Error(String(error));

      logger.logError('Failed to disconnect SQLite database', error);
      throw error;
    }
  }

  /**
   * Fully closes the database connection, invalidating the client
   * Note: After calling this method, reconnect() will not work
   * This should only be used when completely shutting down the application
   */
  async close(): Promise<void> {
    if (this.connectionState === 'disconnected') {
      return;
    }

    try {
      // Perform WAL checkpoint to ensure all data is written
      try {
        this.client.prepare('PRAGMA wal_checkpoint(FULL)').run();
      } catch (checkpointError) {
        logger.warn('Error during WAL checkpoint', {
          errorMessage:
            checkpointError instanceof Error
              ? checkpointError.message
              : String(checkpointError),
        });
      }

      // Actually close the database connection
      if (typeof this.client.close === 'function') {
        this.client.close();
      }

      this.connectionState = 'disconnected';
      this.connectionAttempts = 0;
      this.lastError = null;

      if (process.env.NODE_ENV !== 'production') {
        logger.info('SQLite database fully closed');
      }
    } catch (error) {
      this.connectionState = 'error';
      this.lastError =
        error instanceof Error ? error : new Error(String(error));

      logger.logError('Failed to fully close SQLite database', error);
      throw error;
    }
  }

  /**
   * Checks if the database is currently connected
   */
  isConnected(): boolean {
    return this.connectionState === 'connected';
  }

  /**
   * Gets the current connection state
   */
  getConnectionState(): SqliteConnectionState {
    return this.connectionState;
  }

  /**
   * Gets the Drizzle database instance
   * @throws Error if not connected
   */
  getDatabase(): ReturnType<typeof drizzle> {
    if (!this.isConnected()) {
      throw new Error('Database is not connected. Call connect() first.');
    }
    return this.db;
  }

  /**
   * Gets the raw SQLite client
   * @throws Error if not connected
   */
  getClient(): Database {
    if (!this.isConnected()) {
      throw new Error('Database is not connected. Call connect() first.');
    }
    return this.client;
  }

  /**
   * Gets the database client wrapper
   * @throws Error if not connected
   */
  getDatabaseClient(): SqliteDatabaseClient {
    if (!this.isConnected()) {
      throw new Error('Database is not connected. Call connect() first.');
    }
    return {
      db: this.db,
      client: this.client,
    };
  }

  /**
   * Ensures the database is connected, throws if not
   */
  ensureConnected(): void {
    if (!this.isConnected()) {
      throw new Error('Database is not connected. Call connect() first.');
    }
  }

  /**
   * Gets database health information
   */
  async getHealth(): Promise<SqliteDatabaseHealth> {
    const startTime = Date.now();
    let connected = false;
    let responseTime = 0;

    try {
      if (this.connectionState === 'connected') {
        await this.testConnection();
        connected = true;
      }
      responseTime = Date.now() - startTime;
    } catch (error) {
      responseTime = Date.now() - startTime;
      this.lastError =
        error instanceof Error ? error : new Error(String(error));
    }

    return {
      connected,
      responseTime,
      lastError: this.lastError || undefined,
      connectionAttempts: this.connectionAttempts,
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Performs a health check and logs the results
   */
  async performHealthCheck(): Promise<boolean> {
    try {
      const health = await this.getHealth();

      if (health.connected) {
        logger.info('SQLite database health check passed', {
          responseTime: health.responseTime,
          uptime: health.uptime,
        });
        return true;
      } else {
        logger.warn('SQLite database health check failed', {
          lastError: health.lastError?.message,
          connectionAttempts: health.connectionAttempts,
        });
        return false;
      }
    } catch (error) {
      logger.logError('SQLite database health check error', error);
      return false;
    }
  }

  /**
   * Reconnects to the database (disconnect then connect)
   */
  async reconnect(): Promise<void> {
    logger.info('Reconnecting to SQLite database');

    try {
      await this.disconnect();
    } catch (error) {
      logger.warn('Error during disconnect in reconnect', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Reset the connection state to ensure we can attempt a fresh connection
    this.connectionState = 'disconnected';
    this.connectionPromise = null;

    await this.connect();
  }

  /**
   * Gets connection statistics
   */
  getConnectionStats(): {
    state: SqliteConnectionState;
    attempts: number;
    lastConnectionTime: number;
    uptime: number;
    hasError: boolean;
    lastError?: string;
  } {
    return {
      state: this.connectionState,
      attempts: this.connectionAttempts,
      lastConnectionTime: this.lastConnectionTime,
      uptime: Date.now() - this.startTime,
      hasError: this.lastError !== null,
      lastError: this.lastError?.message,
    };
  }

  /**
   * Applies SQLite configuration parameters using PRAGMA statements
   * This method applies the configuration parameters from the config object to the SQLite client
   */
  /**
   * Applies SQLite configuration parameters via PRAGMA statements
   * with enhanced error handling to differentiate between mandatory and optional settings.
   */
  private applyConfigurationPragmas(): void {
    // Track which settings were successfully applied
    const appliedSettings = {
      busyTimeout: false,
      syncMode: false,
      cacheSize: false,
      foreignKeys: false,
      tempStore: false,
    };
    
    // Record any non-critical errors to report them together
    const nonCriticalErrors: Array<{ setting: string; error: string }> = [];
    
    try {
      // ----- CRITICAL SETTINGS (Application should not continue if these fail) -----
      
      // Apply busy timeout setting (CRITICAL)
      if (
        typeof this.config.sqliteBusyTimeout === 'number' &&
        this.config.sqliteBusyTimeout > 0
      ) {
        try {
          this.client.exec(
            `PRAGMA busy_timeout = ${this.config.sqliteBusyTimeout};`
          );
          appliedSettings.busyTimeout = true;
        } catch (error) {
          const errorMsg = `Failed to set SQLite busy_timeout (CRITICAL for concurrency): ${error instanceof Error ? error.message : String(error)}`;
          logger.error(errorMsg, {
            requestedValue: this.config.sqliteBusyTimeout,
            category: 'CRITICAL_SETTING'
          });
          throw new Error(errorMsg); // Critical setting - halt initialization
        }
      } else {
        logger.warn('SQLite busy_timeout not configured or invalid value - using SQLite default', {
          providedValue: this.config.sqliteBusyTimeout
        });
      }

      // Apply synchronous mode setting (CRITICAL for data integrity)
      if (this.config.sqliteSyncMode) {
        try {
          this.client.exec(`PRAGMA synchronous = ${this.config.sqliteSyncMode};`);
          appliedSettings.syncMode = true;
        } catch (error) {
          const errorMsg = `Failed to set SQLite synchronous mode (CRITICAL for data integrity): ${error instanceof Error ? error.message : String(error)}`;
          logger.error(errorMsg, { 
            requestedValue: this.config.sqliteSyncMode,
            category: 'CRITICAL_SETTING'
          });
          throw new Error(errorMsg); // Critical setting - halt initialization
        }
      } else {
        logger.warn('SQLite synchronous mode not configured - using SQLite default', {
          defaultValue: 'FULL'
        });
      }
      
      // ----- IMPORTANT BUT NON-CRITICAL SETTINGS (Continue with warnings) -----
      
      // Enable foreign keys constraint checking (IMPORTANT)
      try {
        this.client.exec('PRAGMA foreign_keys = ON;');
        appliedSettings.foreignKeys = true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        nonCriticalErrors.push({
          setting: 'foreign_keys',
          error: errorMessage
        });
        logger.warn('Failed to enable SQLite foreign_keys (continuing with SQLite default)', {
          errorMessage,
          category: 'IMPORTANT_SETTING'
        });
      }
      
      // ----- OPTIONAL PERFORMANCE SETTINGS (Continue with fallback) -----
      
      // Apply cache size setting (OPTIONAL - performance only)
      if (
        typeof this.config.sqliteCacheSize === 'number' &&
        this.config.sqliteCacheSize > 0
      ) {
        try {
          this.client.exec(`PRAGMA cache_size = ${this.config.sqliteCacheSize};`);
          appliedSettings.cacheSize = true;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          nonCriticalErrors.push({
            setting: 'cache_size',
            error: errorMessage
          });
          logger.warn('Failed to set SQLite cache_size (continuing with SQLite default)', {
            errorMessage,
            requestedValue: this.config.sqliteCacheSize,
            category: 'OPTIONAL_SETTING'
          });
        }
      }
      
      // Set temp store to memory for better performance (OPTIONAL)
      try {
        this.client.exec('PRAGMA temp_store = MEMORY;');
        appliedSettings.tempStore = true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        nonCriticalErrors.push({
          setting: 'temp_store',
          error: errorMessage
        });
        logger.warn('Failed to set SQLite temp_store to MEMORY (continuing with SQLite default)', {
          errorMessage,
          category: 'OPTIONAL_SETTING'
        });
      }

      // Log applied configurations in non-production environments
      if (process.env.NODE_ENV !== 'production') {
        logger.info('SQLite configuration parameters applied:', {
          busyTimeout: appliedSettings.busyTimeout ? this.config.sqliteBusyTimeout : 'default',
          syncMode: appliedSettings.syncMode ? this.config.sqliteSyncMode : 'default',
          cacheSize: appliedSettings.cacheSize ? this.config.sqliteCacheSize : 'default',
          foreignKeys: appliedSettings.foreignKeys ? 'ON' : 'default',
          tempStore: appliedSettings.tempStore ? 'MEMORY' : 'default',
        });
        
        // If any non-critical errors occurred, log them together for easier debugging
        if (nonCriticalErrors.length > 0) {
          logger.warn(`${nonCriticalErrors.length} non-critical SQLite settings failed to apply`, {
            errors: nonCriticalErrors
          });
        }
      }
    } catch (error) {
      // This will only catch errors not already handled in the individual try/catch blocks
      // These would be truly unexpected errors or critical setting failures
      logger.error('Critical error applying SQLite configuration parameters', {
        error: error instanceof Error ? error.stack : String(error),
        appliedSettingsBeforeError: appliedSettings
      });
      throw error; // Re-throw to halt initialization
    }
  }
}
