/**
 * SQLite implementation of the PlatformUser repository
 *
 * This class implements the PlatformUserRepository interface using SQLite
 * and the Data Mapper pattern with Drizzle ORM.
 */

import { eq, and } from 'drizzle-orm';
import { PlatformUser } from '@domains/backpack/platform-user.entity';
import type { PlatformUserRepository } from '@domains/backpack/platform-user.repository';
import { Shared } from 'openbadges-types';
import { logger } from '@utils/logging/logger.service';
import { platformUsers } from '../schema';
import { SqlitePlatformUserMapper } from '../mappers/sqlite-platform-user.mapper';
import { createId } from '@paralleldrive/cuid2';
import { SqliteConnectionManager } from '../connection/sqlite-connection.manager';

export class SqlitePlatformUserRepository implements PlatformUserRepository {
  private mapper: SqlitePlatformUserMapper;

  constructor(private readonly connectionManager: SqliteConnectionManager) {
    this.mapper = new SqlitePlatformUserMapper();
  }

  /**
   * Gets the database instance with connection validation
   */
  private getDatabase() {
    this.connectionManager.ensureConnected();
    return this.connectionManager.getDatabase();
  }

  async create(user: Omit<PlatformUser, 'id'>): Promise<PlatformUser> {
    try {
      // Generate ID and create full entity
      const id = createId() as Shared.IRI;
      const newUser = PlatformUser.create({ ...user, id } as PlatformUser);

      // Convert domain entity to database record
      const record = this.mapper.toPersistence(newUser);

      // Insert into database
      await this.getDatabase().insert(platformUsers).values(record).returning();

      // Return the domain entity
      return newUser;
    } catch (error) {
      logger.error('Error creating platform user in SQLite repository', {
        error: error instanceof Error ? error.stack : String(error),
        user,
      });
      throw error;
    }
  }

  async findById(id: Shared.IRI): Promise<PlatformUser | null> {
    try {
      // Query database using Drizzle ORM
      const result = await this.getDatabase()
        .select()
        .from(platformUsers)
        .where(eq(platformUsers.id, id as string));

      // Return null if not found
      if (!result.length) {
        return null;
      }

      // Convert database record to domain entity
      return this.mapper.toDomain(result[0]);
    } catch (error) {
      logger.error('Error finding platform user by ID in SQLite repository', {
        error: error instanceof Error ? error.stack : String(error),
        id,
      });
      throw error;
    }
  }

  async findByPlatformAndExternalId(
    platformId: Shared.IRI,
    externalUserId: string
  ): Promise<PlatformUser | null> {
    try {
      // Query database using Drizzle ORM
      const result = await this.getDatabase()
        .select()
        .from(platformUsers)
        .where(
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
      return this.mapper.toDomain(result[0]);
    } catch (error) {
      logger.error(
        'Error finding platform user by platform and external ID in SQLite repository',
        {
          error: error instanceof Error ? error.stack : String(error),
          platformId,
          externalUserId,
        }
      );
      throw error;
    }
  }

  async update(
    id: Shared.IRI,
    user: Partial<PlatformUser>
  ): Promise<PlatformUser | null> {
    try {
      // Check if user exists
      const existingUser = await this.findById(id);
      if (!existingUser) {
        return null;
      }

      // Create a merged entity with updated timestamp
      const mergedUser = PlatformUser.create({
        ...existingUser.toObject(),
        ...(user as Partial<PlatformUser>),
        updatedAt: new Date(),
      });

      // Convert domain entity to database record and create update object
      const record = this.mapper.toPersistence(mergedUser);
      const updateData = this.mapper.toUpdateObject(record);

      // Update in database using Drizzle ORM
      await this.getDatabase()
        .update(platformUsers)
        .set(updateData)
        .where(eq(platformUsers.id, id as string))
        .returning();

      // Return the updated entity
      return mergedUser;
    } catch (error) {
      logger.error('Error updating platform user in SQLite repository', {
        error: error instanceof Error ? error.stack : String(error),
        id,
        user,
      });
      throw error;
    }
  }

  async delete(id: Shared.IRI): Promise<boolean> {
    try {
      // Delete from database using Drizzle ORM
      const result = await this.getDatabase()
        .delete(platformUsers)
        .where(eq(platformUsers.id, id as string))
        .returning();

      // Return true if something was deleted
      return result.length > 0;
    } catch (error) {
      logger.error('Error deleting platform user in SQLite repository', {
        error: error instanceof Error ? error.stack : String(error),
        id,
      });
      throw error;
    }
  }
}
