/**
 * PostgreSQL StatusList Repository
 * 
 * This repository handles database operations for StatusList entities using PostgreSQL.
 */

import { eq, and } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { Shared } from 'openbadges-types';
import { createOrGenerateIRI } from '../../../../../utils/types/iri-utils';
import { logger } from '../../../../../utils/logging/logger.service';
import { 
  StatusList, 
  StatusListRepository, 
  FindStatusListOptions,
  StatusPurpose
} from '../../../../../core/types/status-list.types';
import { statusLists } from '../schema';

/**
 * PostgreSQL implementation of StatusListRepository
 */
export class PostgresStatusListRepository implements StatusListRepository {
  private db: ReturnType<typeof drizzle>;

  constructor(client: postgres.Sql) {
    this.db = drizzle(client);
  }

  /**
   * Creates a new status list
   */
  async create(statusListData: Omit<StatusList, 'id' | 'createdAt' | 'updatedAt'>): Promise<StatusList> {
    try {
      const insertData = {
        issuerId: statusListData.issuerId,
        purpose: statusListData.purpose,
        bitstring: statusListData.bitstring,
        size: statusListData.size
      };

      const result = await this.db.insert(statusLists).values(insertData).returning();

      if (result.length === 0) {
        throw new Error('Failed to create status list: No rows returned from insert operation');
      }

      const row = result[0];

      const statusList: StatusList = {
        id: row.id,
        issuerId: row.issuerId,
        purpose: row.purpose as StatusPurpose,
        bitstring: row.bitstring,
        size: row.size,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      };

      logger.debug('Status list created in PostgreSQL', { statusListId: row.id });
      return statusList;
    } catch (error) {
      logger.error('Failed to create status list in PostgreSQL', {
        error: error instanceof Error ? error.message : String(error),
        issuerId: statusListData.issuerId,
        purpose: statusListData.purpose
      });
      throw new Error(`Failed to create status list: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Finds a status list by ID
   */
  async findById(id: Shared.IRI): Promise<StatusList | null> {
    try {
      const result = await this.db
        .select()
        .from(statusLists)
        .where(eq(statusLists.id, id))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const row = result[0];
      return this.mapRowToStatusList(row);
    } catch (error) {
      logger.error('Failed to find status list by ID in PostgreSQL', {
        error: error instanceof Error ? error.message : String(error),
        statusListId: id
      });
      throw new Error(`Failed to find status list: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Finds a status list by issuer and purpose
   */
  async findByIssuerAndPurpose(issuerId: Shared.IRI, purpose: StatusPurpose): Promise<StatusList | null> {
    try {
      const result = await this.db
        .select()
        .from(statusLists)
        .where(and(
          eq(statusLists.issuerId, issuerId),
          eq(statusLists.purpose, purpose)
        ))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const row = result[0];
      return this.mapRowToStatusList(row);
    } catch (error) {
      logger.error('Failed to find status list by issuer and purpose in PostgreSQL', {
        error: error instanceof Error ? error.message : String(error),
        issuerId,
        purpose
      });
      throw new Error(`Failed to find status list: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Finds all status lists with optional filtering
   */
  async findAll(options?: FindStatusListOptions): Promise<StatusList[]> {
    try {
      let query = this.db.select().from(statusLists);

      // Apply filters
      if (options?.issuerId) {
        query = query.where(eq(statusLists.issuerId, options.issuerId));
      }
      if (options?.purpose) {
        query = query.where(eq(statusLists.purpose, options.purpose));
      }

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset) {
        query = query.offset(options.offset);
      }

      const results = await query;
      return results.map(row => this.mapRowToStatusList(row));
    } catch (error) {
      logger.error('Failed to find all status lists in PostgreSQL', {
        error: error instanceof Error ? error.message : String(error),
        options
      });
      throw new Error(`Failed to find status lists: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Updates a status list
   */
  async update(id: Shared.IRI, updates: Partial<Omit<StatusList, 'id' | 'createdAt'>>): Promise<StatusList | null> {
    try {
      const updateData: any = {};

      if (updates.issuerId) updateData.issuerId = updates.issuerId;
      if (updates.purpose) updateData.purpose = updates.purpose;
      if (updates.bitstring) updateData.bitstring = updates.bitstring;
      if (updates.size) updateData.size = updates.size;
      if (updates.updatedAt) updateData.updatedAt = updates.updatedAt;

      const result = await this.db
        .update(statusLists)
        .set(updateData)
        .where(eq(statusLists.id, id))
        .returning();

      if (result.length === 0) {
        return null;
      }

      const row = result[0];
      return this.mapRowToStatusList(row);
    } catch (error) {
      logger.error('Failed to update status list in PostgreSQL', {
        error: error instanceof Error ? error.message : String(error),
        statusListId: id,
        updates
      });
      throw new Error(`Failed to update status list: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Deletes a status list
   */
  async delete(id: Shared.IRI): Promise<boolean> {
    try {
      const result = await this.db
        .delete(statusLists)
        .where(eq(statusLists.id, id))
        .returning();

      return result.length > 0;
    } catch (error) {
      logger.error('Failed to delete status list in PostgreSQL', {
        error: error instanceof Error ? error.message : String(error),
        statusListId: id
      });
      throw new Error(`Failed to delete status list: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Maps a database row to a StatusList entity
   */
  private mapRowToStatusList(row: any): StatusList {
    return {
      id: row.id,
      issuerId: row.issuerId,
      purpose: row.purpose as StatusPurpose,
      bitstring: row.bitstring,
      size: row.size,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }
}
