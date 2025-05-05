/**
 * User Repository Interface
 * 
 * This interface defines the contract for user repositories that handle
 * persistence of user entities.
 */

import { User, UserRole, UserPermission } from './user.entity';
import { Shared } from 'openbadges-types';

/**
 * Parameters for creating a user
 */
export interface UserCreateParams {
  username: string;
  email: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
  roles?: UserRole[];
  permissions?: UserPermission[];
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Parameters for updating a user
 */
export interface UserUpdateParams {
  username?: string;
  email?: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
  roles?: UserRole[];
  permissions?: UserPermission[];
  isActive?: boolean;
  lastLogin?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Parameters for querying users
 */
export interface UserQueryParams {
  username?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * User repository interface
 */
export interface UserRepository {
  /**
   * Creates a new user
   * @param params The user creation parameters
   * @returns The created user
   */
  create(params: UserCreateParams): Promise<User>;

  /**
   * Finds a user by ID
   * @param id The user ID
   * @returns The user if found, null otherwise
   */
  findById(id: Shared.IRI): Promise<User | null>;

  /**
   * Finds a user by username
   * @param username The username
   * @returns The user if found, null otherwise
   */
  findByUsername(username: string): Promise<User | null>;

  /**
   * Finds a user by email
   * @param email The email
   * @returns The user if found, null otherwise
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Updates a user
   * @param id The user ID
   * @param params The user update parameters
   * @returns The updated user if found, null otherwise
   */
  update(id: Shared.IRI, params: UserUpdateParams): Promise<User | null>;

  /**
   * Deletes a user
   * @param id The user ID
   * @returns True if the user was deleted, false otherwise
   */
  delete(id: Shared.IRI): Promise<boolean>;

  /**
   * Finds users by query parameters
   * @param params The query parameters
   * @returns The users matching the query
   */
  findByQuery(params: UserQueryParams): Promise<User[]>;

  /**
   * Counts users by query parameters
   * @param params The query parameters
   * @returns The number of users matching the query
   */
  countByQuery(params: UserQueryParams): Promise<number>;
}
