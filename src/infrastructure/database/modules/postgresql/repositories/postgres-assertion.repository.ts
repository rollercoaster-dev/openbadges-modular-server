/**
 * PostgreSQL implementation of the Assertion repository
 *
 * This class implements the AssertionRepository interface using PostgreSQL
 * and the Data Mapper pattern with the base repository class.
 */

import { eq, sql, inArray } from 'drizzle-orm';
import postgres from 'postgres';
import { Assertion } from '@domains/assertion/assertion.entity';
import type { AssertionRepository } from '@domains/assertion/assertion.repository';
import { assertions } from '../schema';
import { PostgresAssertionMapper } from '../mappers/postgres-assertion.mapper';
import { InferSelectModel } from 'drizzle-orm';
import { Shared } from 'openbadges-types';
import { SensitiveValue } from '@rollercoaster-dev/rd-logger';
import { BasePostgresRepository } from './base-postgres.repository';
import { PostgresEntityType } from '../types/postgres-database.types';
import { convertUuid } from '@infrastructure/database/utils/type-conversion';
import { batchInsert, batchUpdate } from '@infrastructure/database/utils/batch-operations';

// Define the type for the database record using Drizzle's InferSelectModel
type PostgresAssertionRecord = InferSelectModel<typeof assertions>;

export class PostgresAssertionRepository
  extends BasePostgresRepository
  implements AssertionRepository
{
  private mapper: PostgresAssertionMapper;

  constructor(client: postgres.Sql) {
    super(client);
    this.mapper = new PostgresAssertionMapper();
  }

  /**
   * Returns the entity type for this repository
   */
  protected getEntityType(): PostgresEntityType {
    return 'assertion';
  }

  /**
   * Returns the table name for this repository
   */
  protected getTableName(): string {
    return 'assertions';
  }

  async create(assertion: Omit<Assertion, 'id'>): Promise<Assertion> {
    const context = this.createOperationContext('CREATE Assertion');

    // Convert domain entity to database record
    const record = this.mapper.toPersistence(assertion);

    return this.executeOperation(
      context,
      async () => {
        const result = await this.db
          .insert(assertions)
          .values(record)
          .returning();
        return this.mapper.toDomain(result[0]);
      },
      1
    );
  }

  async findAll(): Promise<Assertion[]> {
    const context = this.createOperationContext('SELECT All Assertions');

    // Log warning for unbounded query
    this.logUnboundedQueryWarning('findAll');

    return this.executeQuery(context, async (db) => {
      const result = await db.select().from(assertions);
      return result.map((record) => this.mapper.toDomain(record));
    });
  }

  async findById(id: Shared.IRI): Promise<Assertion | null> {
    this.validateEntityId(id, 'findById');
    const context = this.createOperationContext('SELECT Assertion by ID', id);

    return this.executeSingleQuery(
      context,
      async (db) => {
        // Convert URN to UUID for PostgreSQL query
        const dbId = convertUuid(id as string, 'postgresql', 'to');
        const result = await db
          .select()
          .from(assertions)
          .where(eq(assertions.id, dbId));
        return result.map((record) => this.mapper.toDomain(record));
      },
      [id]
    );
  }

  async findByBadgeClass(badgeClassId: Shared.IRI): Promise<Assertion[]> {
    this.validateEntityId(badgeClassId, 'findByBadgeClass');
    const context = this.createOperationContext(
      'SELECT Assertions by BadgeClass',
      badgeClassId
    );

    return this.executeQuery(
      context,
      async (db) => {
        // Convert URN to UUID for PostgreSQL query
        const dbBadgeClassId = convertUuid(
          badgeClassId as string,
          'postgresql',
          'to'
        );
        const result = await db
          .select()
          .from(assertions)
          .where(eq(assertions.badgeClassId, dbBadgeClassId));
        return result.map((record) => this.mapper.toDomain(record));
      },
      [badgeClassId]
    );
  }

  async findByRecipient(recipientId: string): Promise<Assertion[]> {
    if (
      !recipientId ||
      typeof recipientId !== 'string' ||
      recipientId.trim().length === 0
    ) {
      throw new Error(
        `Invalid recipient ID provided for findByRecipient: ${recipientId}`
      );
    }

    const context = this.createOperationContext(
      'SELECT Assertions by Recipient'
    );

    return this.executeQuery(
      context,
      async (db) => {
        // Handle different recipient identity formats
        // The recipient field is a JSON object with either 'id' or 'identity' field
        const result = await db
          .select()
          .from(assertions)
          .where(
            sql`(${assertions.recipient}->>'identity' = ${recipientId}) OR (${assertions.recipient}->>'id' = ${recipientId})`
          );
        return result.map((record) => this.mapper.toDomain(record));
      },
      [SensitiveValue.from(recipientId)]
    );
  }

  async update(
    id: Shared.IRI,
    assertion: Partial<Assertion>
  ): Promise<Assertion | null> {
    this.validateEntityId(id, 'update');
    const context = this.createOperationContext('UPDATE Assertion', id);

    // Check if assertion exists
    const existingAssertion = await this.findById(id);
    if (!existingAssertion) {
      return null;
    }

    // Create a merged entity
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

    return this.executeUpdate(
      context,
      async (db) => {
        // Convert URN to UUID for PostgreSQL query
        const dbId = convertUuid(id as string, 'postgresql', 'to');
        const result = await db
          .update(assertions)
          .set(record)
          .where(eq(assertions.id, dbId))
          .returning();
        return result.map((record) => this.mapper.toDomain(record));
      },
      [id, SensitiveValue.from(record)]
    );
  }

  async delete(id: Shared.IRI): Promise<boolean> {
    this.validateEntityId(id, 'delete');
    const context = this.createOperationContext('DELETE Assertion', id);

    return this.executeDelete(context, async (db) => {
      // Convert URN to UUID for PostgreSQL query
      const dbId = convertUuid(id as string, 'postgresql', 'to');
      return await db
        .delete(assertions)
        .where(eq(assertions.id, dbId))
        .returning();
    });
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
      revocationReason: reason,
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

    // All checks passed
    return { isValid: true };
  }

  async createBatch(assertionList: Omit<Assertion, 'id'>[]): Promise<Array<{
    success: boolean;
    assertion?: Assertion;
    error?: string;
  }>> {
    if (assertionList.length === 0) {
      return [];
    }

    const context = this.createOperationContext('BATCH CREATE Assertions');

    try {
      // Convert domain entities to database records
      const records = assertionList.map(assertion => this.mapper.toPersistence(assertion));

      // Use batch insert utility
      const results = await batchInsert(this.db, assertions as any, records, 'postgresql');

      // Convert results back to domain entities
      return results.map((result, index) => {
        try {
          if (result) {
            const domainEntity = this.mapper.toDomain(result);
            return {
              success: true,
              assertion: domainEntity,
            };
          } else {
            return {
              success: false,
              error: 'Failed to create assertion',
            };
          }
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      });
    } catch (error) {
      // If batch operation fails, return error for all items
      return assertionList.map(() => ({
        success: false,
        error: error instanceof Error ? error.message : 'Batch operation failed',
      }));
    }
  }

  async findByIds(ids: Shared.IRI[]): Promise<(Assertion | null)[]> {
    if (ids.length === 0) {
      return [];
    }

    const context = this.createOperationContext('SELECT Assertions by IDs');

    return this.executeQuery(
      context,
      async (db) => {
        // Convert URNs to UUIDs for PostgreSQL query
        const dbIds = ids.map(id => convertUuid(id as string, 'postgresql', 'to'));

        const result = await db
          .select()
          .from(assertions)
          .where(inArray(assertions.id, dbIds));

        // Create a map for quick lookup
        const assertionMap = new Map<string, Assertion>();
        result.forEach(record => {
          const domainEntity = this.mapper.toDomain(record);
          assertionMap.set(domainEntity.id, domainEntity);
        });

        // Return results in the same order as input IDs
        return ids.map(id => assertionMap.get(id) || null);
      },
      ids
    );
  }

  async updateStatusBatch(updates: Array<{
    id: Shared.IRI;
    status: 'revoked' | 'suspended' | 'active';
    reason?: string;
  }>): Promise<Array<{
    id: Shared.IRI;
    success: boolean;
    assertion?: Assertion;
    error?: string;
  }>> {
    if (updates.length === 0) {
      return [];
    }

    const context = this.createOperationContext('BATCH UPDATE Assertion Status');

    const results: Array<{
      id: Shared.IRI;
      success: boolean;
      assertion?: Assertion;
      error?: string;
    }> = [];

    // Process each update individually for now
    // TODO: Optimize with a single query when possible
    for (const update of updates) {
      try {
        const existingAssertion = await this.findById(update.id);
        if (!existingAssertion) {
          results.push({
            id: update.id,
            success: false,
            error: 'Assertion not found',
          });
          continue;
        }

        // Prepare update data based on status
        const updateData: Partial<Assertion> = {};

        switch (update.status) {
          case 'revoked':
            updateData.revoked = true;
            updateData.revocationReason = update.reason || 'Revoked';
            break;
          case 'suspended':
            // For now, treat suspended as revoked with a specific reason
            updateData.revoked = true;
            updateData.revocationReason = update.reason || 'Suspended';
            break;
          case 'active':
            updateData.revoked = false;
            updateData.revocationReason = undefined;
            break;
        }

        const updatedAssertion = await this.update(update.id, updateData);
        if (updatedAssertion) {
          results.push({
            id: update.id,
            success: true,
            assertion: updatedAssertion,
          });
        } else {
          results.push({
            id: update.id,
            success: false,
            error: 'Failed to update assertion',
          });
        }
      } catch (error) {
        results.push({
          id: update.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }
}
