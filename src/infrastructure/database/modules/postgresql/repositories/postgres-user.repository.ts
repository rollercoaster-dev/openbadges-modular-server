/**
 * PostgreSQL implementation of the User repository
 *
 * This class implements the UserRepository interface using PostgreSQL
 * and the Data Mapper pattern with Drizzle ORM.
 */

import { eq, and, or, like, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { User, UserRole, UserPermission } from '@domains/user/user.entity';
import { UserRepository, UserCreateParams, UserUpdateParams, UserQueryParams } from '@domains/user/user.repository';
import { users } from '../schema';
import { Shared } from 'openbadges-types';
import { logger } from '@utils/logging/logger.service';

/**
 * PostgreSQL implementation of the User repository
 */
export class PostgresUserRepository implements UserRepository {
  private db;

  /**
   * Constructor
   * @param client PostgreSQL client
   */
  constructor(client: postgres.Sql<{}>) {
    this.db = drizzle(client);
  }

  /**
   * Creates a new user
   * @param params The user creation parameters
   * @returns The created user
   */
  async create(params: UserCreateParams): Promise<User> {
    try {
      // Create a new user entity
      const newUser = User.create(params as Partial<User>);
      const obj = newUser.toObject();

      // Insert into database
      await this.db.insert(users).values({
        id: obj.id as string,
        username: obj.username as string,
        email: obj.email as string,
        passwordHash: obj.passwordHash as string | null,
        firstName: obj.firstName as string | null,
        lastName: obj.lastName as string | null,
        roles: JSON.stringify(obj.roles),
        permissions: JSON.stringify(obj.permissions),
        isActive: obj.isActive as boolean,
        lastLogin: obj.lastLogin as Date | null,
        metadata: obj.metadata as Record<string, unknown> | null,
        createdAt: obj.createdAt as Date,
        updatedAt: obj.updatedAt as Date
      });

      return newUser;
    } catch (error) {
      logger.error('Error creating user in PostgreSQL repository', {
        error: error instanceof Error ? error.stack : String(error),
        params
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
      // Query database
      const result = await this.db
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
      logger.error('Error finding user by ID in PostgreSQL repository', {
        error: error instanceof Error ? error.stack : String(error),
        id
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
      // Query database
      const result = await this.db
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
      logger.error('Error finding user by username in PostgreSQL repository', {
        error: error instanceof Error ? error.stack : String(error),
        username
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
      // Query database
      const result = await this.db
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
      logger.error('Error finding user by email in PostgreSQL repository', {
        error: error instanceof Error ? error.stack : String(error),
        email
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
        ...params as Partial<User>,
        updatedAt: new Date()
      });
      const obj = mergedUser.toObject();

      // Prepare update values
      const updateValues: Record<string, unknown> = {
        updatedAt: obj.updatedAt as Date
      };

      // Add optional fields if provided
      if (params.username !== undefined) updateValues.username = params.username;
      if (params.email !== undefined) updateValues.email = params.email;
      if (params.passwordHash !== undefined) updateValues.passwordHash = params.passwordHash;
      if (params.firstName !== undefined) updateValues.firstName = params.firstName;
      if (params.lastName !== undefined) updateValues.lastName = params.lastName;
      if (params.roles !== undefined) updateValues.roles = JSON.stringify(params.roles);
      if (params.permissions !== undefined) updateValues.permissions = JSON.stringify(params.permissions);
      if (params.isActive !== undefined) updateValues.isActive = params.isActive;
      if (params.lastLogin !== undefined) updateValues.lastLogin = params.lastLogin;
      if (params.metadata !== undefined) updateValues.metadata = params.metadata;

      // Update in database
      await this.db
        .update(users)
        .set(updateValues)
        .where(eq(users.id, id as string));

      return mergedUser;
    } catch (error) {
      logger.error('Error updating user in PostgreSQL repository', {
        error: error instanceof Error ? error.stack : String(error),
        id,
        params
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
      // Delete from database
      const result = await this.db
        .delete(users)
        .where(eq(users.id, id as string))
        .returning({ id: users.id });

      // Return true if deleted, false otherwise
      return result.length > 0;
    } catch (error) {
      logger.error('Error deleting user in PostgreSQL repository', {
        error: error instanceof Error ? error.stack : String(error),
        id
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
      // Build query
      let query = this.db.select().from(users);

      // Add filters
      const conditions = [];
      if (params.username) {
        conditions.push(like(users.username, `%${params.username}%`));
      }
      if (params.email) {
        conditions.push(like(users.email, `%${params.email}%`));
      }
      if (params.isActive !== undefined) {
        conditions.push(eq(users.isActive, params.isActive));
      }
      if (params.role) {
        // For role filtering, we need to use a JSON contains operator
        // This is PostgreSQL specific syntax
        conditions.push(
          sql`${users.roles}::jsonb @> ${JSON.stringify([params.role])}::jsonb`
        );
      }

      // Apply filters if any
      if (conditions.length > 0) {
        query = query.where(or(...conditions));
      }

      // Apply pagination
      if (params.limit) {
        query = query.limit(params.limit);
      }
      if (params.offset) {
        query = query.offset(params.offset);
      }

      // Execute query
      const result = await query;

      // Convert database records to domain entities
      return result.map(record => this.toDomain(record));
    } catch (error) {
      logger.error('Error finding users by query in PostgreSQL repository', {
        error: error instanceof Error ? error.stack : String(error),
        params
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
      // Build query
      let query = this.db.select({ count: sql`count(*)` }).from(users);

      // Add filters
      const conditions = [];
      if (params.username) {
        conditions.push(like(users.username, `%${params.username}%`));
      }
      if (params.email) {
        conditions.push(like(users.email, `%${params.email}%`));
      }
      if (params.isActive !== undefined) {
        conditions.push(eq(users.isActive, params.isActive));
      }
      if (params.role) {
        // For role filtering, we need to use a JSON contains operator
        // This is PostgreSQL specific syntax
        conditions.push(
          sql`${users.roles}::jsonb @> ${JSON.stringify([params.role])}::jsonb`
        );
      }

      // Apply filters if any
      if (conditions.length > 0) {
        query = query.where(or(...conditions));
      }

      // Execute query
      const result = await query;

      // Return count
      return Number(result[0]?.count || 0);
    } catch (error) {
      logger.error('Error counting users by query in PostgreSQL repository', {
        error: error instanceof Error ? error.stack : String(error),
        params
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
    const roles = typeof record.roles === 'string'
      ? JSON.parse(record.roles as string) as UserRole[]
      : record.roles as UserRole[];

    const permissions = typeof record.permissions === 'string'
      ? JSON.parse(record.permissions as string) as UserPermission[]
      : record.permissions as UserPermission[];

    const metadata = typeof record.metadata === 'string' && record.metadata
      ? JSON.parse(record.metadata as string)
      : record.metadata as Record<string, unknown> | undefined;

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
      lastLogin: record.lastLogin as Date | undefined,
      metadata,
      createdAt: record.createdAt as Date,
      updatedAt: record.updatedAt as Date
    });
  }
}
