/**
 * SQLite implementation of the Assertion repository
 *
 * This class implements the AssertionRepository interface using SQLite
 * and the Data Mapper pattern.
 */

import { eq, sql, InferInsertModel } from 'drizzle-orm';
import { Assertion } from '@domains/assertion/assertion.entity';
import type { AssertionRepository } from '@domains/assertion/assertion.repository';
import { assertions } from '../schema';
import { SqliteAssertionMapper } from '../mappers/sqlite-assertion.mapper';
import { Shared } from 'openbadges-types';
import { logger, queryLogger } from '@utils/logging/logger.service';
import { SensitiveValue } from '@rollercoaster-dev/rd-logger';
import {
  SqlitePaginationParams,
  DEFAULT_PAGINATION,
  MAX_PAGINATION_LIMIT,
} from '../types/sqlite-database.types';
import { SqliteConnectionManager } from '../connection/sqlite-connection.manager';

export class SqliteAssertionRepository implements AssertionRepository {
  private mapper: SqliteAssertionMapper;

  constructor(private readonly connectionManager: SqliteConnectionManager) {
    this.mapper = new SqliteAssertionMapper();
  }

  /**
   * Gets the mapper instance for external access
   */
  getMapper(): SqliteAssertionMapper {
    return this.mapper;
  }

  /**
   * Gets the database instance with connection validation
   */
  private getDatabase() {
    this.connectionManager.ensureConnected();
    return this.connectionManager.getDatabase();
  }

  /**
   * Validates and normalizes pagination parameters
   */
  private validatePagination(
    params?: SqlitePaginationParams
  ): Required<SqlitePaginationParams> {
    const limit = params?.limit ?? DEFAULT_PAGINATION.limit;
    const offset = params?.offset ?? DEFAULT_PAGINATION.offset;

    // Validate limit
    if (limit <= 0) {
      throw new Error(
        `Invalid pagination limit: ${limit}. Must be greater than 0.`
      );
    }
    if (limit > MAX_PAGINATION_LIMIT) {
      throw new Error(
        `Pagination limit ${limit} exceeds maximum allowed limit of ${MAX_PAGINATION_LIMIT}.`
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
   * Logs a warning for unbounded queries
   */
  private logUnboundedQueryWarning(operation: string): void {
    logger.warn('Unbounded query detected in Assertion repository', {
      operation,
      entityType: 'assertion',
      tableName: 'assertions',
      recommendation:
        'Consider adding pagination parameters to prevent memory issues with large datasets',
    });
  }

  async create(assertion: Omit<Assertion, 'id'>): Promise<Assertion> {
    try {
      // Let the entity handle ID generation to ensure proper IRI format
      const fullAssertion = Assertion.create(assertion);

      // Convert domain entity to database record
      const record: InferInsertModel<typeof assertions> =
        this.mapper.toPersistence(fullAssertion);

      // Insert into database
      const startTime = Date.now();
      const result = await this.getDatabase()
        .insert(assertions)
        .values(record)
        .returning();
      const duration = Date.now() - startTime;

      // Log query (wrap the whole record as potentially sensitive)
      queryLogger.logQuery(
        'INSERT Assertion',
        [SensitiveValue.from(record)],
        duration,
        'sqlite'
      );

      // Convert database record back to domain entity
      // Ensure the returned result from 'returning()' matches the expected input for toDomain
      // Assuming result[0] has the correct shape after insertion.
      // If 'returning()' doesn't return all needed fields, a separate findById might be necessary.
      const createdRecord = result[0];
      if (!createdRecord) {
        throw new Error(
          'Failed to retrieve created assertion record after insert.'
        );
      }
      // We need to ensure createdRecord matches the input type for toDomain
      // Let's assume for now it does, but this might need adjustment
      // based on the actual return shape of .returning() in SQLite/Drizzle.
      return this.mapper.toDomain(createdRecord);
    } catch (error) {
      logger.error('Error creating assertion in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        assertion,
        // Log sensitive assertion data separately if needed for debugging, but avoid in query logs
      });
      throw error;
    }
  }

  /**
   * Finds all assertions with optional pagination
   * @param pagination Optional pagination parameters. If not provided, uses default pagination to prevent unbounded queries.
   * @returns Promise resolving to array of Assertion entities
   */
  async findAll(pagination?: SqlitePaginationParams): Promise<Assertion[]> {
    try {
      // Validate and normalize pagination parameters
      const { limit, offset } = this.validatePagination(pagination);

      // Log warning if no pagination was explicitly provided
      if (!pagination) {
        this.logUnboundedQueryWarning('findAll');
      }

      // Query database with pagination
      const startTime = Date.now();
      const result = await this.getDatabase()
        .select()
        .from(assertions)
        .limit(limit)
        .offset(offset);
      const duration = Date.now() - startTime;

      // Log query
      queryLogger.logQuery(
        'SELECT All Assertions',
        undefined,
        duration,
        'sqlite'
      );

      // Convert database records to domain entities
      return result.map((record) => this.mapper.toDomain(record));
    } catch (error) {
      logger.error('Error finding all assertions in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Finds all assertions without pagination (for backward compatibility and specific use cases)
   * @deprecated Use findAll() with pagination parameters instead
   * @returns Promise resolving to array of all Assertion entities
   */
  async findAllUnbounded(): Promise<Assertion[]> {
    try {
      // Log warning for unbounded query
      this.logUnboundedQueryWarning('findAllUnbounded');

      // Query database without pagination
      const startTime = Date.now();
      const result = await this.getDatabase().select().from(assertions);
      const duration = Date.now() - startTime;

      // Log query
      queryLogger.logQuery(
        'SELECT All Assertions (Unbounded)',
        undefined,
        duration,
        'sqlite'
      );

      // Convert database records to domain entities
      return result.map((record) => this.mapper.toDomain(record));
    } catch (error) {
      logger.error('Error finding all assertions in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findById(id: Shared.IRI): Promise<Assertion | null> {
    try {
      const startTime = Date.now();
      // Query database
      const result = await this.getDatabase()
        .select()
        .from(assertions)
        .where(eq(assertions.id, id as string));
      const duration = Date.now() - startTime;

      // Log query (assuming id is not sensitive)
      queryLogger.logQuery('SELECT Assertion by ID', [id], duration, 'sqlite');

      // Return null if not found
      if (!result.length) {
        return null;
      }

      // Convert database record to domain entity
      return this.mapper.toDomain(result[0]);
    } catch (error) {
      logger.error('Error finding assertion by ID in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        id,
      });
      throw error;
    }
  }

  async findByBadgeClass(badgeClassId: Shared.IRI): Promise<Assertion[]> {
    try {
      const startTime = Date.now();
      // Query database
      const result = await this.getDatabase()
        .select()
        .from(assertions)
        .where(eq(assertions.badgeClassId, badgeClassId as string));
      const duration = Date.now() - startTime;

      // Log query (assuming badgeClassId is not sensitive)
      queryLogger.logQuery(
        'SELECT Assertions by BadgeClass',
        [badgeClassId],
        duration,
        'sqlite'
      );

      // Convert database records to domain entities
      return result.map((record) => this.mapper.toDomain(record));
    } catch (error) {
      logger.error(
        'Error finding assertions by badge class in SQLite repository',
        {
          error: error instanceof Error ? error.message : String(error),
          badgeClassId,
        }
      );
      throw error;
    }
  }

  async findByRecipient(recipientId: string): Promise<Assertion[]> {
    try {
      const startTime = Date.now();
      // Query database using JSON extraction
      const result = await this.getDatabase()
        .select()
        .from(assertions)
        .where(
          sql`json_extract(${assertions.recipient}, '$.identity') = ${recipientId}`
        );
      const duration = Date.now() - startTime;

      // Log query (wrap recipientId as potentially sensitive)
      queryLogger.logQuery(
        'SELECT Assertions by Recipient',
        [SensitiveValue.from(recipientId)],
        duration,
        'sqlite'
      );

      // Convert database records to domain entities
      return result.map((record) => this.mapper.toDomain(record));
    } catch (error) {
      logger.error(
        'Error finding assertions by recipient in SQLite repository',
        {
          error: error instanceof Error ? error.message : String(error),
          recipientId,
        }
      );
      throw error;
    }
  }

  async update(
    id: Shared.IRI,
    assertion: Partial<Assertion>
  ): Promise<Assertion | null> {
    try {
      // Check if assertion exists
      const existingAssertion = await this.findById(id);
      if (!existingAssertion) {
        return null;
      }

      // Create a merged entity
      // Get the existing assertion as a plain object while preserving prototype information.
      // Preserving the prototype ensures that the merged entity retains the behavior and methods
      // of the original Assertion class. This is critical for maintaining the integrity of the domain model.
      // The merge order is also important: properties from the `assertion` object will overwrite those
      // in `existingData`. This allows updates to take precedence while retaining any unchanged properties
      // from the existing assertion.
      const existingData = Object.assign(
        Object.create(Object.getPrototypeOf(existingAssertion)),
        existingAssertion
      );

      // Create a merged assertion
      const mergedAssertion = Assertion.create({
        ...existingData,
        ...assertion,
      } as Partial<Assertion>);

      // Convert to database record
      const {
        id: _ignore,
        createdAt: _ca,
        ...updatable
      } = this.mapper.toPersistence(mergedAssertion);

      // Update in database
      const startTime = Date.now();
      const result = await this.getDatabase()
        .update(assertions)
        .set(updatable)
        .where(eq(assertions.id, id as string))
        .returning();
      const duration = Date.now() - startTime;

      // Log query (wrap the whole record as potentially sensitive)
      queryLogger.logQuery(
        'UPDATE Assertion',
        [id, SensitiveValue.from(updatable)], // Log ID and the updated data
        duration,
        'sqlite'
      );

      // Convert database record back to domain entity
      return this.mapper.toDomain(result[0]);
    } catch (error) {
      logger.error('Error updating assertion in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        id,
        assertion, // Log sensitive assertion data separately if needed for debugging
      });
      throw error;
    }
  }

  async delete(id: Shared.IRI): Promise<boolean> {
    try {
      // Delete from database
      const startTime = Date.now();
      const result = await this.getDatabase()
        .delete(assertions)
        .where(eq(assertions.id, id as string))
        .returning();
      const duration = Date.now() - startTime;

      // Log query (assuming id is not sensitive)
      queryLogger.logQuery('DELETE Assertion', [id], duration, 'sqlite');

      // Return true if something was deleted
      return result.length > 0;
    } catch (error) {
      logger.error('Error deleting assertion in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        id,
      });
      throw error;
    }
  }

  async revoke(id: Shared.IRI, reason?: string): Promise<Assertion | null> {
    try {
      // Note: Query logging for the underlying update operation
      // happens within the 'update' method called below.

      // Check if assertion exists
      const existingAssertion = await this.findById(id);
      if (!existingAssertion) {
        return null;
      }

      // Update assertion to revoke it
      return this.update(id, {
        revoked: true,
        revocationReason: reason,
      });
    } catch (error) {
      logger.error('Error revoking assertion in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        id,
        reason,
      });
      throw error;
    }
  }

  async verify(id: Shared.IRI): Promise<{ isValid: boolean; reason?: string }> {
    try {
      // Get assertion
      const assertion = await this.findById(id);

      // Check if assertion exists
      if (!assertion) {
        return { isValid: false, reason: 'Assertion not found' };
      }

      // Check if revoked
      if (assertion.revoked) {
        return {
          isValid: false,
          reason: assertion.revocationReason || 'Assertion has been revoked',
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

      // Assertion is valid
      return { isValid: true };
    } catch (error) {
      logger.error('Error verifying assertion in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        id,
      });
      throw error;
    }
  }
}
