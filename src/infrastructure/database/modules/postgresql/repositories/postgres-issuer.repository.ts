/**
 * PostgreSQL implementation of the Issuer repository
 * 
 * This class implements the IssuerRepository interface using PostgreSQL
 * and the Data Mapper pattern.
 */

import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { Issuer } from '@domains/issuer/issuer.entity';
import type { IssuerRepository } from '@domains/issuer/issuer.repository';
import { issuers } from '../schema';
import { PostgresIssuerMapper } from '../mappers/postgres-issuer.mapper';

export class PostgresIssuerRepository implements IssuerRepository {
  private db: ReturnType<typeof drizzle>;
  private mapper: PostgresIssuerMapper;

  constructor(client: postgres.Sql) {
    this.db = drizzle(client);
    this.mapper = new PostgresIssuerMapper();
  }

  async create(issuer: Omit<Issuer, 'id'>): Promise<Issuer> {
    // Convert domain entity to database record
    const record = this.mapper.toPersistence(issuer as Issuer);
    
    // Remove id if it's empty (for new entities)
    if (!record.id) {
      delete record.id;
    }
    
    // Insert into database
    const result = await this.db.insert(issuers).values(record).returning();
    
    // Convert database record back to domain entity
    return this.mapper.toDomain(result[0]);
  }

  async findById(id: string): Promise<Issuer | null> {
    // Query database
    const result = await this.db.select().from(issuers).where(eq(issuers.id, id));
    
    // Return null if not found
    if (!result.length) {
      return null;
    }
    
    // Convert database record to domain entity
    return this.mapper.toDomain(result[0]);
  }

  async update(id: string, issuer: Partial<Issuer>): Promise<Issuer | null> {
    // Check if issuer exists
    const existingIssuer = await this.findById(id);
    if (!existingIssuer) {
      return null;
    }
    
    // Create a merged entity
    const mergedIssuer = Issuer.create({
      ...existingIssuer.toObject(),
      ...issuer as any
    });
    
    // Convert to database record
    const record = this.mapper.toPersistence(mergedIssuer);
    
    // Update in database
    const result = await this.db.update(issuers)
      .set(record)
      .where(eq(issuers.id, id))
      .returning();
    
    // Convert database record back to domain entity
    return this.mapper.toDomain(result[0]);
  }

  async delete(id: string): Promise<boolean> {
    // Delete from database
    const result = await this.db.delete(issuers).where(eq(issuers.id, id)).returning();
    
    // Return true if something was deleted
    return result.length > 0;
  }
}
