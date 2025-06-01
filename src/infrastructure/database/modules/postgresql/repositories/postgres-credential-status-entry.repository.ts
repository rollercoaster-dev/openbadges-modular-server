/**
 * PostgreSQL CredentialStatusEntry Repository
 * 
 * This repository handles database operations for CredentialStatusEntry entities using PostgreSQL.
 */

import { eq, max } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { Shared } from 'openbadges-types';
import { logger } from '../../../../../utils/logging/logger.service';
import { 
  CredentialStatusEntry, 
  CredentialStatusEntryRepository,
  CredentialStatus
} from '../../../../../core/types/status-list.types';
import { credentialStatusEntries } from '../schema';

/**
 * PostgreSQL implementation of CredentialStatusEntryRepository
 */
export class PostgresCredentialStatusEntryRepository implements CredentialStatusEntryRepository {
  private db: ReturnType<typeof drizzle>;

  constructor(client: postgres.Sql) {
    this.db = drizzle(client);
  }

  /**
   * Creates a new credential status entry
   */
  async create(entryData: Omit<CredentialStatusEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<CredentialStatusEntry> {
    try {
      const insertData = {
        credentialId: entryData.credentialId,
        statusListId: entryData.statusListId,
        statusListIndex: entryData.statusListIndex,
        status: entryData.status,
        reason: entryData.reason || null
      };

      const result = await this.db.insert(credentialStatusEntries).values(insertData).returning();
      const row = result[0];

      const entry: CredentialStatusEntry = {
        id: row.id,
        credentialId: row.credentialId,
        statusListId: row.statusListId,
        statusListIndex: row.statusListIndex,
        status: row.status as CredentialStatus,
        reason: row.reason || undefined,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      };

      logger.debug('Credential status entry created in PostgreSQL', { 
        entryId: row.id,
        credentialId: entryData.credentialId,
        statusListIndex: entryData.statusListIndex
      });
      return entry;
    } catch (error) {
      logger.error('Failed to create credential status entry in PostgreSQL', {
        error: error instanceof Error ? error.message : String(error),
        credentialId: entryData.credentialId,
        statusListId: entryData.statusListId
      });
      throw new Error(`Failed to create credential status entry: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Finds a credential status entry by ID
   */
  async findById(id: Shared.IRI): Promise<CredentialStatusEntry | null> {
    try {
      const result = await this.db
        .select()
        .from(credentialStatusEntries)
        .where(eq(credentialStatusEntries.id, id))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const row = result[0];
      return this.mapRowToCredentialStatusEntry(row);
    } catch (error) {
      logger.error('Failed to find credential status entry by ID in PostgreSQL', {
        error: error instanceof Error ? error.message : String(error),
        entryId: id
      });
      throw new Error(`Failed to find credential status entry: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Finds a credential status entry by credential ID
   */
  async findByCredentialId(credentialId: Shared.IRI): Promise<CredentialStatusEntry | null> {
    try {
      const result = await this.db
        .select()
        .from(credentialStatusEntries)
        .where(eq(credentialStatusEntries.credentialId, credentialId))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const row = result[0];
      return this.mapRowToCredentialStatusEntry(row);
    } catch (error) {
      logger.error('Failed to find credential status entry by credential ID in PostgreSQL', {
        error: error instanceof Error ? error.message : String(error),
        credentialId
      });
      throw new Error(`Failed to find credential status entry: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Finds all credential status entries for a status list
   */
  async findByStatusListId(statusListId: Shared.IRI): Promise<CredentialStatusEntry[]> {
    try {
      const results = await this.db
        .select()
        .from(credentialStatusEntries)
        .where(eq(credentialStatusEntries.statusListId, statusListId));

      return results.map(row => this.mapRowToCredentialStatusEntry(row));
    } catch (error) {
      logger.error('Failed to find credential status entries by status list ID in PostgreSQL', {
        error: error instanceof Error ? error.message : String(error),
        statusListId
      });
      throw new Error(`Failed to find credential status entries: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Updates a credential status entry
   */
  async update(id: Shared.IRI, updates: Partial<Omit<CredentialStatusEntry, 'id' | 'createdAt'>>): Promise<CredentialStatusEntry | null> {
    try {
      const updateData: any = {};

      if (updates.credentialId) updateData.credentialId = updates.credentialId;
      if (updates.statusListId) updateData.statusListId = updates.statusListId;
      if (updates.statusListIndex !== undefined) updateData.statusListIndex = updates.statusListIndex;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.reason !== undefined) updateData.reason = updates.reason;
      if (updates.updatedAt) updateData.updatedAt = updates.updatedAt;

      const result = await this.db
        .update(credentialStatusEntries)
        .set(updateData)
        .where(eq(credentialStatusEntries.id, id))
        .returning();

      if (result.length === 0) {
        return null;
      }

      const row = result[0];
      return this.mapRowToCredentialStatusEntry(row);
    } catch (error) {
      logger.error('Failed to update credential status entry in PostgreSQL', {
        error: error instanceof Error ? error.message : String(error),
        entryId: id,
        updates
      });
      throw new Error(`Failed to update credential status entry: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Deletes a credential status entry
   */
  async delete(id: Shared.IRI): Promise<boolean> {
    try {
      const result = await this.db
        .delete(credentialStatusEntries)
        .where(eq(credentialStatusEntries.id, id))
        .returning();

      return result.length > 0;
    } catch (error) {
      logger.error('Failed to delete credential status entry in PostgreSQL', {
        error: error instanceof Error ? error.message : String(error),
        entryId: id
      });
      throw new Error(`Failed to delete credential status entry: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Gets the next available index in a status list
   */
  async getNextAvailableIndex(statusListId: Shared.IRI): Promise<number> {
    try {
      const result = await this.db
        .select({ maxIndex: max(credentialStatusEntries.statusListIndex) })
        .from(credentialStatusEntries)
        .where(eq(credentialStatusEntries.statusListId, statusListId));

      const maxIndex = result[0]?.maxIndex;
      
      // If no entries exist, start at index 0
      if (maxIndex === null || maxIndex === undefined) {
        return 0;
      }

      // Return the next available index
      return maxIndex + 1;
    } catch (error) {
      logger.error('Failed to get next available index in PostgreSQL', {
        error: error instanceof Error ? error.message : String(error),
        statusListId
      });
      throw new Error(`Failed to get next available index: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Maps a database row to a CredentialStatusEntry entity
   */
  private mapRowToCredentialStatusEntry(row: any): CredentialStatusEntry {
    return {
      id: row.id,
      credentialId: row.credentialId,
      statusListId: row.statusListId,
      statusListIndex: row.statusListIndex,
      status: row.status as CredentialStatus,
      reason: row.reason || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }
}
