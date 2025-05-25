/**
 * PostgreSQL implementation of the BadgeClass repository
 *
 * This class implements the BadgeClassRepository interface using PostgreSQL
 * and the Data Mapper pattern with the base repository class.
 */

import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import { BadgeClass } from '@domains/badgeClass/badgeClass.entity';
import type { BadgeClassRepository } from '@domains/badgeClass/badgeClass.repository';
import { badgeClasses } from '../schema';
import { PostgresBadgeClassMapper } from '../mappers/postgres-badge-class.mapper';
import { Shared } from 'openbadges-types';
import { SensitiveValue } from '@rollercoaster-dev/rd-logger';
import { BasePostgresRepository } from './base-postgres.repository';
import { PostgresEntityType } from '../types/postgres-database.types';
import { convertUuid } from '@infrastructure/database/utils/type-conversion';

export class PostgresBadgeClassRepository
  extends BasePostgresRepository
  implements BadgeClassRepository
{
  private mapper: PostgresBadgeClassMapper;

  constructor(client: postgres.Sql) {
    super(client);
    this.mapper = new PostgresBadgeClassMapper();
  }

  /**
   * Returns the entity type for this repository
   */
  protected getEntityType(): PostgresEntityType {
    return 'badgeClass';
  }

  /**
   * Returns the table name for this repository
   */
  protected getTableName(): string {
    return 'badge_classes';
  }

  async create(badgeClass: Omit<BadgeClass, 'id'>): Promise<BadgeClass> {
    const context = this.createOperationContext('CREATE BadgeClass');

    // Use BadgeClass.create to ensure defaults and ID
    const newEntity = BadgeClass.create(badgeClass);

    // Convert domain entity to database record
    const record = this.mapper.toPersistence(newEntity);

    return this.executeOperation(
      context,
      async () => {
        const result = await this.db
          .insert(badgeClasses)
          .values(record)
          .returning();
        return this.mapper.toDomain(result[0]);
      },
      1
    );
  }

  async findAll(): Promise<BadgeClass[]> {
    const context = this.createOperationContext('SELECT All BadgeClasses');

    // Log warning for unbounded query
    this.logUnboundedQueryWarning('findAll');

    return this.executeQuery(context, async (db) => {
      const result = await db.select().from(badgeClasses);
      return result.map((record) => this.mapper.toDomain(record));
    });
  }

  async findById(id: Shared.IRI): Promise<BadgeClass | null> {
    this.validateEntityId(id, 'findById');
    const context = this.createOperationContext('SELECT BadgeClass by ID', id);

    return this.executeSingleQuery(
      context,
      async (db) => {
        // Convert URN to UUID for PostgreSQL query
        const dbId = convertUuid(id as string, 'postgresql', 'to');
        const result = await db
          .select()
          .from(badgeClasses)
          .where(eq(badgeClasses.id, dbId));
        return result.map((record) => this.mapper.toDomain(record));
      },
      [id]
    );
  }

  async findByIssuer(issuerId: Shared.IRI): Promise<BadgeClass[]> {
    this.validateEntityId(issuerId, 'findByIssuer');
    const context = this.createOperationContext(
      'SELECT BadgeClasses by Issuer',
      issuerId
    );

    return this.executeQuery(
      context,
      async (db) => {
        // Convert URN to UUID for PostgreSQL query
        const dbIssuerId = convertUuid(issuerId as string, 'postgresql', 'to');
        const result = await db
          .select()
          .from(badgeClasses)
          .where(eq(badgeClasses.issuerId, dbIssuerId));
        return result.map((record) => this.mapper.toDomain(record));
      },
      [issuerId]
    );
  }

  async update(
    id: Shared.IRI,
    badgeClass: Partial<BadgeClass>
  ): Promise<BadgeClass | null> {
    this.validateEntityId(id, 'update');
    const context = this.createOperationContext('UPDATE BadgeClass', id);

    // Check if badge class exists
    const existingBadgeClass = await this.findById(id);
    if (!existingBadgeClass) {
      return null;
    }

    // Create a merged entity by spreading existing and new data
    const dataForCreate: Partial<BadgeClass> = {
      ...existingBadgeClass, // Spread properties from the existing entity instance
      ...badgeClass, // Spread the partial update data over it
      id: existingBadgeClass.id, // Ensure ID is preserved
    };
    const mergedBadgeClass = BadgeClass.create(dataForCreate);

    // Convert to database record
    const record = this.mapper.toPersistence(mergedBadgeClass);

    return this.executeUpdate(
      context,
      async (db) => {
        // Convert URN to UUID for PostgreSQL query
        const dbId = convertUuid(id as string, 'postgresql', 'to');
        const result = await db
          .update(badgeClasses)
          .set(record)
          .where(eq(badgeClasses.id, dbId))
          .returning();
        return result.map((record) => this.mapper.toDomain(record));
      },
      [id, SensitiveValue.from(record)]
    );
  }

  async delete(id: Shared.IRI): Promise<boolean> {
    this.validateEntityId(id, 'delete');
    const context = this.createOperationContext('DELETE BadgeClass', id);

    return this.executeDelete(context, async (db) => {
      // Convert URN to UUID for PostgreSQL query
      const dbId = convertUuid(id as string, 'postgresql', 'to');
      return await db
        .delete(badgeClasses)
        .where(eq(badgeClasses.id, dbId))
        .returning();
    });
  }
}
