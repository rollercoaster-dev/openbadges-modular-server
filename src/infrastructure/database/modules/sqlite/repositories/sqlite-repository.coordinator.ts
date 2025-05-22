/**
 * SQLite Repository Coordinator
 *
 * This class coordinates operations across multiple SQLite repositories,
 * providing transaction support and unified error handling.
 */

import { Shared } from 'openbadges-types';
import { Issuer } from '@domains/issuer/issuer.entity';
import { BadgeClass } from '@domains/badgeClass/badgeClass.entity';
import { Assertion } from '@domains/assertion/assertion.entity';
import { SqliteConnectionManager } from '../connection/sqlite-connection.manager';
import { SqliteIssuerRepository } from './sqlite-issuer.repository';
import { SqliteBadgeClassRepository } from './sqlite-badge-class.repository';
import { SqliteAssertionRepository } from './sqlite-assertion.repository';
import { logger } from '@utils/logging/logger.service';
import {
  SqliteTransactionContext,
  SqliteOperationContext,
} from '../types/sqlite-database.types';

/**
 * Coordinates operations across SQLite repositories with transaction support
 */
export class SqliteRepositoryCoordinator {
  private readonly issuerRepository: SqliteIssuerRepository;
  private _badgeClassRepository: SqliteBadgeClassRepository | null = null;
  private _assertionRepository: SqliteAssertionRepository | null = null;

  constructor(private readonly connectionManager: SqliteConnectionManager) {
    this.issuerRepository = new SqliteIssuerRepository(connectionManager);
    // BadgeClass and Assertion repositories use lazy initialization
    // to avoid accessing the client before connection is established
  }

  /**
   * Gets the issuer repository
   */
  getIssuerRepository(): SqliteIssuerRepository {
    return this.issuerRepository;
  }

  /**
   * Gets the badge class repository (lazy initialization)
   */
  getBadgeClassRepository(): SqliteBadgeClassRepository {
    if (!this._badgeClassRepository) {
      this._badgeClassRepository = new SqliteBadgeClassRepository(
        this.connectionManager
      );
    }
    return this._badgeClassRepository;
  }

  /**
   * Gets the assertion repository (lazy initialization)
   */
  getAssertionRepository(): SqliteAssertionRepository {
    if (!this._assertionRepository) {
      const client = this.connectionManager.getClient();
      this._assertionRepository = new SqliteAssertionRepository(client);
    }
    return this._assertionRepository;
  }

  /**
   * Private getter for badge class repository (for internal use)
   */
  private get badgeClassRepository(): SqliteBadgeClassRepository {
    return this.getBadgeClassRepository();
  }

  /**
   * Private getter for assertion repository (for internal use)
   */
  private get assertionRepository(): SqliteAssertionRepository {
    return this.getAssertionRepository();
  }

  /**
   * Creates a complete badge ecosystem (issuer, badge class, and assertion) in a coordinated manner
   */
  async createBadgeEcosystem(
    issuerData: Omit<Issuer, 'id'>,
    badgeClassData: Omit<BadgeClass, 'id' | 'issuer'>,
    assertionData: Omit<Assertion, 'id' | 'badgeClass'>
  ): Promise<{
    issuer: Issuer;
    badgeClass: BadgeClass;
    assertion: Assertion;
  }> {
    const transactionContext = this.createTransactionContext(
      'createBadgeEcosystem'
    );

    try {
      // Ensure connection
      this.connectionManager.ensureConnected();

      // Use Drizzle's transaction helper for atomic operations
      const db = this.connectionManager.getDatabase();

      const result = await db.transaction(async (_tx) => {
        // Create issuer first
        const issuer = await this.issuerRepository.create(issuerData);
        transactionContext.operations.push(
          this.createOperationContext('CREATE Issuer', issuer.id)
        );

        // Create badge class with issuer reference
        const badgeClass = await this.badgeClassRepository.create({
          ...badgeClassData,
          issuer: issuer.id,
        });
        transactionContext.operations.push(
          this.createOperationContext('CREATE BadgeClass', badgeClass.id)
        );

        // Create assertion with badge class reference
        const assertion = await this.assertionRepository.create({
          ...assertionData,
          badgeClass: badgeClass.id,
        });
        transactionContext.operations.push(
          this.createOperationContext('CREATE Assertion', assertion.id)
        );

        return { issuer, badgeClass, assertion };
      });

      logger.info('Badge ecosystem created successfully', {
        transactionId: transactionContext.id,
        issuerId: result.issuer.id,
        badgeClassId: result.badgeClass.id,
        assertionId: result.assertion.id,
        duration: Date.now() - transactionContext.startTime,
      });

      return result;
    } catch (error) {
      logger.error('Failed to create badge ecosystem', {
        error: error instanceof Error ? error.message : String(error),
        transactionId: transactionContext.id,
        operations: transactionContext.operations.length,
        duration: Date.now() - transactionContext.startTime,
      });
      throw error;
    }
  }

  /**
   * Validates that an issuer exists before creating a badge class
   */
  async createBadgeClassWithValidation(
    badgeClassData: Omit<BadgeClass, 'id'>
  ): Promise<BadgeClass> {
    try {
      // Validate that the issuer exists
      const issuerId =
        typeof badgeClassData.issuer === 'string'
          ? (badgeClassData.issuer as Shared.IRI)
          : ((badgeClassData.issuer as { id: Shared.IRI }).id as Shared.IRI);

      const issuer = await this.issuerRepository.findById(issuerId);
      if (!issuer) {
        throw new Error(`Issuer with ID ${issuerId} does not exist`);
      }

      // Create the badge class
      return await this.badgeClassRepository.create(badgeClassData);
    } catch (error) {
      logger.error('Failed to create badge class with validation', {
        error: error instanceof Error ? error.message : String(error),
        issuerId:
          typeof badgeClassData.issuer === 'string'
            ? badgeClassData.issuer
            : (badgeClassData.issuer as { id: Shared.IRI }).id,
      });
      throw error;
    }
  }

  /**
   * Validates that a badge class exists before creating an assertion
   */
  async createAssertionWithValidation(
    assertionData: Omit<Assertion, 'id'>
  ): Promise<Assertion> {
    try {
      // Validate that the badge class exists
      const badgeClassId = assertionData.badgeClass as string;
      const badgeClass = await this.badgeClassRepository.findById(badgeClassId);
      if (!badgeClass) {
        throw new Error(`Badge class with ID ${badgeClassId} does not exist`);
      }

      // Create the assertion
      return await this.assertionRepository.create(assertionData);
    } catch (error) {
      logger.error('Failed to create assertion with validation', {
        error: error instanceof Error ? error.message : String(error),
        badgeClassId: assertionData.badgeClass,
      });
      throw error;
    }
  }

  /**
   * Deletes an issuer and all associated badge classes and assertions
   */
  async deleteIssuerCascade(issuerId: Shared.IRI): Promise<{
    issuerDeleted: boolean;
    badgeClassesDeleted: number;
    assertionsDeleted: number;
  }> {
    const transactionContext = this.createTransactionContext(
      'deleteIssuerCascade'
    );

    try {
      // Ensure connection
      this.connectionManager.ensureConnected();

      // Use Drizzle's transaction helper for atomic operations
      const db = this.connectionManager.getDatabase();

      const result = await db.transaction(async (_tx) => {
        // Get all badge classes for this issuer
        const badgeClasses = await this.badgeClassRepository.findByIssuer(
          issuerId
        );

        let assertionsDeleted = 0;

        // Delete all assertions for each badge class
        for (const badgeClass of badgeClasses) {
          const assertions = await this.assertionRepository.findByBadgeClass(
            badgeClass.id
          );
          for (const assertion of assertions) {
            await this.assertionRepository.delete(assertion.id);
            assertionsDeleted++;
          }
        }

        // Delete all badge classes
        let badgeClassesDeleted = 0;
        for (const badgeClass of badgeClasses) {
          const deleted = await this.badgeClassRepository.delete(badgeClass.id);
          if (deleted) badgeClassesDeleted++;
        }

        // Delete the issuer
        const issuerDeleted = await this.issuerRepository.delete(issuerId);

        return { issuerDeleted, badgeClassesDeleted, assertionsDeleted };
      });

      logger.info('Issuer cascade deletion completed', {
        transactionId: transactionContext.id,
        issuerId,
        issuerDeleted: result.issuerDeleted,
        badgeClassesDeleted: result.badgeClassesDeleted,
        assertionsDeleted: result.assertionsDeleted,
        duration: Date.now() - transactionContext.startTime,
      });

      return result;
    } catch (error) {
      logger.error('Failed to delete issuer cascade', {
        error: error instanceof Error ? error.message : String(error),
        transactionId: transactionContext.id,
        issuerId,
        duration: Date.now() - transactionContext.startTime,
      });
      throw error;
    }
  }

  /**
   * Performs a health check on all repositories
   */
  async performHealthCheck(): Promise<{
    overall: boolean;
    connection: boolean;
    repositories: {
      issuer: boolean;
      badgeClass: boolean;
      assertion: boolean;
    };
  }> {
    try {
      // Check connection
      const connectionHealthy =
        await this.connectionManager.performHealthCheck();

      // Test each repository with a simple query
      const issuerHealthy = await this.testRepositoryHealth('issuer');
      const badgeClassHealthy = await this.testRepositoryHealth('badgeClass');
      const assertionHealthy = await this.testRepositoryHealth('assertion');

      const repositoriesHealthy =
        issuerHealthy && badgeClassHealthy && assertionHealthy;
      const overall = connectionHealthy && repositoriesHealthy;

      return {
        overall,
        connection: connectionHealthy,
        repositories: {
          issuer: issuerHealthy,
          badgeClass: badgeClassHealthy,
          assertion: assertionHealthy,
        },
      };
    } catch (error) {
      logger.error('Health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        overall: false,
        connection: false,
        repositories: {
          issuer: false,
          badgeClass: false,
          assertion: false,
        },
      };
    }
  }

  /**
   * Creates a transaction context for coordinated operations
   */
  private createTransactionContext(
    _operation: string
  ): SqliteTransactionContext {
    return {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      startTime: Date.now(),
      operations: [],
      rollbackOnError: true,
    };
  }

  /**
   * Creates an operation context for logging
   */
  private createOperationContext(
    operation: string,
    entityId?: Shared.IRI
  ): SqliteOperationContext {
    // Determine entity type from operation string
    const entityType = this.determineEntityTypeFromOperation(operation);

    return {
      operation,
      entityType,
      entityId,
      startTime: Date.now(),
    };
  }

  /**
   * Determines entity type from operation string
   */
  private determineEntityTypeFromOperation(
    operation: string
  ): SqliteOperationContext['entityType'] {
    const lowerOp = operation.toLowerCase();

    if (lowerOp.includes('issuer')) {
      return 'issuer';
    } else if (
      lowerOp.includes('badgeclass') ||
      lowerOp.includes('badge class')
    ) {
      return 'badgeClass';
    } else if (lowerOp.includes('assertion')) {
      return 'assertion';
    }

    // Default fallback
    return 'issuer';
  }

  /**
   * Tests repository health by attempting a simple operation
   */
  private async testRepositoryHealth(
    repositoryType: 'issuer' | 'badgeClass' | 'assertion'
  ): Promise<boolean> {
    try {
      switch (repositoryType) {
        case 'issuer':
          await this.issuerRepository.findAll();
          return true;
        case 'badgeClass':
          await this.badgeClassRepository.findAll();
          return true;
        case 'assertion':
          await this.assertionRepository.findAll();
          return true;
        default:
          return false;
      }
    } catch {
      return false;
    }
  }
}
