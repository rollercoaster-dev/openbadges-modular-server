/**
 * Authentication Controller
 * 
 * This controller handles authentication-related HTTP requests.
 */

import { UserService } from '../domains/user/user.service';
import { PasswordService } from './services/password.service';
import { JwtService } from './services/jwt.service';
import { logger } from '../utils/logging/logger.service';

/**
 * Authentication controller for handling auth-related HTTP requests
 */
export class AuthController {
  constructor(private userService: UserService) {}

  /**
   * Login with username/email and password
   * @param data Login data
   * @returns Authentication result
   */
  async login(data: {
    usernameOrEmail: string;
    password: string;
  }): Promise<{ status: number; body: Record<string, unknown> }> {
    try {
      // Validate input
      if (!data.usernameOrEmail || !data.password) {
        return {
          status: 400,
          body: {
            success: false,
            error: 'Username/email and password are required'
          }
        };
      }

      // Authenticate user
      const user = await this.userService.authenticateUser(data.usernameOrEmail, data.password);
      
      if (!user) {
        logger.debug(`Failed login attempt for ${data.usernameOrEmail}`);
        return {
          status: 401,
          body: {
            success: false,
            error: 'Invalid credentials'
          }
        };
      }

      // Generate JWT token
      const token = await JwtService.generateToken({
        sub: user.id,
        provider: 'local',
        claims: {
          username: user.username,
          email: user.email,
          roles: user.roles,
          permissions: user.permissions
        }
      });

      logger.info(`User ${user.username} logged in successfully`);
      
      return {
        status: 200,
        body: {
          success: true,
          token,
          user: user.toPublicObject()
        }
      };
    } catch (error) {
      logger.logError('Login error', error as Error);
      
      return {
        status: 500,
        body: {
          success: false,
          error: 'Authentication failed'
        }
      };
    }
  }

  /**
   * Register a new user
   * @param data Registration data
   * @returns Registration result
   */
  async register(data: {
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }): Promise<{ status: number; body: Record<string, unknown> }> {
    try {
      // Validate input
      if (!data.username || !data.email || !data.password) {
        return {
          status: 400,
          body: {
            success: false,
            error: 'Username, email, and password are required'
          }
        };
      }

      // Validate password
      if (!PasswordService.isPasswordSecure(data.password)) {
        return {
          status: 400,
          body: {
            success: false,
            error: 'Password does not meet security requirements'
          }
        };
      }

      // Create user
      const user = await this.userService.createUser({
        username: data.username,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName
      }, data.password);

      // Generate JWT token
      const token = await JwtService.generateToken({
        sub: user.id,
        provider: 'local',
        claims: {
          username: user.username,
          email: user.email,
          roles: user.roles,
          permissions: user.permissions
        }
      });

      logger.info(`User ${user.username} registered successfully`);
      
      return {
        status: 201,
        body: {
          success: true,
          token,
          user: user.toPublicObject()
        }
      };
    } catch (error) {
      logger.logError('Registration error', error as Error);
      
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
          error: 'Registration failed'
        }
      };
    }
  }

  /**
   * Get the current user's profile
   * @param userId User ID
   * @returns User profile
   */
  async getProfile(userId: string): Promise<{ status: number; body: Record<string, unknown> }> {
    try {
      const user = await this.userService.getUserById(userId);
      
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
      logger.logError('Get profile error', error as Error);
      
      return {
        status: 500,
        body: {
          success: false,
          error: 'Failed to get user profile'
        }
      };
    }
  }
}
