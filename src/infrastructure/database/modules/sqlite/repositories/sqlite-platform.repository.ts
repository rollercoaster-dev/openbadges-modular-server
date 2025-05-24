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
import {
  DuplicateClientIdError,
  PlatformOperationError,
} from '@domains/backpack/platform.errors';

export class SqlitePlatformRepository implements PlatformRepository {
  constructor(private readonly connectionManager: SqliteConnectionManager) {
    // Table creation is handled by migrations
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

      try {
        // Insert into database
        this.getClient()
          .prepare(
            `
          INSERT INTO platforms (
            id, name, description, client_id, public_key, webhook_url, status, created_at, updated_at
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
      } catch (sqliteError) {
        // Check if the error is related to a UNIQUE constraint violation on client_id
        const errorMessage = String(sqliteError);
        if (
          errorMessage.includes('UNIQUE constraint failed') &&
          errorMessage.includes('client_id')
        ) {
          // Convert to a domain-specific error
          throw new DuplicateClientIdError(String(obj.clientId));
        }

        // For other database errors, wrap in a PlatformOperationError
        throw new PlatformOperationError(
          'Failed to create platform due to database error',
          sqliteError instanceof Error
            ? sqliteError
            : new Error(String(sqliteError))
        );
      }

      return newPlatform;
    } catch (error) {
      // If it's already a domain-specific error, rethrow
      if (
        error instanceof DuplicateClientIdError ||
        error instanceof PlatformOperationError
      ) {
        throw error;
      }

      // Log the generic error
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
        .prepare(`SELECT * FROM platforms WHERE client_id = ?`)
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

      try {
        // Update in database
        this.getClient()
          .prepare(
            `
          UPDATE platforms SET
            name = ?,
            description = ?,
            client_id = ?,
            public_key = ?,
            webhook_url = ?,
            status = ?,
            updated_at = ?
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
      } catch (sqliteError) {
        // Check if the error is related to a UNIQUE constraint violation on client_id
        const errorMessage = String(sqliteError);
        if (
          errorMessage.includes('UNIQUE constraint failed') &&
          errorMessage.includes('client_id')
        ) {
          // Convert to a domain-specific error
          throw new DuplicateClientIdError(String(obj.clientId));
        }

        // For other database errors, wrap in a PlatformOperationError
        throw new PlatformOperationError(
          'Failed to update platform due to database error',
          sqliteError instanceof Error
            ? sqliteError
            : new Error(String(sqliteError))
        );
      }

      return mergedPlatform;
    } catch (error) {
      // If it's already a domain-specific error, rethrow
      if (
        error instanceof DuplicateClientIdError ||
        error instanceof PlatformOperationError
      ) {
        throw error;
      }

      // Log the generic error
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
      clientId: String(typedRow.client_id),
      publicKey: String(typedRow.public_key),
      webhookUrl: typedRow.webhook_url
        ? String(typedRow.webhook_url)
        : undefined,
      status: String(typedRow.status) as PlatformStatus,
      createdAt: convertTimestamp(
        typedRow.created_at,
        'sqlite',
        'from'
      ) as Date,
      updatedAt: convertTimestamp(
        typedRow.updated_at,
        'sqlite',
        'from'
      ) as Date,
    });
  }
}
