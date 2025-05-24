/**
 * SQLite Repository Coordinator
 *
 * This class coordinates operations across multiple SQLite repositories,
 * providing transaction support and unified error handling.
 */
import { eq, inArray, sql } from 'drizzle-orm';
import { Shared } from 'openbadges-types';
import { Issuer } from '@domains/issuer/issuer.entity';
import { BadgeClass } from '@domains/badgeClass/badgeClass.entity';
import { Assertion } from '@domains/assertion/assertion.entity';
import { SqliteConnectionManager } from '../connection/sqlite-connection.manager';
import { SqliteIssuerRepository } from './sqlite-issuer.repository';
import { SqliteBadgeClassRepository } from './sqlite-badge-class.repository';
import { SqliteAssertionRepository } from './sqlite-assertion.repository';
import { SqliteAssertionMapper } from '../mappers/sqlite-assertion.mapper';
import { SensitiveValue } from '@rollercoaster-dev/rd-logger';
import { logger } from '@utils/logging/logger.service';
import {
  SqliteTransactionContext,
  SqliteOperationContext,
  DrizzleTransaction,
  SqliteEntityType,
} from '../types/sqlite-database.types';
import { issuers, badgeClasses, assertions } from '../schema';

import { randomUUID } from 'crypto';
// We'll use a more pragmatic approach with proper JSDoc comments

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
      this._assertionRepository = new SqliteAssertionRepository(
        this.connectionManager
      );
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
      // Ensure an active database connection before proceeding
      if (!this.connectionManager.isConnected()) {
        logger.info(
          'Database not connected, establishing connection before createBadgeEcosystem operation'
        );
        await this.connectionManager.connect();
      }

      // Double-check connection status after connection attempt
      if (!this.connectionManager.isConnected()) {
        throw new Error(
          'Failed to establish database connection for createBadgeEcosystem operation'
        );
      }

      // Use Drizzle's transaction helper for atomic operations
      const db = this.connectionManager.getDatabase();

      const result = await db.transaction(async (tx) => {
        // Create issuer first using helper method
        const issuer = await this.createIssuerWithTransaction(issuerData, tx);

        transactionContext.operations.push(
          this.createOperationContext('CREATE Issuer', issuer.id)
        );

        // Create badge class with issuer reference using helper method
        const badgeClass = await this.createBadgeClassWithTransaction(
          {
            ...badgeClassData,
            issuer: issuer.id,
          },
          tx
        );

        transactionContext.operations.push(
          this.createOperationContext('CREATE BadgeClass', badgeClass.id)
        );

        // Create assertion with badge class reference using helper method
        const assertion = await this.createAssertionWithTransaction(
          {
            ...assertionData,
            badgeClass: badgeClass.id,
          },
          tx
        );

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
      // Ensure an active database connection before proceeding
      if (!this.connectionManager.isConnected()) {
        logger.info(
          'Database not connected, establishing connection before createBadgeClassWithValidation operation'
        );
        await this.connectionManager.connect();
      }

      // Double-check connection status after connection attempt
      if (!this.connectionManager.isConnected()) {
        throw new Error(
          'Failed to establish database connection for createBadgeClassWithValidation operation'
        );
      }

      // Extract issuer ID with proper type checking
      let issuerId: Shared.IRI | undefined;

      if (typeof badgeClassData.issuer === 'string') {
        issuerId = badgeClassData.issuer as Shared.IRI;
      } else if (
        badgeClassData.issuer &&
        typeof badgeClassData.issuer === 'object' &&
        'id' in badgeClassData.issuer &&
        badgeClassData.issuer.id
      ) {
        issuerId = badgeClassData.issuer.id as Shared.IRI;
      }

      // Validate that we have a valid issuer ID
      if (!issuerId) {
        throw new Error('Invalid or missing issuer ID in badge class data');
      }

      // Validate that the issuer exists in the database
      const issuer = await this.issuerRepository.findById(issuerId);
      if (!issuer) {
        throw new Error(`Issuer with ID ${issuerId} does not exist`);
      }

      // Create the badge class
      return await this.badgeClassRepository.create(badgeClassData);
    } catch (error) {
      // Extract issuer ID safely for error logging
      let issuerId: Shared.IRI | undefined;

      if (typeof badgeClassData.issuer === 'string') {
        issuerId = badgeClassData.issuer as Shared.IRI;
      } else if (
        badgeClassData.issuer &&
        typeof badgeClassData.issuer === 'object' &&
        'id' in badgeClassData.issuer &&
        badgeClassData.issuer.id
      ) {
        issuerId = badgeClassData.issuer.id as Shared.IRI;
      }

      logger.error('Failed to create badge class with validation', {
        error: error instanceof Error ? error.message : String(error),
        issuerId,
        badgeClassData: SensitiveValue.from(badgeClassData),
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
      // Ensure an active database connection before proceeding
      if (!this.connectionManager.isConnected()) {
        logger.info(
          'Database not connected, establishing connection before createAssertionWithValidation operation'
        );
        await this.connectionManager.connect();
      }

      // Double-check connection status after connection attempt
      if (!this.connectionManager.isConnected()) {
        throw new Error(
          'Failed to establish database connection for createAssertionWithValidation operation'
        );
      }

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
   * Deletes an issuer and all associated badge classes and assertions atomically
   *
   * This method uses direct SQL operations within a transaction to ensure proper atomicity.
   * The database schema has CASCADE DELETE constraints, so deleting the issuer will
   * automatically cascade to badge classes and assertions, but we count them first
   * for accurate reporting.
   *
   * @param issuerId The ID of the issuer to delete
   * @returns Promise with deletion counts for each entity type
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
      // Ensure an active database connection before proceeding
      if (!this.connectionManager.isConnected()) {
        logger.info(
          'Database not connected, establishing connection before deleteIssuerCascade operation'
        );
        await this.connectionManager.connect();
      }

      // Double-check connection status after connection attempt
      if (!this.connectionManager.isConnected()) {
        throw new Error(
          'Failed to establish database connection for deleteIssuerCascade operation'
        );
      }

      // Use Drizzle's transaction helper for atomic operations
      const db = this.connectionManager.getDatabase();

      const result = await db.transaction(async (tx) => {
        // First, count what will be deleted for accurate reporting
        // Get all badge classes for this issuer using the transaction
        const badgeClassResults = await tx
          .select({ id: badgeClasses.id })
          .from(badgeClasses)
          .where(eq(badgeClasses.issuerId, issuerId as string));

        const badgeClassIds = badgeClassResults.map((bc) => bc.id);
        let assertionsDeleted = 0;

        // Count assertions that will be deleted
        if (badgeClassIds.length > 0) {
          if (badgeClassIds.length) {
            const { count } = await tx
              .select({ count: sql<number>`count(*)` })
              .from(assertions)
              .where(inArray(assertions.badgeClassId, badgeClassIds))
              .limit(1) // sqlite optimisation – single row
              .get(); // drizzle: pluck the first row only
            assertionsDeleted = count;
          }
        }

        // Now delete the issuer - this will cascade to badge classes and assertions
        // due to the foreign key constraints with CASCADE DELETE
        const issuerDeleteResult = await tx
          .delete(issuers)
          .where(eq(issuers.id, issuerId as string))
          .returning();

        const issuerDeleted = issuerDeleteResult.length > 0;
        const badgeClassesDeleted = badgeClassIds.length;

        transactionContext.operations.push(
          this.createOperationContext('DELETE Issuer CASCADE', issuerId),
          this.createOperationContext(
            `DELETE ${badgeClassesDeleted} BadgeClasses`
          ),
          this.createOperationContext(`DELETE ${assertionsDeleted} Assertions`)
        );

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
      // Ensure an active database connection before proceeding
      if (!this.connectionManager.isConnected()) {
        logger.info(
          'Database not connected, establishing connection before performHealthCheck operation'
        );
        await this.connectionManager.connect();
      }

      // Check connection - we still perform the explicit health check even after connecting
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
      id: `tx_${Date.now()}_${randomUUID().substring(0, 8)}`,
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
  ): SqliteEntityType {
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

  /**
   * Creates an issuer within a transaction context
   * @private
   * @param issuerData The issuer data
   * @param tx The transaction object from Drizzle
   */
  private async createIssuerWithTransaction(
    issuerData: Omit<Issuer, 'id'>,
    tx: DrizzleTransaction // Transaction object from Drizzle
  ): Promise<Issuer> {
    // Create a full issuer entity with generated ID
    const issuerWithId = Issuer.create(issuerData);

    // Get mapper from repository
    const mapper = this.issuerRepository.getMapper();

    // Convert domain entity to database record
    const record = mapper.toPersistence(issuerWithId);

    // Ensure timestamps are set
    const now = Date.now();
    record.createdAt = now;
    record.updatedAt = now;

    // Insert into database using the transaction
    const insertResult = await tx.insert(issuers).values(record).returning();

    if (!insertResult[0]) {
      throw new Error(
        'Failed to create issuer within transaction: no result returned'
      );
    }

    // Convert database record back to domain entity
    return mapper.toDomain(insertResult[0]);
  }

  /**
   * Creates a badge class within a transaction context
   * @private
   * @param badgeClassData The badge class data
   * @param tx The transaction object from Drizzle
   */
  private async createBadgeClassWithTransaction(
    badgeClassData: Omit<BadgeClass, 'id'>,
    tx: DrizzleTransaction // Transaction object from Drizzle
  ): Promise<BadgeClass> {
    // Create a full badge class entity with generated ID
    const badgeClassWithId = BadgeClass.create(badgeClassData);

    // Get mapper from repository
    const mapper = this.badgeClassRepository.getMapper();

    // Convert domain entity to database record
    const record = mapper.toPersistence(badgeClassWithId);

    // Ensure timestamps are set
    const now = Date.now();
    record.createdAt = now;
    record.updatedAt = now;

    // Insert into database using the transaction
    const insertResult = await tx
      .insert(badgeClasses)
      .values(record)
      .returning();

    if (!insertResult[0]) {
      throw new Error(
        'Failed to create badge class within transaction: no result returned'
      );
    }

    // Convert database record back to domain entity
    return mapper.toDomain(insertResult[0]);
  }

  /**
   * Creates an assertion within a transaction context
   * @private
   * @param assertionData The assertion data
   * @param tx The transaction object from Drizzle
   */
  private async createAssertionWithTransaction(
    assertionData: Omit<Assertion, 'id'>,
    tx: DrizzleTransaction // Transaction object from Drizzle
  ): Promise<Assertion> {
    // Let the entity handle ID generation to ensure proper IRI format
    const fullAssertion = Assertion.create(assertionData);

    // Get mapper from assertion repository if possible, or create a new one
    let mapper: SqliteAssertionMapper;
    if (this._assertionRepository) {
      mapper = this._assertionRepository.getMapper();
    } else {
      mapper = new SqliteAssertionMapper();
    }

    // Convert domain entity to database record
    const record = mapper.toPersistence(fullAssertion);

    // Ensure timestamps are set
    const now = Date.now();
    record.createdAt = now;
    record.updatedAt = now;

    // Insert into database using the transaction
    const insertResult = await tx.insert(assertions).values(record).returning();

    if (!insertResult[0]) {
      throw new Error(
        'Failed to create assertion within transaction: no result returned'
      );
    }

    // Convert database record back to domain entity
    return mapper.toDomain(insertResult[0]);
  }
}
