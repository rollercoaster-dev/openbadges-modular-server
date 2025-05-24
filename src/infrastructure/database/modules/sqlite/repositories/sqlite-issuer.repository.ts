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

export class SqliteIssuerRepository
  extends BaseSqliteRepository
  implements IssuerRepository
{
  private readonly mapper: SqliteIssuerMapper;

  constructor(connectionManager: SqliteConnectionManager) {
    super(connectionManager);
    this.mapper = new SqliteIssuerMapper();
  }

  /**
   * Gets the mapper instance for external access
   */
  getMapper(): SqliteIssuerMapper {
    return this.mapper;
  }

  async create(issuer: Omit<Issuer, 'id'>): Promise<Issuer> {
    const context = this.createOperationContext('INSERT Issuer', 'issuer');

    return this.executeTransaction(context, async (tx) => {
      // Create a full issuer entity with generated ID for mapping
      const issuerWithId = Issuer.create(issuer);

      // Convert domain entity to database record
      const record = this.mapper.toPersistence(issuerWithId);

      // Ensure timestamps are set
      const now = Date.now();
      record.createdAt = now;
      record.updatedAt = now;

      // Insert into database within the transaction
      const insertResult = await tx.insert(issuers).values(record).returning();

      if (!insertResult[0]) {
        throw new Error('Failed to create issuer: no result returned');
      }

      // Log metrics
      this.logQueryMetrics(context, 1);

      // Convert database record back to domain entity
      return this.mapper.toDomain(insertResult[0]);
    });
  }

  async findAll(): Promise<Issuer[]> {
    const context = this.createOperationContext('SELECT All Issuers', 'issuer');

    return this.executeOperation(context, async () => {
      const db = this.getDatabase();

      // Query database to get all issuers
      const result = await db.select().from(issuers);

      // Log metrics
      this.logQueryMetrics(context, result.length);

      // Convert database records to domain entities
      return result.map((record) => this.mapper.toDomain(record));
    });
  }

  async findById(id: Shared.IRI): Promise<Issuer | null> {
    this.validateEntityId(id, 'issuer');
    const context = this.createOperationContext(
      'SELECT Issuer by ID',
      'issuer',
      id
    );

    return this.executeOperation(context, async () => {
      const db = this.getDatabase();

      // Query database
      const result = await db
        .select()
        .from(issuers)
        .where(eq(issuers.id, id as string));

      // Log metrics
      this.logQueryMetrics(context, result.length);

      // Return null if not found
      if (!result.length) {
        return null;
      }

      // Convert database record to domain entity
      return this.mapper.toDomain(result[0]);
    });
  }

  async update(
    id: Shared.IRI,
    issuer: Partial<Issuer>
  ): Promise<Issuer | null> {
    this.validateEntityId(id, 'issuer');
    const context = this.createOperationContext('UPDATE Issuer', 'issuer', id);

    return this.executeOperation(context, async () => {
      // Check if issuer exists
      const existingIssuer = await this.findById(id);
      if (!existingIssuer) {
        return null;
      }

      const db = this.getDatabase();

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
      const { id: _discard, ...updatable } =
        this.mapper.toPersistence(mergedIssuer);

      // Ensure updatedAt timestamp is set
      updatable.updatedAt = Date.now();

      const result = await db
        .update(issuers)
        .set(updatable)
        .where(eq(issuers.id, id as string))
        .returning();

      this.logQueryMetrics(context, result.length);

      if (!result[0]) {
        throw new Error('Failed to update issuer: no result returned');
      }

      // Convert database record back to domain entity
      return this.mapper.toDomain(result[0]);
    });
  }

  async delete(id: Shared.IRI): Promise<boolean> {
    this.validateEntityId(id, 'issuer');
    const context = this.createOperationContext('DELETE Issuer', 'issuer', id);

    return this.executeOperation(context, async () => {
      const db = this.getDatabase();

      // Delete from database
      const result = await db
        .delete(issuers)
        .where(eq(issuers.id, id as string))
        .returning();

      // Log metrics
      this.logQueryMetrics(context, result.length);

      // Return true if something was deleted
      return result.length > 0;
    });
  }
}
