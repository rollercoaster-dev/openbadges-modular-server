/**
 * SQLite Database Service
 *
 * This service implements the DatabaseInterface by coordinating operations
 * across SQLite repositories with proper type safety and error handling.
 */

import { Issuer } from '@domains/issuer/issuer.entity';
import { BadgeClass } from '@domains/badgeClass/badgeClass.entity';
import { Assertion } from '@domains/assertion/assertion.entity';
import {
  DatabaseInterface,
  DatabaseQueryOptions,
  DatabaseHealth,
} from '@infrastructure/database/interfaces/database.interface';
import { Shared } from 'openbadges-types';
import { SqliteConnectionManager } from '../connection/sqlite-connection.manager';
import { SqliteRepositoryCoordinator } from '../repositories/sqlite-repository.coordinator';
import { SqliteIssuerRepository } from '../repositories/sqlite-issuer.repository';
import { SqliteBadgeClassRepository } from '../repositories/sqlite-badge-class.repository';
import { SqliteAssertionRepository } from '../repositories/sqlite-assertion.repository';
import { logger } from '@utils/logging/logger.service';
import {
  SqliteOperationContext,
  SqlitePaginationParams,
} from '../types/sqlite-database.types';

/**
 * SQLite implementation of the DatabaseInterface using the repository pattern
 */
export class SqliteDatabaseService implements DatabaseInterface {
  private readonly repositoryCoordinator: SqliteRepositoryCoordinator;
  // Direct repository access for simple CRUD operations
  private readonly issuerRepository: SqliteIssuerRepository;
  private readonly badgeClassRepository: SqliteBadgeClassRepository;
  private readonly assertionRepository: SqliteAssertionRepository;

  constructor(private readonly connectionManager: SqliteConnectionManager) {
    this.repositoryCoordinator = new SqliteRepositoryCoordinator(
      connectionManager
    );
    // Initialize repositories directly for simple operations
    this.issuerRepository = new SqliteIssuerRepository(connectionManager);
    this.badgeClassRepository = new SqliteBadgeClassRepository(
      connectionManager
    );
    this.assertionRepository = new SqliteAssertionRepository(connectionManager);
  }

  /**
   * Creates operation context for logging and monitoring
   */
  private createOperationContext(
    operation: string,
    entityType: SqliteOperationContext['entityType'],
    entityId?: Shared.IRI
  ): SqliteOperationContext {
    return {
      operation,
      entityType,
      entityId,
      startTime: Date.now(),
    };
  }

  /**
   * Conditionally logs debug messages based on environment
   * Only logs in development mode to reduce production noise
   */
  private logDebugConditional(
    message: string,
    context: Record<string, unknown>
  ): void {
    if (process.env.NODE_ENV !== 'production') {
      logger.debug(message, context);
    }
  }

  // Connection management methods
  async connect(): Promise<void> {
    await this.connectionManager.connect();
  }

  async disconnect(): Promise<void> {
    await this.connectionManager.disconnect();
  }

  isConnected(): boolean {
    return this.connectionManager.isConnected();
  }

  // Issuer operations
  async createIssuer(issuer: Omit<Issuer, 'id'>): Promise<Issuer> {
    const context = this.createOperationContext('CREATE Issuer', 'issuer');

    try {
      const result = await this.issuerRepository.create(issuer);

      // Log creation success - info level for important operations
      logger.info('Issuer created successfully', {
        operation: context.operation,
        issuerId: result.id,
        duration: Date.now() - context.startTime,
      });

      return result;
    } catch (error) {
      logger.error('Failed to create issuer', {
        error: error instanceof Error ? error.message : String(error),
        operation: context.operation,
        duration: Date.now() - context.startTime,
      });
      throw error;
    }
  }

  async getIssuerById(id: Shared.IRI): Promise<Issuer | null> {
    const context = this.createOperationContext('GET Issuer', 'issuer', id);

    try {
      const result = await this.issuerRepository.findById(id);

      // Only log read operations in development mode to reduce noise
      this.logDebugConditional('Issuer retrieved', {
        operation: context.operation,
        issuerId: id,
        found: result !== null,
        duration: Date.now() - context.startTime,
      });

      return result;
    } catch (error) {
      logger.error('Failed to get issuer', {
        error: error instanceof Error ? error.message : String(error),
        operation: context.operation,
        issuerId: id,
        duration: Date.now() - context.startTime,
      });
      throw error;
    }
  }

  async getAllIssuers(options?: DatabaseQueryOptions): Promise<Issuer[]> {
    const context = this.createOperationContext('GET All Issuers', 'issuer');

    try {
      // Convert DatabaseQueryOptions to SqlitePaginationParams
      const pagination: SqlitePaginationParams | undefined = options?.pagination
        ? {
            limit: options.pagination.limit,
            offset: options.pagination.offset,
          }
        : undefined;

      const result = await this.issuerRepository.findAll(pagination);

      this.logDebugConditional('All issuers retrieved', {
        operation: context.operation,
        count: result.length,
        pagination: pagination || 'default',
        duration: Date.now() - context.startTime,
      });

      return result;
    } catch (error) {
      logger.error('Failed to get all issuers', {
        error: error instanceof Error ? error.message : String(error),
        operation: context.operation,
        duration: Date.now() - context.startTime,
      });
      throw error;
    }
  }

  async updateIssuer(
    id: Shared.IRI,
    issuer: Partial<Issuer>
  ): Promise<Issuer | null> {
    const context = this.createOperationContext('UPDATE Issuer', 'issuer', id);

    try {
      const result = await this.issuerRepository.update(id, issuer);

      logger.info('Issuer updated', {
        operation: context.operation,
        issuerId: id,
        updated: result !== null,
        duration: Date.now() - context.startTime,
      });

      return result;
    } catch (error) {
      logger.error('Failed to update issuer', {
        error: error instanceof Error ? error.message : String(error),
        operation: context.operation,
        issuerId: id,
        duration: Date.now() - context.startTime,
      });
      throw error;
    }
  }

  async deleteIssuer(id: Shared.IRI): Promise<boolean> {
    const context = this.createOperationContext('DELETE Issuer', 'issuer', id);

    try {
      const result = await this.issuerRepository.delete(id);

      logger.info('Issuer deletion attempted', {
        operation: context.operation,
        issuerId: id,
        deleted: result,
        duration: Date.now() - context.startTime,
      });

      return result;
    } catch (error) {
      logger.error('Failed to delete issuer', {
        error: error instanceof Error ? error.message : String(error),
        operation: context.operation,
        issuerId: id,
        duration: Date.now() - context.startTime,
      });
      throw error;
    }
  }

  // BadgeClass operations
  async createBadgeClass(
    badgeClass: Omit<BadgeClass, 'id'>
  ): Promise<BadgeClass> {
    const context = this.createOperationContext(
      'CREATE BadgeClass',
      'badgeClass'
    );

    try {
      const result =
        await this.repositoryCoordinator.createBadgeClassWithValidation(
          badgeClass
        );

      // Extract issuer ID with proper type checking
      let issuerId: Shared.IRI | undefined;

      if (typeof badgeClass.issuer === 'string') {
        issuerId = badgeClass.issuer as Shared.IRI;
      } else if (
        badgeClass.issuer &&
        typeof badgeClass.issuer === 'object' &&
        'id' in badgeClass.issuer &&
        badgeClass.issuer.id
      ) {
        issuerId = badgeClass.issuer.id as Shared.IRI;
      }

      if (!issuerId) {
        logger.warn('BadgeClass created with invalid or missing issuer ID', {
          operation: context.operation,
          badgeClassId: result.id,
        });
      }

      logger.info('BadgeClass created successfully', {
        operation: context.operation,
        badgeClassId: result.id,
        issuerId,
        duration: Date.now() - context.startTime,
      });

      return result;
    } catch (error) {
      logger.error('Failed to create badge class', {
        error: error instanceof Error ? error.message : String(error),
        operation: context.operation,
        duration: Date.now() - context.startTime,
      });
      throw error;
    }
  }

  async getBadgeClassById(id: Shared.IRI): Promise<BadgeClass | null> {
    const context = this.createOperationContext(
      'GET BadgeClass',
      'badgeClass',
      id
    );

    try {
      const result = await this.badgeClassRepository.findById(id);

      this.logDebugConditional('BadgeClass retrieved', {
        operation: context.operation,
        badgeClassId: id,
        found: result !== null,
        duration: Date.now() - context.startTime,
      });

      return result;
    } catch (error) {
      logger.error('Failed to get badge class', {
        error: error instanceof Error ? error.message : String(error),
        operation: context.operation,
        badgeClassId: id,
        duration: Date.now() - context.startTime,
      });
      throw error;
    }
  }

  async getAllBadgeClasses(
    options?: DatabaseQueryOptions
  ): Promise<BadgeClass[]> {
    const context = this.createOperationContext(
      'GET All BadgeClasses',
      'badgeClass'
    );

    try {
      // Convert DatabaseQueryOptions to SqlitePaginationParams
      const pagination: SqlitePaginationParams | undefined = options?.pagination
        ? {
            limit: options.pagination.limit,
            offset: options.pagination.offset,
          }
        : undefined;

      const result = await this.badgeClassRepository.findAll(pagination);

      this.logDebugConditional('All badge classes retrieved', {
        operation: context.operation,
        count: result.length,
        pagination: pagination || 'default',
        duration: Date.now() - context.startTime,
      });

      return result;
    } catch (error) {
      logger.error('Failed to get all badge classes', {
        error: error instanceof Error ? error.message : String(error),
        operation: context.operation,
        duration: Date.now() - context.startTime,
      });
      throw error;
    }
  }

  async getBadgeClassesByIssuer(issuerId: Shared.IRI): Promise<BadgeClass[]> {
    const context = this.createOperationContext(
      'GET BadgeClasses by Issuer',
      'badgeClass',
      issuerId
    );

    try {
      const result = await this.badgeClassRepository.findByIssuer(issuerId);

      this.logDebugConditional('BadgeClasses retrieved by issuer', {
        operation: context.operation,
        issuerId,
        count: result.length,
        duration: Date.now() - context.startTime,
      });

      return result;
    } catch (error) {
      logger.error('Failed to get badge classes by issuer', {
        error: error instanceof Error ? error.message : String(error),
        operation: context.operation,
        issuerId,
        duration: Date.now() - context.startTime,
      });
      throw error;
    }
  }

  async updateBadgeClass(
    id: Shared.IRI,
    badgeClass: Partial<BadgeClass>
  ): Promise<BadgeClass | null> {
    const context = this.createOperationContext(
      'UPDATE BadgeClass',
      'badgeClass',
      id
    );

    try {
      const result = await this.badgeClassRepository.update(id, badgeClass);

      logger.info('BadgeClass updated', {
        operation: context.operation,
        badgeClassId: id,
        updated: result !== null,
        duration: Date.now() - context.startTime,
      });

      return result;
    } catch (error) {
      logger.error('Failed to update badge class', {
        error: error instanceof Error ? error.message : String(error),
        operation: context.operation,
        badgeClassId: id,
        duration: Date.now() - context.startTime,
      });
      throw error;
    }
  }

  async deleteBadgeClass(id: Shared.IRI): Promise<boolean> {
    const context = this.createOperationContext(
      'DELETE BadgeClass',
      'badgeClass',
      id
    );

    try {
      const result = await this.badgeClassRepository.delete(id);

      logger.info('BadgeClass deletion attempted', {
        operation: context.operation,
        badgeClassId: id,
        deleted: result,
        duration: Date.now() - context.startTime,
      });

      return result;
    } catch (error) {
      logger.error('Failed to delete badge class', {
        error: error instanceof Error ? error.message : String(error),
        operation: context.operation,
        badgeClassId: id,
        duration: Date.now() - context.startTime,
      });
      throw error;
    }
  }

  // Assertion operations
  async createAssertion(assertion: Omit<Assertion, 'id'>): Promise<Assertion> {
    const context = this.createOperationContext(
      'CREATE Assertion',
      'assertion'
    );

    try {
      const result =
        await this.repositoryCoordinator.createAssertionWithValidation(
          assertion
        );

      logger.info('Assertion created successfully', {
        operation: context.operation,
        assertionId: result.id,
        badgeClassId: assertion.badgeClass,
        duration: Date.now() - context.startTime,
      });

      return result;
    } catch (error) {
      logger.error('Failed to create assertion', {
        error: error instanceof Error ? error.message : String(error),
        operation: context.operation,
        duration: Date.now() - context.startTime,
      });
      throw error;
    }
  }

  async getAssertionById(id: Shared.IRI): Promise<Assertion | null> {
    const context = this.createOperationContext(
      'GET Assertion',
      'assertion',
      id
    );

    try {
      const result = await this.assertionRepository.findById(id);

      this.logDebugConditional('Assertion retrieved', {
        operation: context.operation,
        assertionId: id,
        found: result !== null,
        duration: Date.now() - context.startTime,
      });

      return result;
    } catch (error) {
      logger.error('Failed to get assertion', {
        error: error instanceof Error ? error.message : String(error),
        operation: context.operation,
        assertionId: id,
        duration: Date.now() - context.startTime,
      });
      throw error;
    }
  }

  async getAllAssertions(options?: DatabaseQueryOptions): Promise<Assertion[]> {
    const context = this.createOperationContext(
      'GET All Assertions',
      'assertion'
    );

    try {
      // Convert DatabaseQueryOptions to SqlitePaginationParams
      const pagination: SqlitePaginationParams | undefined = options?.pagination
        ? {
            limit: options.pagination.limit,
            offset: options.pagination.offset,
          }
        : undefined;

      const result = await this.assertionRepository.findAll(pagination);

      this.logDebugConditional('All assertions retrieved', {
        operation: context.operation,
        count: result.length,
        pagination: pagination || 'default',
        duration: Date.now() - context.startTime,
      });

      return result;
    } catch (error) {
      logger.error('Failed to get all assertions', {
        error: error instanceof Error ? error.message : String(error),
        operation: context.operation,
        duration: Date.now() - context.startTime,
      });
      throw error;
    }
  }

  async getAssertionsByBadgeClass(
    badgeClassId: Shared.IRI
  ): Promise<Assertion[]> {
    const context = this.createOperationContext(
      'GET Assertions by BadgeClass',
      'assertion',
      badgeClassId
    );

    try {
      const result = await this.assertionRepository.findByBadgeClass(
        badgeClassId
      );

      this.logDebugConditional('Assertions retrieved by badge class', {
        operation: context.operation,
        badgeClassId,
        count: result.length,
        duration: Date.now() - context.startTime,
      });

      return result;
    } catch (error) {
      logger.error('Failed to get assertions by badge class', {
        error: error instanceof Error ? error.message : String(error),
        operation: context.operation,
        badgeClassId,
        duration: Date.now() - context.startTime,
      });
      throw error;
    }
  }

  async getAssertionsByRecipient(recipientId: string): Promise<Assertion[]> {
    const context = this.createOperationContext(
      'GET Assertions by Recipient',
      'assertion',
      recipientId as Shared.IRI
    );

    try {
      const result = await this.assertionRepository.findByRecipient(
        recipientId as Shared.IRI
      );

      this.logDebugConditional('Assertions retrieved by recipient', {
        operation: context.operation,
        count: result.length,
        duration: Date.now() - context.startTime,
      });

      return result;
    } catch (error) {
      logger.error('Failed to get assertions by recipient', {
        error: error instanceof Error ? error.message : String(error),
        operation: context.operation,
        duration: Date.now() - context.startTime,
      });
      throw error;
    }
  }

  async updateAssertion(
    id: Shared.IRI,
    assertion: Partial<Assertion>
  ): Promise<Assertion | null> {
    const context = this.createOperationContext(
      'UPDATE Assertion',
      'assertion',
      id
    );

    try {
      const result = await this.assertionRepository.update(id, assertion);

      logger.info('Assertion updated', {
        operation: context.operation,
        assertionId: id,
        updated: result !== null,
        duration: Date.now() - context.startTime,
      });

      return result;
    } catch (error) {
      logger.error('Failed to update assertion', {
        error: error instanceof Error ? error.message : String(error),
        operation: context.operation,
        assertionId: id,
        duration: Date.now() - context.startTime,
      });
      throw error;
    }
  }

  async deleteAssertion(id: Shared.IRI): Promise<boolean> {
    const context = this.createOperationContext(
      'DELETE Assertion',
      'assertion',
      id
    );

    try {
      const result = await this.assertionRepository.delete(id);

      logger.info('Assertion deletion attempted', {
        operation: context.operation,
        assertionId: id,
        deleted: result,
        duration: Date.now() - context.startTime,
      });

      return result;
    } catch (error) {
      logger.error('Failed to delete assertion', {
        error: error instanceof Error ? error.message : String(error),
        operation: context.operation,
        assertionId: id,
        duration: Date.now() - context.startTime,
      });
      throw error;
    }
  }

  async revokeAssertion(
    id: Shared.IRI,
    reason?: string
  ): Promise<Assertion | null> {
    const context = this.createOperationContext(
      'REVOKE Assertion',
      'assertion',
      id
    );

    try {
      const result = await this.assertionRepository.revoke(id, reason);

      logger.info('Assertion revocation attempted', {
        operation: context.operation,
        assertionId: id,
        revoked: result !== null,
        reason,
        duration: Date.now() - context.startTime,
      });

      return result;
    } catch (error) {
      logger.error('Failed to revoke assertion', {
        error: error instanceof Error ? error.message : String(error),
        operation: context.operation,
        assertionId: id,
        duration: Date.now() - context.startTime,
      });
      throw error;
    }
  }

  async verifyAssertion(
    id: Shared.IRI
  ): Promise<{ isValid: boolean; reason?: string }> {
    const context = this.createOperationContext(
      'VERIFY Assertion',
      'assertion',
      id
    );

    try {
      const result = await this.assertionRepository.verify(id);

      this.logDebugConditional('Assertion verification completed', {
        operation: context.operation,
        assertionId: id,
        isValid: result.isValid,
        reason: result.reason,
        duration: Date.now() - context.startTime,
      });

      return result;
    } catch (error) {
      logger.error('Failed to verify assertion', {
        error: error instanceof Error ? error.message : String(error),
        operation: context.operation,
        assertionId: id,
        duration: Date.now() - context.startTime,
      });
      throw error;
    }
  }

  // Health and monitoring
  async getHealth(): Promise<DatabaseHealth> {
    try {
      const connectionHealth = await this.connectionManager.getHealth();
      const repositoryHealth =
        await this.repositoryCoordinator.performHealthCheck();

      // Default to false when the property is absent
      const repoStatus =
        typeof repositoryHealth === 'boolean'
          ? repositoryHealth
          : 'overall' in (repositoryHealth as Record<string, unknown>)
          ? (repositoryHealth as { overall: boolean }).overall
          : false;

      // Convert SqliteDatabaseHealth to DatabaseHealth
      return {
        connected: connectionHealth.connected && repoStatus,
        responseTime: connectionHealth.responseTime,
        lastError: connectionHealth.lastError,
        connectionAttempts: connectionHealth.connectionAttempts,
        uptime: connectionHealth.uptime,
        configuration: connectionHealth.configuration || {},
      };
    } catch (error) {
      logger.error('Failed to get database health', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        connected: false,
        responseTime: 0,
        lastError: error instanceof Error ? error : new Error(String(error)),
        connectionAttempts: 0,
        uptime: 0,
        configuration: {},
      };
    }
  }

  async performHealthCheck(): Promise<boolean> {
    try {
      const health = await this.getHealth();
      return health.connected;
    } catch {
      return false;
    }
  }

  // Connection management methods
  async close(): Promise<void> {
    return this.connectionManager.close();
  }

  // Configuration and utility methods
  getConfiguration(): Record<string, unknown> {
    const stats = this.connectionManager.getConnectionStats();
    return {
      module: 'sqlite',
      state: stats.state,
      attempts: stats.attempts,
      uptime: stats.uptime,
      hasError: stats.hasError,
      lastError: stats.lastError,
    };
  }

  async validateConnection(): Promise<boolean> {
    try {
      return (
        this.connectionManager.isConnected() &&
        (await this.connectionManager.performHealthCheck())
      );
    } catch {
      return false;
    }
  }

  getModuleName(): string {
    return 'sqlite';
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
    const context = this.createOperationContext(
      'CREATE Badge Ecosystem',
      'issuer'
    );

    try {
      const result = await this.repositoryCoordinator.createBadgeEcosystem(
        issuerData,
        badgeClassData,
        assertionData
      );

      logger.info('Badge ecosystem created successfully', {
        operation: context.operation,
        issuerId: result.issuer.id,
        badgeClassId: result.badgeClass.id,
        assertionId: result.assertion.id,
        duration: Date.now() - context.startTime,
      });

      return result;
    } catch (error) {
      logger.error('Failed to create badge ecosystem', {
        error: error instanceof Error ? error.message : String(error),
        operation: context.operation,
        duration: Date.now() - context.startTime,
      });
      throw error;
    }
  }

  async deleteIssuerCascade(issuerId: Shared.IRI): Promise<{
    issuerDeleted: boolean;
    badgeClassesDeleted: number;
    assertionsDeleted: number;
  }> {
    const context = this.createOperationContext(
      'DELETE Issuer Cascade',
      'issuer',
      issuerId
    );

    try {
      const result = await this.repositoryCoordinator.deleteIssuerCascade(
        issuerId
      );

      logger.info('Issuer cascade deletion completed', {
        operation: context.operation,
        issuerId,
        issuerDeleted: result.issuerDeleted,
        badgeClassesDeleted: result.badgeClassesDeleted,
        assertionsDeleted: result.assertionsDeleted,
        duration: Date.now() - context.startTime,
      });

      return result;
    } catch (error) {
      logger.error('Failed to delete issuer cascade', {
        error: error instanceof Error ? error.message : String(error),
        operation: context.operation,
        issuerId,
        duration: Date.now() - context.startTime,
      });
      throw error;
    }
  }
}
