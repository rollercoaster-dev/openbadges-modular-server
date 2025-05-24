/**
 * Base SQLite Repository
 *
 * Abstract base class that provides common functionality for all SQLite repositories,
 * including connection management, error handling, logging, and metrics.
 */

import type { Database } from 'bun:sqlite';
import type { drizzle as DrizzleFn } from 'drizzle-orm/bun-sqlite';
import { logger, queryLogger } from '@utils/logging/logger.service';
import { SqliteConnectionManager } from '../connection/sqlite-connection.manager';
import {
  SqliteQueryMetrics,
  SqliteOperationContext,
} from '../types/sqlite-database.types';
import { Shared } from 'openbadges-types';

// Create compile-time type alias to avoid runtime import dependency
type DrizzleDB = ReturnType<typeof DrizzleFn>;

/**
 * Base operation context for repository operations
 */
export interface BaseOperationContext {
  operation: string;
  entityType: string;
  entityId?: Shared.IRI;
  startTime: number;
}

/**
 * Transaction callback function type
 */
export type TransactionCallback<T> = (tx: DrizzleDB) => Promise<T>;

/**
 * Abstract base class for SQLite repositories
 * Provides common patterns for connection management, logging, error handling, and metrics
 */
export abstract class BaseSqliteRepository {
  protected readonly connectionManager: SqliteConnectionManager;

  constructor(connectionManager: SqliteConnectionManager) {
    this.connectionManager = connectionManager;
  }

  /**
   * Gets the database instance with connection validation
   * @returns Drizzle database instance
   * @throws Error if connection is not available
   */
  protected getDatabase(): DrizzleDB {
    this.connectionManager.ensureConnected();
    return this.connectionManager.getDatabase();
  }

  /**
   * Gets the raw SQLite client (for advanced operations)
   * @returns Raw SQLite database client
   * @throws Error if connection is not available
   */
  protected getRawClient(): Database {
    this.connectionManager.ensureConnected();
    return this.connectionManager.getClient();
  }

  /**
   * Creates operation context for logging and monitoring
   * @param operation Operation name (e.g., 'CREATE User', 'SELECT Issuer by ID')
   * @param entityType Entity type being operated on
   * @param entityId Optional entity ID for tracking
   * @returns Operation context
   */
  protected createOperationContext(
    operation: string,
    entityType: string,
    entityId?: Shared.IRI
  ): BaseOperationContext {
    return {
      operation,
      entityType,
      entityId,
      startTime: Date.now(),
    };
  }

  /**
   * Logs query metrics for performance monitoring
   * @param context Operation context
   * @param resultCount Number of results returned
   * @param additionalMetrics Optional additional metrics
   */
  protected logQueryMetrics(
    context: BaseOperationContext,
    resultCount: number,
    additionalMetrics?: Partial<SqliteQueryMetrics>
  ): void {
    const duration = Date.now() - context.startTime;

    // Use queryLogger.logQuery method with the expected parameters
    queryLogger.logQuery(
      context.operation,
      context.entityId ? [context.entityId] : undefined,
      duration,
      'sqlite'
    );
  }

  /**
   * Executes a database operation with standardized error handling and logging
   * @param context Operation context
   * @param operation Database operation to execute
   * @returns Result of the operation
   * @throws Error with enhanced context information
   */
  protected async executeOperation<T>(
    context: BaseOperationContext,
    operation: () => Promise<T>
  ): Promise<T> {
    try {
      const result = await operation();

      // Log successful operation
      logger.debug(`${context.operation} completed successfully`, {
        operation: context.operation,
        entityType: context.entityType,
        entityId: context.entityId,
        duration: Date.now() - context.startTime,
      });

      return result;
    } catch (error) {
      // Enhanced error logging with context
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      logger.error(`${context.operation} failed`, {
        error: errorMessage,
        stack: errorStack,
        operation: context.operation,
        entityType: context.entityType,
        entityId: context.entityId,
        duration: Date.now() - context.startTime,
      });

      // Re-throw with enhanced context
      const enhancedError = new Error(
        `${context.operation} failed: ${errorMessage}`
      );
      enhancedError.stack = errorStack;
      throw enhancedError;
    }
  }

  /**
   * Executes a database transaction with proper error handling
   * @param context Operation context
   * @param callback Transaction callback function
   * @returns Result of the transaction
   * @throws Error if transaction fails
   */
  protected async executeTransaction<T>(
    context: BaseOperationContext,
    callback: TransactionCallback<T>
  ): Promise<T> {
    const db = this.getDatabase();

    return this.executeOperation(context, async () => {
      return db.transaction(callback);
    });
  }

  /**
   * Validates entity ID format
   * @param id Entity ID to validate
   * @param entityType Entity type for error messages
   * @throws Error if ID is invalid
   */
  protected validateEntityId(id: Shared.IRI, entityType: string): void {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new Error(`Invalid ${entityType} ID: ID cannot be empty`);
    }
  }

  /**
   * Validates required fields in entity data
   * @param data Entity data to validate
   * @param requiredFields Array of required field names
   * @param entityType Entity type for error messages
   * @throws Error if required fields are missing
   */
  protected validateRequiredFields(
    data: Record<string, unknown>,
    requiredFields: string[],
    entityType: string
  ): void {
    const missingFields = requiredFields.filter(
      (field) =>
        data[field] === undefined || data[field] === null || data[field] === ''
    );

    if (missingFields.length > 0) {
      throw new Error(
        `Invalid ${entityType} data: Missing required fields: ${missingFields.join(
          ', '
        )}`
      );
    }
  }

  /**
   * Safely converts timestamps for database storage
   * @param date Date to convert (Date object, number, or null/undefined)
   * @returns Timestamp in milliseconds or null
   */
  protected convertTimestamp(
    date: Date | number | null | undefined
  ): number | null {
    if (date === null || date === undefined) {
      return null;
    }

    if (date instanceof Date) {
      return date.getTime();
    }

    if (typeof date === 'number') {
      return date;
    }

    return null;
  }

  /**
   * Safely converts timestamps from database to Date objects
   * @param timestamp Timestamp from database (number or null)
   * @returns Date object or null
   */
  protected convertFromTimestamp(timestamp: number | null): Date | null {
    if (timestamp === null || timestamp === undefined) {
      return null;
    }

    if (typeof timestamp === 'number') {
      return new Date(timestamp);
    }

    return null;
  }

  /**
   * Safely stringifies JSON data for database storage
   * @param data Data to stringify
   * @returns JSON string or null
   */
  protected safeStringify(data: unknown): string | null {
    if (data === null || data === undefined) {
      return null;
    }

    try {
      return JSON.stringify(data);
    } catch (error) {
      logger.warn('Failed to stringify data for database storage', {
        error: error instanceof Error ? error.message : String(error),
        dataType: typeof data,
      });
      return null;
    }
  }

  /**
   * Safely parses JSON data from database
   * @param jsonString JSON string from database
   * @returns Parsed data or null
   */
  protected safeParse<T = unknown>(jsonString: string | null): T | null {
    if (!jsonString || typeof jsonString !== 'string') {
      return null;
    }

    try {
      return JSON.parse(jsonString) as T;
    } catch (error) {
      logger.warn('Failed to parse JSON data from database', {
        error: error instanceof Error ? error.message : String(error),
        jsonString: jsonString.substring(0, 100), // Log first 100 chars for debugging
      });
      return null;
    }
  }
}
