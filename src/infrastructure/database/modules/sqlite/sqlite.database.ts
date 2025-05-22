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

  constructor(client: Database, config?: Partial<SqliteConnectionConfig>) {
    // Set up connection configuration with defaults
    const connectionConfig: SqliteConnectionConfig = {
      maxConnectionAttempts: config?.maxConnectionAttempts ?? 3,
      connectionRetryDelayMs: config?.connectionRetryDelayMs ?? 1000,
    };

    // Initialize connection manager and service
    this.connectionManager = new SqliteConnectionManager(
      client,
      connectionConfig
    );
    this.databaseService = new SqliteDatabaseService(this.connectionManager);
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
