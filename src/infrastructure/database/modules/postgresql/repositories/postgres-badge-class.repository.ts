/**
 * PostgreSQL implementation of the BadgeClass repository
 *
 * This class implements the BadgeClassRepository interface using PostgreSQL
 * and the Data Mapper pattern.
 */

import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { BadgeClass } from '@domains/badgeClass/badgeClass.entity';
import type { BadgeClassRepository } from '@domains/badgeClass/badgeClass.repository';
import { badgeClasses } from '../schema';
import { PostgresBadgeClassMapper } from '../mappers/postgres-badge-class.mapper';
import { Shared } from 'openbadges-types';

export class PostgresBadgeClassRepository implements BadgeClassRepository {
  private db: ReturnType<typeof drizzle>;
  private mapper: PostgresBadgeClassMapper;

  constructor(client: postgres.Sql) {
    this.db = drizzle(client);
    this.mapper = new PostgresBadgeClassMapper();
  }

  async create(badgeClass: Omit<BadgeClass, 'id'>): Promise<BadgeClass> {
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
  }

  async findAll(): Promise<BadgeClass[]> {
    // Query database to get all badge classes
    const result = await this.db.select().from(badgeClasses);

    // Convert database records to domain entities
    return result.map(record => this.mapper.toDomain(record));
  }

  async findById(id: Shared.IRI): Promise<BadgeClass | null> {
    // Query database
    const result = await this.db.select().from(badgeClasses).where(eq(badgeClasses.id, id as string));

    // Return null if not found
    if (!result.length) {
      return null;
    }

    // Convert database record to domain entity
    return this.mapper.toDomain(result[0]);
  }

  async findByIssuer(issuerId: Shared.IRI): Promise<BadgeClass[]> {
    // Query database
    const result = await this.db.select().from(badgeClasses).where(eq(badgeClasses.issuerId, issuerId as string));

    // Convert database records to domain entities
    return result.map(record => this.mapper.toDomain(record));
  }

  async update(id: Shared.IRI, badgeClass: Partial<BadgeClass>): Promise<BadgeClass | null> {
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
  }

  async delete(id: Shared.IRI): Promise<boolean> {
    // Delete from database
    const result = await this.db.delete(badgeClasses).where(eq(badgeClasses.id, id as string)).returning();

    // Return true if something was deleted
    return result.length > 0;
  }
}
