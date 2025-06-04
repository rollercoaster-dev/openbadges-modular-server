/**
 * SQLite implementation of StatusListRepository
 */

import { eq, and, sql, lt, desc, asc } from 'drizzle-orm';
import { StatusList } from '@domains/status-list/status-list.entity';
import type { StatusListRepository } from '@domains/status-list/status-list.repository';
import {
  StatusPurpose,
  StatusListQueryParams,
  CredentialStatusEntryData,
  UpdateCredentialStatusParams,
  StatusUpdateResult,
} from '@domains/status-list/status-list.types';
import { statusLists, credentialStatusEntries } from '../schema';
import { SqliteStatusListMapper } from '../mappers/sqlite-status-list.mapper';
import { SqliteConnectionManager } from '../connection/sqlite-connection.manager';
import { BaseSqliteRepository } from './base-sqlite.repository';
import { logger } from '@utils/logging/logger.service';
import { BitstringUtils } from '@utils/bitstring/bitstring.utils';
import { createOrGenerateIRI } from '@utils/types/type-utils';
import { Shared } from 'openbadges-types';
import { SqliteEntityType } from '../types/sqlite-database.types';

/**
 * SQLite StatusList repository implementation
 */
export class SqliteStatusListRepository
  extends BaseSqliteRepository
  implements StatusListRepository
{
  private readonly mapper: SqliteStatusListMapper;

  constructor(connectionManager: SqliteConnectionManager) {
    super(connectionManager);
    this.mapper = new SqliteStatusListMapper();
  }

  protected getEntityType(): SqliteEntityType {
    return 'statusList';
  }

  protected getTableName(): string {
    return 'status_lists';
  }

  async create(statusList: StatusList): Promise<StatusList> {
    const context = this.createOperationContext('CREATE StatusList');

    // Convert domain entity to database record
    const record = this.mapper.toPersistence(statusList);

    return this.executeOperation(
      context,
      async () => {
        const db = this.getDatabase();
        const result = await db
          .insert(statusLists)
          .values(record as typeof statusLists.$inferInsert)
          .returning();
        return this.mapper.toDomain(result[0]);
      },
      1
    );
  }

  async findById(id: string): Promise<StatusList | null> {
    this.validateEntityId(id as Shared.IRI, 'findById');
    const context = this.createOperationContext(
      'SELECT StatusList by ID',
      id as Shared.IRI
    );

    const result = await this.executeQuery(
      context,
      async (db) => {
        return db
          .select()
          .from(statusLists)
          .where(eq(statusLists.id, id))
          .limit(1);
      },
      [id]
    );

    return result.length > 0 ? this.mapper.toDomain(result[0]) : null;
  }

  async findMany(params: StatusListQueryParams): Promise<StatusList[]> {
    const context = this.createOperationContext(
      'SELECT StatusLists with filters'
    );

    const result = await this.executeQuery(
      context,
      async (db) => {
        let query = db.select().from(statusLists);

        // Apply filters
        const conditions = [];
        if (params.issuerId) {
          conditions.push(eq(statusLists.issuerId, params.issuerId));
        }
        if (params.purpose) {
          conditions.push(eq(statusLists.purpose, params.purpose));
        }
        if (params.statusSize) {
          conditions.push(
            eq(statusLists.statusSize, params.statusSize.toString())
          );
        }
        if (params.hasCapacity) {
          conditions.push(
            lt(statusLists.usedEntries, statusLists.totalEntries)
          );
        }

        if (conditions.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          query = query.where(and(...conditions)) as any;
        }

        // Apply ordering
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        query = query.orderBy(desc(statusLists.createdAt)) as any;

        // Apply pagination
        if (params.limit) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          query = query.limit(params.limit) as any;
        }
        if (params.offset) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          query = query.offset(params.offset) as any;
        }

        return query;
      },
      [params]
    );

    return result.map((record) => this.mapper.toDomain(record));
  }

  async findAvailableStatusList(
    issuerId: string,
    purpose: StatusPurpose,
    statusSize: number
  ): Promise<StatusList | null> {
    const context = this.createOperationContext('SELECT Available StatusList');

    const result = await this.executeQuery(
      context,
      async (db) => {
        return db
          .select()
          .from(statusLists)
          .where(
            and(
              eq(statusLists.issuerId, issuerId),
              eq(statusLists.purpose, purpose),
              eq(statusLists.statusSize, statusSize.toString()),
              lt(statusLists.usedEntries, statusLists.totalEntries)
            )
          )
          .orderBy(asc(statusLists.usedEntries))
          .limit(1);
      },
      [issuerId, purpose, statusSize]
    );

    return result.length > 0 ? this.mapper.toDomain(result[0]) : null;
  }

  async update(statusList: StatusList): Promise<StatusList> {
    const context = this.createOperationContext(
      'UPDATE StatusList',
      statusList.id as Shared.IRI
    );

    // Convert domain entity to database record
    const record = this.mapper.toPersistence(statusList);

    // Remove id from update data
    const { id: _id, ...updateData } = record;

    return this.executeOperation(
      context,
      async () => {
        const db = this.getDatabase();
        const result = await db
          .update(statusLists)
          .set(updateData as Partial<typeof statusLists.$inferInsert>)
          .where(eq(statusLists.id, statusList.id))
          .returning();

        if (result.length === 0) {
          throw new Error(`StatusList with id ${statusList.id} not found`);
        }

        return this.mapper.toDomain(result[0]);
      },
      1
    );
  }

  async delete(id: string): Promise<boolean> {
    this.validateEntityId(id as Shared.IRI, 'delete');
    const context = this.createOperationContext(
      'DELETE StatusList',
      id as Shared.IRI
    );

    return this.executeOperation(
      context,
      async () => {
        const db = this.getDatabase();
        const result = await db
          .delete(statusLists)
          .where(eq(statusLists.id, id))
          .returning({ id: statusLists.id });

        return result.length > 0;
      },
      1
    );
  }

  async createStatusEntry(
    entry: Omit<CredentialStatusEntryData, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<CredentialStatusEntryData> {
    const context = this.createOperationContext('CREATE CredentialStatusEntry');

    const now = new Date();
    const entryWithDefaults = {
      id: createOrGenerateIRI(),
      ...entry,
      createdAt: now,
      updatedAt: now,
    };

    return this.executeOperation(
      context,
      async () => {
        const db = this.getDatabase();
        const record = this.mapper.statusEntryToPersistence(entryWithDefaults);
        const result = await db
          .insert(credentialStatusEntries)
          .values(record as typeof credentialStatusEntries.$inferInsert)
          .returning();
        return this.mapper.statusEntryToDomain(result[0]);
      },
      1
    );
  }

  async findStatusEntry(
    credentialId: string,
    purpose: StatusPurpose
  ): Promise<CredentialStatusEntryData | null> {
    const context = this.createOperationContext('SELECT CredentialStatusEntry');

    const result = await this.executeQuery(
      context,
      async (db) => {
        return db
          .select()
          .from(credentialStatusEntries)
          .where(
            and(
              eq(credentialStatusEntries.credentialId, credentialId),
              eq(credentialStatusEntries.purpose, purpose)
            )
          )
          .limit(1);
      },
      [credentialId, purpose]
    );

    return result.length > 0
      ? this.mapper.statusEntryToDomain(result[0])
      : null;
  }

  async findStatusEntriesByList(
    statusListId: string
  ): Promise<CredentialStatusEntryData[]> {
    const context = this.createOperationContext(
      'SELECT CredentialStatusEntries by StatusList'
    );

    const result = await this.executeQuery(
      context,
      async (db) => {
        return db
          .select()
          .from(credentialStatusEntries)
          .where(eq(credentialStatusEntries.statusListId, statusListId))
          .orderBy(asc(credentialStatusEntries.statusListIndex));
      },
      [statusListId]
    );

    return result.map((record) => this.mapper.statusEntryToDomain(record));
  }

  async updateStatusEntry(
    entry: CredentialStatusEntryData
  ): Promise<CredentialStatusEntryData> {
    const context = this.createOperationContext(
      'UPDATE CredentialStatusEntry',
      entry.id as Shared.IRI
    );

    const record = this.mapper.statusEntryToPersistence({
      ...entry,
      updatedAt: new Date(),
    });

    // Remove id from update data
    const { id: _id, ...updateData } = record;

    return this.executeOperation(
      context,
      async () => {
        const db = this.getDatabase();
        const result = await db
          .update(credentialStatusEntries)
          .set(
            updateData as Partial<typeof credentialStatusEntries.$inferInsert>
          )
          .where(eq(credentialStatusEntries.id, entry.id as Shared.IRI))
          .returning();

        if (result.length === 0) {
          throw new Error(
            `CredentialStatusEntry with id ${entry.id} not found`
          );
        }

        return this.mapper.statusEntryToDomain(result[0]);
      },
      1
    );
  }

  async updateCredentialStatus(
    params: UpdateCredentialStatusParams
  ): Promise<StatusUpdateResult> {
    const context = this.createOperationContext('UPDATE Credential Status');

    try {
      return await this.executeOperation(
        context,
        async () => {
          const db = this.getDatabase();
          // Use transaction for atomic update
          return await db.transaction(async (_tx) => {
            // Find the credential's status entry
            const statusEntry = await this.findStatusEntry(
              params.credentialId,
              params.purpose
            );
            if (!statusEntry) {
              throw new Error(
                `No status entry found for credential ${params.credentialId} with purpose ${params.purpose}`
              );
            }

            // Find the status list
            const statusList = await this.findById(statusEntry.statusListId);
            if (!statusList) {
              throw new Error(
                `Status list ${statusEntry.statusListId} not found`
              );
            }

            // Update the bitstring
            const bitstring = BitstringUtils.decodeBitstring(
              statusList.encodedList
            );
            const updatedBitstring = BitstringUtils.setStatusAtIndex(
              bitstring,
              statusEntry.statusListIndex,
              params.status,
              statusList.statusSize
            );
            const encodedList =
              BitstringUtils.encodeBitstring(updatedBitstring);

            // Update status list
            statusList.updateEncodedList(encodedList);
            await this.update(statusList);

            // Update status entry
            const updatedEntry = await this.updateStatusEntry({
              ...statusEntry,
              currentStatus: params.status,
              statusReason: params.reason,
              updatedAt: new Date(),
            });

            return {
              success: true,
              statusEntry: updatedEntry,
            };
          });
        },
        1
      );
    } catch (error) {
      logger.error('Failed to update credential status', {
        error: error instanceof Error ? error.message : String(error),
        params,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async deleteStatusEntry(id: string): Promise<boolean> {
    this.validateEntityId(id as Shared.IRI, 'deleteStatusEntry');
    const context = this.createOperationContext(
      'DELETE CredentialStatusEntry',
      id as Shared.IRI
    );

    return this.executeOperation(
      context,
      async () => {
        const db = this.getDatabase();
        const result = await db
          .delete(credentialStatusEntries)
          .where(eq(credentialStatusEntries.id, id as Shared.IRI))
          .returning({ id: credentialStatusEntries.id });

        return result.length > 0;
      },
      1
    );
  }

  async getUsedEntriesCount(statusListId: string): Promise<number> {
    const context = this.createOperationContext('COUNT Used Entries');

    const result = await this.executeQuery(
      context,
      async (db) => {
        return db
          .select({ count: sql<number>`count(*)` })
          .from(credentialStatusEntries)
          .where(eq(credentialStatusEntries.statusListId, statusListId));
      },
      [statusListId]
    );

    return result[0]?.count || 0;
  }

  async findByIssuer(issuerId: string): Promise<StatusList[]> {
    const context = this.createOperationContext('SELECT StatusLists by Issuer');

    const result = await this.executeQuery(
      context,
      async (db) => {
        return db
          .select()
          .from(statusLists)
          .where(eq(statusLists.issuerId, issuerId))
          .orderBy(desc(statusLists.createdAt));
      },
      [issuerId]
    );

    return result.map((record) => this.mapper.toDomain(record));
  }

  async findByPurpose(purpose: StatusPurpose): Promise<StatusList[]> {
    const context = this.createOperationContext(
      'SELECT StatusLists by Purpose'
    );

    const result = await this.executeQuery(
      context,
      async (db) => {
        return db
          .select()
          .from(statusLists)
          .where(eq(statusLists.purpose, purpose))
          .orderBy(desc(statusLists.createdAt));
      },
      [purpose]
    );

    return result.map((record) => this.mapper.toDomain(record));
  }

  async hasStatusEntry(
    credentialId: string,
    purpose: StatusPurpose
  ): Promise<boolean> {
    const context = this.createOperationContext('CHECK StatusEntry Exists');

    const result = await this.executeQuery(
      context,
      async (db) => {
        return db
          .select({ count: sql<number>`count(*)` })
          .from(credentialStatusEntries)
          .where(
            and(
              eq(credentialStatusEntries.credentialId, credentialId),
              eq(credentialStatusEntries.purpose, purpose)
            )
          );
      },
      [credentialId, purpose]
    );

    return (result[0]?.count || 0) > 0;
  }

  async getStatusListStats(statusListId: string): Promise<{
    totalEntries: number;
    usedEntries: number;
    availableEntries: number;
    utilizationPercent: number;
  }> {
    const statusList = await this.findById(statusListId);
    if (!statusList) {
      throw new Error(`Status list ${statusListId} not found`);
    }

    const usedEntries = await this.getUsedEntriesCount(statusListId);
    const totalEntries = statusList.totalEntries;
    const availableEntries = totalEntries - usedEntries;
    const utilizationPercent = (usedEntries / totalEntries) * 100;

    return {
      totalEntries,
      usedEntries,
      availableEntries,
      utilizationPercent,
    };
  }

  async findCredentialsNeedingStatus(
    issuerId: string,
    purpose: StatusPurpose,
    limit: number = 100
  ): Promise<string[]> {
    const context = this.createOperationContext(
      'SELECT Credentials Needing Status'
    );

    // This would need to join with assertions table to find credentials
    // without status entries for the given purpose
    // For now, return empty array as placeholder
    await this.executeQuery(
      context,
      async (_db) => {
        return [];
      },
      [issuerId, purpose, limit]
    );

    return [];
  }
}
