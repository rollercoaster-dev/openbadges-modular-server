/**
 * SQLite implementation of the UserAssertion repository
 *
 * This class implements the UserAssertionRepository interface using SQLite
 * and the Data Mapper pattern with Drizzle ORM.
 */

import { eq, and, ne, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import { UserAssertion } from '@domains/backpack/user-assertion.entity';
import type { UserAssertionRepository } from '@domains/backpack/user-assertion.repository';
import { Shared } from 'openbadges-types';
import { logger } from '@utils/logging/logger.service';
import { UserAssertionStatus } from '@domains/backpack/backpack.types';
import { UserAssertionCreateParams, UserAssertionQueryParams } from '@domains/backpack/repository.types';
import { userAssertions } from '../schema';
import { SqliteUserAssertionMapper } from '../mappers/sqlite-user-assertion.mapper';
import { createId } from '@paralleldrive/cuid2';

export class SqliteUserAssertionRepository implements UserAssertionRepository {
  private db: ReturnType<typeof drizzle>;
  private mapper: SqliteUserAssertionMapper;

  constructor(client: Database) {
    this.db = drizzle(client);
    this.mapper = new SqliteUserAssertionMapper();
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

      // Insert into database with ON CONFLICT DO UPDATE
      const updateData: Record<string, unknown> = {};

      // Add fields to update if they exist
      if ('status' in record || (record as any).status) {
        updateData.status = (record as any).status;
      }

      if ('metadata' in record || (record as any).metadata) {
        updateData.metadata = (record as any).metadata;
      }

      await this.db
        .insert(userAssertions)
        .values(record)
        .onConflictDoUpdate({
          target: [userAssertions.userId, userAssertions.assertionId],
          set: updateData as any
        })
        .returning();

      // Return the domain entity
      return userAssertion;
    } catch (error) {
      logger.error('Error creating user assertion in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        assertionId
      });
      throw error;
    }
  }

  async removeAssertion(userId: Shared.IRI, assertionId: Shared.IRI): Promise<boolean> {
    try {
      // Delete from database using Drizzle ORM
      const result = await this.db
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
        error: error instanceof Error ? error.message : String(error),
        userId,
        assertionId
      });
      throw error;
    }
  }

  async updateStatus(userId: Shared.IRI, assertionId: Shared.IRI, status: UserAssertionStatus): Promise<boolean> {
    try {
      // Update status in database using Drizzle ORM
      const updateData: Record<string, unknown> = {
        status: String(status)
      };

      const result = await this.db
        .update(userAssertions)
        .set(updateData as any)
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
        error: error instanceof Error ? error.message : String(error),
        userId,
        assertionId,
        status
      });
      throw error;
    }
  }

  async getUserAssertions(userId: Shared.IRI, params?: UserAssertionQueryParams): Promise<UserAssertion[]> {
    try {
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
      let query = this.db.select().from(userAssertions).where(whereCondition);

      // Execute the query with pagination if provided
      let result;
      if (params?.limit !== undefined) {
        // Create a new query with limit
        const limitQuery = query.limit(params.limit);

        // Add offset if provided
        if (params.offset !== undefined) {
          result = await limitQuery.offset(params.offset);
        } else {
          result = await limitQuery;
        }
      } else {
        // Execute without pagination
        result = await query;
      }

      // Convert database records to domain entities
      return result.map(record => this.mapper.toDomain(record));
    } catch (error) {
      logger.error('Error getting user assertions in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        params
      });
      throw error;
    }
  }

  async getAssertionUsers(assertionId: Shared.IRI): Promise<UserAssertion[]> {
    try {
      // Query database using Drizzle ORM
      const result = await this.db
        .select()
        .from(userAssertions)
        .where(eq(userAssertions.assertionId, assertionId as string));

      // Convert database records to domain entities
      return result.map(record => this.mapper.toDomain(record));
    } catch (error) {
      logger.error('Error getting assertion users in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        assertionId
      });
      throw error;
    }
  }

  async hasAssertion(userId: Shared.IRI, assertionId: Shared.IRI): Promise<boolean> {
    try {
      // Query database using Drizzle ORM
      const result = await this.db
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
        error: error instanceof Error ? error.message : String(error),
        userId,
        assertionId
      });
      throw error;
    }
  }

  async findByUserAndAssertion(userId: Shared.IRI, assertionId: Shared.IRI): Promise<UserAssertion | null> {
    try {
      // Query database using Drizzle ORM
      const result = await this.db
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
        error: error instanceof Error ? error.message : String(error),
        userId,
        assertionId
      });
      throw error;
    }
  }
}
