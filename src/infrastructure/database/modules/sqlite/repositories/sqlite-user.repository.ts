/**
 * SQLite implementation of the User repository
 *
 * This class implements the UserRepository interface using SQLite
 * and the Data Mapper pattern with Drizzle ORM.
 */

import { eq, and, like, sql } from 'drizzle-orm';
import { User, UserRole, UserPermission } from '@domains/user/user.entity';
import {
  UserRepository,
  UserCreateParams,
  UserUpdateParams,
  UserQueryParams,
} from '@domains/user/user.repository';
import { users } from '../schema';
import { Shared } from 'openbadges-types';
import { logger, queryLogger } from '@utils/logging/logger.service';
import { SensitiveValue } from '@rollercoaster-dev/rd-logger';
import { createId } from '@paralleldrive/cuid2';
import { SqliteConnectionManager } from '../connection/sqlite-connection.manager';

/**
 * SQLite implementation of the User repository
 */
export class SqliteUserRepository implements UserRepository {
  /**
   * Constructor
   * @param connectionManager SQLite connection manager
   */
  constructor(private readonly connectionManager: SqliteConnectionManager) {}

  /**
   * Gets the database instance with connection validation
   */
  private getDatabase() {
    this.connectionManager.ensureConnected();
    return this.connectionManager.getDatabase();
  }

  /**
   * Create a mapper for this repository on demand
   * This allows access to the mapper for external components
   * while maintaining lazy initialization
   */
  getMapper(): { toDomain: (record: Record<string, unknown>) => User } {
    // We don't have a dedicated mapper class for User yet,
    // but this provides the interface for future implementation
    return {
      toDomain: this.toDomain.bind(this),
    };
  }

  /**
   * Creates a new user
   * @param params The user creation parameters
   * @returns The created user
   */
  async create(params: UserCreateParams): Promise<User> {
    try {
      // Generate ID and create full entity
      const id = createId() as Shared.IRI;
      const newUser = User.create({ ...params, id } as Partial<User>);
      const obj = newUser.toObject();

      // Convert dates to integers for SQLite
      const createdAt =
        obj.createdAt instanceof Date ? obj.createdAt.getTime() : Date.now();
      const updatedAt =
        obj.updatedAt instanceof Date ? obj.updatedAt.getTime() : Date.now();
      const lastLogin =
        obj.lastLogin instanceof Date ? obj.lastLogin.getTime() : null;

      // Log the password hash for debugging
      logger.debug(
        `Creating user in SQLite repository with passwordHash: ${
          params.passwordHash ? 'yes' : 'no'
        }`
      );

      // Get database with connection validation
      const db = this.getDatabase();

      // Use transaction with returning() to fetch created record atomically
      const startTime = Date.now();
      const result = await db.transaction(async (tx) => {
        const insertValues = {
          id: obj.id as string,
          username: obj.username as string,
          email: obj.email as string,
          passwordHash: params.passwordHash || undefined,
          firstName: obj.firstName as string | null,
          lastName: obj.lastName as string | null,
          roles: JSON.stringify(obj.roles ?? []),
          permissions: JSON.stringify(obj.permissions ?? []),
          isActive: obj.isActive ? 1 : 0,
          lastLogin,
          metadata: obj.metadata ? JSON.stringify(obj.metadata) : null,
          createdAt,
          updatedAt,
        };

        return await tx.insert(users).values(insertValues).returning();
      });
      const duration = Date.now() - startTime;

      // Log query
      queryLogger.logQuery(
        'INSERT User',
        [
          SensitiveValue.from({
            id: obj.id,
            username: obj.username,
            email: obj.email,
            passwordHash: params.passwordHash ? '[REDACTED]' : null,
          }),
        ],
        duration,
        'sqlite'
      );

      // Check if insert was successful
      if (!result[0]) {
        throw new Error('User was not created properly');
      }

      // Convert database record back to domain entity
      const createdUser = this.toDomain(result[0]);

      logger.debug(
        `User created in SQLite repository: ${
          createdUser.id
        } with passwordHash: ${createdUser.passwordHash ? 'yes' : 'no'}`
      );
      return createdUser;
    } catch (error) {
      logger.error('Error creating user in SQLite repository', {
        error: error instanceof Error ? error.stack : String(error),
        params,
      });
      throw error;
    }
  }

  /**
   * Finds a user by ID
   * @param id The user ID
   * @returns The user if found, null otherwise
   */
  async findById(id: Shared.IRI): Promise<User | null> {
    try {
      // Get database with connection validation
      const db = this.getDatabase();

      // Query database
      const result = await db
        .select()
        .from(users)
        .where(eq(users.id, id as string));

      // Return null if not found
      if (!result.length) {
        return null;
      }

      // Convert database record to domain entity
      return this.toDomain(result[0]);
    } catch (error) {
      logger.error('Error finding user by ID in SQLite repository', {
        error: error instanceof Error ? error.stack : String(error),
        id,
      });
      throw error;
    }
  }

  /**
   * Finds a user by username
   * @param username The username
   * @returns The user if found, null otherwise
   */
  async findByUsername(username: string): Promise<User | null> {
    try {
      // Get database with connection validation
      const db = this.getDatabase();

      // Query database
      const result = await db
        .select()
        .from(users)
        .where(eq(users.username, username));

      // Return null if not found
      if (!result.length) {
        return null;
      }

      // Convert database record to domain entity
      return this.toDomain(result[0]);
    } catch (error) {
      logger.error('Error finding user by username in SQLite repository', {
        error: error instanceof Error ? error.stack : String(error),
        username,
      });
      throw error;
    }
  }

  /**
   * Finds a user by email
   * @param email The email
   * @returns The user if found, null otherwise
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      // Get database with connection validation
      const db = this.getDatabase();

      // Query database
      const result = await db
        .select()
        .from(users)
        .where(eq(users.email, email));

      // Return null if not found
      if (!result.length) {
        return null;
      }

      // Convert database record to domain entity
      return this.toDomain(result[0]);
    } catch (error) {
      logger.error('Error finding user by email in SQLite repository', {
        error: error instanceof Error ? error.stack : String(error),
        email,
      });
      throw error;
    }
  }

  /**
   * Updates a user
   * @param id The user ID
   * @param params The user update parameters
   * @returns The updated user if found, null otherwise
   */
  async update(id: Shared.IRI, params: UserUpdateParams): Promise<User | null> {
    try {
      // Check if user exists
      const existingUser = await this.findById(id);
      if (!existingUser) {
        return null;
      }

      // Create a merged entity
      const mergedUser = User.create({
        ...existingUser.toObject(),
        ...(params as Partial<User>),
        updatedAt: new Date(),
      });
      const obj = mergedUser.toObject();

      // Prepare update values
      const updateValues: Record<string, unknown> = {
        updatedAt: (obj.updatedAt as Date).getTime(),
      };

      // Add optional fields if provided
      if (params.username !== undefined)
        updateValues.username = params.username;
      if (params.email !== undefined) updateValues.email = params.email;
      if (params.passwordHash !== undefined)
        updateValues.passwordHash = params.passwordHash;
      if (params.firstName !== undefined)
        updateValues.firstName = params.firstName;
      if (params.lastName !== undefined)
        updateValues.lastName = params.lastName;
      if (params.roles !== undefined)
        updateValues.roles = JSON.stringify(params.roles);
      if (params.permissions !== undefined)
        updateValues.permissions = JSON.stringify(params.permissions);
      if (params.isActive !== undefined)
        updateValues.isActive = params.isActive ? 1 : 0;
      if (params.lastLogin !== undefined) {
        updateValues.lastLogin = params.lastLogin
          ? params.lastLogin.getTime()
          : null;
      }
      if (params.metadata !== undefined) {
        updateValues.metadata = params.metadata
          ? JSON.stringify(params.metadata)
          : null;
      }

      // Get database with connection validation
      const db = this.getDatabase();

      // Use transaction with returning() to fetch updated record atomically
      const startTime = Date.now();
      const result = await db.transaction(async (tx) => {
        return await tx
          .update(users)
          .set(updateValues)
          .where(eq(users.id, id as string))
          .returning();
      });
      const duration = Date.now() - startTime;

      // Log query
      queryLogger.logQuery(
        'UPDATE User',
        [
          id,
          SensitiveValue.from({
            ...updateValues,
            ...(updateValues.passwordHash
              ? { passwordHash: '[REDACTED]' }
              : {}),
          }),
        ],
        duration,
        'sqlite'
      );

      // Check if update was successful
      if (!result[0]) {
        throw new Error('Failed to update user: no result returned');
      }

      // Convert database record back to domain entity
      return this.toDomain(result[0]);
    } catch (error) {
      logger.error('Error updating user in SQLite repository', {
        error: error instanceof Error ? error.stack : String(error),
        id,
        params,
      });
      throw error;
    }
  }

  /**
   * Deletes a user
   * @param id The user ID
   * @returns True if the user was deleted, false otherwise
   */
  async delete(id: Shared.IRI): Promise<boolean> {
    try {
      // Get database with connection validation
      const db = this.getDatabase();

      // Delete from database
      const result = await db
        .delete(users)
        .where(eq(users.id, id as string))
        .returning({ id: users.id });

      // Return true if deleted, false otherwise
      return result.length > 0;
    } catch (error) {
      logger.error('Error deleting user in SQLite repository', {
        error: error instanceof Error ? error.stack : String(error),
        id,
      });
      throw error;
    }
  }

  /**
   * Finds users by query parameters
   * @param params The query parameters
   * @returns The users matching the query
   */
  async findByQuery(params: UserQueryParams): Promise<User[]> {
    try {
      // Get database with connection validation
      const db = this.getDatabase();

      // Build query
      let query = db.select().from(users);

      // Add filters
      const conditions = [];
      if (params.username) {
        conditions.push(like(users.username, `%${params.username}%`));
      }
      if (params.email) {
        conditions.push(like(users.email, `%${params.email}%`));
      }
      if (params.isActive !== undefined) {
        conditions.push(eq(users.isActive, params.isActive ? 1 : 0));
      }
      if (params.role) {
        // For SQLite, we need to use a JSON string contains check
        // This is a simple implementation and might not be perfect for all cases
        conditions.push(like(users.roles, `%${params.role}%`));
      }

      // Apply filters if any
      if (conditions.length === 1) {
        query = query.where(conditions[0]) as typeof query;
      } else if (conditions.length > 1) {
        query = query.where(and(...conditions)) as typeof query;
      }

      // Apply pagination
      if (params.limit) {
        query = query.limit(params.limit) as typeof query;
      }
      if (params.offset) {
        query = query.offset(params.offset) as typeof query;
      }

      // Execute query
      const result = await query;

      // Convert database records to domain entities
      return result.map((record) => this.toDomain(record));
    } catch (error) {
      logger.error('Error finding users by query in SQLite repository', {
        error: error instanceof Error ? error.stack : String(error),
        params,
      });
      throw error;
    }
  }

  /**
   * Counts users by query parameters
   * @param params The query parameters
   * @returns The number of users matching the query
   */
  async countByQuery(params: UserQueryParams): Promise<number> {
    try {
      // Get database with connection validation
      const db = this.getDatabase();

      // Build query
      let query = db.select({ count: sql`count(*)` }).from(users);

      // Add filters
      const conditions = [];
      if (params.username) {
        conditions.push(like(users.username, `%${params.username}%`));
      }
      if (params.email) {
        conditions.push(like(users.email, `%${params.email}%`));
      }
      if (params.isActive !== undefined) {
        conditions.push(eq(users.isActive, params.isActive ? 1 : 0));
      }
      if (params.role) {
        // For SQLite, we need to use a JSON string contains check
        conditions.push(like(users.roles, `%${params.role}%`));
      }

      // Apply filters if any
      if (conditions.length === 1) {
        query = query.where(conditions[0]) as typeof query;
      } else if (conditions.length > 1) {
        query = query.where(and(...conditions)) as typeof query;
      }

      // Execute query
      const result = await query;

      // Return count
      return Number(result[0]?.count || 0);
    } catch (error) {
      logger.error('Error counting users by query in SQLite repository', {
        error: error instanceof Error ? error.stack : String(error),
        params,
      });
      throw error;
    }
  }

  /**
   * Converts a database record to a domain entity
   * @param record The database record
   * @returns The domain entity
   */
  private toDomain(record: Record<string, unknown>): User {
    // Parse JSON fields
    const roles =
      typeof record.roles === 'string'
        ? (JSON.parse(record.roles as string) as UserRole[])
        : (record.roles as UserRole[]);

    const permissions =
      typeof record.permissions === 'string'
        ? (JSON.parse(record.permissions as string) as UserPermission[])
        : (record.permissions as UserPermission[]);

    const metadata =
      typeof record.metadata === 'string' && record.metadata
        ? JSON.parse(record.metadata as string)
        : (record.metadata as Record<string, unknown> | undefined);

    // Convert integer timestamps to Date objects
    const createdAt =
      typeof record.createdAt === 'number'
        ? new Date(record.createdAt)
        : (record.createdAt as Date);

    const updatedAt =
      typeof record.updatedAt === 'number'
        ? new Date(record.updatedAt)
        : (record.updatedAt as Date);

    const lastLogin =
      typeof record.lastLogin === 'number'
        ? new Date(record.lastLogin)
        : (record.lastLogin as Date | undefined);

    // Create user entity
    return User.create({
      id: record.id as Shared.IRI,
      username: record.username as string,
      email: record.email as string,
      passwordHash: record.passwordHash as string | undefined,
      firstName: record.firstName as string | undefined,
      lastName: record.lastName as string | undefined,
      roles,
      permissions,
      isActive: Boolean(record.isActive),
      lastLogin,
      metadata,
      createdAt,
      updatedAt,
    });
  }
}
