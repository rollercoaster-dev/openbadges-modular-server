/**
 * PostgreSQL implementation of StatusListRepository
 */

import { eq, and, sql, lt, desc, asc } from 'drizzle-orm';
import postgres from 'postgres';
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
import { PostgresStatusListMapper } from '../mappers/postgres-status-list.mapper';
import { BasePostgresRepository } from './base-postgres.repository';
import { PostgresEntityType } from '../types/postgres-database.types';
import { logger } from '@utils/logging/logger.service';
import { BitstringUtils } from '@utils/bitstring/bitstring.utils';
import { createOrGenerateIRI } from '@utils/types/type-utils';
import { convertUuid } from '@infrastructure/database/utils/type-conversion';
import { Shared } from 'openbadges-types';

/**
 * PostgreSQL StatusList repository implementation
 */
export class PostgresStatusListRepository
  extends BasePostgresRepository
  implements StatusListRepository
{
  private readonly mapper: PostgresStatusListMapper;

  constructor(client: postgres.Sql) {
    super(client);
    this.mapper = new PostgresStatusListMapper();
  }

  protected getEntityType(): PostgresEntityType {
    // 'StatusList' is not a valid PostgresEntityType. Assuming it should be 'statusList' based on context.
    return 'statusList' as PostgresEntityType;
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
        const result = await this.db
          .insert(statusLists)
          .values(record as typeof statusLists.$inferInsert)
          .returning();
        return this.mapper.toDomain(result[0]);
      },
      1
    );
  }

  async findById(id: Shared.IRI): Promise<StatusList | null> {
    this.validateEntityId(id, 'findById');
    const context = this.createOperationContext('SELECT StatusList by ID', id);

    return this.executeQuery(
      context,
      async (db) => {
        const result = await db
          .select()
          .from(statusLists)
          .where(eq(statusLists.id, id))
          .limit(1);

        return result.length > 0 ? [this.mapper.toDomain(result[0])] : [];
      },
      [id]
    ).then((results) => results[0] || null);
  }

  async findMany(params: StatusListQueryParams): Promise<StatusList[]> {
    const context = this.createOperationContext(
      'SELECT StatusLists with filters'
    );

    return this.executeQuery(
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
          conditions.push(eq(statusLists.statusSize, params.statusSize));
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

        const result = await query;
        return result.map((record) => this.mapper.toDomain(record));
      },
      [params]
    );
  }

  async findAvailableStatusList(
    issuerId: string,
    purpose: StatusPurpose,
    statusSize: number
  ): Promise<StatusList | null> {
    const context = this.createOperationContext('SELECT Available StatusList');

    // Convert issuer ID from URN format to UUID format for database query
    const dbIssuerId = convertUuid(issuerId, 'postgresql', 'to');

    return this.executeQuery(
      context,
      async (db) => {
        const result = await db
          .select()
          .from(statusLists)
          .where(
            and(
              eq(statusLists.issuerId, dbIssuerId),
              eq(statusLists.purpose, purpose),
              eq(statusLists.statusSize, statusSize),
              lt(statusLists.usedEntries, statusLists.totalEntries)
            )
          )
          .orderBy(asc(statusLists.usedEntries))
          .limit(1);

        return result.length > 0 ? [this.mapper.toDomain(result[0])] : [];
      },
      [dbIssuerId, purpose, statusSize]
    ).then((results) => results[0] || null);
  }

  async update(statusList: StatusList): Promise<StatusList> {
    const context = this.createOperationContext(
      'UPDATE StatusList',
      statusList.id as Shared.IRI
    );

    // Convert domain entity to database record
    const record = this.mapper.toPersistence(statusList);

    return this.executeOperation(
      context,
      async () => {
        const result = await this.db
          .update(statusLists)
          .set(record as Partial<typeof statusLists.$inferInsert>)
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

  async delete(id: Shared.IRI): Promise<boolean> {
    this.validateEntityId(id, 'delete');
    const context = this.createOperationContext('DELETE StatusList', id);

    return this.executeOperation(
      context,
      async () => {
        const result = await this.db
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
        const record = this.mapper.statusEntryToPersistence(entryWithDefaults);
        const result = await this.db
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

    // Convert credential ID from URN format to UUID format for database query
    const dbCredentialId = convertUuid(credentialId, 'postgresql', 'to');

    return this.executeQuery(
      context,
      async (db) => {
        const result = await db
          .select()
          .from(credentialStatusEntries)
          .where(
            and(
              eq(credentialStatusEntries.credentialId, dbCredentialId),
              eq(credentialStatusEntries.purpose, purpose)
            )
          )
          .limit(1);

        return result.length > 0
          ? [this.mapper.statusEntryToDomain(result[0])]
          : [];
      },
      [dbCredentialId, purpose]
    ).then((results) => results[0] || null);
  }

  async findStatusEntriesByList(
    statusListId: string
  ): Promise<CredentialStatusEntryData[]> {
    const context = this.createOperationContext(
      'SELECT CredentialStatusEntries by StatusList'
    );

    return this.executeQuery(
      context,
      async (db) => {
        const result = await db
          .select()
          .from(credentialStatusEntries)
          .where(eq(credentialStatusEntries.statusListId, statusListId))
          .orderBy(asc(credentialStatusEntries.statusListIndex));

        return result.map((record) => this.mapper.statusEntryToDomain(record));
      },
      [statusListId]
    );
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

    return this.executeOperation(
      context,
      async () => {
        const result = await this.db
          .update(credentialStatusEntries)
          .set(record as Partial<typeof credentialStatusEntries.$inferInsert>)
          .where(eq(credentialStatusEntries.id, entry.id))
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
          // Use transaction for atomic update
          return await this.db.transaction(async (_tx) => {
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

            // Find the status list (convert URN to UUID format for database query)
            const statusListId = convertUuid(
              statusEntry.statusListId,
              'postgresql',
              'to'
            );
            const statusList = await this.findById(statusListId as Shared.IRI);
            if (!statusList) {
              throw new Error(
                `Status list ${statusEntry.statusListId} not found`
              );
            }

            // Update the bitstring
            const bitstring = await BitstringUtils.decodeBitstring(
              statusList.encodedList
            );
            const updatedBitstring = BitstringUtils.setStatusAtIndex(
              bitstring,
              statusEntry.statusListIndex,
              params.status,
              statusList.statusSize
            );
            const encodedList = await BitstringUtils.encodeBitstring(
              updatedBitstring
            );

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

  async deleteStatusEntry(id: Shared.IRI): Promise<boolean> {
    this.validateEntityId(id, 'deleteStatusEntry');
    const context = this.createOperationContext(
      'DELETE CredentialStatusEntry',
      id
    );

    return this.executeOperation(
      context,
      async () => {
        const result = await this.db
          .delete(credentialStatusEntries)
          .where(eq(credentialStatusEntries.id, id))
          .returning({ id: credentialStatusEntries.id });

        return result.length > 0;
      },
      1
    );
  }

  async getUsedEntriesCount(statusListId: string): Promise<number> {
    const context = this.createOperationContext('COUNT Used Entries');

    // Convert status list ID from URN format to UUID format for database query
    const dbStatusListId = convertUuid(statusListId, 'postgresql', 'to');

    return this.executeQuery(
      context,
      async (db) => {
        const result = await db
          .select({ count: sql<number>`count(*)` })
          .from(credentialStatusEntries)
          .where(eq(credentialStatusEntries.statusListId, dbStatusListId));

        return [result[0]?.count || 0];
      },
      [dbStatusListId]
    ).then((results) => results[0]);
  }

  async findByIssuer(issuerId: string): Promise<StatusList[]> {
    const context = this.createOperationContext('SELECT StatusLists by Issuer');

    // Convert issuer ID from URN format to UUID format for database query
    const dbIssuerId = convertUuid(issuerId, 'postgresql', 'to');

    return this.executeQuery(
      context,
      async (db) => {
        const result = await db
          .select()
          .from(statusLists)
          .where(eq(statusLists.issuerId, dbIssuerId))
          .orderBy(desc(statusLists.createdAt));

        return result.map((record) => this.mapper.toDomain(record));
      },
      [dbIssuerId]
    );
  }

  async findByPurpose(purpose: StatusPurpose): Promise<StatusList[]> {
    const context = this.createOperationContext(
      'SELECT StatusLists by Purpose'
    );

    return this.executeQuery(
      context,
      async (db) => {
        const result = await db
          .select()
          .from(statusLists)
          .where(eq(statusLists.purpose, purpose))
          .orderBy(desc(statusLists.createdAt));

        return result.map((record) => this.mapper.toDomain(record));
      },
      [purpose]
    );
  }

  async hasStatusEntry(
    credentialId: string,
    purpose: StatusPurpose
  ): Promise<boolean> {
    const context = this.createOperationContext('CHECK StatusEntry Exists');

    // Convert credential ID from URN format to UUID format for database query
    const dbCredentialId = convertUuid(credentialId, 'postgresql', 'to');

    return this.executeQuery(
      context,
      async (db) => {
        const result = await db
          .select({ count: sql<number>`count(*)` })
          .from(credentialStatusEntries)
          .where(
            and(
              eq(credentialStatusEntries.credentialId, dbCredentialId),
              eq(credentialStatusEntries.purpose, purpose)
            )
          );

        return [(result[0]?.count || 0) > 0];
      },
      [dbCredentialId, purpose]
    ).then((results) => results[0]);
  }

  async getStatusListStats(statusListId: string): Promise<{
    totalEntries: number;
    usedEntries: number;
    availableEntries: number;
    utilizationPercent: number;
  }> {
    const statusList = await this.findById(statusListId as Shared.IRI);
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

    return this.executeQuery(
      context,
      async () => {
        // This would need to join with assertions table to find credentials
        // without status entries for the given purpose
        // For now, return empty array as placeholder
        return [];
      },
      [issuerId, purpose, limit]
    );
  }
}
