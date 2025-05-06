/**
 * User Service
 *
 * This service handles user management operations, including
 * user creation, authentication, and authorization.
 */

import { User, UserRole, UserPermission } from './user.entity';
import { UserRepository, UserCreateParams, UserUpdateParams, UserQueryParams } from './user.repository';
import { PasswordService } from '../../auth/services/password.service';
import { logger } from '../../utils/logging/logger.service';
import { Shared } from 'openbadges-types';

/**
 * User service for managing users
 */
export class UserService {
  constructor(private userRepository: UserRepository) {}

  /**
   * Create a new user
   * @param params User creation parameters
   * @param password Plain text password (will be hashed)
   * @returns The created user
   */
  async createUser(params: Omit<UserCreateParams, 'passwordHash'>, password?: string): Promise<User> {
    try {
      // Check if username already exists
      const existingUsername = await this.userRepository.findByUsername(params.username);
      if (existingUsername) {
        throw new Error('Username already exists');
      }

      // Check if email already exists
      const existingEmail = await this.userRepository.findByEmail(params.email);
      if (existingEmail) {
        throw new Error('Email already exists');
      }

      // Create user params object
      const userParams: UserCreateParams = {
        ...params
      };

      // Hash password if provided
      if (password) {
        userParams.passwordHash = await PasswordService.hashPassword(password);
        logger.debug(`Password hash created for user ${params.username}`);
      }

      // Create user
      const user = await this.userRepository.create(userParams);
      logger.debug(`User created: ${user.id} (${user.username}) with passwordHash: ${user.passwordHash ? 'yes' : 'no'}`);
      return user;
    } catch (error) {
      logger.logError('Failed to create user', error as Error);
      throw error;
    }
  }

  /**
   * Get a user by ID
   * @param id User ID
   * @returns The user if found, null otherwise
   */
  async getUserById(id: Shared.IRI): Promise<User | null> {
    try {
      return await this.userRepository.findById(id);
    } catch (error) {
      logger.logError('Failed to get user by ID', error as Error);
      throw error;
    }
  }

  /**
   * Get a user by username
   * @param username Username
   * @returns The user if found, null otherwise
   */
  async getUserByUsername(username: string): Promise<User | null> {
    try {
      return await this.userRepository.findByUsername(username);
    } catch (error) {
      logger.logError('Failed to get user by username', error as Error);
      throw error;
    }
  }

  /**
   * Get a user by email
   * @param email Email
   * @returns The user if found, null otherwise
   */
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      return await this.userRepository.findByEmail(email);
    } catch (error) {
      logger.logError('Failed to get user by email', error as Error);
      throw error;
    }
  }

  /**
   * Update a user
   * @param id User ID
   * @param params User update parameters
   * @returns The updated user if found, null otherwise
   */
  async updateUser(id: Shared.IRI, params: Omit<UserUpdateParams, 'passwordHash'>): Promise<User | null> {
    try {
      // Check if user exists
      const existingUser = await this.userRepository.findById(id);
      if (!existingUser) {
        return null;
      }

      // Create update params
      const updateParams: UserUpdateParams = {
        ...params
      };

      // Update user
      return await this.userRepository.update(id, updateParams);
    } catch (error) {
      logger.logError('Failed to update user', error as Error);
      throw error;
    }
  }

  /**
   * Update a user's password
   * @param id User ID
   * @param password New password
   * @returns The updated user if found, null otherwise
   */
  async updatePassword(id: Shared.IRI, password: string): Promise<User | null> {
    try {
      // Check if user exists
      const existingUser = await this.userRepository.findById(id);
      if (!existingUser) {
        return null;
      }

      // Hash password
      const passwordHash = await PasswordService.hashPassword(password);

      // Update user
      return await this.userRepository.update(id, { passwordHash });
    } catch (error) {
      logger.logError('Failed to update password', error as Error);
      throw error;
    }
  }

  /**
   * Delete a user
   * @param id User ID
   * @returns True if the user was deleted, false otherwise
   */
  async deleteUser(id: Shared.IRI): Promise<boolean> {
    try {
      return await this.userRepository.delete(id);
    } catch (error) {
      logger.logError('Failed to delete user', error as Error);
      throw error;
    }
  }

  /**
   * Authenticate a user with username/email and password
   * @param usernameOrEmail Username or email
   * @param password Password
   * @returns The authenticated user if successful, null otherwise
   */
  async authenticateUser(usernameOrEmail: string, password: string): Promise<User | null> {
    try {
      // Find user by username or email
      const isEmail = usernameOrEmail.includes('@');
      const user = isEmail
        ? await this.userRepository.findByEmail(usernameOrEmail)
        : await this.userRepository.findByUsername(usernameOrEmail);

      // Check if user exists and is active
      if (!user || !user.isActive) {
        return null;
      }

      // Check if user has a password
      if (!user.passwordHash) {
        logger.warn(`User ${user.id} has no password hash`);
        return null;
      }

      // Verify password
      const isPasswordValid = await PasswordService.verifyPassword(password, user.passwordHash);
      if (!isPasswordValid) {
        return null;
      }

      // Update last login
      await this.userRepository.update(user.id, { lastLogin: new Date() });

      return user;
    } catch (error) {
      logger.logError('Failed to authenticate user', error as Error);
      throw error;
    }
  }

  /**
   * Find users by query
   * @param params Query parameters
   * @returns Users matching the query
   */
  async findUsers(params: UserQueryParams): Promise<User[]> {
    try {
      return await this.userRepository.findByQuery(params);
    } catch (error) {
      logger.logError('Failed to find users', error as Error);
      throw error;
    }
  }

  /**
   * Count users by query
   * @param params Query parameters
   * @returns Number of users matching the query
   */
  async countUsers(params: UserQueryParams): Promise<number> {
    try {
      return await this.userRepository.countByQuery(params);
    } catch (error) {
      logger.logError('Failed to count users', error as Error);
      throw error;
    }
  }

  /**
   * Add roles to a user
   * @param id User ID
   * @param roles Roles to add
   * @returns The updated user if found, null otherwise
   */
  async addRoles(id: Shared.IRI, roles: UserRole[]): Promise<User | null> {
    try {
      // Check if user exists
      const user = await this.userRepository.findById(id);
      if (!user) {
        return null;
      }

      // Add roles
      const updatedRoles = [...new Set([...user.roles, ...roles])];

      // Update user
      return await this.userRepository.update(id, { roles: updatedRoles });
    } catch (error) {
      logger.logError('Failed to add roles to user', error as Error);
      throw error;
    }
  }

  /**
   * Remove roles from a user
   * @param id User ID
   * @param roles Roles to remove
   * @returns The updated user if found, null otherwise
   */
  async removeRoles(id: Shared.IRI, roles: UserRole[]): Promise<User | null> {
    try {
      // Check if user exists
      const user = await this.userRepository.findById(id);
      if (!user) {
        return null;
      }

      // Remove roles
      const updatedRoles = user.roles.filter(role => !roles.includes(role));

      // Ensure user has at least one role
      if (updatedRoles.length === 0) {
        updatedRoles.push(UserRole.USER);
      }

      // Update user
      return await this.userRepository.update(id, { roles: updatedRoles });
    } catch (error) {
      logger.logError('Failed to remove roles from user', error as Error);
      throw error;
    }
  }

  /**
   * Add permissions to a user
   * @param id User ID
   * @param permissions Permissions to add
   * @returns The updated user if found, null otherwise
   */
  async addPermissions(id: Shared.IRI, permissions: UserPermission[]): Promise<User | null> {
    try {
      // Check if user exists
      const user = await this.userRepository.findById(id);
      if (!user) {
        return null;
      }

      // Add permissions
      const updatedPermissions = [...new Set([...user.permissions, ...permissions])];

      // Update user
      return await this.userRepository.update(id, { permissions: updatedPermissions });
    } catch (error) {
      logger.logError('Failed to add permissions to user', error as Error);
      throw error;
    }
  }

  /**
   * Remove permissions from a user
   * @param id User ID
   * @param permissions Permissions to remove
   * @returns The updated user if found, null otherwise
   */
  async removePermissions(id: Shared.IRI, permissions: UserPermission[]): Promise<User | null> {
    try {
      // Check if user exists
      const user = await this.userRepository.findById(id);
      if (!user) {
        return null;
      }

      // Remove permissions
      const updatedPermissions = user.permissions.filter(
        permission => !permissions.includes(permission)
      );

      // Update user
      return await this.userRepository.update(id, { permissions: updatedPermissions });
    } catch (error) {
      logger.logError('Failed to remove permissions from user', error as Error);
      throw error;
    }
  }
}
