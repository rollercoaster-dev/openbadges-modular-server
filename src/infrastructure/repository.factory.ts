/**
 * Repository factory for creating repository instances
 *
 * This factory is responsible for creating repository instances based on the
 * configured database module. It provides a unified interface for accessing
 * repositories regardless of the underlying database implementation.
 */

import postgres from 'postgres';
import { IssuerRepository } from '../domains/issuer/issuer.repository';
import { BadgeClassRepository } from '../domains/badgeClass/badgeClass.repository';
import { AssertionRepository } from '../domains/assertion/assertion.repository';
import { PostgresIssuerRepository } from './database/modules/postgresql/repositories/postgres-issuer.repository';
import { PostgresBadgeClassRepository } from './database/modules/postgresql/repositories/postgres-badge-class.repository';
import { PostgresAssertionRepository } from './database/modules/postgresql/repositories/postgres-assertion.repository';
import { CachedIssuerRepository } from './cache/repositories/cached-issuer.repository';
import { CachedBadgeClassRepository } from './cache/repositories/cached-badge-class.repository';
import { CachedAssertionRepository } from './cache/repositories/cached-assertion.repository';
import { config } from '../config/config';

export class RepositoryFactory {
  private static client: postgres.Sql | null = null;
  private static dbType: string = 'postgresql'; // Default database type

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
  }

  /**
   * Creates an issuer repository
   * @returns An implementation of IssuerRepository
   */
  static createIssuerRepository(): IssuerRepository {
    // Check if caching is enabled
    const enableCaching = config.cache?.enabled !== false;

    if (this.dbType === 'postgresql') {
      if (!this.client) {
        throw new Error('PostgreSQL client not initialized');
      }

      // Create the base repository
      const baseRepository = new PostgresIssuerRepository(this.client);

      // Wrap with cache if enabled
      return enableCaching ? new CachedIssuerRepository(baseRepository) : baseRepository;
    } else if (this.dbType === 'sqlite') {
      // For SQLite, we'll use a placeholder repository that delegates to the DatabaseInterface
      // This is a temporary solution until we implement proper SQLite repositories
      return {
        create: async (issuer) => {
          const db = await import('./database/database.factory')
            .then(m => m.DatabaseFactory.createDatabase('sqlite'));
          return db.createIssuer(issuer);
        },
        findById: async (id) => {
          const db = await import('./database/database.factory')
            .then(m => m.DatabaseFactory.createDatabase('sqlite'));
          return db.getIssuerById(id);
        },
        update: async (id, issuer) => {
          const db = await import('./database/database.factory')
            .then(m => m.DatabaseFactory.createDatabase('sqlite'));
          return db.updateIssuer(id, issuer);
        },
        delete: async (id) => {
          const db = await import('./database/database.factory')
            .then(m => m.DatabaseFactory.createDatabase('sqlite'));
          return db.deleteIssuer(id);
        },
        findAll: async () => {
          // This is a placeholder - we need to implement this in the DatabaseInterface
          return [];
        }
      };
    }

    throw new Error(`Unsupported database type: ${this.dbType}`);
  }

  /**
   * Creates a badge class repository
   * @returns An implementation of BadgeClassRepository
   */
  static createBadgeClassRepository(): BadgeClassRepository {
    // Check if caching is enabled
    const enableCaching = config.cache?.enabled !== false;

    if (this.dbType === 'postgresql') {
      if (!this.client) {
        throw new Error('PostgreSQL client not initialized');
      }

      // Create the base repository
      const baseRepository = new PostgresBadgeClassRepository(this.client);

      // Wrap with cache if enabled
      return enableCaching ? new CachedBadgeClassRepository(baseRepository) : baseRepository;
    } else if (this.dbType === 'sqlite') {
      // For SQLite, we'll use a placeholder repository that delegates to the DatabaseInterface
      return {
        create: async (badgeClass) => {
          const db = await import('./database/database.factory')
            .then(m => m.DatabaseFactory.createDatabase('sqlite'));
          return db.createBadgeClass(badgeClass);
        },
        findById: async (id) => {
          const db = await import('./database/database.factory')
            .then(m => m.DatabaseFactory.createDatabase('sqlite'));
          return db.getBadgeClassById(id);
        },
        findByIssuer: async (issuerId) => {
          const db = await import('./database/database.factory')
            .then(m => m.DatabaseFactory.createDatabase('sqlite'));
          return db.getBadgeClassesByIssuer(issuerId);
        },
        update: async (id, badgeClass) => {
          const db = await import('./database/database.factory')
            .then(m => m.DatabaseFactory.createDatabase('sqlite'));
          return db.updateBadgeClass(id, badgeClass);
        },
        delete: async (id) => {
          const db = await import('./database/database.factory')
            .then(m => m.DatabaseFactory.createDatabase('sqlite'));
          return db.deleteBadgeClass(id);
        },
        findAll: async () => {
          // This is a placeholder - we need to implement this in the DatabaseInterface
          return [];
        }
      };
    }

    throw new Error(`Unsupported database type: ${this.dbType}`);
  }

  /**
   * Creates an assertion repository
   * @returns An implementation of AssertionRepository
   */
  static createAssertionRepository(): AssertionRepository {
    // Check if caching is enabled
    const enableCaching = config.cache?.enabled !== false;

    if (this.dbType === 'postgresql') {
      if (!this.client) {
        throw new Error('PostgreSQL client not initialized');
      }

      // Create the base repository
      const baseRepository = new PostgresAssertionRepository(this.client);

      // Wrap with cache if enabled
      return enableCaching ? new CachedAssertionRepository(baseRepository) : baseRepository;
    } else if (this.dbType === 'sqlite') {
      // For SQLite, we'll use a placeholder repository that delegates to the DatabaseInterface
      return {
        create: async (assertion) => {
          const db = await import('./database/database.factory')
            .then(m => m.DatabaseFactory.createDatabase('sqlite'));
          return db.createAssertion(assertion);
        },
        findById: async (id) => {
          const db = await import('./database/database.factory')
            .then(m => m.DatabaseFactory.createDatabase('sqlite'));
          return db.getAssertionById(id);
        },
        findByBadgeClass: async (badgeClassId) => {
          const db = await import('./database/database.factory')
            .then(m => m.DatabaseFactory.createDatabase('sqlite'));
          return db.getAssertionsByBadgeClass(badgeClassId);
        },
        findByRecipient: async (recipientId) => {
          const db = await import('./database/database.factory')
            .then(m => m.DatabaseFactory.createDatabase('sqlite'));
          return db.getAssertionsByRecipient(recipientId);
        },
        update: async (id, assertion) => {
          const db = await import('./database/database.factory')
            .then(m => m.DatabaseFactory.createDatabase('sqlite'));
          return db.updateAssertion(id, assertion);
        },
        delete: async (id) => {
          const db = await import('./database/database.factory')
            .then(m => m.DatabaseFactory.createDatabase('sqlite'));
          return db.deleteAssertion(id);
        },
        findAll: async () => {
          // This is a placeholder - we need to implement this in the DatabaseInterface
          return [];
        },
        revoke: async (id, reason) => {
          const db = await import('./database/database.factory')
            .then(m => m.DatabaseFactory.createDatabase('sqlite'));
          const assertion = await db.getAssertionById(id);
          if (!assertion) return null;

          return db.updateAssertion(id, {
            revoked: true,
            revocationReason: reason
          });
        },
        verify: async (id) => {
          const db = await import('./database/database.factory')
            .then(m => m.DatabaseFactory.createDatabase('sqlite'));
          const assertion = await db.getAssertionById(id);

          if (!assertion) {
            return { isValid: false, reason: 'Assertion not found' };
          }

          // Check if revoked
          if (assertion.revoked) {
            return {
              isValid: false,
              reason: assertion.revocationReason || 'Assertion has been revoked'
            };
          }

          // Check if expired
          if (assertion.expires) {
            const expiryDate = new Date(assertion.expires);
            const now = new Date();
            if (expiryDate < now) {
              return { isValid: false, reason: 'Assertion has expired' };
            }
          }

          return { isValid: true };
        }
      };
    }

    throw new Error(`Unsupported database type: ${this.dbType}`);
  }

  /**
   * Closes the database connection
   */
  static async close(): Promise<void> {
    if (this.dbType === 'postgresql' && this.client) {
      await this.client.end();
      this.client = null;
    } else if (this.dbType === 'sqlite') {
      // Close SQLite connection via DatabaseFactory
      try {
        const db = await import('./database/database.factory')
          .then(m => m.DatabaseFactory.createDatabase('sqlite'));
        await db.disconnect();
      } catch (error) {
        console.warn('Error closing SQLite connection:', error);
      }
    }
  }
}
