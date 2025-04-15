/**
 * PostgreSQL implementation of the Assertion repository
 * 
 * This class implements the AssertionRepository interface using PostgreSQL
 * and the Data Mapper pattern.
 */

import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { Assertion } from '../../../domains/assertion/assertion.entity';
import { AssertionRepository } from '../../../domains/assertion/assertion.repository';
import { assertions } from '../schema';
import { PostgresAssertionMapper } from './mappers/postgres-assertion.mapper';

export class PostgresAssertionRepository implements AssertionRepository {
  private db: ReturnType<typeof drizzle>;
  private mapper: PostgresAssertionMapper;

  constructor(client: postgres.Sql) {
    this.db = drizzle(client);
    this.mapper = new PostgresAssertionMapper();
  }

  async create(assertion: Omit<Assertion, 'id'>): Promise<Assertion> {
    // Convert domain entity to database record
    const record = this.mapper.toPersistence(assertion as Assertion);
    
    // Remove id if it's empty (for new entities)
    if (!record.id) {
      delete record.id;
    }
    
    // Insert into database
    const result = await this.db.insert(assertions).values(record).returning();
    
    // Convert database record back to domain entity
    return this.mapper.toDomain(result[0]);
  }

  async findById(id: string): Promise<Assertion | null> {
    // Query database
    const result = await this.db.select().from(assertions).where(eq(assertions.id, id));
    
    // Return null if not found
    if (!result.length) {
      return null;
    }
    
    // Convert database record to domain entity
    return this.mapper.toDomain(result[0]);
  }

  async findByBadgeClass(badgeClassId: string): Promise<Assertion[]> {
    // Query database
    const result = await this.db.select().from(assertions).where(eq(assertions.badgeClassId, badgeClassId));
    
    // Convert database records to domain entities
    return result.map(record => this.mapper.toDomain(record));
  }

  async findByRecipient(recipientId: string): Promise<Assertion[]> {
    // This is a simplified implementation that assumes recipient.id exists
    // A more robust implementation would need to handle different recipient identity formats
    const result = await this.db.select().from(assertions)
      .where(eq(assertions.recipient.id, recipientId));
    
    // Convert database records to domain entities
    return result.map(record => this.mapper.toDomain(record));
  }

  async update(id: string, assertion: Partial<Assertion>): Promise<Assertion | null> {
    // Check if assertion exists
    const existingAssertion = await this.findById(id);
    if (!existingAssertion) {
      return null;
    }
    
    // Create a merged entity
    const mergedAssertion = Assertion.create({
      ...existingAssertion.toObject(),
      ...assertion as any
    });
    
    // Convert to database record
    const record = this.mapper.toPersistence(mergedAssertion);
    
    // Update in database
    const result = await this.db.update(assertions)
      .set(record)
      .where(eq(assertions.id, id))
      .returning();
    
    // Convert database record back to domain entity
    return this.mapper.toDomain(result[0]);
  }

  async delete(id: string): Promise<boolean> {
    // Delete from database
    const result = await this.db.delete(assertions).where(eq(assertions.id, id)).returning();
    
    // Return true if something was deleted
    return result.length > 0;
  }

  async revoke(id: string, reason: string): Promise<Assertion | null> {
    // Check if assertion exists
    const existingAssertion = await this.findById(id);
    if (!existingAssertion) {
      return null;
    }
    
    // Update the assertion with revocation information
    return this.update(id, {
      revoked: true,
      revocationReason: reason
    } as Partial<Assertion>);
  }

  async verify(id: string): Promise<boolean> {
    // Get the assertion
    const assertion = await this.findById(id);
    
    // If not found, return false
    if (!assertion) {
      return false;
    }
    
    // Use the domain entity's isValid method to check validity
    return assertion.isValid();
  }
}
