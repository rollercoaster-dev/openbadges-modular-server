/**
 * Repository factory for creating repository instances
 *
 * This factory is responsible for creating repository instances based on the
 * configured database module. It provides a unified interface for accessing
 * repositories regardless of the underlying database implementation.
 */

import postgres from 'postgres';
import { IssuerRepository } from '@domains/issuer/issuer.repository';
import { BadgeClassRepository } from '@domains/badgeClass/badgeClass.repository';
import { AssertionRepository } from '@domains/assertion/assertion.repository';
import { ApiKeyRepository } from '@domains/auth/apiKey.repository';
import { UserRepository } from '@domains/user/user.repository';
import { PlatformRepository } from '@domains/backpack/platform.repository';
import { PlatformUserRepository } from '@domains/backpack/platform-user.repository';
import { UserAssertionRepository } from '@domains/backpack/user-assertion.repository';
import { PostgresIssuerRepository } from './database/modules/postgresql/repositories/postgres-issuer.repository';
import { PostgresBadgeClassRepository } from './database/modules/postgresql/repositories/postgres-badge-class.repository';
import { PostgresAssertionRepository } from './database/modules/postgresql/repositories/postgres-assertion.repository';
import { PostgresApiKeyRepository } from './database/modules/postgresql/repositories/postgres-api-key.repository';
import { PostgresUserRepository } from './database/modules/postgresql/repositories/postgres-user.repository';
import { PostgresPlatformRepository } from './database/modules/postgresql/repositories/postgres-platform.repository';
import { PostgresPlatformUserRepository } from './database/modules/postgresql/repositories/postgres-platform-user.repository';
import { PostgresUserAssertionRepository } from './database/modules/postgresql/repositories/postgres-user-assertion.repository';
// All PostgreSQL repositories are now implemented
import { SqliteIssuerRepository } from './database/modules/sqlite/repositories/sqlite-issuer.repository';
import { SqliteBadgeClassRepository } from './database/modules/sqlite/repositories/sqlite-badge-class.repository';
import { SqliteAssertionRepository } from './database/modules/sqlite/repositories/sqlite-assertion.repository';
import { SqliteApiKeyRepository } from './database/modules/sqlite/repositories/sqlite-api-key.repository';
import { SqliteUserRepository } from './database/modules/sqlite/repositories/sqlite-user.repository';
import { SqlitePlatformRepository } from './database/modules/sqlite/repositories/sqlite-platform.repository';
import { SqlitePlatformUserRepository } from './database/modules/sqlite/repositories/sqlite-platform-user.repository';
import { SqliteUserAssertionRepository } from './database/modules/sqlite/repositories/sqlite-user-assertion.repository';
import { CachedIssuerRepository } from './cache/repositories/cached-issuer.repository';
import { CachedBadgeClassRepository } from './cache/repositories/cached-badge-class.repository';
import { CachedAssertionRepository } from './cache/repositories/cached-assertion.repository';
import { config } from '@/config/config';
import { logger } from '@utils/logging/logger.service';

export class RepositoryFactory {
  private static client: postgres.Sql | null = null;
  private static dbType: string = 'postgresql'; // Default database type
  private static isInitialized: boolean = false;

  /**
   * Initializes the repository factory with a database connection
   * @param config Database configuration
   */
  static async initialize(config: {
    type: string;
    connectionString: string;
    sqliteFile?: string;
    sqliteBusyTimeout?: number;
    sqliteSyncMode?: string;
    sqliteCacheSize?: number;
  }): Promise<void> {
    // Prevent multiple initializations
    if (this.isInitialized) {
      logger.warn(
        'RepositoryFactory already initialized. Skipping redundant initialization.'
      );
      return;
    }

    this.dbType = config.type;

    if (this.dbType === 'postgresql') {
      // Configure PostgreSQL client with connection pooling
      this.client = postgres(config.connectionString, {
        max: 20, // Maximum connections in pool
        idle_timeout: 30, // Close idle connections after 30 seconds
        connect_timeout: 10, // Connection timeout in seconds
        max_lifetime: 60 * 60, // Max connection lifetime in seconds
      });
    } else if (this.dbType === 'sqlite') {
      // SQLite doesn't need a client in the repository factory
      // It will be handled by the DatabaseFactory
    } else {
      throw new Error(`Unsupported database type: ${this.dbType}`);
    }

    // Mark as initialized
    this.isInitialized = true;
    logger.info(`Repository factory initialized with ${this.dbType} database`);
  }

  /**
   * Creates an issuer repository
   * @returns An implementation of IssuerRepository
   */
  static async createIssuerRepository(): Promise<IssuerRepository> {
    // Check if caching is enabled
    const enableCaching = config.cache?.enabled !== false;

    if (this.dbType === 'postgresql') {
      if (!this.client) {
        throw new Error('PostgreSQL client not initialized');
      }

      // Create the base repository
      const baseRepository = new PostgresIssuerRepository(this.client);

      // Wrap with cache if enabled
      return enableCaching
        ? new CachedIssuerRepository(baseRepository)
        : baseRepository;
    } else if (this.dbType === 'sqlite') {
      // Get SQLite database client
      const { Database } = await import('bun:sqlite');
      const sqliteFile = config.database.sqliteFile || ':memory:';
      const client = new Database(sqliteFile);

      // Create connection manager for the new pattern
      const { SqliteConnectionManager } = await import(
        './database/modules/sqlite/connection/sqlite-connection.manager'
      );
      const connectionManager = new SqliteConnectionManager(client, {
        maxConnectionAttempts: 3,
        connectionRetryDelayMs: 1000,
      });

      // Connect the connection manager
      await connectionManager.connect();

      // Create the base repository using the new pattern
      const baseRepository = new SqliteIssuerRepository(connectionManager);

      // Wrap with cache if enabled
      return enableCaching
        ? new CachedIssuerRepository(baseRepository)
        : baseRepository;
    }

    throw new Error(`Unsupported database type: ${this.dbType}`);
  }

  /**
   * Creates a badge class repository
   * @returns An implementation of BadgeClassRepository
   */
  static async createBadgeClassRepository(): Promise<BadgeClassRepository> {
    // Check if caching is enabled
    const enableCaching = config.cache?.enabled !== false;

    if (this.dbType === 'postgresql') {
      if (!this.client) {
        throw new Error('PostgreSQL client not initialized');
      }

      // Create the base repository
      const baseRepository = new PostgresBadgeClassRepository(this.client);

      // Wrap with cache if enabled
      return enableCaching
        ? new CachedBadgeClassRepository(baseRepository)
        : baseRepository;
    } else if (this.dbType === 'sqlite') {
      // Get SQLite database client
      const { Database } = await import('bun:sqlite');
      const sqliteFile = config.database.sqliteFile || ':memory:';
      const client = new Database(sqliteFile);

      // Create the base repository
      const baseRepository = new SqliteBadgeClassRepository(client);

      // Wrap with cache if enabled
      return enableCaching
        ? new CachedBadgeClassRepository(baseRepository)
        : baseRepository;
    }

    throw new Error(`Unsupported database type: ${this.dbType}`);
  }

  /**
   * Creates an assertion repository
   * @returns An implementation of AssertionRepository
   */
  static async createAssertionRepository(): Promise<AssertionRepository> {
    // Check if caching is enabled
    const enableCaching = config.cache?.enabled !== false;

    if (this.dbType === 'postgresql') {
      if (!this.client) {
        throw new Error('PostgreSQL client not initialized');
      }

      // Create the base repository
      const baseRepository = new PostgresAssertionRepository(this.client);

      // Wrap with cache if enabled
      return enableCaching
        ? new CachedAssertionRepository(baseRepository)
        : baseRepository;
    } else if (this.dbType === 'sqlite') {
      // Get SQLite database client
      const { Database } = await import('bun:sqlite');
      const sqliteFile = config.database.sqliteFile || ':memory:';
      const client = new Database(sqliteFile);

      // Create the base repository
      const baseRepository = new SqliteAssertionRepository(client);

      // Wrap with cache if enabled
      return enableCaching
        ? new CachedAssertionRepository(baseRepository)
        : baseRepository;
    }

    throw new Error(`Unsupported database type: ${this.dbType}`);
  }

  /**
   * Creates an API Key repository
   * @returns An implementation of ApiKeyRepository
   */
  static async createApiKeyRepository(): Promise<ApiKeyRepository> {
    if (this.dbType === 'postgresql') {
      if (!this.client) {
        throw new Error('PostgreSQL client not initialized');
      }

      // Create the repository (no caching for security-related repositories)
      return new PostgresApiKeyRepository(this.client);
    } else if (this.dbType === 'sqlite') {
      // Get SQLite database client
      const { Database } = await import('bun:sqlite');
      const sqliteFile = config.database.sqliteFile || ':memory:';
      const client = new Database(sqliteFile);

      // Create the repository
      return new SqliteApiKeyRepository(client);
    }

    throw new Error(`Unsupported database type: ${this.dbType}`);
  }

  /**
   * Creates a platform repository
   * @returns An implementation of PlatformRepository
   */
  static async createPlatformRepository(): Promise<PlatformRepository> {
    if (this.dbType === 'postgresql') {
      if (!this.client) {
        throw new Error('PostgreSQL client not initialized');
      }

      // Create the repository
      return new PostgresPlatformRepository(this.client);
    } else if (this.dbType === 'sqlite') {
      // Get SQLite database client
      const { Database } = await import('bun:sqlite');
      const sqliteFile = config.database.sqliteFile || ':memory:';
      const client = new Database(sqliteFile);

      // Create the repository
      return new SqlitePlatformRepository(client);
    }

    throw new Error(`Unsupported database type: ${this.dbType}`);
  }

  /**
   * Creates a platform user repository
   * @returns An implementation of PlatformUserRepository
   */
  static async createPlatformUserRepository(): Promise<PlatformUserRepository> {
    if (this.dbType === 'postgresql') {
      if (!this.client) {
        throw new Error('PostgreSQL client not initialized');
      }

      // Create the repository
      return new PostgresPlatformUserRepository(this.client);
    } else if (this.dbType === 'sqlite') {
      // Get SQLite database client
      const { Database } = await import('bun:sqlite');
      const sqliteFile = config.database.sqliteFile || ':memory:';
      const client = new Database(sqliteFile);

      // Create the repository
      return new SqlitePlatformUserRepository(client);
    }

    throw new Error(`Unsupported database type: ${this.dbType}`);
  }

  /**
   * Creates a user assertion repository
   * @returns An implementation of UserAssertionRepository
   */
  static async createUserAssertionRepository(): Promise<UserAssertionRepository> {
    if (this.dbType === 'postgresql') {
      if (!this.client) {
        throw new Error('PostgreSQL client not initialized');
      }

      // Create the repository
      return new PostgresUserAssertionRepository(this.client);
    } else if (this.dbType === 'sqlite') {
      // Get SQLite database client
      const { Database } = await import('bun:sqlite');
      const sqliteFile = config.database.sqliteFile || ':memory:';
      const client = new Database(sqliteFile);

      // Create the repository
      return new SqliteUserAssertionRepository(client);
    }

    throw new Error(`Unsupported database type: ${this.dbType}`);
  }

  /**
   * Creates a user repository
   * @returns An implementation of UserRepository
   */
  static async createUserRepository(): Promise<UserRepository> {
    if (this.dbType === 'postgresql') {
      if (!this.client) {
        throw new Error('PostgreSQL client not initialized');
      }

      // Create the repository
      return new PostgresUserRepository(this.client);
    } else if (this.dbType === 'sqlite') {
      // Get SQLite database client
      const { Database } = await import('bun:sqlite');
      const sqliteFile = config.database.sqliteFile || ':memory:';
      const client = new Database(sqliteFile);

      // Create the repository
      return new SqliteUserRepository(client);
    }

    throw new Error(`Unsupported database type: ${this.dbType}`);
  }

  /**
   * Closes the database connection
   */
  static async close(): Promise<void> {
    if (!this.isInitialized) {
      logger.warn('RepositoryFactory not initialized. Nothing to close.');
      return;
    }

    if (this.dbType === 'postgresql' && this.client) {
      await this.client.end();
      this.client = null;
    } else if (this.dbType === 'sqlite') {
      // SQLite connections are closed automatically when the Database object is garbage collected
      // But we can explicitly close any open connections if needed
      try {
        // No need to do anything here as SQLite connections are managed by the repositories
        logger.info('SQLite connections will be closed automatically');
      } catch (error) {
        logger.warn('Error handling SQLite connections', {
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Reset initialization state
    this.isInitialized = false;
    logger.info('Repository factory closed');
  }
}
