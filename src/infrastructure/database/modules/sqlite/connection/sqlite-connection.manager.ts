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

      // Close the database connection
      if (typeof this.client.close === 'function') {
        this.client.close();
      }

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
}
