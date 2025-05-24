/**
 * SQLite implementation of the BadgeClass repository
 *
 * This class implements the BadgeClassRepository interface using SQLite
 * and the Data Mapper pattern with enhanced type safety.
 */

import { eq } from 'drizzle-orm';
import { BadgeClass } from '@domains/badgeClass/badgeClass.entity';
import type { BadgeClassRepository } from '@domains/badgeClass/badgeClass.repository';
import { badgeClasses } from '../schema';
import { SqliteBadgeClassMapper } from '../mappers/sqlite-badge-class.mapper';
import { Shared } from 'openbadges-types';
import { SqliteConnectionManager } from '../connection/sqlite-connection.manager';
import { BaseSqliteRepository } from './base-sqlite.repository';
import { SqlitePaginationParams } from '../types/sqlite-database.types';

export class SqliteBadgeClassRepository
  extends BaseSqliteRepository
  implements BadgeClassRepository
{
  private mapper: SqliteBadgeClassMapper;

  constructor(connectionManager: SqliteConnectionManager) {
    super(connectionManager);
    this.mapper = new SqliteBadgeClassMapper();
  }

  protected getEntityType(): 'badgeClass' {
    return 'badgeClass';
  }

  protected getTableName(): string {
    return 'badgeClasses';
  }

  /**
   * Gets the mapper instance for external access
   */
  getMapper(): SqliteBadgeClassMapper {
    return this.mapper;
  }

  async create(badgeClass: Partial<BadgeClass>): Promise<BadgeClass> {
    const context = this.createOperationContext('INSERT BadgeClass');

    return this.executeTransaction(context, async (tx) => {
      // Create a full badge class entity with generated ID for mapping
      const badgeClassWithId = BadgeClass.create(badgeClass);

      // Convert domain entity to database record
      const record = this.mapper.toPersistence(badgeClassWithId, true);

      // Insert into database within the transaction
      const insertResult = await tx
        .insert(badgeClasses)
        .values(record)
        .returning();

      return this.mapper.toDomain(insertResult[0]);
    });
  }

  /**
   * Finds all badge classes with optional pagination
   * @param pagination Optional pagination parameters. If not provided, uses default pagination to prevent unbounded queries.
   * @returns Promise resolving to array of BadgeClass entities
   */
  async findAll(pagination?: SqlitePaginationParams): Promise<BadgeClass[]> {
    const context = this.createOperationContext('SELECT All BadgeClasses');

    const result = await this.executeQuery(context, async (db) => {
      const { limit, offset } = this.validatePagination(pagination);
      return db.select().from(badgeClasses).limit(limit).offset(offset);
    });

    return result.map((record: typeof badgeClasses.$inferSelect) =>
      this.mapper.toDomain(record)
    );
  }

  /**
   * Finds all badge classes without pagination (for backward compatibility and specific use cases)
   * @deprecated Use findAll() with pagination parameters instead
   * @returns Promise resolving to array of all BadgeClass entities
   */
  async findAllUnbounded(): Promise<BadgeClass[]> {
    const context = this.createOperationContext(
      'SELECT All BadgeClasses (Unbounded)'
    );

    const result = await this.executeQuery(context, async (db) => {
      return db.select().from(badgeClasses);
    });

    return result.map((record: typeof badgeClasses.$inferSelect) =>
      this.mapper.toDomain(record)
    );
  }

  async findById(id: string): Promise<BadgeClass | null> {
    this.validateEntityId(id as Shared.IRI, 'find badge class by ID');
    const context = this.createOperationContext(
      'SELECT BadgeClass by ID',
      id as Shared.IRI
    );

    const result = await this.executeSingleQuery(
      context,
      async (db) => {
        return db.select().from(badgeClasses).where(eq(badgeClasses.id, id));
      },
      [id] // Forward ID parameter to logger
    );

    return result
      ? this.mapper.toDomain(result as typeof badgeClasses.$inferSelect)
      : null;
  }

  async findByIssuer(issuerId: Shared.IRI): Promise<BadgeClass[]> {
    this.validateEntityId(issuerId, 'find badge classes by issuer');
    const context = this.createOperationContext(
      'SELECT BadgeClasses by Issuer',
      issuerId
    );

    const result = await this.executeQuery(
      context,
      async (db) => {
        return db
          .select()
          .from(badgeClasses)
          .where(eq(badgeClasses.issuerId, issuerId as string));
      },
      [issuerId] // Forward issuer ID parameter to logger
    );

    return result.map((record: typeof badgeClasses.$inferSelect) =>
      this.mapper.toDomain(record)
    );
  }

  async update(
    id: string,
    badgeClass: Partial<BadgeClass>
  ): Promise<BadgeClass | null> {
    const context = this.createOperationContext(
      'UPDATE BadgeClass',
      id as Shared.IRI
    );

    return this.executeTransaction(context, async (tx) => {
      // Perform SELECT and UPDATE within the same transaction to prevent TOCTOU race condition
      const existing = await tx
        .select()
        .from(badgeClasses)
        .where(eq(badgeClasses.id, id))
        .limit(1);

      if (existing.length === 0) {
        return null;
      }

      // Convert database record to domain entity for merging
      const existingBadgeClass = this.mapper.toDomain(existing[0]);

      const partialExistingData = existingBadgeClass.toPartial();
      const mergedData: Partial<BadgeClass> = {
        ...partialExistingData,
        ...badgeClass,
      };

      const mergedBadgeClass = BadgeClass.create(mergedData);

      // Use destructuring instead of delete operator for better performance
      const {
        id: _ignore,
        createdAt: _ca,
        ...updatable
      } = this.mapper.toPersistence(mergedBadgeClass);

      const updated = await tx
        .update(badgeClasses)
        .set(updatable)
        .where(eq(badgeClasses.id, id))
        .returning();

      return this.mapper.toDomain(updated[0]);
    });
  }

  async delete(id: string): Promise<boolean> {
    this.validateEntityId(id as Shared.IRI, 'delete badge class');
    const context = this.createOperationContext(
      'DELETE BadgeClass',
      id as Shared.IRI
    );

    return this.executeDelete(context, async (db) => {
      return db.delete(badgeClasses).where(eq(badgeClasses.id, id)).returning();
    });
  }
}
