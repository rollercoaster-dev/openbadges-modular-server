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
import { StatusListRepository } from '@domains/status-list/status-list.repository';
import { ApiKeyRepository } from '@domains/auth/apiKey.repository';
import { UserRepository } from '@domains/user/user.repository';
import { PlatformRepository } from '@domains/backpack/platform.repository';
import { PlatformUserRepository } from '@domains/backpack/platform-user.repository';
import { UserAssertionRepository } from '@domains/backpack/user-assertion.repository';
import { PostgresIssuerRepository } from './database/modules/postgresql/repositories/postgres-issuer.repository';
import { PostgresBadgeClassRepository } from './database/modules/postgresql/repositories/postgres-badge-class.repository';
import { PostgresAssertionRepository } from './database/modules/postgresql/repositories/postgres-assertion.repository';
import { PostgresStatusListRepository } from './database/modules/postgresql/repositories/postgres-status-list.repository';
import { PostgresApiKeyRepository } from './database/modules/postgresql/repositories/postgres-api-key.repository';
import { PostgresUserRepository } from './database/modules/postgresql/repositories/postgres-user.repository';
import { PostgresPlatformRepository } from './database/modules/postgresql/repositories/postgres-platform.repository';
import { PostgresPlatformUserRepository } from './database/modules/postgresql/repositories/postgres-platform-user.repository';
import { PostgresUserAssertionRepository } from './database/modules/postgresql/repositories/postgres-user-assertion.repository';
// All PostgreSQL repositories are now implemented
import { SqliteIssuerRepository } from './database/modules/sqlite/repositories/sqlite-issuer.repository';
import { SqliteBadgeClassRepository } from './database/modules/sqlite/repositories/sqlite-badge-class.repository';
import { SqliteAssertionRepository } from './database/modules/sqlite/repositories/sqlite-assertion.repository';
import { SqliteStatusListRepository } from './database/modules/sqlite/repositories/sqlite-status-list.repository';
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
  private static sqliteConnectionManager:
    | import('./database/modules/sqlite/connection/sqlite-connection.manager').SqliteConnectionManager
    | null = null;

  // Promise to track ongoing initialization - serves as a mutex
  private static initializationPromise: Promise<void> | null = null;

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
    // Check if initialization is already in progress
    if (RepositoryFactory.initializationPromise) {
      // Wait for ongoing initialization to complete
      await RepositoryFactory.initializationPromise;
      return; // Initialization already completed by another call
    }

    // Prevent multiple initializations if already initialized
    if (RepositoryFactory.isInitialized) {
      logger.warn(
        'RepositoryFactory already initialized. Skipping redundant initialization.'
      );
      return;
    }

    // Create and store the initialization promise
    RepositoryFactory.initializationPromise = (async () => {
      try {
        RepositoryFactory.dbType = config.type;

        if (RepositoryFactory.dbType === 'postgresql') {
          // Configure PostgreSQL client with connection pooling
          RepositoryFactory.client = postgres(config.connectionString, {
            max: 20, // Maximum connections in pool
            idle_timeout: 30, // Close idle connections after 30 seconds
            connect_timeout: 10, // Connection timeout in seconds
            max_lifetime: 60 * 60, // Max connection lifetime in seconds
          });
        } else if (RepositoryFactory.dbType === 'sqlite') {
          // Only initialize if not already initialized
          if (!RepositoryFactory.sqliteConnectionManager) {
            // Create shared SQLite connection manager for resource management
            const { Database } = await import('bun:sqlite');
            const { SqliteConnectionManager } = await import(
              './database/modules/sqlite/connection/sqlite-connection.manager'
            );

            const sqliteFile = config.sqliteFile || ':memory:';
            const client = new Database(sqliteFile);

            RepositoryFactory.sqliteConnectionManager =
              new SqliteConnectionManager(client, {
                maxConnectionAttempts: 3,
                connectionRetryDelayMs: 1000,
                sqliteBusyTimeout: config.sqliteBusyTimeout,
                sqliteSyncMode: config.sqliteSyncMode as
                  | 'OFF'
                  | 'NORMAL'
                  | 'FULL'
                  | undefined,
                sqliteCacheSize: config.sqliteCacheSize,
              });

            // Connect the shared connection manager
            await RepositoryFactory.sqliteConnectionManager.connect();
            logger.info('SQLite connection manager initialized successfully');
          }
        } else {
          throw new Error(
            `Unsupported database type: ${RepositoryFactory.dbType}`
          );
        }

        // Mark as initialized
        RepositoryFactory.isInitialized = true;
        logger.info(
          `Repository factory initialized with ${RepositoryFactory.dbType} database`
        );
      } catch (error) {
        logger.error('Failed to initialize RepositoryFactory', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    })();

    // Wait for initialization to complete
    await RepositoryFactory.initializationPromise;
  }

  /**
   * Creates an issuer repository
   * @returns An implementation of IssuerRepository
   */
  static async createIssuerRepository(): Promise<IssuerRepository> {
    // Check if caching is enabled
    const enableCaching = config.cache?.enabled !== false;

    if (RepositoryFactory.dbType === 'postgresql') {
      if (!RepositoryFactory.client) {
        throw new Error('PostgreSQL client not initialized');
      }

      // Create the base repository
      const baseRepository = new PostgresIssuerRepository(
        RepositoryFactory.client
      );

      // Wrap with cache if enabled
      return enableCaching
        ? new CachedIssuerRepository(baseRepository)
        : baseRepository;
    } else if (RepositoryFactory.dbType === 'sqlite') {
      // Use the shared SQLite connection manager
      if (!RepositoryFactory.sqliteConnectionManager) {
        throw new Error('SQLite connection manager not initialized');
      }

      // Create the base repository using the shared connection manager
      const baseRepository = new SqliteIssuerRepository(
        RepositoryFactory.sqliteConnectionManager
      );

      // Wrap with cache if enabled
      return enableCaching
        ? new CachedIssuerRepository(baseRepository)
        : baseRepository;
    }

    throw new Error(`Unsupported database type: ${RepositoryFactory.dbType}`);
  }

  /**
   * Creates a badge class repository
   * @returns An implementation of BadgeClassRepository
   */
  static async createBadgeClassRepository(): Promise<BadgeClassRepository> {
    // Check if caching is enabled
    const enableCaching = config.cache?.enabled !== false;

    if (RepositoryFactory.dbType === 'postgresql') {
      if (!RepositoryFactory.client) {
        throw new Error('PostgreSQL client not initialized');
      }

      // Create the base repository
      const baseRepository = new PostgresBadgeClassRepository(
        RepositoryFactory.client
      );

      // Wrap with cache if enabled
      return enableCaching
        ? new CachedBadgeClassRepository(baseRepository)
        : baseRepository;
    } else if (RepositoryFactory.dbType === 'sqlite') {
      // Use the shared SQLite connection manager
      if (!RepositoryFactory.sqliteConnectionManager) {
        throw new Error('SQLite connection manager not initialized');
      }

      // Create the base repository using the shared connection manager
      const baseRepository = new SqliteBadgeClassRepository(
        RepositoryFactory.sqliteConnectionManager
      );

      // Wrap with cache if enabled
      return enableCaching
        ? new CachedBadgeClassRepository(baseRepository)
        : baseRepository;
    }

    throw new Error(`Unsupported database type: ${RepositoryFactory.dbType}`);
  }

  /**
   * Creates an assertion repository
   * @returns An implementation of AssertionRepository
   */
  static async createAssertionRepository(): Promise<AssertionRepository> {
    // Check if caching is enabled
    const enableCaching = config.cache?.enabled !== false;

    if (RepositoryFactory.dbType === 'postgresql') {
      if (!RepositoryFactory.client) {
        throw new Error('PostgreSQL client not initialized');
      }

      // Create the base repository
      const baseRepository = new PostgresAssertionRepository(
        RepositoryFactory.client
      );

      // Wrap with cache if enabled
      return enableCaching
        ? new CachedAssertionRepository(baseRepository)
        : baseRepository;
    } else if (RepositoryFactory.dbType === 'sqlite') {
      // Use the shared SQLite connection manager
      if (!RepositoryFactory.sqliteConnectionManager) {
        throw new Error('SQLite connection manager not initialized');
      }

      // Create the base repository using the shared connection manager
      const baseRepository = new SqliteAssertionRepository(
        RepositoryFactory.sqliteConnectionManager
      );

      // Wrap with cache if enabled
      return enableCaching
        ? new CachedAssertionRepository(baseRepository)
        : baseRepository;
    }

    throw new Error(`Unsupported database type: ${RepositoryFactory.dbType}`);
  }

  /**
   * Creates a status list repository
   * @returns An implementation of StatusListRepository
   */
  static async createStatusListRepository(): Promise<StatusListRepository> {
    if (RepositoryFactory.dbType === 'postgresql') {
      if (!RepositoryFactory.client) {
        throw new Error('PostgreSQL client not initialized');
      }

      // Create the repository
      return new PostgresStatusListRepository(RepositoryFactory.client);
    } else if (RepositoryFactory.dbType === 'sqlite') {
      // Use the shared SQLite connection manager
      if (!RepositoryFactory.sqliteConnectionManager) {
        throw new Error('SQLite connection manager not initialized');
      }

      // Create the repository using the shared connection manager
      return new SqliteStatusListRepository(
        RepositoryFactory.sqliteConnectionManager
      );
    }

    throw new Error(`Unsupported database type: ${RepositoryFactory.dbType}`);
  }

  /**
   * Creates an API Key repository
   * @returns An implementation of ApiKeyRepository
   */
  static async createApiKeyRepository(): Promise<ApiKeyRepository> {
    if (RepositoryFactory.dbType === 'postgresql') {
      if (!RepositoryFactory.client) {
        throw new Error('PostgreSQL client not initialized');
      }

      // Create the repository (no caching for security-related repositories)
      return new PostgresApiKeyRepository(RepositoryFactory.client);
    } else if (RepositoryFactory.dbType === 'sqlite') {
      // Use the shared SQLite connection manager
      if (!RepositoryFactory.sqliteConnectionManager) {
        throw new Error('SQLite connection manager not initialized');
      }

      // Create the repository using the shared connection manager
      return new SqliteApiKeyRepository(
        RepositoryFactory.sqliteConnectionManager
      );
    }

    throw new Error(`Unsupported database type: ${RepositoryFactory.dbType}`);
  }

  /**
   * Creates a platform repository
   * @returns An implementation of PlatformRepository
   */
  static async createPlatformRepository(): Promise<PlatformRepository> {
    if (RepositoryFactory.dbType === 'postgresql') {
      if (!RepositoryFactory.client) {
        throw new Error('PostgreSQL client not initialized');
      }

      // Create the repository
      return new PostgresPlatformRepository(RepositoryFactory.client);
    } else if (RepositoryFactory.dbType === 'sqlite') {
      // Use the shared SQLite connection manager
      if (!RepositoryFactory.sqliteConnectionManager) {
        throw new Error('SQLite connection manager not initialized');
      }

      // Create the repository using the shared connection manager
      return new SqlitePlatformRepository(
        RepositoryFactory.sqliteConnectionManager
      );
    }

    throw new Error(`Unsupported database type: ${RepositoryFactory.dbType}`);
  }

  /**
   * Creates a platform user repository
   * @returns An implementation of PlatformUserRepository
   */
  static async createPlatformUserRepository(): Promise<PlatformUserRepository> {
    if (RepositoryFactory.dbType === 'postgresql') {
      if (!RepositoryFactory.client) {
        throw new Error('PostgreSQL client not initialized');
      }

      // Create the repository
      return new PostgresPlatformUserRepository(RepositoryFactory.client);
    } else if (RepositoryFactory.dbType === 'sqlite') {
      // Use the shared SQLite connection manager
      if (!RepositoryFactory.sqliteConnectionManager) {
        throw new Error('SQLite connection manager not initialized');
      }

      // Create the repository using the shared connection manager
      return new SqlitePlatformUserRepository(
        RepositoryFactory.sqliteConnectionManager
      );
    }

    throw new Error(`Unsupported database type: ${RepositoryFactory.dbType}`);
  }

  /**
   * Creates a user assertion repository
   * @returns An implementation of UserAssertionRepository
   */
  static async createUserAssertionRepository(): Promise<UserAssertionRepository> {
    if (RepositoryFactory.dbType === 'postgresql') {
      if (!RepositoryFactory.client) {
        throw new Error('PostgreSQL client not initialized');
      }

      // Create the repository
      return new PostgresUserAssertionRepository(RepositoryFactory.client);
    } else if (RepositoryFactory.dbType === 'sqlite') {
      // Use the shared SQLite connection manager
      if (!RepositoryFactory.sqliteConnectionManager) {
        throw new Error('SQLite connection manager not initialized');
      }

      // Create the repository using the shared connection manager
      return new SqliteUserAssertionRepository(
        RepositoryFactory.sqliteConnectionManager
      );
    }

    throw new Error(`Unsupported database type: ${RepositoryFactory.dbType}`);
  }

  /**
   * Creates a user repository
   * @returns An implementation of UserRepository
   */
  static async createUserRepository(): Promise<UserRepository> {
    if (RepositoryFactory.dbType === 'postgresql') {
      if (!RepositoryFactory.client) {
        throw new Error('PostgreSQL client not initialized');
      }

      // Create the repository
      return new PostgresUserRepository(RepositoryFactory.client);
    } else if (RepositoryFactory.dbType === 'sqlite') {
      // Use the shared SQLite connection manager
      if (!RepositoryFactory.sqliteConnectionManager) {
        throw new Error('SQLite connection manager not initialized');
      }

      // Create the repository using the shared connection manager
      return new SqliteUserRepository(
        RepositoryFactory.sqliteConnectionManager
      );
    }

    throw new Error(`Unsupported database type: ${RepositoryFactory.dbType}`);
  }

  /**
   * Closes the database connection
   */
  static async close(): Promise<void> {
    // Wait for any ongoing initialization to complete before attempting to close
    if (RepositoryFactory.initializationPromise) {
      try {
        await RepositoryFactory.initializationPromise;
      } catch (error) {
        // If initialization failed, log and continue with cleanup
        logger.warn('Initialization was in progress but failed during close', {
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (!RepositoryFactory.isInitialized) {
      logger.warn('RepositoryFactory not initialized. Nothing to close.');
      return;
    }

    if (RepositoryFactory.dbType === 'postgresql' && RepositoryFactory.client) {
      try {
        await RepositoryFactory.client.end();
        logger.info('PostgreSQL client closed successfully');
      } catch (e) {
        logger.warn('Failed to close PostgreSQL client', {
          errorMessage: e instanceof Error ? e.message : String(e),
        });
      }
      RepositoryFactory.client = null;
    } else if (
      RepositoryFactory.dbType === 'sqlite' &&
      RepositoryFactory.sqliteConnectionManager
    ) {
      // Properly disconnect the shared SQLite connection manager
      try {
        await RepositoryFactory.sqliteConnectionManager.disconnect();
        RepositoryFactory.sqliteConnectionManager = null;
        logger.info('SQLite connection manager disconnected successfully');
      } catch (error) {
        logger.warn('Failed to disconnect SQLite connection manager', {
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Reset initialization state
    RepositoryFactory.isInitialized = false;
    // Reset initialization promise
    RepositoryFactory.initializationPromise = null;
    logger.info('Repository factory closed');
  }

  /**
   * Check if the repository factory has an active database connection
   * @returns true if the factory has a working database connection
   */
  static async isConnected(): Promise<boolean> {
    if (!RepositoryFactory.isInitialized) {
      return false;
    }

    try {
      if (
        RepositoryFactory.dbType === 'postgresql' &&
        RepositoryFactory.client
      ) {
        // Test PostgreSQL connection with a simple query
        await RepositoryFactory.client`SELECT 1`;
        return true;
      } else if (
        RepositoryFactory.dbType === 'sqlite' &&
        RepositoryFactory.sqliteConnectionManager
      ) {
        // Test SQLite connection
        const ok =
          await RepositoryFactory.sqliteConnectionManager.isConnected();
        return ok;
      }
      return false;
    } catch {
      logger.debug(
        'RepositoryFactory.isConnected(): connectivity check failed'
      );
      return false;
    }
  }

  /**
   * Gets the SQLite connection manager for migrations and other operations
   * @returns The SQLite connection manager or null if not initialized
   */
  static getSqliteConnectionManager():
    | import('./database/modules/sqlite/connection/sqlite-connection.manager').SqliteConnectionManager
    | null {
    return RepositoryFactory.sqliteConnectionManager;
  }
}
