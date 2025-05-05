/**
 * PostgreSQL implementation of the Assertion repository
 *
 * This class implements the AssertionRepository interface using PostgreSQL
 * and the Data Mapper pattern.
 */

import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { Assertion } from '@domains/assertion/assertion.entity';
import type { AssertionRepository } from '@domains/assertion/assertion.repository';
import { assertions } from '../schema';
import { PostgresAssertionMapper } from '../mappers/postgres-assertion.mapper';
import { Shared } from 'openbadges-types';
import { queryLogger } from '@utils/logging/logger.service';
import { SensitiveValue } from '@rollercoaster-dev/rd-logger';

export class PostgresAssertionRepository implements AssertionRepository {
  private db: ReturnType<typeof drizzle>;
  private mapper: PostgresAssertionMapper;

  constructor(client: postgres.Sql) {
    this.db = drizzle(client);
    this.mapper = new PostgresAssertionMapper();
  }

  async create(assertion: Omit<Assertion, 'id'>): Promise<Assertion> {
    // Convert domain entity to database record
    // The mapper now returns the correct shape for insertion (InferInsertModel)
    // and handles required field validation internally.
    const record = this.mapper.toPersistence(assertion);

    // Insert into database
    const startTime = Date.now();
    const result = await this.db.insert(assertions).values(record).returning();
    const duration = Date.now() - startTime;

    // Log query
    queryLogger.logQuery(
      'INSERT Assertion (PG)',
      [SensitiveValue.from(record)], // Wrap sensitive record data
      duration,
      'postgresql'
    );

    // Convert database record back to domain entity
    return this.mapper.toDomain(result[0]);
  }

  async findAll(): Promise<Assertion[]> {
    // Query database to get all assertions
    const startTime = Date.now();
    const result = await this.db.select().from(assertions);
    const duration = Date.now() - startTime;

    // Log query
    queryLogger.logQuery('SELECT All Assertions (PG)', undefined, duration, 'postgresql');

    // Convert database records to domain entities
    return result.map(record => this.mapper.toDomain(record));
  }

  async findById(id: Shared.IRI): Promise<Assertion | null> {
    // Query database
    const startTime = Date.now();
    const result = await this.db.select().from(assertions).where(eq(assertions.id, id as string));
    const duration = Date.now() - startTime;

    // Log query (assuming id is not sensitive)
    queryLogger.logQuery('SELECT Assertion by ID (PG)', [id], duration, 'postgresql');

    // Return null if not found
    if (!result.length) {
      return null;
    }

    // Convert database record to domain entity
    return this.mapper.toDomain(result[0]);
  }

  async findByBadgeClass(badgeClassId: Shared.IRI): Promise<Assertion[]> {
    // Query database
    const startTime = Date.now();
    const result = await this.db.select().from(assertions).where(eq(assertions.badgeClassId, badgeClassId as string));
    const duration = Date.now() - startTime;

    // Log query (assuming badgeClassId is not sensitive)
    queryLogger.logQuery('SELECT Assertions by BadgeClass (PG)', [badgeClassId], duration, 'postgresql');

    // Convert database records to domain entities
    return result.map(record => this.mapper.toDomain(record));
  }

  async findByRecipient(recipientId: string): Promise<Assertion[]> {
    // Handle different recipient identity formats
    // The recipient field is a JSON object with either 'id' or 'identity' field
    const startTime = Date.now();
    const result = await this.db.select().from(assertions)
      .where(sql`(${assertions.recipient}->>'identity' = ${recipientId}) OR (${assertions.recipient}->>'id' = ${recipientId})`);
    const duration = Date.now() - startTime;

    // Log query (wrap recipientId as potentially sensitive)
    queryLogger.logQuery(
      'SELECT Assertions by Recipient (PG)',
      [SensitiveValue.from(recipientId)],
      duration,
      'postgresql'
    );

    // Convert database records to domain entities
    return result.map(record => this.mapper.toDomain(record));
  }

  async update(id: Shared.IRI, assertion: Partial<Assertion>): Promise<Assertion | null> {
    // Check if assertion exists
    const existingAssertion = await this.findById(id);
    if (!existingAssertion) {
      return null;
    }

    // Create a merged entity
    // Get the existing assertion as a plain object while preserving prototype information
    const existingData = Object.assign(Object.create(Object.getPrototypeOf(existingAssertion)), existingAssertion);

    // Create a merged assertion
    const mergedAssertion = Assertion.create({
      ...existingData,
      ...assertion
    } as Partial<Assertion>);

    // Convert to database record
    const record = this.mapper.toPersistence(mergedAssertion);

    // Update in database
    const startTime = Date.now();
    const result = await this.db.update(assertions)
      .set(record)
      .where(eq(assertions.id, id as string))
      .returning();
    const duration = Date.now() - startTime;

    // Log query
    queryLogger.logQuery(
      'UPDATE Assertion (PG)',
      [id, SensitiveValue.from(record)], // Log ID and sensitive record data
      duration,
      'postgresql'
    );

    // Convert database record back to domain entity
    return this.mapper.toDomain(result[0]);
  }

  async delete(id: Shared.IRI): Promise<boolean> {
    // Delete from database
    const startTime = Date.now();
    const result = await this.db.delete(assertions).where(eq(assertions.id, id as string)).returning();
    const duration = Date.now() - startTime;

    // Log query (assuming id is not sensitive)
    queryLogger.logQuery('DELETE Assertion (PG)', [id], duration, 'postgresql');

    // Return true if something was deleted
    return result.length > 0;
  }

  async revoke(id: Shared.IRI, reason: string): Promise<Assertion | null> {
    // Check if assertion exists
    // Note: Query logging for the underlying update operation
    // happens within the 'update' method called below.
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

  async verify(id: Shared.IRI): Promise<{ isValid: boolean; reason?: string }> {
    // Get the assertion
    // Note: Query logging for the underlying findById operation
    // happens within the 'findById' method called above.
    const assertion = await this.findById(id);

    // If not found, return false with reason
    if (!assertion) {
      return { isValid: false, reason: 'Assertion not found' };
    }

    // Check if revoked
    if (assertion.revoked) {
      return {
        isValid: false,
        reason: assertion.revocationReason || 'Assertion has been revoked'
      };
    }

    // Check if expired
    if (assertion.expires) {
      const expiryDate = new Date(assertion.expires);
      const now = new Date();
      if (expiryDate < now) {
        return { isValid: false, reason: 'Assertion has expired' };
      }
    }

    // All checks passed
    return { isValid: true };
  }
}
