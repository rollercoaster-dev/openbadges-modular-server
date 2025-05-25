/**
 * PostgreSQL Connection Manager
 *
 * Manages PostgreSQL database connections with proper state management,
 * health monitoring, configuration management, and error handling.
 * Provides similar functionality to SqliteConnectionManager for consistency.
 */

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { logger } from '@utils/logging/logger.service';
import {
  PostgresConnectionConfig,
  PostgresConnectionState,
  PostgresDatabaseHealth,
  PostgresConnectionError,
  createPostgresConnectionConfig,
} from '../types/postgres-database.types';

/**
 * PostgreSQL Connection Manager
 * 
 * Provides centralized connection management for PostgreSQL databases with:
 * - Connection state tracking and health monitoring
 * - Automatic reconnection with exponential backoff
 * - Configuration validation and management
 * - Comprehensive error handling and logging
 */
export class PostgresConnectionManager {
  private client: postgres.Sql | null = null;
  private db: ReturnType<typeof drizzle> | null = null;
  private connectionState: PostgresConnectionState = 'disconnected';
  private connectionAttempts = 0;
  private lastError: Error | null = null;
  private readonly config: PostgresConnectionConfig;
  private readonly maxRetries = 3;
  private readonly baseRetryDelay = 1000; // 1 second

  constructor(config: Partial<PostgresConnectionConfig> & { connectionString: string }) {
    this.config = createPostgresConnectionConfig(config);
    this.validateConfiguration();
  }

  /**
   * Validates the PostgreSQL configuration
   */
  private validateConfiguration(): void {
    if (!this.config.connectionString || typeof this.config.connectionString !== 'string') {
      throw new Error('PostgreSQL connection string is required and must be a string');
    }

    // Basic connection string validation
    if (!this.config.connectionString.startsWith('postgres://') && 
        !this.config.connectionString.startsWith('postgresql://')) {
      throw new Error('PostgreSQL connection string must start with postgres:// or postgresql://');
    }

    // Validate numeric configuration values
    if (this.config.maxConnections && (this.config.maxConnections <= 0 || this.config.maxConnections > 1000)) {
      throw new Error('PostgreSQL maxConnections must be between 1 and 1000');
    }

    if (this.config.connectTimeout && (this.config.connectTimeout <= 0 || this.config.connectTimeout > 60)) {
      throw new Error('PostgreSQL connectTimeout must be between 1 and 60 seconds');
    }
  }

  /**
   * Establishes connection to PostgreSQL database
   */
  async connect(): Promise<void> {
    if (this.connectionState === 'connected') {
      return;
    }

    if (this.connectionState === 'connecting') {
      throw new Error('Connection attempt already in progress');
    }

    if (this.connectionState === 'closed') {
      throw new Error('Connection manager has been closed. Create a new instance to reconnect.');
    }

    this.connectionState = 'connecting';
    this.connectionAttempts++;

    try {
      // Create PostgreSQL client with configuration
      this.client = postgres(this.config.connectionString, {
        max: this.config.maxConnections,
        idle_timeout: this.config.idleTimeout,
        connect_timeout: this.config.connectTimeout,
        max_lifetime: this.config.maxLifetime,
        ssl: this.config.ssl,
        onnotice: (notice) => {
          logger.debug('PostgreSQL notice', { notice: notice.message });
        },
        onparameter: (key, value) => {
          logger.debug('PostgreSQL parameter', { key, value });
        },
      });

      // Test the connection
      await this.testConnection();

      // Create Drizzle instance
      this.db = drizzle(this.client);

      this.connectionState = 'connected';
      this.lastError = null;

      if (process.env.NODE_ENV !== 'production') {
        logger.info('PostgreSQL database connected successfully', {
          maxConnections: this.config.maxConnections,
          connectTimeout: this.config.connectTimeout,
          attempts: this.connectionAttempts,
        });
      }
    } catch (error) {
      this.connectionState = 'error';
      this.lastError = error instanceof Error ? error : new Error(String(error));

      logger.error('Failed to connect to PostgreSQL database', {
        error: this.lastError.message,
        stack: this.lastError.stack,
        attempts: this.connectionAttempts,
        config: {
          maxConnections: this.config.maxConnections,
          connectTimeout: this.config.connectTimeout,
          idleTimeout: this.config.idleTimeout,
        },
      });

      // Clean up on failure
      if (this.client) {
        try {
          await this.client.end();
        } catch (cleanupError) {
          logger.warn('Error during connection cleanup', {
            error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
          });
        }
        this.client = null;
      }

      throw this.lastError;
    }
  }

  /**
   * Tests the database connection
   */
  private async testConnection(): Promise<void> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      // Simple query to test connection
      await this.client`SELECT 1 as test`;
    } catch (error) {
      const pgError = error as PostgresConnectionError;
      throw new Error(`PostgreSQL connection test failed: ${pgError.message || String(error)}`);
    }
  }

  /**
   * Reconnects to the database with exponential backoff
   */
  async reconnect(): Promise<void> {
    if (this.connectionState === 'closed') {
      throw new Error('Connection manager has been closed. Create a new instance to reconnect.');
    }

    if (this.connectionAttempts >= this.maxRetries) {
      throw new Error(`Maximum reconnection attempts (${this.maxRetries}) exceeded`);
    }

    // Calculate delay with exponential backoff
    const delay = this.baseRetryDelay * Math.pow(2, this.connectionAttempts - 1);
    
    logger.info('Attempting to reconnect to PostgreSQL database', {
      attempt: this.connectionAttempts + 1,
      maxRetries: this.maxRetries,
      delay,
    });

    // Wait before attempting reconnection
    await new Promise(resolve => setTimeout(resolve, delay));

    // Disconnect first if needed
    if (this.connectionState !== 'disconnected') {
      await this.disconnect();
    }

    // Attempt to connect
    await this.connect();
  }

  /**
   * Disconnects from the PostgreSQL database
   */
  async disconnect(): Promise<void> {
    if (this.connectionState === 'disconnected') {
      return;
    }

    try {
      if (this.client) {
        await this.client.end();
        this.client = null;
      }

      this.db = null;
      this.connectionState = 'disconnected';
      this.connectionAttempts = 0;
      this.lastError = null;

      if (process.env.NODE_ENV !== 'production') {
        logger.info('PostgreSQL database disconnected successfully');
      }
    } catch (error) {
      this.connectionState = 'error';
      this.lastError = error instanceof Error ? error : new Error(String(error));

      logger.error('Failed to disconnect PostgreSQL database', {
        error: this.lastError.message,
        stack: this.lastError.stack,
      });
      throw this.lastError;
    }
  }

  /**
   * Fully closes the database connection, invalidating the manager
   */
  async close(): Promise<void> {
    if (this.connectionState === 'closed') {
      return;
    }

    try {
      if (this.client) {
        await this.client.end();
        this.client = null;
      }

      this.db = null;
      this.connectionState = 'closed';
      this.connectionAttempts = 0;
      this.lastError = null;

      if (process.env.NODE_ENV !== 'production') {
        logger.info('PostgreSQL database connection manager closed');
      }
    } catch (error) {
      this.connectionState = 'error';
      this.lastError = error instanceof Error ? error : new Error(String(error));

      logger.error('Failed to close PostgreSQL database connection manager', {
        error: this.lastError.message,
        stack: this.lastError.stack,
      });
      throw this.lastError;
    }
  }

  /**
   * Gets the current database instance
   */
  getDatabase(): ReturnType<typeof drizzle> {
    if (!this.db || this.connectionState !== 'connected') {
      throw new Error('Database is not connected. Call connect() first.');
    }
    return this.db;
  }

  /**
   * Gets the raw PostgreSQL client
   */
  getClient(): postgres.Sql {
    if (!this.client || this.connectionState !== 'connected') {
      throw new Error('Database client is not connected. Call connect() first.');
    }
    return this.client;
  }

  /**
   * Gets the current connection state
   */
  getConnectionState(): PostgresConnectionState {
    return this.connectionState;
  }

  /**
   * Checks if the database is connected
   */
  isConnected(): boolean {
    return this.connectionState === 'connected' && this.client !== null && this.db !== null;
  }

  /**
   * Gets comprehensive health information about the database connection
   */
  async getHealth(): Promise<PostgresDatabaseHealth> {
    const startTime = Date.now();
    let connected = false;
    let responseTime = 0;

    try {
      if (this.isConnected()) {
        // Test connection with a simple query
        await this.client!`SELECT 1 as health_check`;
        connected = true;
        responseTime = Date.now() - startTime;
      }
    } catch (error) {
      logger.warn('Health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const health: PostgresDatabaseHealth = {
      connected,
      responseTime,
      uptime: connected ? Date.now() - startTime : 0,
      connectionAttempts: this.connectionAttempts,
      lastError: this.lastError,
      configuration: {
        maxConnections: this.config.maxConnections,
        // Note: PostgreSQL doesn't expose active/idle connection counts easily
        // These would require additional monitoring setup
        activeConnections: undefined,
        idleConnections: undefined,
        version: undefined, // Could be populated with a version query
      },
    };

    return health;
  }

  /**
   * Gets the current configuration
   */
  getConfiguration(): PostgresConnectionConfig {
    return { ...this.config };
  }
}
