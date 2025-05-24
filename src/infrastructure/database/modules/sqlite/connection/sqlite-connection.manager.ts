/**
 * SQLite Connection Manager
 *
 * This class handles SQLite database connection management with proper type safety,
 * error handling, and connection state management.
 */

import { drizzle } from 'drizzle-orm/bun-sqlite';
import type { Database } from 'bun:sqlite';
import { logger } from '@utils/logging/logger.service';
import { SqlitePragmaManager } from '../utils/sqlite-pragma.manager';
import {
  SqliteConnectionConfig,
  SqliteConnectionConfigInput,
  SqliteConnectionState,
  SqliteDatabaseClient,
  SqliteConnectionError,
  SqliteDatabaseHealth,
  createSqliteConnectionConfig,
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

  /**
   * Creates a new SQLite connection manager with proper error handling during initialization
   *
   * @param client The SQLite database client
   * @param config Configuration for the connection, including critical and optional settings
   * @throws Error if critical configuration parameters fail to apply
   */
  constructor(client: Database, config: SqliteConnectionConfigInput = {}) {
    try {
      if (!client) {
        throw new Error('SQLite client is required for connection manager');
      }

      this.client = client;
      this.db = drizzle(client);

      // Validate and normalize configuration using factory function
      this.config = createSqliteConnectionConfig(config);

      // Apply SQLite configuration parameters using PRAGMA statements
      // This may throw for critical settings - let it propagate
      this.applyConfigurationPragmas();

      logger.info('SQLite connection manager initialized successfully');
    } catch (error) {
      const errorMsg = `Failed to initialize SQLite connection manager: ${
        error instanceof Error ? error.message : String(error)
      }`;
      logger.error(errorMsg, {
        error: error instanceof Error ? error.stack : String(error),
        config: {
          // Log config but omit any sensitive data that might be present
          maxConnectionAttempts: config?.maxConnectionAttempts,
          connectionRetryDelayMs: config?.connectionRetryDelayMs,
          sqliteBusyTimeout: config?.sqliteBusyTimeout,
          sqliteSyncMode: config?.sqliteSyncMode,
          sqliteCacheSize: config?.sqliteCacheSize,
        },
      });
      throw new Error(errorMsg);
    }
  }

  /**
   * Establishes a connection to the SQLite database
   */
  async connect(): Promise<void> {
    const startTime = Date.now();

    // Prevent operations on closed connections
    if (this.connectionState === 'closed') {
      throw new Error(
        'Cannot connect to a closed database connection. Create a new connection manager.'
      );
    }

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
          logger.error(errorMessage, {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
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

      logger.error('Failed to disconnect SQLite database', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Fully closes the database connection, invalidating the client
   * Note: After calling this method, reconnect() will not work
   * This should only be used when completely shutting down the application
   */
  async close(): Promise<void> {
    if (
      this.connectionState === 'disconnected' ||
      this.connectionState === 'closed'
    ) {
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

      // Mark as truly closed so that reconnect() won't reuse a closed client
      this.connectionState = 'closed';
      this.connectionAttempts = 0;
      this.lastError = null;

      if (process.env.NODE_ENV !== 'production') {
        logger.info('SQLite database fully closed');
      }
    } catch (error) {
      this.connectionState = 'error';
      this.lastError =
        error instanceof Error ? error : new Error(String(error));

      logger.error('Failed to fully close SQLite database', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
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
   * Gets detailed database health information including SQLite configuration status
   */
  async getHealth(): Promise<SqliteDatabaseHealth> {
    const startTime = Date.now();
    let connected = false;
    let responseTime = 0;

    // Will store SQLite PRAGMA results
    const configInfo: SqliteDatabaseHealth['configuration'] = {
      appliedSettings: {
        busyTimeout: false,
        syncMode: false,
        cacheSize: false,
        foreignKeys: false,
        tempStore: false,
      },
    };

    try {
      if (this.connectionState === 'connected') {
        // Test basic connection
        await this.testConnection();
        connected = true;

        // Get PRAGMA values to include in health check
        if (connected) {
          try {
            // Get busy_timeout setting
            const busyTimeoutResult = this.client
              .query('PRAGMA busy_timeout;')
              .get() as { busy_timeout?: number } | null;
            if (busyTimeoutResult && 'busy_timeout' in busyTimeoutResult) {
              configInfo.busyTimeout = busyTimeoutResult.busy_timeout;
              configInfo.appliedSettings.busyTimeout = true;
            }

            // Get synchronous mode
            const syncModeResult = this.client
              .query('PRAGMA synchronous;')
              .get() as { synchronous?: number | string } | null;
            if (syncModeResult && 'synchronous' in syncModeResult) {
              configInfo.syncMode = String(syncModeResult.synchronous);
              configInfo.appliedSettings.syncMode = true;
            }

            // Get cache size
            const cacheSizeResult = this.client
              .query('PRAGMA cache_size;')
              .get() as { cache_size?: number } | null;
            if (cacheSizeResult && 'cache_size' in cacheSizeResult) {
              configInfo.cacheSize = cacheSizeResult.cache_size;
              configInfo.appliedSettings.cacheSize = true;
            }

            // Get journal mode
            const journalModeResult = this.client
              .query('PRAGMA journal_mode;')
              .get() as { journal_mode?: string } | null;
            if (journalModeResult && 'journal_mode' in journalModeResult) {
              configInfo.journalMode = String(journalModeResult.journal_mode);
            }

            // Check foreign keys status
            const foreignKeysResult = this.client
              .query('PRAGMA foreign_keys;')
              .get() as { foreign_keys?: number } | null;
            if (foreignKeysResult && 'foreign_keys' in foreignKeysResult) {
              configInfo.foreignKeys = Boolean(foreignKeysResult.foreign_keys);
              configInfo.appliedSettings.foreignKeys = true;
            }

            // Get temp_store setting
            const tempStoreResult = this.client
              .query('PRAGMA temp_store;')
              .get() as { temp_store?: number } | null;
            if (
              tempStoreResult &&
              'temp_store' in tempStoreResult &&
              tempStoreResult.temp_store === 2
            ) {
              // 2 = MEMORY
              configInfo.appliedSettings.tempStore = true;
            }

            // Estimate memory usage (if available)
            try {
              const memoryUsed = this.client
                .query('PRAGMA memory_used;')
                .get() as { memory_used?: number } | null;
              if (memoryUsed && 'memory_used' in memoryUsed) {
                configInfo.memoryUsage = memoryUsed.memory_used;
              }
            } catch {
              // Memory usage stats not available in all SQLite versions
            }
          } catch (configError) {
            // Log but don't fail the health check due to config info issues
            logger.warn(
              'Error getting SQLite configuration details during health check',
              {
                error:
                  configError instanceof Error
                    ? configError.message
                    : String(configError),
              }
            );
          }
        }
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
      configuration: configInfo,
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
          configuration: health.configuration,
        });
        return true;
      } else {
        logger.warn('SQLite database health check failed', {
          lastError: health.lastError?.message,
          connectionAttempts: health.connectionAttempts,
          partialConfiguration: health.configuration,
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
    // Prevent reconnection on closed connections
    if (this.connectionState === 'closed') {
      throw new Error(
        'Cannot reconnect a closed database connection. Create a new connection manager.'
      );
    }

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
   * Applies SQLite configuration parameters using the centralized PRAGMA manager
   */
  private applyConfigurationPragmas(): void {
    try {
      // Extract only PRAGMA-related properties from the full connection config
      const pragmaConfig = {
        sqliteBusyTimeout: this.config.sqliteBusyTimeout,
        sqliteSyncMode: this.config.sqliteSyncMode,
        sqliteCacheSize: this.config.sqliteCacheSize,
      };

      // Use the centralized PRAGMA manager for consistent application
      const result = SqlitePragmaManager.applyPragmas(
        this.client,
        pragmaConfig
      );

      // Log successful application in development mode only
      // (Failures are already logged by the PRAGMA manager in both dev and production)
      if (process.env.NODE_ENV !== 'production') {
        logger.info('SQLite PRAGMA settings applied via centralized manager', {
          appliedSettings: result.appliedSettings,
          criticalSettingsApplied: result.criticalSettingsApplied,
          failedSettingsCount: result.failedSettings.length,
        });
      }
    } catch (error) {
      // Critical PRAGMA settings failed - this should halt initialization
      logger.error('Critical SQLite PRAGMA settings failed to apply', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error; // Re-throw to halt initialization
    }
  }
}
