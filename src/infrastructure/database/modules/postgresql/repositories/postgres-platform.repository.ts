/**
 * PostgreSQL implementation of the Platform repository
 *
 * This class implements the PlatformRepository interface using PostgreSQL
 * and the Data Mapper pattern.
 */

import { eq, like, and } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { Platform } from '@domains/backpack/platform.entity';
import type { PlatformRepository } from '@domains/backpack/platform.repository';
import { platforms } from '../schema';
import { Shared } from 'openbadges-types';
import { logger } from '@utils/logging/logger.service';
import { PlatformCreateParams, PlatformUpdateParams, PlatformQueryParams, PlatformStatus } from '@domains/backpack/repository.types';

// Define the type for platform insert values
type PlatformInsertValues = {
  name: string;
  clientId: string;
  publicKey: string;
  status: string;
  description?: string;
  webhookUrl?: string;
};

// Define the type for platform update values
type PlatformUpdateValues = {
  name: string;
  clientId: string;
  publicKey: string;
  status: string;
  updatedAt: Date;
  description?: string;
  webhookUrl?: string;
};

export class PostgresPlatformRepository implements PlatformRepository {
  private db: ReturnType<typeof drizzle>;

  constructor(client: postgres.Sql) {
    this.db = drizzle(client);
  }

  async create(params: PlatformCreateParams): Promise<Platform> {
    try {
      // Create a new platform entity
      const newPlatform = Platform.create(params as Platform);
      const obj = newPlatform.toObject();

      // Prepare insert values
      const insertValues: PlatformInsertValues = {
        name: obj.name as string,
        clientId: obj.clientId as string,
        publicKey: obj.publicKey as string,
        status: obj.status as string
      };

      // Add optional fields if they exist
      if (obj.description) insertValues.description = obj.description as string;
      if (obj.webhookUrl) insertValues.webhookUrl = obj.webhookUrl as string;

      // Insert into database
      const result = await this.db.insert(platforms).values(insertValues).returning();

      // Convert database record back to domain entity
      return this.rowToDomain(result[0]);
    } catch (error) {
      logger.error('Error creating platform in PostgreSQL repository', {
        error: error instanceof Error ? error.message : String(error),
        params
      });
      throw error;
    }
  }

  async findAll(params?: PlatformQueryParams): Promise<Platform[]> {
    try {
      // Build query conditions
      const whereConditions = [];

      if (params?.status) {
        whereConditions.push(eq(platforms.status, params.status));
      }

      if (params?.name) {
        whereConditions.push(like(platforms.name, `%${params.name}%`));
      }

      // Build the query
      let query = this.db.select().from(platforms);

      // Apply where conditions if any
      if (whereConditions.length > 0) {
        query = (query.where(whereConditions.length === 1
          ? whereConditions[0]
          : and(...whereConditions)) as typeof query);
      }

      // Apply pagination
      if (params?.limit !== undefined) {
        query = (query.limit(params.limit) as typeof query);
      }

      if (params?.offset !== undefined && params.offset > 0) {
        query = (query.offset(params.offset) as typeof query);
      }

      // Execute the query
      const result = await query;

      // Convert database records to domain entities
      return result.map(row => this.rowToDomain(row));
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
      return this.rowToDomain(result[0]);
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
      return this.rowToDomain(result[0]);
    } catch (error) {
      logger.error('Error finding platform by client ID in PostgreSQL repository', {
        error: error instanceof Error ? error.message : String(error),
        clientId
      });
      throw error;
    }
  }

  async update(id: Shared.IRI, params: PlatformUpdateParams): Promise<Platform | null> {
    try {
      // Check if platform exists
      const existingPlatform = await this.findById(id);
      if (!existingPlatform) {
        return null;
      }

      // Create a merged entity
      const mergedPlatform = Platform.create({
        ...existingPlatform.toObject(),
        ...params as Partial<Platform>,
        updatedAt: new Date()
      });
      const obj = mergedPlatform.toObject();

      // Prepare update values
      const updateValues: PlatformUpdateValues = {
        name: obj.name as string,
        clientId: obj.clientId as string,
        publicKey: obj.publicKey as string,
        status: obj.status as string,
        updatedAt: new Date()
      };

      // Add optional fields if they exist
      if (obj.description !== undefined) updateValues.description = obj.description as string;
      if (obj.webhookUrl !== undefined) updateValues.webhookUrl = obj.webhookUrl as string;

      // Update in database
      const result = await this.db.update(platforms)
        .set(updateValues)
        .where(eq(platforms.id, id as string))
        .returning();

      // Convert database record back to domain entity
      return this.rowToDomain(result[0]);
    } catch (error) {
      logger.error('Error updating platform in PostgreSQL repository', {
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

  /**
   * Converts a database row to a domain entity
   * @param row The database row
   * @returns A Platform domain entity
   */
  private rowToDomain(row: unknown): Platform {
    // Cast row to the expected type
    const typedRow = row as Record<string, string | number | null | Date>;
    return Platform.create({
      id: String(typedRow.id) as Shared.IRI,
      name: String(typedRow.name),
      description: typedRow.description ? String(typedRow.description) : undefined,
      clientId: String(typedRow.clientId),
      publicKey: String(typedRow.publicKey),
      webhookUrl: typedRow.webhookUrl ? String(typedRow.webhookUrl) : undefined,
      status: String(typedRow.status) as PlatformStatus,
      createdAt: typedRow.createdAt instanceof Date ? typedRow.createdAt : new Date(String(typedRow.createdAt)),
      updatedAt: typedRow.updatedAt instanceof Date ? typedRow.updatedAt : new Date(String(typedRow.updatedAt))
    });
  }
}
