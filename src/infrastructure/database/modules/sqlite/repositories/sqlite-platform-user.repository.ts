/**
 * SQLite implementation of the PlatformUser repository
 *
 * This class implements the PlatformUserRepository interface using SQLite
 */

import { Database } from 'bun:sqlite';
import { PlatformUser } from '@domains/backpack/platform-user.entity';
import type { PlatformUserRepository } from '@domains/backpack/platform-user.repository';
import { Shared } from 'openbadges-types';
import { logger } from '@utils/logging/logger.service';
import { InferSelectModel } from 'drizzle-orm';
import { platformUsers } from '../schema';
import {
  convertJson,
  convertTimestamp,
  convertUuid,
} from '@infrastructure/database/utils/type-conversion';

type SqlitePlatformUserRecord = InferSelectModel<typeof platformUsers>;

export class SqlitePlatformUserRepository implements PlatformUserRepository {
  private db: Database;

  constructor(db: Database) {
    this.db = db;

    // Create the platform_users table if it doesn't exist
    this.db.run(`
      CREATE TABLE IF NOT EXISTS platform_users (
        id TEXT PRIMARY KEY,
        platformId TEXT NOT NULL,
        externalUserId TEXT NOT NULL,
        displayName TEXT,
        email TEXT,
        metadata TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (platformId) REFERENCES platforms(id) ON DELETE CASCADE,
        UNIQUE (platformId, externalUserId)
      )
    `);

    // Create indexes
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_platform_users_platform_external ON platform_users(platformId, externalUserId)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_platform_users_email ON platform_users(email)`);
  }

  async create(user: Omit<PlatformUser, 'id'>): Promise<PlatformUser> {
    try {
      // Create a new platform user entity
      const newUser = PlatformUser.create(user as PlatformUser);
      const obj = newUser.toObject();

      // Convert metadata to JSON string if it exists
      const metadata = obj.metadata ? JSON.stringify(obj.metadata) : null;

      // Insert into database
      this.db.prepare(`
        INSERT INTO platform_users (
          id, platformId, externalUserId, displayName, email, metadata, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        String(obj.id),
        String(obj.platformId),
        String(obj.externalUserId),
        obj.displayName ? String(obj.displayName) : null,
        obj.email ? String(obj.email) : null,
        metadata,
        (obj.createdAt instanceof Date) ? obj.createdAt.toISOString() : String(obj.createdAt),
        (obj.updatedAt instanceof Date) ? obj.updatedAt.toISOString() : String(obj.updatedAt)
      );

      return newUser;
    } catch (error) {
      logger.error('Error creating platform user in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        user
      });
      throw error;
    }
  }

  async findById(id: Shared.IRI): Promise<PlatformUser | null> {
    try {
      // Query database
      const row = this.db
        .prepare(`SELECT * FROM platform_users WHERE id = ?`)
        .get(id) as SqlitePlatformUserRecord | undefined;

      // Return null if not found
      if (!row) {
        return null;
      }

      // Convert row to domain entity
      return this.rowToDomain(row);
    } catch (error) {
      logger.error('Error finding platform user by ID in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        id
      });
      throw error;
    }
  }

  async findByPlatformAndExternalId(platformId: Shared.IRI, externalUserId: string): Promise<PlatformUser | null> {
    try {
      // Query database
      const row = this.db.prepare(`
        SELECT * FROM platform_users
        WHERE platformId = ? AND externalUserId = ?
      `).get(platformId, externalUserId) as SqlitePlatformUserRecord | undefined;

      // Return null if not found
      if (!row) {
        return null;
      }

      // Convert row to domain entity
      return this.rowToDomain(row);
    } catch (error) {
      logger.error('Error finding platform user by platform and external ID in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        platformId,
        externalUserId
      });
      throw error;
    }
  }

  async update(id: Shared.IRI, user: Partial<PlatformUser>): Promise<PlatformUser | null> {
    try {
      // Check if user exists
      const existingUser = await this.findById(id);
      if (!existingUser) {
        return null;
      }

      // Create a merged entity
      const mergedUser = PlatformUser.create({
        ...existingUser.toObject(),
        ...user as Partial<PlatformUser>,
        updatedAt: new Date()
      });
      const obj = mergedUser.toObject();

      // Convert metadata to JSON string if it exists
      const metadata = obj.metadata ? JSON.stringify(obj.metadata) : null;

      // Update in database
      this.db.prepare(`
        UPDATE platform_users SET
          platformId = ?,
          externalUserId = ?,
          displayName = ?,
          email = ?,
          metadata = ?,
          updatedAt = ?
        WHERE id = ?
      `).run(
        String(obj.platformId),
        String(obj.externalUserId),
        obj.displayName ? String(obj.displayName) : null,
        obj.email ? String(obj.email) : null,
        metadata,
        (obj.updatedAt instanceof Date) ? obj.updatedAt.toISOString() : String(obj.updatedAt),
        String(id)
      );

      return mergedUser;
    } catch (error) {
      logger.error('Error updating platform user in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        id,
        user
      });
      throw error;
    }
  }

  async delete(id: Shared.IRI): Promise<boolean> {
    try {
      // Delete from database
      const result = this.db.prepare(`DELETE FROM platform_users WHERE id = ?`).run(id);

      // Return true if something was deleted
      return result.changes > 0;
    } catch (error) {
      logger.error('Error deleting platform user in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        id
      });
      throw error;
    }
  }

  /**
   * Converts a database row to a domain entity
   * @param row The database row
   * @returns A PlatformUser domain entity
   */
  private rowToDomain(row: SqlitePlatformUserRecord): PlatformUser {
    // Validate required fields from DB
    if (!row.id) {
      throw new Error('Platform user record is missing required field: id');
    }
    if (!row.platformId) {
      throw new Error('Platform user record is missing required field: platformId');
    }
    if (!row.externalUserId) {
      throw new Error(
        'Platform user record is missing required field: externalUserId'
      );
    }
    if (!row.createdAt) {
      throw new Error('Platform user record is missing required field: createdAt');
    }
    if (!row.updatedAt) {
      throw new Error('Platform user record is missing required field: updatedAt');
    }

    // Safely parse metadata
    let metadata: Record<string, unknown> | undefined = undefined;
    if (row.metadata !== null && row.metadata !== undefined) {
      try {
        const parsed = convertJson<Record<string, unknown>>(
          row.metadata,
          'sqlite',
          'from'
        );
        if (parsed && typeof parsed === 'object') {
          metadata = parsed;
        }
      } catch (error) {
        logger.warn('Error parsing platform user metadata', {
          error: error instanceof Error ? error.message : String(error),
          metadata: row.metadata,
          userId: row.id,
        });
        // Decide whether to throw or continue with undefined metadata
      }
    }

    return PlatformUser.create({
      id: convertUuid(row.id, 'sqlite', 'from') as Shared.IRI,
      platformId: convertUuid(row.platformId, 'sqlite', 'from') as Shared.IRI,
      externalUserId: row.externalUserId, // Already validated non-null
      displayName: row.displayName, // Optional field
      email: row.email, // Optional field
      metadata,
      createdAt: new Date(convertTimestamp(row.createdAt, 'sqlite', 'from') as number), // Validated non-null
      updatedAt: new Date(convertTimestamp(row.updatedAt, 'sqlite', 'from') as number), // Validated non-null
    });
  }
}
