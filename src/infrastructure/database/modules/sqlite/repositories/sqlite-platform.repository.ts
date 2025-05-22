/**
 * SQLite implementation of the Platform repository
 *
 * This class implements the PlatformRepository interface using SQLite
 */

import { Platform } from '@domains/backpack/platform.entity';
import type { PlatformRepository } from '@domains/backpack/platform.repository';
import { Shared } from 'openbadges-types';
import { logger } from '@utils/logging/logger.service';
import {
  PlatformCreateParams,
  PlatformUpdateParams,
  PlatformQueryParams,
  PlatformStatus,
} from '@domains/backpack/repository.types';
import {
  convertTimestamp,
  convertUuid,
} from '@infrastructure/database/utils/type-conversion';
import { toIRI } from '@utils/types/iri-utils';
import { SqliteConnectionManager } from '../connection/sqlite-connection.manager';

export class SqlitePlatformRepository implements PlatformRepository {
  constructor(private readonly connectionManager: SqliteConnectionManager) {
    // Initialize table on first connection
    this.initializeTable();
  }

  /**
   * Gets the database instance with connection validation
   */
  private getDatabase() {
    this.connectionManager.ensureConnected();
    return this.connectionManager.getDatabase();
  }

  /**
   * Gets the raw SQLite client for direct SQL operations
   */
  private getClient() {
    this.connectionManager.ensureConnected();
    return this.connectionManager.getClient();
  }

  /**
   * Initialize the platforms table
   */
  private initializeTable() {
    const client = this.getClient();

    // Create the platforms table if it doesn't exist
    client.run(`
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
      // Get database with connection validation
      this.getDatabase();
      // Create a new platform entity
      const newPlatform = Platform.create(params as Platform);
      const obj = newPlatform.toObject();

      // Convert timestamps to SQLite format
      const createdAtTimestamp = convertTimestamp(
        obj.createdAt as Date,
        'sqlite',
        'to'
      ) as number;
      const updatedAtTimestamp = convertTimestamp(
        obj.updatedAt as Date,
        'sqlite',
        'to'
      ) as number;

      // Insert into database
      this.getClient()
        .prepare(
          `
        INSERT INTO platforms (
          id, name, description, clientId, publicKey, webhookUrl, status, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
        )
        .run(
          convertUuid(String(obj.id), 'sqlite', 'to') as string,
          String(obj.name),
          obj.description ? String(obj.description) : null,
          String(obj.clientId),
          String(obj.publicKey),
          obj.webhookUrl ? String(obj.webhookUrl) : null,
          String(obj.status),
          createdAtTimestamp,
          updatedAtTimestamp
        );

      return newPlatform;
    } catch (error) {
      logger.error('Error creating platform in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        params,
      });
      throw error;
    }
  }

  async findAll(params?: PlatformQueryParams): Promise<Platform[]> {
    try {
      // Build query
      let query = `SELECT * FROM platforms`;
      const queryParams: (string | number)[] = [];

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
      const rows = this.getClient()
        .prepare(query)
        .all(...queryParams);

      // Convert rows to domain entities
      return rows.map((row) => this.rowToDomain(row));
    } catch (error) {
      logger.error('Error finding all platforms in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async findById(id: Shared.IRI): Promise<Platform | null> {
    try {
      // Query database
      const row = this.getClient()
        .prepare(`SELECT * FROM platforms WHERE id = ?`)
        .get(convertUuid(String(id), 'sqlite', 'to'));

      // Return null if not found
      if (!row) {
        return null;
      }

      // Convert row to domain entity
      return this.rowToDomain(row);
    } catch (error) {
      logger.error('Error finding platform by ID in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        id,
      });
      throw error;
    }
  }

  async findByClientId(clientId: string): Promise<Platform | null> {
    try {
      // Query database
      const row = this.getClient()
        .prepare(`SELECT * FROM platforms WHERE clientId = ?`)
        .get(clientId);

      // Return null if not found
      if (!row) {
        return null;
      }

      // Convert row to domain entity
      return this.rowToDomain(row);
    } catch (error) {
      logger.error('Error finding platform by client ID in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        clientId,
      });
      throw error;
    }
  }

  async update(
    id: Shared.IRI,
    params: PlatformUpdateParams
  ): Promise<Platform | null> {
    try {
      // Check if platform exists
      const existingPlatform = await this.findById(id);
      if (!existingPlatform) {
        return null;
      }

      // Create a merged entity
      const mergedPlatform = Platform.create({
        ...existingPlatform.toObject(),
        ...(params as Partial<Platform>),
        updatedAt: new Date(),
      });
      const obj = mergedPlatform.toObject();

      // Convert timestamp to SQLite format
      const updatedAtTimestamp = convertTimestamp(
        obj.updatedAt as Date,
        'sqlite',
        'to'
      ) as number;
      const idString = convertUuid(String(id), 'sqlite', 'to') as string;

      // Update in database
      this.getClient()
        .prepare(
          `
        UPDATE platforms SET
          name = ?,
          description = ?,
          clientId = ?,
          publicKey = ?,
          webhookUrl = ?,
          status = ?,
          updatedAt = ?
        WHERE id = ?
      `
        )
        .run(
          String(obj.name),
          obj.description ? String(obj.description) : null,
          String(obj.clientId),
          String(obj.publicKey),
          obj.webhookUrl ? String(obj.webhookUrl) : null,
          String(obj.status),
          updatedAtTimestamp,
          idString
        );

      return mergedPlatform;
    } catch (error) {
      logger.error('Error updating platform in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        id,
        params,
      });
      throw error;
    }
  }

  async delete(id: Shared.IRI): Promise<boolean> {
    try {
      // Delete from database
      const result = this.getClient()
        .prepare(`DELETE FROM platforms WHERE id = ?`)
        .run(convertUuid(String(id), 'sqlite', 'to'));

      // Return true if something was deleted
      return result.changes > 0;
    } catch (error) {
      logger.error('Error deleting platform in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        id,
      });
      throw error;
    }
  }

  /**
   * Converts a database row to a domain entity
   * @param row The database row
   * @returns A Platform domain entity
   */
  private rowToDomain(row: unknown): Platform {
    // Cast row to the expected type
    const typedRow = row as Record<string, string | number | null>;
    return Platform.create({
      id: toIRI(convertUuid(String(typedRow.id), 'sqlite', 'from')),
      name: String(typedRow.name),
      description: typedRow.description
        ? String(typedRow.description)
        : undefined,
      clientId: String(typedRow.clientId),
      publicKey: String(typedRow.publicKey),
      webhookUrl: typedRow.webhookUrl ? String(typedRow.webhookUrl) : undefined,
      status: String(typedRow.status) as PlatformStatus,
      createdAt: convertTimestamp(typedRow.createdAt, 'sqlite', 'from') as Date,
      updatedAt: convertTimestamp(typedRow.updatedAt, 'sqlite', 'from') as Date,
    });
  }
}
