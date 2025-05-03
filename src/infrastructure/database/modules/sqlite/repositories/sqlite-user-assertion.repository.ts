/**
 * SQLite implementation of the UserAssertion repository
 *
 * This class implements the UserAssertionRepository interface using SQLite
 */

import { Database } from 'bun:sqlite';
import { UserAssertion } from '@domains/backpack/user-assertion.entity';
import type { UserAssertionRepository } from '@domains/backpack/user-assertion.repository';
import { Shared } from 'openbadges-types';
import { logger } from '@utils/logging/logger.service';
import { UserAssertionStatus } from '@domains/backpack/backpack.types';
import { UserAssertionCreateParams, UserAssertionQueryParams } from '@domains/backpack/repository.types';

export class SqliteUserAssertionRepository implements UserAssertionRepository {
  private db: Database;

  constructor(db: Database) {
    this.db = db;

    // Create the user_assertions table if it doesn't exist
    this.db.run(`
      CREATE TABLE IF NOT EXISTS user_assertions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        assertionId TEXT NOT NULL,
        addedAt TEXT NOT NULL,
        status TEXT NOT NULL,
        metadata TEXT,
        FOREIGN KEY (userId) REFERENCES platform_users(id) ON DELETE CASCADE,
        FOREIGN KEY (assertionId) REFERENCES assertions(id) ON DELETE CASCADE,
        UNIQUE (userId, assertionId)
      )
    `);

    // Create indexes
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_user_assertions_user ON user_assertions(userId)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_user_assertions_assertion ON user_assertions(assertionId)`);
  }

  async addAssertion(userIdOrParams: Shared.IRI | UserAssertionCreateParams, assertionId?: Shared.IRI, metadata?: Record<string, unknown>): Promise<UserAssertion> {
    try {
      // Handle params object
      if (typeof userIdOrParams !== 'string') {
        const params = userIdOrParams;
        return this.createUserAssertion(params.userId, params.assertionId, params.metadata);
      }

      // Handle individual parameters
      if (!assertionId) {
        throw new Error('Assertion ID is required when userId is provided');
      }

      return this.createUserAssertion(userIdOrParams, assertionId, metadata);
    } catch (error) {
      logger.error('Error adding assertion to user in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        userIdOrParams,
        assertionId
      });
      throw error;
    }
  }

  /**
   * Internal method to create a user assertion
   */
  private async createUserAssertion(userId: Shared.IRI, assertionId: Shared.IRI, metadata?: Record<string, unknown>): Promise<UserAssertion> {

      // Create a new user assertion entity
      const userAssertion = UserAssertion.create({
        userId,
        assertionId,
        metadata
      });
      const obj = userAssertion.toObject();

      // Convert metadata to JSON string if it exists
      const metadataStr = obj.metadata ? JSON.stringify(obj.metadata) : null;

      // Insert into database
      this.db.prepare(`
        INSERT INTO user_assertions (
          id, userId, assertionId, addedAt, status, metadata
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT (userId, assertionId) DO UPDATE SET
          status = ?,
          metadata = ?
      `).run(
        String(obj.id),
        String(obj.userId),
        String(obj.assertionId),
        (obj.addedAt instanceof Date) ? obj.addedAt.toISOString() : String(obj.addedAt),
        String(obj.status),
        metadataStr,
        String(obj.status),
        metadataStr
      );

      return userAssertion;

  }

  async removeAssertion(userId: Shared.IRI, assertionId: Shared.IRI): Promise<boolean> {
    try {
      // Delete from database
      const result = this.db.prepare(`
        DELETE FROM user_assertions
        WHERE userId = ? AND assertionId = ?
      `).run(String(userId), String(assertionId));

      // Return true if something was deleted
      return result.changes > 0;
    } catch (error) {
      logger.error('Error removing assertion from user in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        assertionId
      });
      throw error;
    }
  }

  async updateStatus(userId: Shared.IRI, assertionId: Shared.IRI, status: UserAssertionStatus): Promise<boolean> {
    try {
      // Update status in database
      const result = this.db.prepare(`
        UPDATE user_assertions
        SET status = ?
        WHERE userId = ? AND assertionId = ?
      `).run(String(status), String(userId), String(assertionId));

      // Return true if something was updated
      return result.changes > 0;
    } catch (error) {
      logger.error('Error updating assertion status in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        assertionId,
        status
      });
      throw error;
    }
  }

  async getUserAssertions(userId: Shared.IRI, params?: UserAssertionQueryParams): Promise<UserAssertion[]> {
    try {
      // Build query
      let query = `SELECT * FROM user_assertions WHERE userId = ? AND status != ?`;
      const queryParams: (string | number | boolean)[] = [String(userId), String(UserAssertionStatus.DELETED)];

      // Add filters if provided
      if (params) {
        if (params.status) {
          query = query.replace('AND status != ?', 'AND status = ?');
          queryParams[1] = String(params.status);
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
      return rows.map(row => this.rowToDomain(row as Record<string, unknown>));
    } catch (error) {
      logger.error('Error getting user assertions in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        userId
      });
      throw error;
    }
  }

  async getAssertionUsers(assertionId: Shared.IRI): Promise<UserAssertion[]> {
    try {
      // Query database
      const rows = this.db.prepare(`
        SELECT * FROM user_assertions
        WHERE assertionId = ?
      `).all(String(assertionId));

      // Convert rows to domain entities
      return rows.map(row => this.rowToDomain(row as Record<string, unknown>));
    } catch (error) {
      logger.error('Error getting assertion users in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        assertionId
      });
      throw error;
    }
  }

  async hasAssertion(userId: Shared.IRI, assertionId: Shared.IRI): Promise<boolean> {
    try {
      // Query database
      const row = this.db.prepare(`
        SELECT 1 FROM user_assertions
        WHERE userId = ? AND assertionId = ? AND status != ?
      `).get(String(userId), String(assertionId), String(UserAssertionStatus.DELETED));

      // Return true if found
      return !!row;
    } catch (error) {
      logger.error('Error checking if user has assertion in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        assertionId
      });
      throw error;
    }
  }

  async findByUserAndAssertion(userId: Shared.IRI, assertionId: Shared.IRI): Promise<UserAssertion | null> {
    try {
      // Query database
      const row = this.db.prepare(`
        SELECT * FROM user_assertions
        WHERE userId = ? AND assertionId = ?
      `).get(String(userId), String(assertionId));

      if (!row) {
        return null;
      }

      return this.rowToDomain(row as Record<string, unknown>);
    } catch (error) {
      logger.error('Error finding user assertion by user and assertion ID in SQLite repository', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        assertionId
      });
      throw error;
    }
  }

  /**
   * Converts a database row to a domain entity
   * @param row The database row
   * @returns A UserAssertion domain entity
   */
  private rowToDomain(row: Record<string, unknown>): UserAssertion {
    // Parse metadata if it exists
    let metadata: Record<string, unknown> | undefined;
    if (row.metadata && typeof row.metadata === 'string') {
      try {
        const parsedMetadata = JSON.parse(row.metadata);
        // Ensure the parsed data is a non-null object before assigning
        if (parsedMetadata && typeof parsedMetadata === 'object') {
          metadata = parsedMetadata as Record<string, unknown>; // Cast after check
        } else {
          logger.warn('Parsed user assertion metadata is not an object', { metadataValue: row.metadata });
        }
      } catch (error) {
        logger.warn('Failed to parse user assertion metadata', { error });
      }
    }

    return UserAssertion.create({
      id: typeof row.id === 'string' ? row.id as Shared.IRI : String(row.id) as Shared.IRI,
      userId: typeof row.userId === 'string' ? row.userId as Shared.IRI : String(row.userId) as Shared.IRI,
      assertionId: typeof row.assertionId === 'string' ? row.assertionId as Shared.IRI : String(row.assertionId) as Shared.IRI,
      addedAt: typeof row.addedAt === 'string' || typeof row.addedAt === 'number' ? new Date(row.addedAt) : new Date(),
      status: typeof row.status === 'string' ? row.status as UserAssertionStatus : UserAssertionStatus.ACTIVE,
      metadata
    });
  }
}
