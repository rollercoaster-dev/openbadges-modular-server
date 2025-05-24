/**
 * Base PostgreSQL Repository
 *
 * Abstract base class providing common functionality for all PostgreSQL repositories.
 * Includes standardized error handling, logging, transaction support, and query execution patterns.
 */

import type { drizzle } from 'drizzle-orm/postgres-js';
import type postgres from 'postgres';
import { logger, queryLogger } from '@utils/logging/logger.service';
import { Shared } from 'openbadges-types';
import {
  PostgresOperationContext,
  PostgresEntityType,
  PostgresQueryMetrics,
  PostgresPaginationParams,
  PostgresTransaction,
  DEFAULT_POSTGRES_PAGINATION,
  MAX_POSTGRES_PAGINATION_LIMIT,
} from '../types/postgres-database.types';

/**
 * Abstract base class for PostgreSQL repositories
 */
export abstract class BasePostgresRepository {
  protected readonly db: ReturnType<typeof drizzle>;
  protected readonly client: postgres.Sql;

  constructor(client: postgres.Sql) {
    this.client = client;
    this.db = drizzle(client);
  }

  /**
   * Gets the PostgreSQL database instance
   */
  protected getDatabase(): ReturnType<typeof drizzle> {
    return this.db;
  }

  /**
   * Gets the raw PostgreSQL client
   */
  protected getClient(): postgres.Sql {
    return this.client;
  }

  /**
   * Creates operation context for logging and monitoring
   */
  protected createOperationContext(
    operation: string,
    entityId?: Shared.IRI
  ): PostgresOperationContext {
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
  protected abstract getEntityType(): PostgresEntityType;

  /**
   * Abstract method that subclasses must implement to specify their table name
   */
  protected abstract getTableName(): string;

  /**
   * Logs query metrics with standardized format
   */
  protected logQueryMetrics(
    context: PostgresOperationContext,
    rowsAffected: number,
    queryParams?: unknown[]
  ): PostgresQueryMetrics {
    const metrics: PostgresQueryMetrics = {
      duration: Date.now() - context.startTime,
      rowsAffected,
      queryType: this.determineQueryType(context.operation),
      tableName: this.getTableName(),
    };

    // Use provided query parameters if available, otherwise fall back to entityId
    const logParams =
      queryParams || (context.entityId ? [context.entityId] : undefined);

    queryLogger.logQuery(
      context.operation,
      logParams,
      metrics.duration,
      'postgresql'
    );

    return metrics;
  }

  /**
   * Determines query type from operation string using word boundary regex for accuracy
   */
  private determineQueryType(
    operation: string
  ): 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'UNKNOWN' {
    const upperOp = operation.toUpperCase();

    // Use word boundaries to ensure we match complete words, not substrings
    if (/\bSELECT\b/.test(upperOp)) return 'SELECT';
    if (/\bINSERT\b/.test(upperOp)) return 'INSERT';
    if (/\bUPDATE\b/.test(upperOp)) return 'UPDATE';
    if (/\bDELETE\b/.test(upperOp)) return 'DELETE';

    return 'UNKNOWN'; // Return UNKNOWN instead of guessing
  }

  /**
   * Executes a database operation with standardized error handling and logging
   */
  protected async executeOperation<T>(
    context: PostgresOperationContext,
    operation: () => Promise<T>,
    rowsAffected?: number
  ): Promise<T> {
    try {
      const result = await operation();

      // Log successful operation with provided or default row count
      this.logQueryMetrics(context, rowsAffected ?? 1);

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
    context: PostgresOperationContext,
    operation: (tx: PostgresTransaction) => Promise<T>,
    rowsAffected?: number
  ): Promise<T> {
    try {
      const db = this.getDatabase();

      const result = await db.transaction(async (tx) => {
        return await operation(tx);
      });

      // Log successful transaction with provided or default row count
      this.logQueryMetrics(context, rowsAffected ?? 1);

      return result;
    } catch (error) {
      this.logError(context, error);
      throw error;
    }
  }

  /**
   * Logs errors with standardized format and context information
   */
  protected logError(context: PostgresOperationContext, error: unknown): void {
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
    context: PostgresOperationContext,
    query: (db: ReturnType<typeof drizzle>) => Promise<T[]>,
    queryParams?: unknown[]
  ): Promise<T[]> {
    try {
      const db = this.getDatabase();
      const result = await query(db);

      // Log query metrics with actual row count and parameters
      this.logQueryMetrics(context, result.length, queryParams);

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
    context: PostgresOperationContext,
    query: (db: ReturnType<typeof drizzle>) => Promise<T[]>,
    queryParams?: unknown[]
  ): Promise<T | null> {
    try {
      const db = this.getDatabase();
      const result = await query(db);

      // Log query metrics with parameters
      this.logQueryMetrics(context, result.length, queryParams);

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
    context: PostgresOperationContext,
    update: (db: ReturnType<typeof drizzle>) => Promise<T[]>,
    queryParams?: unknown[]
  ): Promise<T | null> {
    try {
      const db = this.getDatabase();
      const result = await update(db);

      // Log update metrics
      this.logQueryMetrics(context, result.length, queryParams);

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
    context: PostgresOperationContext,
    deleteOp: (db: ReturnType<typeof drizzle>) => Promise<unknown[]>
  ): Promise<boolean> {
    try {
      const db = this.getDatabase();
      const result = await deleteOp(db);

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
  protected getCurrentTimestamp(): Date {
    return new Date();
  }

  /**
   * Helper method to create standardized error messages
   */
  protected createErrorMessage(operation: string, details?: string): string {
    const entityType = this.getEntityType();
    const baseMessage = `Failed to ${operation} ${entityType}`;
    return details ? `${baseMessage}: ${details}` : baseMessage;
  }

  /**
   * Validates and normalizes pagination parameters
   */
  protected validatePagination(
    params?: PostgresPaginationParams
  ): Required<PostgresPaginationParams> {
    const limit = params?.limit ?? DEFAULT_POSTGRES_PAGINATION.limit;
    const offset = params?.offset ?? DEFAULT_POSTGRES_PAGINATION.offset;

    // Validate limit
    if (limit <= 0) {
      throw new Error(
        `Invalid pagination limit: ${limit}. Must be greater than 0.`
      );
    }
    if (limit > MAX_POSTGRES_PAGINATION_LIMIT) {
      throw new Error(
        `Pagination limit ${limit} exceeds maximum allowed limit of ${MAX_POSTGRES_PAGINATION_LIMIT}.`
      );
    }

    // Validate offset
    if (offset < 0) {
      throw new Error(
        `Invalid pagination offset: ${offset}. Must be 0 or greater.`
      );
    }

    return { limit, offset };
  }

  /**
   * Logs a warning for unbounded queries to help identify potential scalability issues
   */
  protected logUnboundedQueryWarning(operation: string): void {
    logger.warn(
      `Unbounded query detected in ${this.getEntityType()} repository`,
      {
        operation,
        entityType: this.getEntityType(),
        tableName: this.getTableName(),
        recommendation:
          'Consider adding pagination parameters to prevent memory issues with large datasets',
      }
    );
  }
}
