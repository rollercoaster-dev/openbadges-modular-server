/**
 * SQLite CredentialStatusEntry Repository
 * 
 * This repository handles database operations for CredentialStatusEntry entities using SQLite.
 */

import { eq, max } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Shared } from 'openbadges-types';
import { createOrGenerateIRI } from '../../../../../utils/types/iri-utils';
import { logger } from '../../../../../utils/logging/logger.service';
import {
  CredentialStatusEntry,
  CredentialStatusEntryRepository,
  CredentialStatus
} from '../../../../../core/types/status-list.types';
import { credentialStatusEntries } from '../schema';
import { SqliteConnectionManager } from '../connection/sqlite-connection.manager';
import type { drizzle as DrizzleFn } from 'drizzle-orm/bun-sqlite';

// Create compile-time type alias to avoid runtime import dependency
type DrizzleDB = ReturnType<typeof DrizzleFn>;

/**
 * SQLite implementation of CredentialStatusEntryRepository
 */
export class SqliteCredentialStatusEntryRepository implements CredentialStatusEntryRepository {
  constructor(private readonly connectionManager: SqliteConnectionManager) {}

  /**
   * Gets the database instance with connection validation
   */
  private getDatabase(): DrizzleDB {
    this.connectionManager.ensureConnected();
    return this.connectionManager.getDatabase();
  }

  /**
   * Creates a new credential status entry
   */
  async create(entryData: Omit<CredentialStatusEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<CredentialStatusEntry> {
    try {
      const id = createOrGenerateIRI();
      const now = Date.now();

      const insertData = {
        id,
        credentialId: entryData.credentialId,
        statusListId: entryData.statusListId,
        statusListIndex: entryData.statusListIndex,
        status: entryData.status,
        reason: entryData.reason || null,
        createdAt: now,
        updatedAt: now
      };

      const db = this.getDatabase();
      await db.insert(credentialStatusEntries).values(insertData);

      const entry: CredentialStatusEntry = {
        id,
        credentialId: entryData.credentialId,
        statusListId: entryData.statusListId,
        statusListIndex: entryData.statusListIndex,
        status: entryData.status,
        reason: entryData.reason,
        createdAt: new Date(now),
        updatedAt: new Date(now)
      };

      logger.debug('Credential status entry created in SQLite', { 
        entryId: id,
        credentialId: entryData.credentialId,
        statusListIndex: entryData.statusListIndex
      });
      return entry;
    } catch (error) {
      logger.error('Failed to create credential status entry in SQLite', {
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
      const db = this.getDatabase();
      const result = await db
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
      logger.error('Failed to find credential status entry by ID in SQLite', {
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
      const db = this.getDatabase();
      const result = await db
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
      logger.error('Failed to find credential status entry by credential ID in SQLite', {
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
      const db = this.getDatabase();
      const results = await db
        .select()
        .from(credentialStatusEntries)
        .where(eq(credentialStatusEntries.statusListId, statusListId));

      return results.map(row => this.mapRowToCredentialStatusEntry(row));
    } catch (error) {
      logger.error('Failed to find credential status entries by status list ID in SQLite', {
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
      const updateData: Partial<typeof credentialStatusEntries.$inferInsert> = {
        updatedAt: Date.now()
      };

      if (updates.credentialId) updateData.credentialId = updates.credentialId;
      if (updates.statusListId) updateData.statusListId = updates.statusListId;
      if (updates.statusListIndex !== undefined) updateData.statusListIndex = updates.statusListIndex;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.reason !== undefined) updateData.reason = updates.reason;

      const db = this.getDatabase();
      await db
        .update(credentialStatusEntries)
        .set(updateData)
        .where(eq(credentialStatusEntries.id, id));

      // Return the updated entry
      return await this.findById(id);
    } catch (error) {
      logger.error('Failed to update credential status entry in SQLite', {
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
      const db = this.getDatabase();
      await db
        .delete(credentialStatusEntries)
        .where(eq(credentialStatusEntries.id, id));

      return true;
    } catch (error) {
      logger.error('Failed to delete credential status entry in SQLite', {
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
      const db = this.getDatabase();
      const result = await db
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
      logger.error('Failed to get next available index in SQLite', {
        error: error instanceof Error ? error.message : String(error),
        statusListId
      });
      throw new Error(`Failed to get next available index: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Maps a database row to a CredentialStatusEntry entity
   */
  private mapRowToCredentialStatusEntry(row: typeof credentialStatusEntries.$inferSelect): CredentialStatusEntry {
    return {
      id: row.id,
      credentialId: row.credentialId,
      statusListId: row.statusListId,
      statusListIndex: row.statusListIndex,
      status: row.status as CredentialStatus,
      reason: row.reason || undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    };
  }
}
