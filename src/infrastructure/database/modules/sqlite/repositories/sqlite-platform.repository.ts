/**
 * SQLite implementation of the Platform repository
 *
 * This class implements the PlatformRepository interface using SQLite
 */

import { Database } from 'bun:sqlite';
import { Platform } from '@domains/backpack/platform.entity';
import type { PlatformRepository } from '@domains/backpack/platform.repository';
import { Shared } from 'openbadges-types';
import { logger } from '@utils/logging/logger.service';
import { PlatformCreateParams, PlatformUpdateParams, PlatformQueryParams } from '@domains/backpack/repository.types';

export class SqlitePlatformRepository implements PlatformRepository {
  private db: Database;

  constructor(db: Database) {
    this.db = db;

    // Create the platforms table if it doesn't exist
    this.db.run(`
      CREATE TABLE IF NOT EXISTS platforms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        clientId TEXT NOT NULL UNIQUE,
        publicKey TEXT NOT NULL,
        webhookUrl TEXT,
        status TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);
  }

  async create(params: PlatformCreateParams): Promise<Platform> {
    try {
      // Create a new platform entity
      const newPlatform = Platform.create(params as Platform);
      const obj = newPlatform.toObject();

      // Insert into database
      this.db.prepare(`
        INSERT INTO platforms (
          id, name, description, clientId, publicKey, webhookUrl, status, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        String(obj.id),
        String(obj.name),
        obj.description ? String(obj.description) : null,
        String(obj.clientId),
        String(obj.publicKey),
        obj.webhookUrl ? String(obj.webhookUrl) : null,
        String(obj.status),
        (obj.createdAt instanceof Date) ? obj.createdAt.toISOString() : String(obj.createdAt),
        (obj.updatedAt instanceof Date) ? obj.updatedAt.toISOString() : String(obj.updatedAt)
      );

      return newPlatform;
    } catch (error) {
      logger.error('Error creating platform in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        params
      });
      throw error;
    }
  }

  async findAll(params?: PlatformQueryParams): Promise<Platform[]> {
    try {
      // Build query
      let query = `SELECT * FROM platforms`;
      const queryParams: any[] = [];

      // Add filters if provided
      if (params) {
        const whereConditions: string[] = [];

        if (params.status) {
          whereConditions.push(`status = ?`);
          queryParams.push(params.status);
        }

        if (params.name) {
          whereConditions.push(`name LIKE ?`);
          queryParams.push(`%${params.name}%`);
        }

        if (whereConditions.length > 0) {
          query += ` WHERE ${whereConditions.join(' AND ')}`;
        }

        // Add limit and offset if provided
        if (params.limit) {
          query += ` LIMIT ?`;
          queryParams.push(params.limit);

          if (params.offset) {
            query += ` OFFSET ?`;
            queryParams.push(params.offset);
          }
        }
      }

      // Query database
      const rows = this.db.prepare(query).all(...queryParams);

      // Convert rows to domain entities
      return rows.map(row => this.rowToDomain(row));
    } catch (error) {
      logger.error('Error finding all platforms in SQLite repository', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async findById(id: Shared.IRI): Promise<Platform | null> {
    try {
      // Query database
      const row = this.db.prepare(`SELECT * FROM platforms WHERE id = ?`).get(id);

      // Return null if not found
      if (!row) {
        return null;
      }

      // Convert row to domain entity
      return this.rowToDomain(row);
    } catch (error) {
      logger.error('Error finding platform by ID in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        id
      });
      throw error;
    }
  }

  async findByClientId(clientId: string): Promise<Platform | null> {
    try {
      // Query database
      const row = this.db.prepare(`SELECT * FROM platforms WHERE clientId = ?`).get(clientId);

      // Return null if not found
      if (!row) {
        return null;
      }

      // Convert row to domain entity
      return this.rowToDomain(row);
    } catch (error) {
      logger.error('Error finding platform by client ID in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        clientId
      });
      throw error;
    }
  }

  async update(id: Shared.IRI, params: PlatformUpdateParams): Promise<Platform | null> {
    try {
      // Check if platform exists
      const existingPlatform = await this.findById(id);
      if (!existingPlatform) {
        return null;
      }

      // Create a merged entity
      const mergedPlatform = Platform.create({
        ...existingPlatform.toObject(),
        ...params as any,
        updatedAt: new Date()
      });
      const obj = mergedPlatform.toObject();

      // Update in database
      this.db.prepare(`
        UPDATE platforms SET
          name = ?,
          description = ?,
          clientId = ?,
          publicKey = ?,
          webhookUrl = ?,
          status = ?,
          updatedAt = ?
        WHERE id = ?
      `).run(
        String(obj.name),
        obj.description ? String(obj.description) : null,
        String(obj.clientId),
        String(obj.publicKey),
        obj.webhookUrl ? String(obj.webhookUrl) : null,
        String(obj.status),
        (obj.updatedAt instanceof Date) ? obj.updatedAt.toISOString() : String(obj.updatedAt),
        String(id)
      );

      return mergedPlatform;
    } catch (error) {
      logger.error('Error updating platform in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        id,
        params
      });
      throw error;
    }
  }

  async delete(id: Shared.IRI): Promise<boolean> {
    try {
      // Delete from database
      const result = this.db.prepare(`DELETE FROM platforms WHERE id = ?`).run(id);

      // Return true if something was deleted
      return result.changes > 0;
    } catch (error) {
      logger.error('Error deleting platform in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        id
      });
      throw error;
    }
  }

  /**
   * Converts a database row to a domain entity
   * @param row The database row
   * @returns A Platform domain entity
   */
  private rowToDomain(row: any): Platform {
    return Platform.create({
      id: row.id as Shared.IRI,
      name: row.name,
      description: row.description,
      clientId: row.clientId,
      publicKey: row.publicKey,
      webhookUrl: row.webhookUrl,
      status: row.status,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    });
  }
}
