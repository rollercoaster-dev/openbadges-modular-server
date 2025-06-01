/**
 * SQLite implementation of the Issuer repository
 *
 * This class implements the IssuerRepository interface using SQLite
 * and the Data Mapper pattern with enhanced type safety.
 */

import { eq } from 'drizzle-orm';
import { Issuer } from '@domains/issuer/issuer.entity';
import type { IssuerRepository } from '@domains/issuer/issuer.repository';
import { issuers } from '../schema';
import { SqliteIssuerMapper } from '../mappers/sqlite-issuer.mapper';
import { Shared } from 'openbadges-types';
import { SqliteConnectionManager } from '../connection/sqlite-connection.manager';
import { BaseSqliteRepository } from './base-sqlite.repository';
import { SqlitePaginationParams } from '../types/sqlite-database.types';
import { convertUuid } from '@infrastructure/database/utils/type-conversion';

export class SqliteIssuerRepository
  extends BaseSqliteRepository
  implements IssuerRepository
{
  private mapper: SqliteIssuerMapper;

  constructor(connectionManager: SqliteConnectionManager) {
    super(connectionManager);
    this.mapper = new SqliteIssuerMapper();
  }

  protected getEntityType(): 'issuer' {
    return 'issuer';
  }

  protected getTableName(): string {
    return 'issuers';
  }

  /**
   * Gets the mapper instance for external access
   */
  getMapper(): SqliteIssuerMapper {
    return this.mapper;
  }

  async create(issuer: Omit<Issuer, 'id'>): Promise<Issuer> {
    const context = this.createOperationContext('INSERT Issuer');

    return this.executeTransaction(context, async (tx) => {
      // Create a full issuer entity with generated ID for mapping
      const issuerWithId = Issuer.create(issuer);

      // Convert domain entity to database record
      // The mapper handles timestamp setting, so no need to set them manually
      const record = this.mapper.toPersistence(issuerWithId);

      // Insert into database within the transaction
      const insertResult = await tx.insert(issuers).values(record).returning();

      if (!insertResult[0]) {
        throw new Error('Failed to create issuer: no result returned');
      }

      // Convert database record back to domain entity
      return this.mapper.toDomain(insertResult[0]);
    });
  }

  /**
   * Finds all issuers with optional pagination
   * @param pagination Optional pagination parameters. If not provided, uses default pagination to prevent unbounded queries.
   * @returns Promise resolving to array of Issuer entities
   */
  async findAll(pagination?: SqlitePaginationParams): Promise<Issuer[]> {
    const context = this.createOperationContext('SELECT All Issuers');

    // Validate and normalize pagination parameters
    const { limit, offset } = this.validatePagination(pagination);

    // Log warning if no pagination was explicitly provided
    if (!pagination) {
      this.logUnboundedQueryWarning('findAll');
    }

    const result = await this.executeQuery(
      context,
      async () => {
        const db = this.getDatabase();
        return db.select().from(issuers).limit(limit).offset(offset);
      },
      [limit, offset] // Forward calculated parameters to logger
    );

    // Convert database records to domain entities
    return result.map((record) => this.mapper.toDomain(record));
  }

  /**
   * Finds all issuers without pagination (for backward compatibility and specific use cases)
   * @deprecated Use findAll() with pagination parameters instead
   * @returns Promise resolving to array of all Issuer entities
   */
  async findAllUnbounded(): Promise<Issuer[]> {
    const context = this.createOperationContext(
      'SELECT All Issuers (Unbounded)'
    );

    // Log warning for unbounded query
    this.logUnboundedQueryWarning('findAllUnbounded');

    const result = await this.executeQuery(context, async () => {
      const db = this.getDatabase();
      return db.select().from(issuers);
    });

    // Convert database records to domain entities
    return result.map((record) => this.mapper.toDomain(record));
  }

  async findById(id: Shared.IRI): Promise<Issuer | null> {
    this.validateEntityId(id, 'find issuer by ID');
    const context = this.createOperationContext('SELECT Issuer by ID', id);

    const result = await this.executeSingleQuery(
      context,
      async () => {
        const db = this.getDatabase();
        // Convert URN to UUID for SQLite query
        const dbId = convertUuid(id as string, 'sqlite', 'to');
        return db.select().from(issuers).where(eq(issuers.id, dbId));
      },
      [id] // Forward ID parameter to logger
    );

    // Convert database record to domain entity if found
    return result ? this.mapper.toDomain(result) : null;
  }

  async update(
    id: Shared.IRI,
    issuer: Partial<Issuer>
  ): Promise<Issuer | null> {
    this.validateEntityId(id, 'update issuer');
    const context = this.createOperationContext('UPDATE Issuer', id);

    return this.executeTransaction(context, async (tx) => {
      // First, get the existing issuer within the transaction to avoid race conditions
      // Convert URN to UUID for SQLite query
      const dbId = convertUuid(id as string, 'sqlite', 'to');
      const existingRecords = await tx
        .select()
        .from(issuers)
        .where(eq(issuers.id, dbId));

      if (existingRecords.length === 0) {
        return null; // Entity doesn't exist
      }

      const existingIssuer = this.mapper.toDomain(existingRecords[0]);

      // Create a merged entity using toPartial for type safety
      // Filter out undefined values from the update to prevent overwriting with undefined
      const filteredUpdate = Object.fromEntries(
        Object.entries(issuer).filter(([_, value]) => value !== undefined)
      ) as Partial<Issuer>;

      // Preserve the original ID by explicitly setting it
      const mergedIssuer = Issuer.create({
        ...existingIssuer.toPartial(),
        ...filteredUpdate,
        id: existingIssuer.id, // Ensure we keep the original ID
      });

      // Convert to database record but exclude id to avoid updating primary key
      // The mapper handles timestamp setting, so no need to set updatedAt manually
      const { id: _discard, ...updatable } =
        this.mapper.toPersistence(mergedIssuer);

      const updateResult = await tx
        .update(issuers)
        .set(updatable)
        .where(eq(issuers.id, dbId))
        .returning();

      if (!updateResult[0]) {
        throw new Error('Failed to update issuer: no result returned');
      }

      // Convert database record back to domain entity
      return this.mapper.toDomain(updateResult[0]);
    });
  }

  async delete(id: Shared.IRI): Promise<boolean> {
    this.validateEntityId(id, 'delete issuer');
    const context = this.createOperationContext('DELETE Issuer', id);

    return this.executeDelete(context, async () => {
      const db = this.getDatabase();
      // Convert URN to UUID for SQLite query
      const dbId = convertUuid(id as string, 'sqlite', 'to');
      return db.delete(issuers).where(eq(issuers.id, dbId)).returning();
    });
  }
}
