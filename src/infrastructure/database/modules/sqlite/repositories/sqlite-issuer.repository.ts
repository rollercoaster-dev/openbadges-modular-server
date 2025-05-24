/**
 * SQLite implementation of the Issuer repository
 *
 * This class implements the IssuerRepository interface using SQLite
 * and the Data Mapper pattern with enhanced type safety.
 */

import { eq } from 'drizzle-orm';
import { Issuer } from '@domains/issuer/issuer.entity';
import type { IssuerRepository } from '@domains/issuer/issuer.repository';
import { issuers } from '../schema';
import { SqliteIssuerMapper } from '../mappers/sqlite-issuer.mapper';
import { Shared } from 'openbadges-types';
import { logger, queryLogger } from '@utils/logging/logger.service';
// SensitiveValue import removed as it's not used in this file
import { SqliteConnectionManager } from '../connection/sqlite-connection.manager';
import {
  SqliteQueryMetrics,
  SqliteOperationContext,
} from '../types/sqlite-database.types';
import type { drizzle as DrizzleFn } from 'drizzle-orm/bun-sqlite';

// Create compile-time type alias to avoid runtime import dependency
type DrizzleDB = ReturnType<typeof DrizzleFn>;

export class SqliteIssuerRepository implements IssuerRepository {
  private mapper: SqliteIssuerMapper;

  constructor(private readonly connectionManager: SqliteConnectionManager) {
    this.mapper = new SqliteIssuerMapper();
  }

  /**
   * Gets the mapper instance for external access
   */
  getMapper(): SqliteIssuerMapper {
    return this.mapper;
  }

  /**
   * Gets the database instance with connection validation
   */
  private getDatabase(): DrizzleDB {
    this.connectionManager.ensureConnected();
    return this.connectionManager.getDatabase();
  }

  /**
   * Creates operation context for logging and monitoring
   */
  private createOperationContext(
    operation: string,
    entityId?: Shared.IRI
  ): SqliteOperationContext {
    return {
      operation,
      entityType: 'issuer',
      entityId,
      startTime: Date.now(),
    };
  }

  /**
   * Logs query metrics
   */
  private logQueryMetrics(
    context: SqliteOperationContext,
    rowsAffected: number
  ): SqliteQueryMetrics {
    const metrics: SqliteQueryMetrics = {
      duration: Date.now() - context.startTime,
      rowsAffected,
      queryType: context.operation.includes('SELECT')
        ? 'SELECT'
        : context.operation.includes('INSERT')
        ? 'INSERT'
        : context.operation.includes('UPDATE')
        ? 'UPDATE'
        : 'DELETE',
      tableName: 'issuers',
    };

    queryLogger.logQuery(
      context.operation,
      context.entityId ? [context.entityId] : undefined,
      metrics.duration,
      'sqlite'
    );

    return metrics;
  }

  async create(issuer: Omit<Issuer, 'id'>): Promise<Issuer> {
    const context = this.createOperationContext('INSERT Issuer');

    try {
      const db = this.getDatabase();

      // Use transaction to ensure atomicity between entity creation and database insertion
      const result = await db.transaction(async (tx) => {
        // Create a full issuer entity with generated ID for mapping
        const issuerWithId = Issuer.create(issuer);

        // Convert domain entity to database record
        const record = this.mapper.toPersistence(issuerWithId);

        // Ensure timestamps are set
        const now = Date.now();
        record.createdAt = now;
        record.updatedAt = now;

        // Insert into database within the transaction
        const insertResult = await tx
          .insert(issuers)
          .values(record)
          .returning();

        if (!insertResult[0]) {
          throw new Error('Failed to create issuer: no result returned');
        }

        return insertResult[0];
      });

      // Log metrics
      this.logQueryMetrics(context, 1);

      // Convert database record back to domain entity
      return this.mapper.toDomain(result);
    } catch (error) {
      logger.error('Error creating issuer in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        operation: context.operation,
        duration: Date.now() - context.startTime,
      });
      throw error;
    }
  }

  async findAll(): Promise<Issuer[]> {
    const context = this.createOperationContext('SELECT All Issuers');

    try {
      const db = this.getDatabase();

      // Query database to get all issuers
      const result = await db.select().from(issuers);

      // Log metrics
      this.logQueryMetrics(context, result.length);

      // Convert database records to domain entities
      return result.map((record) => this.mapper.toDomain(record));
    } catch (error) {
      logger.error('Error finding all issuers in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        operation: context.operation,
        duration: Date.now() - context.startTime,
      });
      throw error;
    }
  }

  async findById(id: Shared.IRI): Promise<Issuer | null> {
    const context = this.createOperationContext('SELECT Issuer by ID', id);

    try {
      const db = this.getDatabase();

      // Query database
      const result = await db
        .select()
        .from(issuers)
        .where(eq(issuers.id, id as string));

      // Log metrics
      this.logQueryMetrics(context, result.length);

      // Return null if not found
      if (!result.length) {
        return null;
      }

      // Convert database record to domain entity
      return this.mapper.toDomain(result[0]);
    } catch (error) {
      logger.error('Error finding issuer by ID in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        id,
        operation: context.operation,
        duration: Date.now() - context.startTime,
      });
      throw error;
    }
  }

  async update(
    id: Shared.IRI,
    issuer: Partial<Issuer>
  ): Promise<Issuer | null> {
    const context = this.createOperationContext('UPDATE Issuer', id);

    try {
      // Check if issuer exists
      const existingIssuer = await this.findById(id);
      if (!existingIssuer) {
        return null;
      }

      const db = this.getDatabase();

      // Create a merged entity using toPartial for type safety
      // Filter out undefined values from the update to prevent overwriting with undefined
      const filteredUpdate = Object.fromEntries(
        Object.entries(issuer).filter(([_, value]) => value !== undefined)
      ) as Partial<Issuer>;

      // Preserve the original ID by explicitly setting it
      const mergedIssuer = Issuer.create({
        ...existingIssuer.toPartial(),
        ...filteredUpdate,
        id: existingIssuer.id, // Ensure we keep the original ID
      });

      // Convert to database record but exclude id to avoid updating primary key
      const { id: _discard, ...updatable } =
        this.mapper.toPersistence(mergedIssuer);

      // Ensure updatedAt timestamp is set
      updatable.updatedAt = Date.now();

      const result = await db
        .update(issuers)
        .set(updatable)
        .where(eq(issuers.id, id as string))
        .returning();
      this.logQueryMetrics(context, result.length);

      if (!result[0]) {
        throw new Error('Failed to update issuer: no result returned');
      }

      // Convert database record back to domain entity
      return this.mapper.toDomain(result[0]);
    } catch (error) {
      logger.error('Error updating issuer in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        id,
        operation: context.operation,
        duration: Date.now() - context.startTime,
      });
      throw error;
    }
  }

  async delete(id: Shared.IRI): Promise<boolean> {
    const context = this.createOperationContext('DELETE Issuer', id);

    try {
      const db = this.getDatabase();

      // Delete from database
      const result = await db
        .delete(issuers)
        .where(eq(issuers.id, id as string))
        .returning();

      // Log metrics
      this.logQueryMetrics(context, result.length);

      // Return true if something was deleted
      return result.length > 0;
    } catch (error) {
      logger.error('Error deleting issuer in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        id,
        operation: context.operation,
        duration: Date.now() - context.startTime,
      });
      throw error;
    }
  }
}
