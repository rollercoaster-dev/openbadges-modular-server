/**
 * SQLite implementation of the BadgeClass repository
 *
 * This class implements the BadgeClassRepository interface using SQLite
 * and the Data Mapper pattern with enhanced type safety.
 */

import { eq, InferInsertModel } from 'drizzle-orm';
import { BadgeClass } from '@domains/badgeClass/badgeClass.entity';
import type { BadgeClassRepository } from '@domains/badgeClass/badgeClass.repository';
import { badgeClasses } from '../schema';
import { SqliteBadgeClassMapper } from '../mappers/sqlite-badge-class.mapper';
import { Shared } from 'openbadges-types';
import { logger, queryLogger } from '@utils/logging/logger.service';
import { SensitiveValue } from '@rollercoaster-dev/rd-logger';
import { SqliteConnectionManager } from '../connection/sqlite-connection.manager';

export class SqliteBadgeClassRepository implements BadgeClassRepository {
  private mapper: SqliteBadgeClassMapper;

  constructor(private readonly connectionManager: SqliteConnectionManager) {
    this.mapper = new SqliteBadgeClassMapper();
  }

  /**
   * Gets the mapper instance for external access
   */
  getMapper(): SqliteBadgeClassMapper {
    return this.mapper;
  }

  /**
   * Gets the database instance with connection validation
   */
  private getDatabase(): ReturnType<
    typeof import('drizzle-orm/bun-sqlite').drizzle
  > {
    this.connectionManager.ensureConnected();
    return this.connectionManager.getDatabase();
  }

  async create(badgeClass: Partial<BadgeClass>): Promise<BadgeClass> {
    try {
      // Instantiate entity first to ensure defaults
      const newEntity = BadgeClass.create(badgeClass);

      // Convert domain entity to database record, indicating it's new
      const record: InferInsertModel<typeof badgeClasses> =
        this.mapper.toPersistence(newEntity, true);

      // Insert into database
      const startTime = Date.now();
      const result = await this.getDatabase()
        .insert(badgeClasses)
        .values(record)
        .returning();
      const duration = Date.now() - startTime;

      // Log query
      queryLogger.logQuery(
        'INSERT BadgeClass',
        [SensitiveValue.from(record)],
        duration,
        'sqlite'
      );

      // Convert database record back to domain entity
      return this.mapper.toDomain(result[0]);
    } catch (error) {
      logger.error('Error creating badge class in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        badgeClass,
        // Log sensitive data separately if needed for debugging
      });
      throw error;
    }
  }

  async findAll(): Promise<BadgeClass[]> {
    try {
      // Query database to get all badge classes
      const startTime = Date.now();
      const result = await this.getDatabase().select().from(badgeClasses);
      const duration = Date.now() - startTime;

      // Log query
      queryLogger.logQuery(
        'SELECT All BadgeClasses',
        undefined,
        duration,
        'sqlite'
      );

      // Convert database records to domain entities
      return result.map((record) => this.mapper.toDomain(record));
    } catch (error) {
      logger.error('Error finding all badge classes in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findById(id: string): Promise<BadgeClass | null> {
    try {
      const startTime = Date.now();
      // Query database
      const result = await this.getDatabase()
        .select()
        .from(badgeClasses)
        .where(eq(badgeClasses.id, id));
      const duration = Date.now() - startTime;

      // Log query (assuming id is not sensitive)
      queryLogger.logQuery('SELECT BadgeClass by ID', [id], duration, 'sqlite');

      // Return null if not found
      if (!result.length) {
        return null;
      }

      // Convert database record to domain entity
      return this.mapper.toDomain(result[0]);
    } catch (error) {
      logger.error('Error finding badge class by ID in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        id,
      });
      throw error;
    }
  }

  async findByIssuer(issuerId: Shared.IRI): Promise<BadgeClass[]> {
    try {
      const startTime = Date.now();
      // Query database
      const result = await this.getDatabase()
        .select()
        .from(badgeClasses)
        .where(eq(badgeClasses.issuerId, issuerId as string));
      const duration = Date.now() - startTime;

      // Log query (assuming issuerId is not sensitive)
      queryLogger.logQuery(
        'SELECT BadgeClasses by Issuer',
        [issuerId],
        duration,
        'sqlite'
      );

      // Convert database records to domain entities
      return result.map((record) => this.mapper.toDomain(record));
    } catch (error) {
      logger.error(
        'Error finding badge classes by issuer in SQLite repository',
        {
          error: error instanceof Error ? error.message : String(error),
          issuerId,
        }
      );
      throw error;
    }
  }

  async update(
    id: string,
    badgeClass: Partial<BadgeClass>
  ): Promise<BadgeClass | null> {
    try {
      // Check if badge class exists
      const existingBadgeClass = await this.findById(id);
      if (!existingBadgeClass) {
        return null;
      }

      // Create a merged entity using the internal representation from toPartial()
      const partialExistingData = existingBadgeClass.toPartial();
      const updateData = badgeClass; // Already Partial<BadgeClass>

      // Simple merge as both are Partial<BadgeClass>
      const mergedData: Partial<BadgeClass> = {
        ...partialExistingData,
        ...updateData,
      };

      const mergedBadgeClass = BadgeClass.create(mergedData);

      // Convert to database record
      const record = { ...this.mapper.toPersistence(mergedBadgeClass) };
      // Prevent overwriting immutable columns
      delete (record as Partial<typeof record>).id;
      delete (record as Partial<typeof record>).createdAt;

      // Update in database
      const startTime = Date.now();
      const result = await this.getDatabase()
        .update(badgeClasses)
        .set(record)
        .where(eq(badgeClasses.id, id))
        .returning();
      const duration = Date.now() - startTime;

      // Log query
      queryLogger.logQuery(
        'UPDATE BadgeClass',
        [id, SensitiveValue.from(record)],
        duration,
        'sqlite'
      );

      // Convert database record back to domain entity
      return this.mapper.toDomain(result[0]);
    } catch (error) {
      logger.error('Error updating badge class in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        id,
        badgeClass, // Log sensitive data separately if needed for debugging
      });
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      // Delete from database
      const startTime = Date.now();
      const result = await this.getDatabase()
        .delete(badgeClasses)
        .where(eq(badgeClasses.id, id))
        .returning();
      const duration = Date.now() - startTime;

      // Log query (assuming id is not sensitive)
      queryLogger.logQuery('DELETE BadgeClass', [id], duration, 'sqlite');

      // Return true if something was deleted
      return result.length > 0;
    } catch (error) {
      logger.error('Error deleting badge class in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        id,
      });
      throw error;
    }
  }
}
