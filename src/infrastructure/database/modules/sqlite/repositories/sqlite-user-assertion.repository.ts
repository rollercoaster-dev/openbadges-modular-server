/**
 * SQLite implementation of the UserAssertion repository
 *
 * This class implements the UserAssertionRepository interface using SQLite
 * and the Data Mapper pattern with Drizzle ORM.
 */

import { eq, and, ne, sql } from 'drizzle-orm';
import { UserAssertion } from '@domains/backpack/user-assertion.entity';
import type { UserAssertionRepository } from '@domains/backpack/user-assertion.repository';
import { Shared } from 'openbadges-types';
import { logger } from '@utils/logging/logger.service';
import { UserAssertionStatus } from '@domains/backpack/backpack.types';
import {
  UserAssertionCreateParams,
  UserAssertionQueryParams,
} from '@domains/backpack/repository.types';
import { userAssertions } from '../schema';
import { SqliteUserAssertionMapper } from '../mappers/sqlite-user-assertion.mapper';
import { createId } from '@paralleldrive/cuid2';
import { SqliteConnectionManager } from '../connection/sqlite-connection.manager';
import { convertUuid } from '@infrastructure/database/utils/type-conversion';
import { SqliteTypeConverters } from '../utils/sqlite-type-converters';

export class SqliteUserAssertionRepository implements UserAssertionRepository {
  private mapper: SqliteUserAssertionMapper;

  constructor(private readonly connectionManager: SqliteConnectionManager) {
    this.mapper = new SqliteUserAssertionMapper();
  }

  /**
   * Gets the database instance with connection validation
   */
  private getDatabase() {
    this.connectionManager.ensureConnected();
    return this.connectionManager.getDatabase();
  }

  /**
   * Gets the mapper instance for external access
   */
  getMapper(): SqliteUserAssertionMapper {
    return this.mapper;
  }

  /**
   * Helper method to construct a properly typed Drizzle update set from a record
   * @param record The record containing fields to update
   * @returns A properly typed update object for Drizzle ORM
   */
  private constructDrizzleUpdateSet(record: Record<string, unknown>) {
    // Create an update set with explicitly typed fields matching the schema
    // This provides compile-time type safety when passing the result to Drizzle's .set() method
    // and ensures consistency with the database schema structure
    const updateSet: {
      status?: string;
      metadata?: string;
      updatedAt?: number; // Must be number for SQLite integer field
    } = {};

    if (record.status !== undefined) {
      updateSet.status = String(record.status);
    }

    if (record.metadata !== undefined) {
      // Use proper JSON conversion to prevent data loss
      updateSet.metadata =
        typeof record.metadata === 'string'
          ? record.metadata
          : SqliteTypeConverters.safeJsonStringify(
              record.metadata,
              'metadata'
            ) || '{}';
    }

    // Handle updatedAt field
    if (record.updatedAt !== undefined) {
      updateSet.updatedAt =
        typeof record.updatedAt === 'number'
          ? record.updatedAt
          : record.updatedAt instanceof Date
          ? record.updatedAt.getTime()
          : Date.now();
    }

    return updateSet;
  }

  async addAssertion(
    userIdOrParams: Shared.IRI | UserAssertionCreateParams,
    assertionId?: Shared.IRI,
    metadata?: Record<string, unknown>
  ): Promise<UserAssertion> {
    try {
      // Handle params object
      if (typeof userIdOrParams !== 'string') {
        const params = userIdOrParams;
        return this.createUserAssertion(
          params.userId,
          params.assertionId,
          params.metadata
        );
      }

      // Handle individual parameters
      if (!assertionId) {
        throw new Error('Assertion ID is required when userId is provided');
      }

      return this.createUserAssertion(userIdOrParams, assertionId, metadata);
    } catch (error) {
      logger.error('Error adding assertion to user in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        userIdOrParams,
        assertionId,
      });
      throw error;
    }
  }

  /**
   * Internal method to create a user assertion
   */
  private async createUserAssertion(
    userId: Shared.IRI,
    assertionId: Shared.IRI,
    metadata?: Record<string, unknown>
  ): Promise<UserAssertion> {
    try {
      // Create a new user assertion entity with a generated ID
      const id = createId() as Shared.IRI;
      const userAssertion = UserAssertion.create({
        id,
        userId,
        assertionId,
        metadata,
      });

      // Convert domain entity to database record
      const record = this.mapper.toPersistence(userAssertion);

      // Get database with connection validation
      const db = this.getDatabase();

      // Use transaction for atomicity
      await db.transaction(async (tx) => {
        // Ensure we have current timestamp for updated records
        const now = Date.now();

        // Prepare record with current timestamps for initial insertion
        const recordWithTime = {
          ...record, // Contains id, userId, assertionId, metadata (if any), status (default or provided)
          addedAt: now,
          updatedAt: now, // Set updatedAt on creation as well
        };

        // Extract the original entity data for update values
        const entityData = userAssertion.toObject();

        // Create update values for conflict case - preserve only the fields we want to update
        // Build the object dynamically to avoid including undefined values
        const updateValues: Record<string, string | number | undefined> = {
          updatedAt: now, // Always update updatedAt on conflict
        };

        // Only add status if it's defined, otherwise use default
        if (entityData.status) {
          updateValues.status = entityData.status;
        } else {
          updateValues.status = UserAssertionStatus.ACTIVE;
        }

        // Only add metadata if it's defined and can be converted to a string
        if (entityData.metadata) {
          const metadataString = SqliteTypeConverters.safeJsonStringify(
            entityData.metadata,
            'metadata'
          );
          if (metadataString) {
            updateValues.metadata = metadataString;
          }
        }

        // Use a single atomic operation with INSERT ... ON CONFLICT DO UPDATE
        // This ensures we don't have race conditions with concurrent transactions
        await tx
          .insert(userAssertions)
          .values(recordWithTime)
          .onConflictDoUpdate({
            target: [userAssertions.userId, userAssertions.assertionId],
            set: updateValues,
          });
      });

      // Fetch the persisted entity to ensure canonical data is returned
      const persistedAssertion = await this.findByUserAndAssertion(
        userId,
        assertionId
      );

      if (!persistedAssertion) {
        // This should ideally not happen if the transaction was successful
        logger.error('Failed to fetch user assertion after creation/update', {
          userId,
          assertionId,
        });
        // Throw an error to indicate an inconsistency, as returning the potentially
        // stale in-memory 'userAssertion' would defeat the purpose of this change.
        throw new Error(
          'Failed to retrieve user assertion after persistence operation.'
        );
      }

      return persistedAssertion;
    } catch (error) {
      logger.error('Error creating user assertion in SQLite repository', {
        error: error instanceof Error ? error.stack : String(error),
        userId,
        assertionId,
      });
      throw error;
    }
  }

  async removeAssertion(
    userId: Shared.IRI,
    assertionId: Shared.IRI
  ): Promise<boolean> {
    try {
      // Get database with connection validation
      const db = this.getDatabase();

      // Convert IDs to database format for querying
      const dbUserId = convertUuid(userId as string, 'sqlite', 'to') as string;
      const dbAssertionId = convertUuid(
        assertionId as string,
        'sqlite',
        'to'
      ) as string;

      // Delete from database using Drizzle ORM
      const result = await db
        .delete(userAssertions)
        .where(
          and(
            eq(userAssertions.userId, dbUserId),
            eq(userAssertions.assertionId, dbAssertionId)
          )
        )
        .returning();

      // Return true if something was deleted
      return result.length > 0;
    } catch (error) {
      logger.error('Error removing assertion from user in SQLite repository', {
        error: error instanceof Error ? error.stack : String(error),
        userId,
        assertionId,
      });
      throw error;
    }
  }

  async updateStatus(
    userId: Shared.IRI,
    assertionId: Shared.IRI,
    status: UserAssertionStatus
  ): Promise<boolean> {
    try {
      // Get database with connection validation
      const db = this.getDatabase();

      // Update status in database using Drizzle ORM
      // Use the helper method to construct the Drizzle update set
      const drizzleUpdateSet = this.constructDrizzleUpdateSet({
        status,
        updatedAt: Date.now(), // Use updatedAt for timestamp field
      });

      // Convert IDs to database format for querying
      const dbUserId = convertUuid(userId as string, 'sqlite', 'to') as string;
      const dbAssertionId = convertUuid(
        assertionId as string,
        'sqlite',
        'to'
      ) as string;

      const result = await db
        .update(userAssertions)
        .set(drizzleUpdateSet)
        .where(
          and(
            eq(userAssertions.userId, dbUserId),
            eq(userAssertions.assertionId, dbAssertionId)
          )
        )
        .returning();

      // Return true if something was updated
      return result.length > 0;
    } catch (error) {
      logger.error('Error updating assertion status in SQLite repository', {
        error: error instanceof Error ? error.stack : String(error),
        userId,
        assertionId,
        status,
      });
      throw error;
    }
  }

  async getUserAssertions(
    userId: Shared.IRI,
    params?: UserAssertionQueryParams
  ): Promise<UserAssertion[]> {
    try {
      // Get database with connection validation
      const db = this.getDatabase();

      // Convert user ID to database format for querying
      const dbUserId = convertUuid(userId as string, 'sqlite', 'to') as string;

      // Build the where conditions
      const whereCondition = params?.status
        ? and(
            eq(userAssertions.userId, dbUserId),
            eq(userAssertions.status, params.status as string)
          )
        : and(
            eq(userAssertions.userId, dbUserId),
            ne(userAssertions.status, UserAssertionStatus.DELETED as string)
          );

      // Build the query with the condition
      let query = db.select().from(userAssertions).where(whereCondition);

      // Execute the query with pagination if provided
      let result: (typeof userAssertions.$inferSelect)[];

      // Apply pagination if provided
      if (params?.limit !== undefined) {
        // Create a new query with limit
        const limitQuery = query.limit(params.limit);

        // Add offset if provided
        if (params?.offset !== undefined) {
          result = await limitQuery.offset(params.offset);
        } else {
          result = await limitQuery;
        }
      } else if (params?.offset !== undefined) {
        // If only offset is provided (unusual but supported)
        result = await query.offset(params.offset);
      } else {
        // Execute without pagination
        result = await query;
      }

      // Convert database records to domain entities
      return result.map((record: typeof userAssertions.$inferSelect) =>
        this.mapper.toDomain(record)
      );
    } catch (error) {
      logger.error('Error getting user assertions in SQLite repository', {
        error: error instanceof Error ? error.stack : String(error),
        userId,
        params,
      });
      throw error;
    }
  }

  async getAssertionUsers(assertionId: Shared.IRI): Promise<UserAssertion[]> {
    try {
      // Get database with connection validation
      const db = this.getDatabase();

      // Convert assertion ID to database format for querying
      const dbAssertionId = convertUuid(
        assertionId as string,
        'sqlite',
        'to'
      ) as string;

      // Query database using Drizzle ORM
      const result = await db
        .select()
        .from(userAssertions)
        .where(eq(userAssertions.assertionId, dbAssertionId));

      // Convert database records to domain entities
      return result.map((record) => this.mapper.toDomain(record));
    } catch (error) {
      logger.error('Error getting assertion users in SQLite repository', {
        error: error instanceof Error ? error.stack : String(error),
        assertionId,
      });
      throw error;
    }
  }

  async hasAssertion(
    userId: Shared.IRI,
    assertionId: Shared.IRI
  ): Promise<boolean> {
    try {
      // Get database with connection validation
      const db = this.getDatabase();

      // Convert IDs to database format for querying
      const dbUserId = convertUuid(userId as string, 'sqlite', 'to') as string;
      const dbAssertionId = convertUuid(
        assertionId as string,
        'sqlite',
        'to'
      ) as string;

      // Query database using Drizzle ORM
      const result = await db
        .select({ exists: sql`1` })
        .from(userAssertions)
        .where(
          and(
            eq(userAssertions.userId, dbUserId),
            eq(userAssertions.assertionId, dbAssertionId),
            ne(userAssertions.status, UserAssertionStatus.DELETED as string)
          )
        );

      // Return true if found
      return result.length > 0;
    } catch (error) {
      logger.error(
        'Error checking if user has assertion in SQLite repository',
        {
          error: error instanceof Error ? error.stack : String(error),
          userId,
          assertionId,
        }
      );
      throw error;
    }
  }

  async findByUserAndAssertion(
    userId: Shared.IRI,
    assertionId: Shared.IRI
  ): Promise<UserAssertion | null> {
    try {
      // Get database with connection validation
      const db = this.getDatabase();

      // Convert IDs to database format for querying
      const dbUserId = convertUuid(userId as string, 'sqlite', 'to') as string;
      const dbAssertionId = convertUuid(
        assertionId as string,
        'sqlite',
        'to'
      ) as string;

      // Query database using Drizzle ORM
      const result = await db
        .select()
        .from(userAssertions)
        .where(
          and(
            eq(userAssertions.userId, dbUserId),
            eq(userAssertions.assertionId, dbAssertionId)
          )
        );

      // Return null if not found
      if (!result.length) {
        return null;
      }

      // Convert database record to domain entity
      return this.mapper.toDomain(result[0]);
    } catch (error) {
      logger.error(
        'Error finding user assertion by user and assertion ID in SQLite repository',
        {
          error: error instanceof Error ? error.stack : String(error),
          userId,
          assertionId,
        }
      );
      throw error;
    }
  }
}
