/**
 * Authentication Controller
 *
 * This controller handles authentication-related HTTP requests.
 */

import { UserService } from '../domains/user/user.service';
import { PasswordService } from './services/password.service';
import { JwtService } from './services/jwt.service';
import { logger } from '../utils/logging/logger.service';
import { Shared } from 'openbadges-types';

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
    requestId?: string;
    clientIp?: string;
    userAgent?: string;
  }): Promise<{ status: number; body: Record<string, unknown> }> {
    // Create context for structured logging
    const logContext = {
      requestId: data.requestId || crypto.randomUUID(),
      clientIp: data.clientIp || 'unknown',
      userAgent: data.userAgent ? data.userAgent.substring(0, 100) : 'unknown',
      action: 'login',
      usernameOrEmail: data.usernameOrEmail
    };

    try {
      // Validate input
      if (!data.usernameOrEmail || !data.password) {
        logger.warn('Login attempt with missing credentials', {
          ...logContext,
          error: 'Missing credentials'
        });

        return {
          status: 400,
          body: {
            success: false,
            error: 'Username/email and password are required'
          }
        };
      }

      logger.debug('Processing login attempt', logContext);

      // Authenticate user
      const user = await this.userService.authenticateUser(data.usernameOrEmail, data.password);

      if (!user) {
        logger.warn('Failed login attempt: Invalid credentials', {
          ...logContext,
          timestamp: new Date().toISOString()
        });

        return {
          status: 401,
          body: {
            success: false,
            error: 'Invalid credentials'
          }
        };
      }

      // Add user info to log context
      const authLogContext = {
        ...logContext,
        userId: user.id,
        username: user.username,
        roles: user.roles
      };

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

      logger.info('User logged in successfully', {
        ...authLogContext,
        timestamp: new Date().toISOString()
      });

      return {
        status: 200,
        body: {
          success: true,
          token,
          user: user.toPublicObject()
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Login error', {
        ...logContext,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });

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
    requestId?: string;
    clientIp?: string;
    userAgent?: string;
  }): Promise<{ status: number; body: Record<string, unknown> }> {
    // Create context for structured logging
    const logContext = {
      requestId: data.requestId || crypto.randomUUID(),
      clientIp: data.clientIp || 'unknown',
      userAgent: data.userAgent ? data.userAgent.substring(0, 100) : 'unknown',
      action: 'register',
      username: data.username,
      email: data.email
    };

    try {
      logger.debug('Processing user registration request', logContext);

      // Validate input
      if (!data.username || !data.email || !data.password) {
        logger.warn('Registration attempt with missing required fields', {
          ...logContext,
          error: 'Missing required fields',
          hasUsername: !!data.username,
          hasEmail: !!data.email,
          hasPassword: !!data.password
        });

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
        logger.warn('Registration attempt with insecure password', {
          ...logContext,
          error: 'Insecure password'
        });

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

      // Add user info to log context
      const authLogContext = {
        ...logContext,
        userId: user.id,
        roles: user.roles
      };

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

      logger.info('User registered successfully', {
        ...authLogContext,
        timestamp: new Date().toISOString()
      });

      return {
        status: 201,
        body: {
          success: true,
          token,
          user: user.toPublicObject()
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Handle specific errors
      if (error instanceof Error && error.message.includes('already exists')) {
        logger.warn('Registration failed: User already exists', {
          ...logContext,
          error: errorMessage,
          timestamp: new Date().toISOString()
        });

        return {
          status: 409,
          body: {
            success: false,
            error: errorMessage
          }
        };
      }

      // Log general registration errors
      logger.error('Registration error', {
        ...logContext,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });

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
   * @param requestInfo Additional request information for logging
   * @returns User profile
   */
  async getProfile(
    userId: string,
    requestInfo?: {
      requestId?: string;
      clientIp?: string;
      userAgent?: string;
    }
  ): Promise<{ status: number; body: Record<string, unknown> }> {
    // Create context for structured logging
    const logContext = {
      requestId: requestInfo?.requestId || crypto.randomUUID(),
      clientIp: requestInfo?.clientIp || 'unknown',
      userAgent: requestInfo?.userAgent ? requestInfo.userAgent.substring(0, 100) : 'unknown',
      action: 'getProfile',
      userId
    };

    try {
      logger.debug('Retrieving user profile', logContext);

      // Convert string to IRI type
      const userIdIri = userId as Shared.IRI;
      const user = await this.userService.getUserById(userIdIri);

      if (!user) {
        logger.warn('Profile retrieval failed: User not found', {
          ...logContext,
          error: 'User not found',
          timestamp: new Date().toISOString()
        });

        return {
          status: 404,
          body: {
            success: false,
            error: 'User not found'
          }
        };
      }

      // Add user info to log context
      const profileLogContext = {
        ...logContext,
        username: user.username,
        roles: user.roles
      };

      logger.info('User profile retrieved successfully', {
        ...profileLogContext,
        timestamp: new Date().toISOString()
      });

      return {
        status: 200,
        body: {
          success: true,
          user: user.toPublicObject()
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error('Profile retrieval error', {
        ...logContext,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });

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
