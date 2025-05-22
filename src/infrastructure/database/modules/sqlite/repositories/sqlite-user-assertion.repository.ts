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
import { UserAssertionCreateParams, UserAssertionQueryParams } from '@domains/backpack/repository.types';
import { userAssertions } from '../schema';
import { SqliteUserAssertionMapper } from '../mappers/sqlite-user-assertion.mapper';
import { createId } from '@paralleldrive/cuid2';
import { SqliteConnectionManager } from '../connection/sqlite-connection.manager';

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
  private constructDrizzleUpdateSet(record: Record<string, unknown>): {
    [key in typeof userAssertions.status.name | typeof userAssertions.metadata.name]?: string;
  } {
    // Define a properly typed update object for Drizzle
    type DrizzleUpdateSet = {
      [key in typeof userAssertions.status.name | typeof userAssertions.metadata.name]?: string;
    };

    const updateSet: DrizzleUpdateSet = {};

    if (record.status !== undefined) {
      updateSet[userAssertions.status.name] = String(record.status);
    }

    if (record.metadata !== undefined) {
      updateSet[userAssertions.metadata.name] = String(record.metadata);
    }

    return updateSet;
  }

  async addAssertion(userIdOrParams: Shared.IRI | UserAssertionCreateParams, assertionId?: Shared.IRI, metadata?: Record<string, unknown>): Promise<UserAssertion> {
    try {
      // Handle params object
      if (typeof userIdOrParams !== 'string') {
        const params = userIdOrParams;
        return this.createUserAssertion(params.userId, params.assertionId, params.metadata);
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
        assertionId
      });
      throw error;
    }
  }

  /**
   * Internal method to create a user assertion
   */
  private async createUserAssertion(userId: Shared.IRI, assertionId: Shared.IRI, metadata?: Record<string, unknown>): Promise<UserAssertion> {
    try {
      // Create a new user assertion entity with a generated ID
      const id = createId() as Shared.IRI;
      const userAssertion = UserAssertion.create({
        id,
        userId,
        assertionId,
        metadata
      });

      // Convert domain entity to database record
      const record = this.mapper.toPersistence(userAssertion);

      // Get database with connection validation
      const db = this.getDatabase();
      
      // Use transaction for atomicity
      await db.transaction(async (tx) => {
        // First check if the record already exists
        const existingRecord = await tx
          .select()
          .from(userAssertions)
          .where(
            and(
              eq(userAssertions.userId, userId as string),
              eq(userAssertions.assertionId, assertionId as string)
            )
          );
          
        if (existingRecord.length > 0) {
          // Record exists, update it
          const updateData: Record<string, unknown> = {};
          
          // Extract fields to update from the record
          const extendedRecord = record as Record<string, unknown>;
          
          if ('status' in extendedRecord && extendedRecord.status !== undefined) {
            updateData.status = extendedRecord.status;
          }
          
          if ('metadata' in extendedRecord && extendedRecord.metadata !== undefined) {
            updateData.metadata = extendedRecord.metadata;
          }
          
          // Use the helper method to construct the Drizzle update set
          const drizzleUpdateSet = this.constructDrizzleUpdateSet(updateData);
          
          await tx
            .update(userAssertions)
            .set(drizzleUpdateSet)
            .where(
              and(
                eq(userAssertions.userId, userId as string),
                eq(userAssertions.assertionId, assertionId as string)
              )
            );
        } else {
          // Record doesn't exist, insert it
          await tx
            .insert(userAssertions)
            .values(record);
        }
      });

      // Return the domain entity
      return userAssertion;
    } catch (error) {
      logger.error('Error creating user assertion in SQLite repository', {
        error: error instanceof Error ? error.stack : String(error),
        userId,
        assertionId
      });
      throw error;
    }
  }

  async removeAssertion(userId: Shared.IRI, assertionId: Shared.IRI): Promise<boolean> {
    try {
      // Get database with connection validation
      const db = this.getDatabase();
      
      // Delete from database using Drizzle ORM
      const result = await db
        .delete(userAssertions)
        .where(
          and(
            eq(userAssertions.userId, userId as string),
            eq(userAssertions.assertionId, assertionId as string)
          )
        )
        .returning();

      // Return true if something was deleted
      return result.length > 0;
    } catch (error) {
      logger.error('Error removing assertion from user in SQLite repository', {
        error: error instanceof Error ? error.stack : String(error),
        userId,
        assertionId
      });
      throw error;
    }
  }

  async updateStatus(userId: Shared.IRI, assertionId: Shared.IRI, status: UserAssertionStatus): Promise<boolean> {
    try {
      // Get database with connection validation
      const db = this.getDatabase();
      
      // Update status in database using Drizzle ORM
      // Use the helper method to construct the Drizzle update set
      const drizzleUpdateSet = this.constructDrizzleUpdateSet({ status });

      const result = await db
        .update(userAssertions)
        .set(drizzleUpdateSet)
        .where(
          and(
            eq(userAssertions.userId, userId as string),
            eq(userAssertions.assertionId, assertionId as string)
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
        status
      });
      throw error;
    }
  }

  async getUserAssertions(userId: Shared.IRI, params?: UserAssertionQueryParams): Promise<UserAssertion[]> {
    try {
      // Get database with connection validation
      const db = this.getDatabase();
      
      // Build the where conditions
      const whereCondition = params?.status
        ? and(
            eq(userAssertions.userId, userId as string),
            eq(userAssertions.status, params.status as string)
          )
        : and(
            eq(userAssertions.userId, userId as string),
            ne(userAssertions.status, UserAssertionStatus.DELETED as string)
          );

      // Build the query with the condition
      let query = db.select().from(userAssertions).where(whereCondition);

      // Execute the query with pagination if provided
      let result;

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
      return result.map(record => this.mapper.toDomain(record));
    } catch (error) {
      logger.error('Error getting user assertions in SQLite repository', {
        error: error instanceof Error ? error.stack : String(error),
        userId,
        params
      });
      throw error;
    }
  }

  async getAssertionUsers(assertionId: Shared.IRI): Promise<UserAssertion[]> {
    try {
      // Get database with connection validation
      const db = this.getDatabase();
      
      // Query database using Drizzle ORM
      const result = await db
        .select()
        .from(userAssertions)
        .where(eq(userAssertions.assertionId, assertionId as string));

      // Convert database records to domain entities
      return result.map(record => this.mapper.toDomain(record));
    } catch (error) {
      logger.error('Error getting assertion users in SQLite repository', {
        error: error instanceof Error ? error.stack : String(error),
        assertionId
      });
      throw error;
    }
  }

  async hasAssertion(userId: Shared.IRI, assertionId: Shared.IRI): Promise<boolean> {
    try {
      // Get database with connection validation
      const db = this.getDatabase();
      
      // Query database using Drizzle ORM
      const result = await db
        .select({ exists: sql`1` })
        .from(userAssertions)
        .where(
          and(
            eq(userAssertions.userId, userId as string),
            eq(userAssertions.assertionId, assertionId as string),
            ne(userAssertions.status, UserAssertionStatus.DELETED as string)
          )
        );

      // Return true if found
      return result.length > 0;
    } catch (error) {
      logger.error('Error checking if user has assertion in SQLite repository', {
        error: error instanceof Error ? error.stack : String(error),
        userId,
        assertionId
      });
      throw error;
    }
  }

  async findByUserAndAssertion(userId: Shared.IRI, assertionId: Shared.IRI): Promise<UserAssertion | null> {
    try {
      // Get database with connection validation
      const db = this.getDatabase();
      
      // Query database using Drizzle ORM
      const result = await db
        .select()
        .from(userAssertions)
        .where(
          and(
            eq(userAssertions.userId, userId as string),
            eq(userAssertions.assertionId, assertionId as string)
          )
        );

      // Return null if not found
      if (!result.length) {
        return null;
      }

      // Convert database record to domain entity
      return this.mapper.toDomain(result[0]);
    } catch (error) {
      logger.error('Error finding user assertion by user and assertion ID in SQLite repository', {
        error: error instanceof Error ? error.stack : String(error),
        userId,
        assertionId
      });
      throw error;
    }
  }
}
