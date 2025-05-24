/**
 * SQLite Database Implementation
 *
 * This class implements the DatabaseInterface using SQLite as the underlying database.
 * It provides methods for managing issuers, badge classes, and assertions with enhanced
 * type safety and proper separation of concerns.
 */

import type { Database } from 'bun:sqlite';
import { Issuer } from '@domains/issuer/issuer.entity';
import { BadgeClass } from '@domains/badgeClass/badgeClass.entity';
import { Assertion } from '@domains/assertion/assertion.entity';
import { DatabaseInterface } from '@infrastructure/database/interfaces/database.interface';
import { Shared } from 'openbadges-types';
import { SqliteConnectionManager } from './connection/sqlite-connection.manager';
import { SqliteDatabaseService } from './services/sqlite-database.service';
import { logger } from '@utils/logging/logger.service';
import {
  SqliteConnectionConfig,
  SqliteDatabaseHealth,
} from './types/sqlite-database.types';

/**
 * SQLite Database implementation using the service layer pattern
 */
export class SqliteDatabase implements DatabaseInterface {
  private readonly connectionManager: SqliteConnectionManager;
  private readonly databaseService: SqliteDatabaseService;

  /**
   * Creates a new SQLite database implementation
   *
   * @param client SQLite database client instance
   * @param config Configuration options with categorized settings (critical vs optional)
   * @throws Error if critical configuration parameters cannot be applied or client is invalid
   */
  constructor(client: Database, config?: Partial<SqliteConnectionConfig>) {
    try {
      if (!client) {
        throw new Error(
          'SQLite client is required for database initialization'
        );
      }

      // Set up connection configuration with defaults and validation
      const connectionConfig: SqliteConnectionConfig = {
        // Required connection settings with fallbacks
        maxConnectionAttempts: Math.max(1, config?.maxConnectionAttempts ?? 3),
        connectionRetryDelayMs: Math.max(
          100,
          config?.connectionRetryDelayMs ?? 1000
        ),

        // Critical SQLite settings (with type checking)
        sqliteBusyTimeout:
          typeof config?.sqliteBusyTimeout === 'number'
            ? Math.max(100, config.sqliteBusyTimeout)
            : 5000, // Default 5 seconds

        sqliteSyncMode:
          config?.sqliteSyncMode &&
          ['OFF', 'NORMAL', 'FULL'].includes(config.sqliteSyncMode)
            ? config.sqliteSyncMode
            : 'NORMAL',

        // Optional performance settings (passed through as-is)
        sqliteCacheSize:
          typeof config?.sqliteCacheSize === 'number' &&
          config.sqliteCacheSize > 0
            ? config.sqliteCacheSize
            : undefined,
      };

      // Initialize connection manager and service
      // This may throw if critical settings cannot be applied
      this.connectionManager = new SqliteConnectionManager(
        client,
        connectionConfig
      );
      this.databaseService = new SqliteDatabaseService(this.connectionManager);
    } catch (error) {
      const errorMsg = `Failed to initialize SQLite database: ${
        error instanceof Error ? error.message : String(error)
      }`;

      // Import logger dynamically to avoid circular dependencies
      const { logger } = require('@utils/logging/logger.service');
      logger.error(errorMsg, {
        error: error instanceof Error ? error.stack : String(error),
        config: {
          // Log config but omit any sensitive values
          maxConnectionAttempts: config?.maxConnectionAttempts,
          connectionRetryDelayMs: config?.connectionRetryDelayMs,
          sqliteBusyTimeout: config?.sqliteBusyTimeout,
          sqliteSyncMode: config?.sqliteSyncMode,
          sqliteCacheSize: config?.sqliteCacheSize,
        },
      });

      // Rethrow with contextual information
      throw new Error(errorMsg);
    }
  }

  // Connection management methods - delegate to service
  async connect(): Promise<void> {
    return this.databaseService.connect();
  }

  async disconnect(): Promise<void> {
    return this.databaseService.disconnect();
  }

  isConnected(): boolean {
    return this.databaseService.isConnected();
  }

  // Issuer operations - delegate to service
  async createIssuer(issuerData: Omit<Issuer, 'id'>): Promise<Issuer> {
    return this.databaseService.createIssuer(issuerData);
  }

  async getIssuerById(id: Shared.IRI): Promise<Issuer | null> {
    return this.databaseService.getIssuerById(id);
  }

  async updateIssuer(
    id: Shared.IRI,
    issuer: Partial<Issuer>
  ): Promise<Issuer | null> {
    return this.databaseService.updateIssuer(id, issuer);
  }

  async deleteIssuer(id: Shared.IRI): Promise<boolean> {
    return this.databaseService.deleteIssuer(id);
  }

  // BadgeClass operations - delegate to service
  async createBadgeClass(
    badgeClassData: Omit<BadgeClass, 'id'>
  ): Promise<BadgeClass> {
    return this.databaseService.createBadgeClass(badgeClassData);
  }

  async getBadgeClassById(id: Shared.IRI): Promise<BadgeClass | null> {
    return this.databaseService.getBadgeClassById(id);
  }

  async getBadgeClassesByIssuer(issuerId: Shared.IRI): Promise<BadgeClass[]> {
    return this.databaseService.getBadgeClassesByIssuer(issuerId);
  }

  async updateBadgeClass(
    id: Shared.IRI,
    badgeClass: Partial<BadgeClass>
  ): Promise<BadgeClass | null> {
    return this.databaseService.updateBadgeClass(id, badgeClass);
  }

  async deleteBadgeClass(id: Shared.IRI): Promise<boolean> {
    return this.databaseService.deleteBadgeClass(id);
  }

  // Assertion operations
  async createAssertion(
    assertionData: Omit<Assertion, 'id'>
  ): Promise<Assertion> {
    return this.databaseService.createAssertion(assertionData);
  }

  async getAssertionById(id: Shared.IRI): Promise<Assertion | null> {
    return this.databaseService.getAssertionById(id);
  }

  async getAssertionsByBadgeClass(
    badgeClassId: Shared.IRI
  ): Promise<Assertion[]> {
    return this.databaseService.getAssertionsByBadgeClass(badgeClassId);
  }

  async getAssertionsByRecipient(recipientId: string): Promise<Assertion[]> {
    return this.databaseService.getAssertionsByRecipient(recipientId);
  }

  async updateAssertion(
    id: Shared.IRI,
    assertion: Partial<Assertion>
  ): Promise<Assertion | null> {
    return this.databaseService.updateAssertion(id, assertion);
  }

  async deleteAssertion(id: Shared.IRI): Promise<boolean> {
    return this.databaseService.deleteAssertion(id);
  }

  async revokeAssertion(
    id: Shared.IRI,
    reason?: string
  ): Promise<Assertion | null> {
    return this.databaseService.revokeAssertion(id, reason);
  }

  async verifyAssertion(
    id: Shared.IRI
  ): Promise<{ isValid: boolean; reason?: string }> {
    return this.databaseService.verifyAssertion(id);
  }

  // Health and utility methods
  async getHealth(): Promise<SqliteDatabaseHealth> {
    return this.databaseService.getHealth();
  }

  async performHealthCheck(): Promise<boolean> {
    return this.databaseService.performHealthCheck();
  }

  // Utility methods for coordinated operations
  async createBadgeEcosystem(
    issuerData: Omit<Issuer, 'id'>,
    badgeClassData: Omit<BadgeClass, 'id' | 'issuer'>,
    assertionData: Omit<Assertion, 'id' | 'badgeClass'>
  ): Promise<{
    issuer: Issuer;
    badgeClass: BadgeClass;
    assertion: Assertion;
  }> {
    return this.databaseService.createBadgeEcosystem(
      issuerData,
      badgeClassData,
      assertionData
    );
  }

  async deleteIssuerCascade(issuerId: Shared.IRI): Promise<{
    issuerDeleted: boolean;
    badgeClassesDeleted: number;
    assertionsDeleted: number;
  }> {
    return this.databaseService.deleteIssuerCascade(issuerId);
  }
}
