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

      if (!insertResult[0]) {
        throw new Error('Failed to create badge class: no result returned');
      }

      // Convert database record back to domain entity
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

    // Validate and normalize pagination parameters
    const { limit, offset } = this.validatePagination(pagination);

    // Log warning if no pagination was explicitly provided
    if (!pagination) {
      this.logUnboundedQueryWarning('findAll');
    }

    const result = await this.executeQuery(context, async () => {
      const db = this.getDatabase();
      return db.select().from(badgeClasses).limit(limit).offset(offset);
    });

    // Convert database records to domain entities
    return result.map((record) => this.mapper.toDomain(record));
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

    // Log warning for unbounded query
    this.logUnboundedQueryWarning('findAllUnbounded');

    const result = await this.executeQuery(context, async () => {
      const db = this.getDatabase();
      return db.select().from(badgeClasses);
    });

    // Convert database records to domain entities
    return result.map((record) => this.mapper.toDomain(record));
  }

  async findById(id: string): Promise<BadgeClass | null> {
    this.validateEntityId(id as Shared.IRI, 'find badge class by ID');
    const context = this.createOperationContext(
      'SELECT BadgeClass by ID',
      id as Shared.IRI
    );

    const result = await this.executeSingleQuery(
      context,
      async () => {
        const db = this.getDatabase();
        return db.select().from(badgeClasses).where(eq(badgeClasses.id, id));
      },
      [id] // Forward ID parameter to logger
    );

    // Convert database record to domain entity if found
    return result ? this.mapper.toDomain(result) : null;
  }

  async findByIssuer(issuerId: Shared.IRI): Promise<BadgeClass[]> {
    this.validateEntityId(issuerId, 'find badge classes by issuer');
    const context = this.createOperationContext(
      'SELECT BadgeClasses by Issuer',
      issuerId
    );

    const result = await this.executeQuery(
      context,
      async () => {
        const db = this.getDatabase();
        return db
          .select()
          .from(badgeClasses)
          .where(eq(badgeClasses.issuerId, issuerId as string));
      },
      [issuerId] // Forward issuer ID parameter to logger
    );

    // Convert database records to domain entities
    return result.map((record) => this.mapper.toDomain(record));
  }

  async update(
    id: string,
    badgeClass: Partial<BadgeClass>
  ): Promise<BadgeClass | null> {
    this.validateEntityId(id as Shared.IRI, 'update badge class');
    const context = this.createOperationContext(
      'UPDATE BadgeClass',
      id as Shared.IRI
    );

    return this.executeTransaction(context, async (tx) => {
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

      // Update in database within the transaction
      const updateResult = await tx
        .update(badgeClasses)
        .set(record)
        .where(eq(badgeClasses.id, id))
        .returning();

      if (!updateResult[0]) {
        throw new Error('Failed to update badge class: no result returned');
      }

      // Convert database record back to domain entity
      return this.mapper.toDomain(updateResult[0]);
    });
  }

  async delete(id: string): Promise<boolean> {
    this.validateEntityId(id as Shared.IRI, 'delete badge class');
    const context = this.createOperationContext(
      'DELETE BadgeClass',
      id as Shared.IRI
    );

    return this.executeDelete(context, async () => {
      const db = this.getDatabase();
      return db.delete(badgeClasses).where(eq(badgeClasses.id, id)).returning();
    });
  }
}
