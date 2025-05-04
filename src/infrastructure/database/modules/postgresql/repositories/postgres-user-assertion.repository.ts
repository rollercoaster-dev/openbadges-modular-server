/**
 * PostgreSQL implementation of the UserAssertion repository
 *
 * This class implements the UserAssertionRepository interface using PostgreSQL
 * and the Data Mapper pattern.
 */

import { eq, and, ne, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { UserAssertion } from '@domains/backpack/user-assertion.entity';
import type { UserAssertionRepository } from '@domains/backpack/user-assertion.repository';
import { userAssertions } from '../schema';
import { Shared } from 'openbadges-types';
import { logger } from '@utils/logging/logger.service';
import { UserAssertionStatus } from '@domains/backpack/backpack.types';
import { UserAssertionCreateParams, UserAssertionQueryParams } from '@domains/backpack/repository.types';

// Define the type for user assertion insert values
type UserAssertionInsertValues = {
  userId: string;
  assertionId: string;
  addedAt: Date;
  status?: string;
  metadata?: Record<string, unknown> | null;
};

// Define the type for user assertion update values
type UserAssertionUpdateValues = {
  status: string;
};

// Define the type for user assertion conflict update values
type UserAssertionConflictUpdateValues = {
  status?: string;
  metadata?: Record<string, unknown> | null;
};

export class PostgresUserAssertionRepository implements UserAssertionRepository {
  private db: ReturnType<typeof drizzle>;

  constructor(client: postgres.Sql) {
    this.db = drizzle(client);
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
      logger.error('Error adding assertion to user in PostgreSQL repository', {
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
    // Create a new user assertion entity
    const userAssertion = UserAssertion.create({
      userId,
      assertionId,
      metadata
    });
    const obj = userAssertion.toObject();

    // Prepare insert values
    const insertValues: UserAssertionInsertValues = {
      userId: obj.userId as string,
      assertionId: obj.assertionId as string,
      addedAt: obj.addedAt as Date
    };

    // Add optional fields if they exist
    if (obj.status) insertValues.status = obj.status as string;
    if (obj.metadata) insertValues.metadata = obj.metadata as Record<string, unknown> | null;

    // Prepare update values for conflict case
    const updateValues: UserAssertionConflictUpdateValues = {};
    if (obj.status) updateValues.status = obj.status as string;
    if (obj.metadata) updateValues.metadata = obj.metadata as Record<string, unknown> | null;

    // Insert into database
    const result = await this.db.insert(userAssertions)
      .values(insertValues)
      .onConflictDoUpdate({
        target: [userAssertions.userId, userAssertions.assertionId],
        set: updateValues as Record<string, unknown>
      })
      .returning();

    // Convert database record back to domain entity
    return this.rowToDomain(result[0]);
  }

  async removeAssertion(userId: Shared.IRI, assertionId: Shared.IRI): Promise<boolean> {
    try {
      // Delete from database
      const result = await this.db.delete(userAssertions)
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
      logger.error('Error removing assertion from user in PostgreSQL repository', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        assertionId
      });
      throw error;
    }
  }

  async updateStatus(userId: Shared.IRI, assertionId: Shared.IRI, status: UserAssertionStatus): Promise<boolean> {
    try {
      // Prepare update values
      const updateValues: UserAssertionUpdateValues = {
        status: status as string
      };

      // Update status in database
      const result = await this.db.update(userAssertions)
        .set(updateValues as Record<string, unknown>)
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
      logger.error('Error updating assertion status in PostgreSQL repository', {
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
      const whereCondition = and(
        eq(userAssertions.userId, userId as string),
        params?.status
          ? eq(userAssertions.status, params.status as string)
          : ne(userAssertions.status, UserAssertionStatus.DELETED as string)
      );

      // Build the query with the condition
      const baseQuery = this.db.select().from(userAssertions).where(whereCondition);

      // Execute the query with pagination if provided
      const result = await (params?.limit !== undefined
        ? (params?.offset !== undefined
            ? baseQuery.limit(params.limit).offset(params.offset)
            : baseQuery.limit(params.limit))
        : baseQuery);

      // Convert database records to domain entities
      return result.map(row => this.rowToDomain(row));
    } catch (error) {
      logger.error('Error getting user assertions in PostgreSQL repository', {
        error: error instanceof Error ? error.message : String(error),
        userId
      });
      throw error;
    }
  }

  async getAssertionUsers(assertionId: Shared.IRI): Promise<UserAssertion[]> {
    try {
      // Query database
      const result = await this.db.select().from(userAssertions)
        .where(eq(userAssertions.assertionId, assertionId as string));

      // Convert database records to domain entities
      return result.map(row => this.rowToDomain(row));
    } catch (error) {
      logger.error('Error getting assertion users in PostgreSQL repository', {
        error: error instanceof Error ? error.message : String(error),
        assertionId
      });
      throw error;
    }
  }

  async hasAssertion(userId: Shared.IRI, assertionId: Shared.IRI): Promise<boolean> {
    try {
      // Query database
      const result = await this.db.select({ exists: sql`1` }).from(userAssertions)
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
      logger.error('Error checking if user has assertion in PostgreSQL repository', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        assertionId
      });
      throw error;
    }
  }

  async findByUserAndAssertion(userId: Shared.IRI, assertionId: Shared.IRI): Promise<UserAssertion | null> {
    try {
      // Query database
      const result = await this.db.select().from(userAssertions)
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
      return this.rowToDomain(result[0]);
    } catch (error) {
      logger.error('Error finding user assertion by user and assertion ID in PostgreSQL repository', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        assertionId
      });
      throw error;
    }
  }

  /**
   * Converts a database row to a domain entity
   * @param row The database row
   * @returns A UserAssertion domain entity
   */
  private rowToDomain(row: unknown): UserAssertion {
    // Cast row to the expected type
    const typedRow = row as Record<string, string | number | null | Date | Record<string, unknown>>;

    return UserAssertion.create({
      id: String(typedRow.id) as Shared.IRI,
      userId: String(typedRow.userId) as Shared.IRI,
      assertionId: String(typedRow.assertionId) as Shared.IRI,
      addedAt: typedRow.addedAt instanceof Date ? typedRow.addedAt : new Date(String(typedRow.addedAt)),
      status: String(typedRow.status) as UserAssertionStatus,
      metadata: typedRow.metadata as Record<string, unknown> | undefined
    });
  }
}