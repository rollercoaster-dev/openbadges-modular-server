/**
 * User Controller
 * 
 * This controller handles HTTP requests related to user management.
 */

import { UserService } from './user.service';
import { User, UserRole, UserPermission } from './user.entity';
import { UserCreateParams, UserUpdateParams, UserQueryParams } from './user.repository';
import { logger } from '../../utils/logging/logger.service';
import { Shared } from 'openbadges-types';
import { PasswordService } from '../../auth/services/password.service';

/**
 * User controller for handling user-related HTTP requests
 */
export class UserController {
  constructor(private userService: UserService) {}

  /**
   * Create a new user
   * @param data User creation data
   * @returns The created user
   */
  async createUser(data: {
    username: string;
    email: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    roles?: UserRole[];
    isActive?: boolean;
    metadata?: Record<string, unknown>;
  }): Promise<{ status: number; body: Record<string, unknown> }> {
    try {
      // Validate password if provided
      if (data.password && !PasswordService.isPasswordSecure(data.password)) {
        return {
          status: 400,
          body: {
            success: false,
            error: 'Password does not meet security requirements'
          }
        };
      }

      // Create user params
      const userParams: Omit<UserCreateParams, 'passwordHash'> = {
        username: data.username,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        roles: data.roles,
        isActive: data.isActive,
        metadata: data.metadata
      };

      // Create user
      const user = await this.userService.createUser(userParams, data.password);

      return {
        status: 201,
        body: {
          success: true,
          user: user.toPublicObject()
        }
      };
    } catch (error) {
      logger.logError('Failed to create user', error as Error);
      
      // Handle specific errors
      if ((error as Error).message.includes('already exists')) {
        return {
          status: 409,
          body: {
            success: false,
            error: (error as Error).message
          }
        };
      }
      
      return {
        status: 500,
        body: {
          success: false,
          error: 'Failed to create user'
        }
      };
    }
  }

  /**
   * Get a user by ID
   * @param id User ID
   * @returns The user
   */
  async getUserById(id: Shared.IRI): Promise<{ status: number; body: Record<string, unknown> }> {
    try {
      const user = await this.userService.getUserById(id);
      
      if (!user) {
        return {
          status: 404,
          body: {
            success: false,
            error: 'User not found'
          }
        };
      }
      
      return {
        status: 200,
        body: {
          success: true,
          user: user.toPublicObject()
        }
      };
    } catch (error) {
      logger.logError('Failed to get user by ID', error as Error);
      
      return {
        status: 500,
        body: {
          success: false,
          error: 'Failed to get user'
        }
      };
    }
  }

  /**
   * Update a user
   * @param id User ID
   * @param data User update data
   * @returns The updated user
   */
  async updateUser(id: Shared.IRI, data: {
    username?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    roles?: UserRole[];
    isActive?: boolean;
    metadata?: Record<string, unknown>;
  }): Promise<{ status: number; body: Record<string, unknown> }> {
    try {
      // Create update params
      const updateParams: Omit<UserUpdateParams, 'passwordHash'> = {
        ...data
      };
      
      // Update user
      const user = await this.userService.updateUser(id, updateParams);
      
      if (!user) {
        return {
          status: 404,
          body: {
            success: false,
            error: 'User not found'
          }
        };
      }
      
      return {
        status: 200,
        body: {
          success: true,
          user: user.toPublicObject()
        }
      };
    } catch (error) {
      logger.logError('Failed to update user', error as Error);
      
      return {
        status: 500,
        body: {
          success: false,
          error: 'Failed to update user'
        }
      };
    }
  }

  /**
   * Change a user's password
   * @param id User ID
   * @param data Password change data
   * @returns Success status
   */
  async changePassword(id: Shared.IRI, data: {
    currentPassword?: string;
    newPassword: string;
  }): Promise<{ status: number; body: Record<string, unknown> }> {
    try {
      // Validate new password
      if (!PasswordService.isPasswordSecure(data.newPassword)) {
        return {
          status: 400,
          body: {
            success: false,
            error: 'New password does not meet security requirements'
          }
        };
      }
      
      // Get user
      const user = await this.userService.getUserById(id);
      
      if (!user) {
        return {
          status: 404,
          body: {
            success: false,
            error: 'User not found'
          }
        };
      }
      
      // If current password is provided, verify it
      if (data.currentPassword) {
        if (!user.passwordHash) {
          return {
            status: 400,
            body: {
              success: false,
              error: 'User does not have a password set'
            }
          };
        }
        
        const isValid = await PasswordService.verifyPassword(data.currentPassword, user.passwordHash);
        
        if (!isValid) {
          return {
            status: 401,
            body: {
              success: false,
              error: 'Current password is incorrect'
            }
          };
        }
      }
      
      // Update password
      await this.userService.updatePassword(id, data.newPassword);
      
      return {
        status: 200,
        body: {
          success: true,
          message: 'Password updated successfully'
        }
      };
    } catch (error) {
      logger.logError('Failed to change password', error as Error);
      
      return {
        status: 500,
        body: {
          success: false,
          error: 'Failed to change password'
        }
      };
    }
  }

  /**
   * Delete a user
   * @param id User ID
   * @returns Success status
   */
  async deleteUser(id: Shared.IRI): Promise<{ status: number; body: Record<string, unknown> }> {
    try {
      const success = await this.userService.deleteUser(id);
      
      if (!success) {
        return {
          status: 404,
          body: {
            success: false,
            error: 'User not found'
          }
        };
      }
      
      return {
        status: 200,
        body: {
          success: true,
          message: 'User deleted successfully'
        }
      };
    } catch (error) {
      logger.logError('Failed to delete user', error as Error);
      
      return {
        status: 500,
        body: {
          success: false,
          error: 'Failed to delete user'
        }
      };
    }
  }

  /**
   * Get users by query
   * @param query Query parameters
   * @returns Users matching the query
   */
  async getUsers(query: {
    username?: string;
    email?: string;
    role?: UserRole;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ status: number; body: Record<string, unknown> }> {
    try {
      // Set default pagination
      const page = query.page || 1;
      const limit = query.limit || 20;
      const offset = (page - 1) * limit;
      
      // Create query params
      const queryParams: UserQueryParams = {
        username: query.username,
        email: query.email,
        role: query.role,
        isActive: query.isActive,
        limit,
        offset
      };
      
      // Get users and count
      const [users, total] = await Promise.all([
        this.userService.findUsers(queryParams),
        this.userService.countUsers(queryParams)
      ]);
      
      return {
        status: 200,
        body: {
          success: true,
          users: users.map(user => user.toPublicObject()),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      };
    } catch (error) {
      logger.logError('Failed to get users', error as Error);
      
      return {
        status: 500,
        body: {
          success: false,
          error: 'Failed to get users'
        }
      };
    }
  }

  /**
   * Add roles to a user
   * @param id User ID
   * @param roles Roles to add
   * @returns The updated user
   */
  async addRoles(id: Shared.IRI, roles: UserRole[]): Promise<{ status: number; body: Record<string, unknown> }> {
    try {
      const user = await this.userService.addRoles(id, roles);
      
      if (!user) {
        return {
          status: 404,
          body: {
            success: false,
            error: 'User not found'
          }
        };
      }
      
      return {
        status: 200,
        body: {
          success: true,
          user: user.toPublicObject()
        }
      };
    } catch (error) {
      logger.logError('Failed to add roles to user', error as Error);
      
      return {
        status: 500,
        body: {
          success: false,
          error: 'Failed to add roles to user'
        }
      };
    }
  }

  /**
   * Remove roles from a user
   * @param id User ID
   * @param roles Roles to remove
   * @returns The updated user
   */
  async removeRoles(id: Shared.IRI, roles: UserRole[]): Promise<{ status: number; body: Record<string, unknown> }> {
    try {
      const user = await this.userService.removeRoles(id, roles);
      
      if (!user) {
        return {
          status: 404,
          body: {
            success: false,
            error: 'User not found'
          }
        };
      }
      
      return {
        status: 200,
        body: {
          success: true,
          user: user.toPublicObject()
        }
      };
    } catch (error) {
      logger.logError('Failed to remove roles from user', error as Error);
      
      return {
        status: 500,
        body: {
          success: false,
          error: 'Failed to remove roles from user'
        }
      };
    }
  }

  /**
   * Add permissions to a user
   * @param id User ID
   * @param permissions Permissions to add
   * @returns The updated user
   */
  async addPermissions(id: Shared.IRI, permissions: UserPermission[]): Promise<{ status: number; body: Record<string, unknown> }> {
    try {
      const user = await this.userService.addPermissions(id, permissions);
      
      if (!user) {
        return {
          status: 404,
          body: {
            success: false,
            error: 'User not found'
          }
        };
      }
      
      return {
        status: 200,
        body: {
          success: true,
          user: user.toPublicObject()
        }
      };
    } catch (error) {
      logger.logError('Failed to add permissions to user', error as Error);
      
      return {
        status: 500,
        body: {
          success: false,
          error: 'Failed to add permissions to user'
        }
      };
    }
  }

  /**
   * Remove permissions from a user
   * @param id User ID
   * @param permissions Permissions to remove
   * @returns The updated user
   */
  async removePermissions(id: Shared.IRI, permissions: UserPermission[]): Promise<{ status: number; body: Record<string, unknown> }> {
    try {
      const user = await this.userService.removePermissions(id, permissions);
      
      if (!user) {
        return {
          status: 404,
          body: {
            success: false,
            error: 'User not found'
          }
        };
      }
      
      return {
        status: 200,
        body: {
          success: true,
          user: user.toPublicObject()
        }
      };
    } catch (error) {
      logger.logError('Failed to remove permissions from user', error as Error);
      
      return {
        status: 500,
        body: {
          success: false,
          error: 'Failed to remove permissions from user'
        }
      };
    }
  }
}
