/**
 * SQLite implementation of the BadgeClass repository
 *
 * This class implements the BadgeClassRepository interface using SQLite
 * and the Data Mapper pattern.
 */

import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import { BadgeClass } from '@domains/badgeClass/badgeClass.entity';
import type { BadgeClassRepository } from '@domains/badgeClass/badgeClass.repository';
import { badgeClasses } from '../schema';
import { SqliteBadgeClassMapper } from '../mappers/sqlite-badge-class.mapper';
import { Shared } from 'openbadges-types';
import { logger } from '@utils/logging/logger.service';

export class SqliteBadgeClassRepository implements BadgeClassRepository {
  private db: ReturnType<typeof drizzle>;
  private mapper: SqliteBadgeClassMapper;

  constructor(client: Database) {
    this.db = drizzle(client);
    this.mapper = new SqliteBadgeClassMapper();
  }

  async create(badgeClass: Omit<BadgeClass, 'id'>): Promise<BadgeClass> {
    try {
      // Convert domain entity to database record
      const record = this.mapper.toPersistence(badgeClass as BadgeClass);

      // Remove id if it's empty (for new entities)
      if (!record.id) {
        delete record.id;
      }

      // Insert into database
      const result = await this.db.insert(badgeClasses).values(record).returning();

      // Convert database record back to domain entity
      return this.mapper.toDomain(result[0]);
    } catch (error) {
      logger.error('Error creating badge class in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        badgeClass
      });
      throw error;
    }
  }

  async findAll(): Promise<BadgeClass[]> {
    try {
      // Query database to get all badge classes
      const result = await this.db.select().from(badgeClasses);

      // Convert database records to domain entities
      return result.map(record => this.mapper.toDomain(record));
    } catch (error) {
      logger.error('Error finding all badge classes in SQLite repository', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async findById(id: Shared.IRI): Promise<BadgeClass | null> {
    try {
      // Query database
      const result = await this.db.select().from(badgeClasses).where(eq(badgeClasses.id, id as string));

      // Return null if not found
      if (!result.length) {
        return null;
      }

      // Convert database record to domain entity
      return this.mapper.toDomain(result[0]);
    } catch (error) {
      logger.error('Error finding badge class by ID in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        id
      });
      throw error;
    }
  }

  async findByIssuer(issuerId: Shared.IRI): Promise<BadgeClass[]> {
    try {
      // Query database
      const result = await this.db.select().from(badgeClasses).where(eq(badgeClasses.issuerId, issuerId as string));

      // Convert database records to domain entities
      return result.map(record => this.mapper.toDomain(record));
    } catch (error) {
      logger.error('Error finding badge classes by issuer in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        issuerId
      });
      throw error;
    }
  }

  async update(id: Shared.IRI, badgeClass: Partial<BadgeClass>): Promise<BadgeClass | null> {
    try {
      // Check if badge class exists
      const existingBadgeClass = await this.findById(id);
      if (!existingBadgeClass) {
        return null;
      }

      // Create a merged entity
      const mergedBadgeClass = BadgeClass.create({
        ...existingBadgeClass.toObject(),
        ...badgeClass as Partial<BadgeClass>
      });

      // Convert to database record
      const record = this.mapper.toPersistence(mergedBadgeClass);

      // Update in database
      const result = await this.db.update(badgeClasses)
        .set(record)
        .where(eq(badgeClasses.id, id as string))
        .returning();

      // Convert database record back to domain entity
      return this.mapper.toDomain(result[0]);
    } catch (error) {
      logger.error('Error updating badge class in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        id,
        badgeClass
      });
      throw error;
    }
  }

  async delete(id: Shared.IRI): Promise<boolean> {
    try {
      // Delete from database
      const result = await this.db.delete(badgeClasses).where(eq(badgeClasses.id, id as string)).returning();

      // Return true if something was deleted
      return result.length > 0;
    } catch (error) {
      logger.error('Error deleting badge class in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        id
      });
      throw error;
    }
  }
}
