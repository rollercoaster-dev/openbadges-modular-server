/**
 * SQLite implementation of the Assertion repository
 *
 * This class implements the AssertionRepository interface using SQLite
 * and the Data Mapper pattern.
 */

import { eq, sql, inArray } from 'drizzle-orm';
import { Assertion } from '@domains/assertion/assertion.entity';
import type { AssertionRepository } from '@domains/assertion/assertion.repository';
import { assertions } from '../schema';
import { SqliteAssertionMapper } from '../mappers/sqlite-assertion.mapper';
import { Shared } from 'openbadges-types';
import { SqliteConnectionManager } from '../connection/sqlite-connection.manager';
import { BaseSqliteRepository } from './base-sqlite.repository';
import { SqlitePaginationParams } from '../types/sqlite-database.types';
import { SensitiveValue } from '@rollercoaster-dev/rd-logger'; // Correctly placed import
import { convertUuid } from '@infrastructure/database/utils/type-conversion';

export class SqliteAssertionRepository
  extends BaseSqliteRepository
  implements AssertionRepository
{
  private mapper: SqliteAssertionMapper;

  constructor(connectionManager: SqliteConnectionManager) {
    super(connectionManager);
    this.mapper = new SqliteAssertionMapper();
  }

  protected getEntityType(): 'assertion' {
    return 'assertion';
  }

  protected getTableName(): string {
    return 'assertions';
  }

  /**
   * Gets the mapper instance for external access
   */
  getMapper(): SqliteAssertionMapper {
    return this.mapper;
  }

  async create(assertion: Omit<Assertion, 'id'>): Promise<Assertion> {
    const context = this.createOperationContext('INSERT Assertion');

    return this.executeTransaction(context, async (tx) => {
      const assertionWithId = Assertion.create(assertion);
      const record = this.mapper.toPersistence(assertionWithId);

      const insertResult = await tx
        .insert(assertions)
        .values(record)
        .returning();

      return this.mapper.toDomain(insertResult[0]);
    });
  }

  /**
   * Finds all assertions with optional pagination
   * @param pagination Optional pagination parameters. If not provided, uses default pagination to prevent unbounded queries.
   * @returns Promise resolving to array of Assertion entities
   */
  async findAll(pagination?: SqlitePaginationParams): Promise<Assertion[]> {
    const context = this.createOperationContext('SELECT All Assertions');

    const result = await this.executeQuery(context, async (db) => {
      const { limit, offset } = this.validatePagination(pagination);
      return db.select().from(assertions).limit(limit).offset(offset);
    });

    return result.map((record: typeof assertions.$inferSelect) =>
      this.mapper.toDomain(record)
    );
  }

  /**
   * Finds all assertions without pagination (for backward compatibility and specific use cases)
   * @deprecated Use findAll() with pagination parameters instead
   * @returns Promise resolving to array of all Assertion entities
   */
  async findAllUnbounded(): Promise<Assertion[]> {
    const context = this.createOperationContext(
      'SELECT All Assertions (Unbounded)'
    );

    const result = await this.executeQuery(context, async (db) => {
      return db.select().from(assertions);
    });

    return result.map((record) => this.mapper.toDomain(record));
  }

  async findById(id: Shared.IRI): Promise<Assertion | null> {
    this.validateEntityId(id, 'find assertion by ID');
    const context = this.createOperationContext('SELECT Assertion by ID', id);

    const result = await this.executeSingleQuery(
      context,
      async (db) => {
        // Convert URN to UUID for SQLite query
        const dbId = convertUuid(id as string, 'sqlite', 'to');
        return db.select().from(assertions).where(eq(assertions.id, dbId));
      },
      [id]
    );

    return result
      ? this.mapper.toDomain(result as typeof assertions.$inferSelect)
      : null;
  }

  async findByBadgeClass(badgeClassId: Shared.IRI): Promise<Assertion[]> {
    this.validateEntityId(badgeClassId, 'find assertions by badge class');
    const context = this.createOperationContext(
      'SELECT Assertions by BadgeClass',
      badgeClassId
    );

    const result = await this.executeQuery(
      context,
      async (db) => {
        // Convert URN to UUID for SQLite query
        const dbBadgeClassId = convertUuid(
          badgeClassId as string,
          'sqlite',
          'to'
        );
        return db
          .select()
          .from(assertions)
          .where(eq(assertions.badgeClassId, dbBadgeClassId));
      },
      [badgeClassId]
    );

    return result.map((record: typeof assertions.$inferSelect) =>
      this.mapper.toDomain(record)
    );
  }

  async findByRecipient(recipientId: Shared.IRI): Promise<Assertion[]> {
    const context = this.createOperationContext(
      'SELECT Assertions by Recipient',
      recipientId
    );

    const result = await this.executeQuery(
      context,
      async (db) => {
        // Note: Drizzle's sql template literal provides automatic parameter binding
        // The ${recipientId} is safely bound as a parameter, not concatenated as raw SQL
        return db
          .select()
          .from(assertions)
          .where(
            sql`json_extract(${assertions.recipient}, '$.identity') = ${recipientId}`
          );
      },
      [new SensitiveValue(recipientId)] // Wrap recipientId in SensitiveValue for logging
    );

    return result.map((record: typeof assertions.$inferSelect) =>
      this.mapper.toDomain(record)
    );
  }

  async update(
    id: Shared.IRI,
    assertion: Partial<Assertion>
  ): Promise<Assertion | null> {
    const context = this.createOperationContext('UPDATE Assertion', id);

    return this.executeTransaction(context, async (tx) => {
      // Perform SELECT and UPDATE within the same transaction to prevent TOCTOU race condition
      // Convert URN to UUID for SQLite query
      const dbId = convertUuid(id as string, 'sqlite', 'to');
      const existing = await tx
        .select()
        .from(assertions)
        .where(eq(assertions.id, dbId))
        .limit(1);

      if (existing.length === 0) {
        return null;
      }

      // Convert database record to domain entity for merging
      const existingAssertion = this.mapper.toDomain(existing[0]);

      const mergedAssertion = Assertion.create({
        ...existingAssertion,
        ...assertion,
      } as Partial<Assertion>);

      const {
        id: _ignore,
        createdAt: _ca,
        ...updatable
      } = this.mapper.toPersistence(mergedAssertion);

      const updated = await tx
        .update(assertions)
        .set(updatable)
        .where(eq(assertions.id, dbId))
        .returning();

      return this.mapper.toDomain(updated[0]);
    });
  }

  async delete(id: Shared.IRI): Promise<boolean> {
    const context = this.createOperationContext('DELETE Assertion', id);

    return this.executeDelete(context, async (db) => {
      // Convert URN to UUID for SQLite query
      const dbId = convertUuid(id as string, 'sqlite', 'to');
      return db.delete(assertions).where(eq(assertions.id, dbId)).returning();
    });
  }

  async revoke(id: Shared.IRI, reason?: string): Promise<Assertion | null> {
    const context = this.createOperationContext('REVOKE Assertion', id);

    return this.executeTransaction(context, async () => {
      const existingAssertion = await this.findById(id);
      if (!existingAssertion) {
        return null;
      }

      return this.update(id, {
        revoked: true,
        revocationReason: reason,
      });
    });
  }

  async verify(id: Shared.IRI): Promise<{ isValid: boolean; reason?: string }> {
    const context = this.createOperationContext('VERIFY Assertion', id);

    try {
      const assertion = await this.findById(id);

      if (!assertion) {
        return { isValid: false, reason: 'Assertion not found' };
      }

      if (assertion.revoked) {
        return {
          isValid: false,
          reason: assertion.revocationReason || 'Assertion has been revoked',
        };
      }

      if (assertion.expires) {
        const expiryDate = new Date(assertion.expires);
        const now = new Date();
        if (expiryDate < now) {
          return { isValid: false, reason: 'Assertion has expired' };
        }
      }

      return { isValid: true };
    } catch (error) {
      this.logError(context, error);
      throw error;
    }
  }

  async createBatch(assertionList: Omit<Assertion, 'id'>[]): Promise<
    Array<{
      success: boolean;
      assertion?: Assertion;
      error?: string;
    }>
  > {
    if (assertionList.length === 0) {
      return [];
    }

    const context = this.createOperationContext('BATCH CREATE Assertions');

    return this.executeTransaction(context, async (tx) => {
      const results: Array<{
        success: boolean;
        assertion?: Assertion;
        error?: string;
      }> = [];

      // Process each assertion individually within the transaction
      for (const assertionData of assertionList) {
        try {
          const assertionWithId = Assertion.create(assertionData);
          const record = this.mapper.toPersistence(assertionWithId);

          const insertResult = await tx
            .insert(assertions)
            .values(record)
            .returning();

          const createdAssertion = this.mapper.toDomain(insertResult[0]);
          results.push({
            success: true,
            assertion: createdAssertion,
          });
        } catch (error) {
          results.push({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return results;
    });
  }

  async findByIds(ids: Shared.IRI[]): Promise<(Assertion | null)[]> {
    if (ids.length === 0) {
      return [];
    }

    const context = this.createOperationContext('SELECT Assertions by IDs');

    const result = await this.executeQuery(
      context,
      async (db) => {
        const stringIds = ids.map((id) => id as string);
        return db
          .select()
          .from(assertions)
          .where(inArray(assertions.id, stringIds));
      },
      ids
    );

    // Create a map for quick lookup
    const assertionMap = new Map<string, Assertion>();
    result.forEach((record) => {
      const domainEntity = this.mapper.toDomain(record);
      assertionMap.set(domainEntity.id, domainEntity);
    });

    // Return results in the same order as input IDs
    return ids.map((id) => assertionMap.get(id) || null);
  }

  async updateStatusBatch(
    updates: Array<{
      id: Shared.IRI;
      status: 'revoked' | 'suspended' | 'active';
      reason?: string;
    }>
  ): Promise<
    Array<{
      id: Shared.IRI;
      success: boolean;
      assertion?: Assertion;
      error?: string;
    }>
  > {
    if (updates.length === 0) {
      return [];
    }

    const context = this.createOperationContext(
      'BATCH UPDATE Assertion Status'
    );

    return this.executeTransaction(context, async () => {
      const results: Array<{
        id: Shared.IRI;
        success: boolean;
        assertion?: Assertion;
        error?: string;
      }> = [];

      // Process each update individually within the transaction
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
    });
  }
}
