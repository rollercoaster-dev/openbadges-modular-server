/**
 * SQLite implementation of the Issuer repository
 *
 * This class implements the IssuerRepository interface using SQLite
 * and the Data Mapper pattern.
 */

import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import { Issuer } from '@domains/issuer/issuer.entity';
import type { IssuerRepository } from '@domains/issuer/issuer.repository';
import { issuers } from '../schema';
import { SqliteIssuerMapper } from '../mappers/sqlite-issuer.mapper';
import { Shared } from 'openbadges-types';
import { logger } from '@utils/logging/logger.service';

export class SqliteIssuerRepository implements IssuerRepository {
  private db: ReturnType<typeof drizzle>;
  private mapper: SqliteIssuerMapper;

  constructor(client: Database) {
    this.db = drizzle(client);
    this.mapper = new SqliteIssuerMapper();
  }

  async create(issuer: Omit<Issuer, 'id'>): Promise<Issuer> {
    try {
      // Convert domain entity to database record
      // Assume this returns a type compatible with issuers.$inferInsert
      const record = this.mapper.toPersistence(issuer as Issuer);

      // Directly pass the record to Drizzle, trusting it handles optional/PKs
      const result = await this.db.insert(issuers).values(record).returning();

      // Convert database record back to domain entity
      return this.mapper.toDomain(result[0]);
    } catch (error) {
      logger.error('Error creating issuer in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        issuer
      });
      throw error;
    }
  }

  async findAll(): Promise<Issuer[]> {
    try {
      // Query database to get all issuers
      const result = await this.db.select().from(issuers);

      // Convert database records to domain entities
      return result.map(record => this.mapper.toDomain(record));
    } catch (error) {
      logger.error('Error finding all issuers in SQLite repository', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async findById(id: Shared.IRI): Promise<Issuer | null> {
    try {
      // Query database
      const result = await this.db.select().from(issuers).where(eq(issuers.id, id as string));

      // Return null if not found
      if (!result.length) {
        return null;
      }

      // Convert database record to domain entity
      return this.mapper.toDomain(result[0]);
    } catch (error) {
      logger.error('Error finding issuer by ID in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        id
      });
      throw error;
    }
  }

  async update(id: Shared.IRI, issuer: Partial<Issuer>): Promise<Issuer | null> {
    try {
      // Check if issuer exists
      const existingIssuer = await this.findById(id);
      if (!existingIssuer) {
        return null;
      }

      // Create a merged entity using toPartial for type safety
      const mergedIssuer = Issuer.create({
        ...existingIssuer.toPartial(), 
        ...issuer 
      });

      // Convert to database record
      const record = this.mapper.toPersistence(mergedIssuer);

      // Update in database
      const result = await this.db.update(issuers)
        .set(record)
        .where(eq(issuers.id, id as string))
        .returning();

      // Convert database record back to domain entity
      return this.mapper.toDomain(result[0]);
    } catch (error) {
      logger.error('Error updating issuer in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        id,
        issuer
      });
      throw error;
    }
  }

  async delete(id: Shared.IRI): Promise<boolean> {
    try {
      // Delete from database
      const result = await this.db.delete(issuers).where(eq(issuers.id, id as string)).returning();

      // Return true if something was deleted
      return result.length > 0;
    } catch (error) {
      logger.error('Error deleting issuer in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        id
      });
      throw error;
    }
  }
}
