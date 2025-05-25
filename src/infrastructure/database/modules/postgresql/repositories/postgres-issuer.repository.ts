/**
 * PostgreSQL implementation of the Issuer repository
 *
 * This class implements the IssuerRepository interface using PostgreSQL
 * and the Data Mapper pattern with the base repository class.
 */

import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import { Issuer } from '@domains/issuer/issuer.entity';
import type { IssuerRepository } from '@domains/issuer/issuer.repository';
import { issuers } from '../schema';
import { PostgresIssuerMapper } from '../mappers/postgres-issuer.mapper';
import { Shared } from 'openbadges-types';
import { SensitiveValue } from '@rollercoaster-dev/rd-logger';
import { BasePostgresRepository } from './base-postgres.repository';
import { PostgresEntityType } from '../types/postgres-database.types';
import { convertUuid } from '@infrastructure/database/utils/type-conversion';

export class PostgresIssuerRepository
  extends BasePostgresRepository
  implements IssuerRepository
{
  private mapper: PostgresIssuerMapper;

  constructor(client: postgres.Sql) {
    super(client);
    this.mapper = new PostgresIssuerMapper();
  }

  /**
   * Returns the entity type for this repository
   */
  protected getEntityType(): PostgresEntityType {
    return 'issuer';
  }

  /**
   * Returns the table name for this repository
   */
  protected getTableName(): string {
    return 'issuers';
  }

  async create(issuer: Omit<Issuer, 'id'>): Promise<Issuer> {
    const context = this.createOperationContext('CREATE Issuer');

    // Convert domain entity to database record
    const record = this.mapper.toPersistence(issuer);

    return this.executeOperation(
      context,
      async () => {
        const result = await this.db.insert(issuers).values(record).returning();
        return this.mapper.toDomain(result[0]);
      },
      1
    );
  }

  async findAll(): Promise<Issuer[]> {
    const context = this.createOperationContext('SELECT All Issuers');

    // Log warning for unbounded query
    this.logUnboundedQueryWarning('findAll');

    return this.executeQuery(context, async (db) => {
      const result = await db.select().from(issuers);
      return result.map((record) => this.mapper.toDomain(record));
    });
  }

  async findById(id: Shared.IRI): Promise<Issuer | null> {
    this.validateEntityId(id, 'findById');
    const context = this.createOperationContext('SELECT Issuer by ID', id);

    return this.executeSingleQuery(
      context,
      async (db) => {
        // Convert URN to UUID for PostgreSQL query
        const dbId = convertUuid(id as string, 'postgresql', 'to');
        const result = await db
          .select()
          .from(issuers)
          .where(eq(issuers.id, dbId));
        return result.map((record) => this.mapper.toDomain(record));
      },
      [id]
    );
  }

  async update(
    id: Shared.IRI,
    issuer: Partial<Issuer>
  ): Promise<Issuer | null> {
    this.validateEntityId(id, 'update');
    const context = this.createOperationContext('UPDATE Issuer', id);

    // Check if issuer exists
    const existingIssuer = await this.findById(id);
    if (!existingIssuer) {
      return null;
    }

    // Create a merged object with updated properties
    const mergedProps: Partial<Issuer> = {
      ...existingIssuer,
      ...issuer,
      id: existingIssuer.id, // Ensure we keep the original ID
    };

    // Convert to database record
    const record = this.mapper.toPersistence(mergedProps);

    return this.executeUpdate(
      context,
      async (db) => {
        // Convert URN to UUID for PostgreSQL query
        const dbId = convertUuid(id as string, 'postgresql', 'to');
        const result = await db
          .update(issuers)
          .set(record)
          .where(eq(issuers.id, dbId))
          .returning();
        return result.map((record) => this.mapper.toDomain(record));
      },
      [id, SensitiveValue.from(record)]
    );
  }

  async delete(id: Shared.IRI): Promise<boolean> {
    this.validateEntityId(id, 'delete');
    const context = this.createOperationContext('DELETE Issuer', id);

    return this.executeDelete(context, async (db) => {
      // Convert URN to UUID for PostgreSQL query
      const dbId = convertUuid(id as string, 'postgresql', 'to');
      return await db.delete(issuers).where(eq(issuers.id, dbId)).returning();
    });
  }
}
