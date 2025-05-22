/**
 * SQLite implementation of the Assertion repository
 *
 * This class implements the AssertionRepository interface using SQLite
 * and the Data Mapper pattern.
 */

import { eq, sql, InferInsertModel } from 'drizzle-orm';
import { Assertion } from '@domains/assertion/assertion.entity';
import type { AssertionRepository } from '@domains/assertion/assertion.repository';
import { assertions } from '../schema';
import { SqliteAssertionMapper } from '../mappers/sqlite-assertion.mapper';
import { Shared } from 'openbadges-types';
import { logger, queryLogger } from '@utils/logging/logger.service';
import { SensitiveValue } from '@rollercoaster-dev/rd-logger';
import { createId } from '@paralleldrive/cuid2';
import { SqliteConnectionManager } from '../connection/sqlite-connection.manager';

export class SqliteAssertionRepository implements AssertionRepository {
  private mapper: SqliteAssertionMapper;

  constructor(private readonly connectionManager: SqliteConnectionManager) {
    this.mapper = new SqliteAssertionMapper();
  }

  /**
   * Gets the mapper instance for external access
   */
  getMapper(): SqliteAssertionMapper {
    return this.mapper;
  }

  /**
   * Gets the database instance with connection validation
   */
  private getDatabase() {
    this.connectionManager.ensureConnected();
    return this.connectionManager.getDatabase();
  }

  async create(assertion: Omit<Assertion, 'id'>): Promise<Assertion> {
    try {
      // Generate ID and create full entity
      const id = createId() as Shared.IRI;
      const fullAssertion = Assertion.create({ ...assertion, id });

      // Convert domain entity to database record
      const record: InferInsertModel<typeof assertions> =
        this.mapper.toPersistence(fullAssertion);

      // Insert into database
      const startTime = Date.now();
      const result = await this.getDatabase()
        .insert(assertions)
        .values(record)
        .returning();
      const duration = Date.now() - startTime;

      // Log query (wrap the whole record as potentially sensitive)
      queryLogger.logQuery(
        'INSERT Assertion',
        [SensitiveValue.from(record)],
        duration,
        'sqlite'
      );

      // Convert database record back to domain entity
      // Ensure the returned result from 'returning()' matches the expected input for toDomain
      // Assuming result[0] has the correct shape after insertion.
      // If 'returning()' doesn't return all needed fields, a separate findById might be necessary.
      const createdRecord = result[0];
      if (!createdRecord) {
        throw new Error(
          'Failed to retrieve created assertion record after insert.'
        );
      }
      // We need to ensure createdRecord matches the input type for toDomain
      // Let's assume for now it does, but this might need adjustment
      // based on the actual return shape of .returning() in SQLite/Drizzle.
      return this.mapper.toDomain(createdRecord);
    } catch (error) {
      logger.error('Error creating assertion in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        assertion,
        // Log sensitive assertion data separately if needed for debugging, but avoid in query logs
      });
      throw error;
    }
  }

  async findAll(): Promise<Assertion[]> {
    try {
      // Query database to get all assertions
      const startTime = Date.now();
      const result = await this.getDatabase().select().from(assertions);
      const duration = Date.now() - startTime;

      // Log query
      queryLogger.logQuery(
        'SELECT All Assertions',
        undefined,
        duration,
        'sqlite'
      );

      // Convert database records to domain entities
      return result.map((record) => this.mapper.toDomain(record));
    } catch (error) {
      logger.error('Error finding all assertions in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findById(id: Shared.IRI): Promise<Assertion | null> {
    try {
      const startTime = Date.now();
      // Query database
      const result = await this.getDatabase()
        .select()
        .from(assertions)
        .where(eq(assertions.id, id as string));
      const duration = Date.now() - startTime;

      // Log query (assuming id is not sensitive)
      queryLogger.logQuery('SELECT Assertion by ID', [id], duration, 'sqlite');

      // Return null if not found
      if (!result.length) {
        return null;
      }

      // Convert database record to domain entity
      return this.mapper.toDomain(result[0]);
    } catch (error) {
      logger.error('Error finding assertion by ID in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        id,
      });
      throw error;
    }
  }

  async findByBadgeClass(badgeClassId: Shared.IRI): Promise<Assertion[]> {
    try {
      const startTime = Date.now();
      // Query database
      const result = await this.getDatabase()
        .select()
        .from(assertions)
        .where(eq(assertions.badgeClassId, badgeClassId as string));
      const duration = Date.now() - startTime;

      // Log query (assuming badgeClassId is not sensitive)
      queryLogger.logQuery(
        'SELECT Assertions by BadgeClass',
        [badgeClassId],
        duration,
        'sqlite'
      );

      // Convert database records to domain entities
      return result.map((record) => this.mapper.toDomain(record));
    } catch (error) {
      logger.error(
        'Error finding assertions by badge class in SQLite repository',
        {
          error: error instanceof Error ? error.message : String(error),
          badgeClassId,
        }
      );
      throw error;
    }
  }

  async findByRecipient(recipientId: string): Promise<Assertion[]> {
    try {
      const startTime = Date.now();
      // Query database using JSON extraction
      const result = await this.getDatabase()
        .select()
        .from(assertions)
        .where(
          sql`json_extract(${assertions.recipient}, '$.identity') = ${recipientId}`
        );
      const duration = Date.now() - startTime;

      // Log query (wrap recipientId as potentially sensitive)
      queryLogger.logQuery(
        'SELECT Assertions by Recipient',
        [SensitiveValue.from(recipientId)],
        duration,
        'sqlite'
      );

      // Convert database records to domain entities
      return result.map((record) => this.mapper.toDomain(record));
    } catch (error) {
      logger.error(
        'Error finding assertions by recipient in SQLite repository',
        {
          error: error instanceof Error ? error.message : String(error),
          recipientId,
        }
      );
      throw error;
    }
  }

  async update(
    id: Shared.IRI,
    assertion: Partial<Assertion>
  ): Promise<Assertion | null> {
    try {
      // Check if assertion exists
      const existingAssertion = await this.findById(id);
      if (!existingAssertion) {
        return null;
      }

      // Create a merged entity
      // Get the existing assertion as a plain object while preserving prototype information.
      // Preserving the prototype ensures that the merged entity retains the behavior and methods
      // of the original Assertion class. This is critical for maintaining the integrity of the domain model.
      // The merge order is also important: properties from the `assertion` object will overwrite those
      // in `existingData`. This allows updates to take precedence while retaining any unchanged properties
      // from the existing assertion.
      const existingData = Object.assign(
        Object.create(Object.getPrototypeOf(existingAssertion)),
        existingAssertion
      );

      // Create a merged assertion
      const mergedAssertion = Assertion.create({
        ...existingData,
        ...assertion,
      } as Partial<Assertion>);

      // Convert to database record
      const record = this.mapper.toPersistence(mergedAssertion);

      // Update in database
      const startTime = Date.now();
      const result = await this.getDatabase()
        .update(assertions)
        .set(record)
        .where(eq(assertions.id, id as string))
        .returning();
      const duration = Date.now() - startTime;

      // Log query (wrap the whole record as potentially sensitive)
      queryLogger.logQuery(
        'UPDATE Assertion',
        [id, SensitiveValue.from(record)], // Log ID and the updated data
        duration,
        'sqlite'
      );

      // Convert database record back to domain entity
      return this.mapper.toDomain(result[0]);
    } catch (error) {
      logger.error('Error updating assertion in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        id,
        assertion, // Log sensitive assertion data separately if needed for debugging
      });
      throw error;
    }
  }

  async delete(id: Shared.IRI): Promise<boolean> {
    try {
      // Delete from database
      const startTime = Date.now();
      const result = await this.getDatabase()
        .delete(assertions)
        .where(eq(assertions.id, id as string))
        .returning();
      const duration = Date.now() - startTime;

      // Log query (assuming id is not sensitive)
      queryLogger.logQuery('DELETE Assertion', [id], duration, 'sqlite');

      // Return true if something was deleted
      return result.length > 0;
    } catch (error) {
      logger.error('Error deleting assertion in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        id,
      });
      throw error;
    }
  }

  async revoke(id: Shared.IRI, reason?: string): Promise<Assertion | null> {
    try {
      // Note: Query logging for the underlying update operation
      // happens within the 'update' method called below.

      // Check if assertion exists
      const existingAssertion = await this.findById(id);
      if (!existingAssertion) {
        return null;
      }

      // Update assertion to revoke it
      return this.update(id, {
        revoked: true,
        revocationReason: reason,
      });
    } catch (error) {
      logger.error('Error revoking assertion in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        id,
        reason,
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
          reason: assertion.revocationReason || 'Assertion has been revoked',
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
        id,
      });
      throw error;
    }
  }
}
