/**
 * PostgreSQL implementation of the PlatformUser repository
 *
 * This class implements the PlatformUserRepository interface using PostgreSQL
 * and the Data Mapper pattern.
 */

import { eq, and } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { PlatformUser } from '@domains/backpack/platform-user.entity';
import type { PlatformUserRepository } from '@domains/backpack/platform-user.repository';
import { platformUsers } from '../schema';
import { Shared } from 'openbadges-types';
import { logger } from '@utils/logging/logger.service';
import { PlatformUserCreateParams, PlatformUserUpdateParams } from '@domains/backpack/repository.types';

export class PostgresPlatformUserRepository implements PlatformUserRepository {
  private db: ReturnType<typeof drizzle>;

  constructor(client: postgres.Sql) {
    this.db = drizzle(client);
  }

  async create(params: PlatformUserCreateParams): Promise<PlatformUser> {
    try {
      // Create a new platform user entity
      const newUser = PlatformUser.create(params as PlatformUser);
      const obj = newUser.toObject();

      // Insert into database
      const result = await this.db.insert(platformUsers).values({
        platformId: obj.platformId as string,
        externalUserId: obj.externalUserId as string,
        // Optional fields
        ...(obj.displayName ? { displayName: obj.displayName as string } : {}),
        ...(obj.email ? { email: obj.email as string } : {}),
        ...(obj.metadata ? { metadata: obj.metadata } : {}),
        // id, createdAt and updatedAt will be set by default values in the schema
      }).returning();

      // Convert database record back to domain entity
      return this.rowToDomain(result[0]);
    } catch (error) {
      logger.error('Error creating platform user in PostgreSQL repository', {
        error: error instanceof Error ? error.message : String(error),
        params
      });
      throw error;
    }
  }

  async findById(id: Shared.IRI): Promise<PlatformUser | null> {
    try {
      // Query database
      const result = await this.db.select().from(platformUsers).where(eq(platformUsers.id, id as string));

      // Return null if not found
      if (!result.length) {
        return null;
      }

      // Convert database record to domain entity
      return this.rowToDomain(result[0]);
    } catch (error) {
      logger.error('Error finding platform user by ID in PostgreSQL repository', {
        error: error instanceof Error ? error.message : String(error),
        id
      });
      throw error;
    }
  }

  async findByPlatformAndExternalId(platformId: Shared.IRI, externalUserId: string): Promise<PlatformUser | null> {
    try {
      // Query database
      const result = await this.db.select().from(platformUsers).where(
        and(
          eq(platformUsers.platformId, platformId as string),
          eq(platformUsers.externalUserId, externalUserId)
        )
      );

      // Return null if not found
      if (!result.length) {
        return null;
      }

      // Convert database record to domain entity
      return this.rowToDomain(result[0]);
    } catch (error) {
      logger.error('Error finding platform user by platform and external ID in PostgreSQL repository', {
        error: error instanceof Error ? error.message : String(error),
        platformId,
        externalUserId
      });
      throw error;
    }
  }

  async update(id: Shared.IRI, params: PlatformUserUpdateParams): Promise<PlatformUser | null> {
    try {
      // Check if user exists
      const existingUser = await this.findById(id);
      if (!existingUser) {
        return null;
      }

      // Create a merged entity
      const mergedUser = PlatformUser.create({
        ...existingUser.toObject(),
        ...params as Partial<PlatformUser>,
        updatedAt: new Date()
      });
      const obj = mergedUser.toObject();

      // Prepare update values
      const updateValues: Record<string, unknown> = {
        platformId: obj.platformId as string,
        externalUserId: obj.externalUserId as string,
        updatedAt: new Date()
      };

      // Add optional fields if they exist
      if (obj.displayName !== undefined) updateValues.displayName = obj.displayName as string;
      if (obj.email !== undefined) updateValues.email = obj.email as string;
      if (obj.metadata !== undefined) updateValues.metadata = obj.metadata;

      // Update in database
      const result = await this.db.update(platformUsers)
        .set(updateValues)
        .where(eq(platformUsers.id, id as string))
        .returning();

      // Convert database record back to domain entity
      return this.rowToDomain(result[0]);
    } catch (error) {
      logger.error('Error updating platform user in PostgreSQL repository', {
        error: error instanceof Error ? error.message : String(error),
        id,
        params
      });
      throw error;
    }
  }

  async delete(id: Shared.IRI): Promise<boolean> {
    try {
      // Delete from database
      const result = await this.db.delete(platformUsers).where(eq(platformUsers.id, id as string)).returning();

      // Return true if something was deleted
      return result.length > 0;
    } catch (error) {
      logger.error('Error deleting platform user in PostgreSQL repository', {
        error: error instanceof Error ? error.message : String(error),
        id
      });
      throw error;
    }
  }

  /**
   * Converts a database row to a domain entity
   * @param row The database row
   * @returns A PlatformUser domain entity
   */
  private rowToDomain(row: unknown): PlatformUser {
    // Cast row to the expected type
    const typedRow = row as Record<string, string | number | null | Date | Record<string, unknown>>;

    return PlatformUser.create({
      id: String(typedRow.id) as Shared.IRI,
      platformId: String(typedRow.platformId) as Shared.IRI,
      externalUserId: String(typedRow.externalUserId),
      displayName: typedRow.displayName ? String(typedRow.displayName) : undefined,
      email: typedRow.email ? String(typedRow.email) : undefined,
      metadata: typedRow.metadata as Record<string, unknown> | undefined,
      createdAt: typedRow.createdAt instanceof Date ? typedRow.createdAt : new Date(String(typedRow.createdAt)),
      updatedAt: typedRow.updatedAt instanceof Date ? typedRow.updatedAt : new Date(String(typedRow.updatedAt))
    });
  }
}