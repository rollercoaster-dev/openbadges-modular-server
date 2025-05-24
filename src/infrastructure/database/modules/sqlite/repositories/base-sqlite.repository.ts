/**
 * Base SQLite Repository
 *
 * Abstract base class that provides common functionality for all SQLite repositories,
 * including connection management, error handling, logging, and transaction support.
 */

import { logger, queryLogger } from '@utils/logging/logger.service';
import { SqliteConnectionManager } from '../connection/sqlite-connection.manager';
import {
  SqliteOperationContext,
  SqliteQueryMetrics,
  DrizzleTransaction,
} from '../types/sqlite-database.types';
import { Shared } from 'openbadges-types';
import type { drizzle as DrizzleFn } from 'drizzle-orm/bun-sqlite';

// Create compile-time type alias to avoid runtime import dependency
type DrizzleDB = ReturnType<typeof DrizzleFn>;

/**
 * Abstract base class for SQLite repositories
 */
export abstract class BaseSqliteRepository {
  protected readonly connectionManager: SqliteConnectionManager;

  constructor(connectionManager: SqliteConnectionManager) {
    this.connectionManager = connectionManager;
  }

  /**
   * Gets the database instance with connection validation
   */
  protected getDatabase(): DrizzleDB {
    this.connectionManager.ensureConnected();
    return this.connectionManager.getDatabase();
  }

  /**
   * Creates operation context for logging and monitoring
   * Subclasses should override getEntityType() to provide the correct entity type
   */
  protected createOperationContext(
    operation: string,
    entityId?: Shared.IRI
  ): SqliteOperationContext {
    return {
      operation,
      entityType: this.getEntityType(),
      entityId,
      startTime: Date.now(),
    };
  }

  /**
   * Abstract method that subclasses must implement to specify their entity type
   */
  protected abstract getEntityType(): 'issuer' | 'badgeClass' | 'assertion' | 'user' | 'platform' | 'apiKey' | 'platformUser' | 'userAssertion';

  /**
   * Abstract method that subclasses must implement to specify their table name
   */
  protected abstract getTableName(): string;

  /**
   * Logs query metrics with standardized format
   */
  protected logQueryMetrics(
    context: SqliteOperationContext,
    rowsAffected: number
  ): SqliteQueryMetrics {
    const metrics: SqliteQueryMetrics = {
      duration: Date.now() - context.startTime,
      rowsAffected,
      queryType: this.determineQueryType(context.operation),
      tableName: this.getTableName(),
    };

    queryLogger.logQuery(
      context.operation,
      context.entityId ? [context.entityId] : undefined,
      metrics.duration,
      'sqlite'
    );

    return metrics;
  }

  /**
   * Determines query type from operation string
   */
  private determineQueryType(operation: string): 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' {
    const upperOp = operation.toUpperCase();
    if (upperOp.includes('SELECT')) return 'SELECT';
    if (upperOp.includes('INSERT')) return 'INSERT';
    if (upperOp.includes('UPDATE')) return 'UPDATE';
    if (upperOp.includes('DELETE')) return 'DELETE';
    return 'SELECT'; // Default fallback
  }

  /**
   * Executes a database operation with standardized error handling and logging
   */
  protected async executeOperation<T>(
    context: SqliteOperationContext,
    operation: () => Promise<T>
  ): Promise<T> {
    try {
      const result = await operation();
      
      // Log successful operation (assuming 1 row affected for non-query operations)
      this.logQueryMetrics(context, 1);
      
      return result;
    } catch (error) {
      this.logError(context, error);
      throw error;
    }
  }

  /**
   * Executes a database transaction with standardized error handling and logging
   */
  protected async executeTransaction<T>(
    context: SqliteOperationContext,
    operation: (tx: DrizzleTransaction) => Promise<T>
  ): Promise<T> {
    try {
      const db = this.getDatabase();
      
      const result = await db.transaction(async (tx) => {
        return await operation(tx);
      });
      
      // Log successful transaction
      this.logQueryMetrics(context, 1);
      
      return result;
    } catch (error) {
      this.logError(context, error);
      throw error;
    }
  }

  /**
   * Logs errors with standardized format and context information
   */
  protected logError(context: SqliteOperationContext, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error(`Error in ${this.getEntityType()} repository operation`, {
      error: errorMessage,
      stack: errorStack,
      operation: context.operation,
      entityType: context.entityType,
      entityId: context.entityId,
      duration: Date.now() - context.startTime,
      tableName: this.getTableName(),
    });
  }

  /**
   * Executes a query operation with standardized error handling and metrics logging
   */
  protected async executeQuery<T>(
    context: SqliteOperationContext,
    query: () => Promise<T[]>
  ): Promise<T[]> {
    try {
      const result = await query();
      
      // Log query metrics with actual row count
      this.logQueryMetrics(context, result.length);
      
      return result;
    } catch (error) {
      this.logError(context, error);
      throw error;
    }
  }

  /**
   * Executes a single-result query with standardized error handling
   */
  protected async executeSingleQuery<T>(
    context: SqliteOperationContext,
    query: () => Promise<T[]>
  ): Promise<T | null> {
    try {
      const result = await query();
      
      // Log query metrics
      this.logQueryMetrics(context, result.length);
      
      // Return null if not found, otherwise return the first result
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      this.logError(context, error);
      throw error;
    }
  }

  /**
   * Executes an update operation with standardized error handling
   */
  protected async executeUpdate<T>(
    context: SqliteOperationContext,
    update: () => Promise<T[]>
  ): Promise<T | null> {
    try {
      const result = await update();
      
      // Log update metrics
      this.logQueryMetrics(context, result.length);
      
      // Return null if no rows were updated, otherwise return the updated record
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      this.logError(context, error);
      throw error;
    }
  }

  /**
   * Executes a delete operation with standardized error handling
   */
  protected async executeDelete(
    context: SqliteOperationContext,
    deleteOp: () => Promise<unknown[]>
  ): Promise<boolean> {
    try {
      const result = await deleteOp();
      
      // Log delete metrics
      const rowsAffected = Array.isArray(result) ? result.length : 0;
      this.logQueryMetrics(context, rowsAffected);
      
      // Return true if any rows were deleted
      return rowsAffected > 0;
    } catch (error) {
      this.logError(context, error);
      throw error;
    }
  }

  /**
   * Helper method to validate entity ID format
   */
  protected validateEntityId(id: Shared.IRI, operation: string): void {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new Error(`Invalid entity ID provided for ${operation}: ${id}`);
    }
  }

  /**
   * Helper method to get current timestamp
   */
  protected getCurrentTimestamp(): number {
    return Date.now();
  }

  /**
   * Helper method to create standardized error messages
   */
  protected createErrorMessage(operation: string, details?: string): string {
    const entityType = this.getEntityType();
    const baseMessage = `Failed to ${operation} ${entityType}`;
    return details ? `${baseMessage}: ${details}` : baseMessage;
  }
}
