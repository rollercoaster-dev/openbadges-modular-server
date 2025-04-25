/**
 * SQLite implementation of the Assertion repository
 *
 * This class implements the AssertionRepository interface using SQLite
 * and the Data Mapper pattern.
 */

import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import { Assertion } from '@domains/assertion/assertion.entity';
import type { AssertionRepository } from '@domains/assertion/assertion.repository';
import { assertions } from '../schema';
import { SqliteAssertionMapper } from '../mappers/sqlite-assertion.mapper';
import { Shared } from 'openbadges-types';
import { logger } from '../../../../../utils/logging/logger.service';

export class SqliteAssertionRepository implements AssertionRepository {
  private db: ReturnType<typeof drizzle>;
  private mapper: SqliteAssertionMapper;

  constructor(client: Database) {
    this.db = drizzle(client);
    this.mapper = new SqliteAssertionMapper();
  }

  async create(assertion: Omit<Assertion, 'id'>): Promise<Assertion> {
    try {
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
    } catch (error) {
      logger.error('Error creating assertion in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        assertion
      });
      throw error;
    }
  }

  async findAll(): Promise<Assertion[]> {
    try {
      // Query database to get all assertions
      const result = await this.db.select().from(assertions);

      // Convert database records to domain entities
      return result.map(record => this.mapper.toDomain(record));
    } catch (error) {
      logger.error('Error finding all assertions in SQLite repository', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async findById(id: Shared.IRI): Promise<Assertion | null> {
    try {
      // Query database
      const result = await this.db.select().from(assertions).where(eq(assertions.id, id as string));

      // Return null if not found
      if (!result.length) {
        return null;
      }

      // Convert database record to domain entity
      return this.mapper.toDomain(result[0]);
    } catch (error) {
      logger.error('Error finding assertion by ID in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        id
      });
      throw error;
    }
  }

  async findByBadgeClass(badgeClassId: Shared.IRI): Promise<Assertion[]> {
    try {
      // Query database
      const result = await this.db.select().from(assertions).where(eq(assertions.badgeClassId, badgeClassId as string));

      // Convert database records to domain entities
      return result.map(record => this.mapper.toDomain(record));
    } catch (error) {
      logger.error('Error finding assertions by badge class in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        badgeClassId
      });
      throw error;
    }
  }

  async findByRecipient(recipientId: string): Promise<Assertion[]> {
    try {
      // Query database using JSON extraction
      const result = await this.db.select().from(assertions).where(
        sql`json_extract(${assertions.recipient}, '$.identity') = ${recipientId}`
      );

      // Convert database records to domain entities
      return result.map(record => this.mapper.toDomain(record));
    } catch (error) {
      logger.error('Error finding assertions by recipient in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        recipientId
      });
      throw error;
    }
  }

  async update(id: Shared.IRI, assertion: Partial<Assertion>): Promise<Assertion | null> {
    try {
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
        .where(eq(assertions.id, id as string))
        .returning();

      // Convert database record back to domain entity
      return this.mapper.toDomain(result[0]);
    } catch (error) {
      logger.error('Error updating assertion in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        id,
        assertion
      });
      throw error;
    }
  }

  async delete(id: Shared.IRI): Promise<boolean> {
    try {
      // Delete from database
      const result = await this.db.delete(assertions).where(eq(assertions.id, id as string)).returning();

      // Return true if something was deleted
      return result.length > 0;
    } catch (error) {
      logger.error('Error deleting assertion in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        id
      });
      throw error;
    }
  }

  async revoke(id: Shared.IRI, reason?: string): Promise<Assertion | null> {
    try {
      // Check if assertion exists
      const existingAssertion = await this.findById(id);
      if (!existingAssertion) {
        return null;
      }

      // Update assertion to revoke it
      return this.update(id, {
        revoked: true,
        revocationReason: reason
      });
    } catch (error) {
      logger.error('Error revoking assertion in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        id,
        reason
      });
      throw error;
    }
  }

  async verify(id: Shared.IRI): Promise<{ isValid: boolean; reason?: string }> {
    try {
      // Get assertion
      const assertion = await this.findById(id);

      // Check if assertion exists
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

      // Assertion is valid
      return { isValid: true };
    } catch (error) {
      logger.error('Error verifying assertion in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        id
      });
      throw error;
    }
  }
}
