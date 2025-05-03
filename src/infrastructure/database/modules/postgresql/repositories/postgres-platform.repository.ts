/**
 * PostgreSQL implementation of the Platform repository
 *
 * This class implements the PlatformRepository interface using PostgreSQL
 * and the Data Mapper pattern.
 */

import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { Platform } from '@domains/backpack/platform.entity';
import type { PlatformRepository } from '@domains/backpack/platform.repository';
import { platforms } from '../schema';
import { PostgresPlatformMapper } from '../mappers/postgres-platform.mapper';
import { Shared } from 'openbadges-types';
import { logger } from '@utils/logging/logger.service';

export class PostgresPlatformRepository implements PlatformRepository {
  private db: ReturnType<typeof drizzle>;
  private mapper: PostgresPlatformMapper;

  constructor(client: postgres.Sql) {
    this.db = drizzle(client);
    this.mapper = new PostgresPlatformMapper();
  }

  async create(platform: Omit<Platform, 'id'>): Promise<Platform> {
    try {
      // Convert domain entity to database record
      const record = this.mapper.toPersistence(platform as Platform);

      // Remove id if it's empty (for new entities)
      if (!record.id) {
        delete record.id;
      }

      // Insert into database
      const result = await this.db.insert(platforms).values(record).returning();

      // Convert database record back to domain entity
      return this.mapper.toDomain(result[0]);
    } catch (error) {
      logger.error('Error creating platform in PostgreSQL repository', {
        error: error instanceof Error ? error.message : String(error),
        platform
      });
      throw error;
    }
  }

  async findAll(): Promise<Platform[]> {
    try {
      // Query database to get all platforms
      const result = await this.db.select().from(platforms);

      // Convert database records to domain entities
      return result.map(record => this.mapper.toDomain(record));
    } catch (error) {
      logger.error('Error finding all platforms in PostgreSQL repository', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async findById(id: Shared.IRI): Promise<Platform | null> {
    try {
      // Query database
      const result = await this.db.select().from(platforms).where(eq(platforms.id, id as string));

      // Return null if not found
      if (!result.length) {
        return null;
      }

      // Convert database record to domain entity
      return this.mapper.toDomain(result[0]);
    } catch (error) {
      logger.error('Error finding platform by ID in PostgreSQL repository', {
        error: error instanceof Error ? error.message : String(error),
        id
      });
      throw error;
    }
  }

  async findByClientId(clientId: string): Promise<Platform | null> {
    try {
      // Query database
      const result = await this.db.select().from(platforms).where(eq(platforms.clientId, clientId));

      // Return null if not found
      if (!result.length) {
        return null;
      }

      // Convert database record to domain entity
      return this.mapper.toDomain(result[0]);
    } catch (error) {
      logger.error('Error finding platform by client ID in PostgreSQL repository', {
        error: error instanceof Error ? error.message : String(error),
        clientId
      });
      throw error;
    }
  }

  async update(id: Shared.IRI, platform: Partial<Platform>): Promise<Platform | null> {
    try {
      // Check if platform exists
      const existingPlatform = await this.findById(id);
      if (!existingPlatform) {
        return null;
      }

      // Create a merged entity
      const mergedPlatform = Platform.create({
        ...existingPlatform.toObject(),
        ...platform as any
      });

      // Convert to database record
      const record = this.mapper.toPersistence(mergedPlatform);

      // Update in database
      const result = await this.db.update(platforms)
        .set(record)
        .where(eq(platforms.id, id as string))
        .returning();

      // Convert database record back to domain entity
      return this.mapper.toDomain(result[0]);
    } catch (error) {
      logger.error('Error updating platform in PostgreSQL repository', {
        error: error instanceof Error ? error.message : String(error),
        id,
        platform
      });
      throw error;
    }
  }

  async delete(id: Shared.IRI): Promise<boolean> {
    try {
      // Delete from database
      const result = await this.db.delete(platforms).where(eq(platforms.id, id as string)).returning();

      // Return true if something was deleted
      return result.length > 0;
    } catch (error) {
      logger.error('Error deleting platform in PostgreSQL repository', {
        error: error instanceof Error ? error.message : String(error),
        id
      });
      throw error;
    }
  }
}
