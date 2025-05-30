/**
 * Authentication Initializer
 *
 * This module initializes the authentication system by configuring and registering
 * the appropriate authentication adapters based on the application configuration.
 */

import { config } from '../config/config';
import { logger } from '../utils/logging/logger.service';
import { registerAuthAdapter } from './middleware/auth.middleware';
import { ApiKeyAdapter } from './adapters/api-key.adapter';
import { BasicAuthAdapter } from './adapters/basic-auth.adapter';
import { OAuth2Adapter } from './adapters/oauth2.adapter';
import { UserService } from '../domains/user/user.service';
import { RepositoryFactory } from '../infrastructure/repository.factory';
import { UserRole } from '../domains/user/user.entity';

/**
 * Validate username format
 * @param username The username to validate
 * @returns true if username is valid, false otherwise
 */
function isValidUsername(username: string): boolean {
  if (!username || typeof username !== 'string') {
    return false;
  }

  // Username must be 3-50 characters, alphanumeric, underscores, and hyphens only
  const usernameRegex = /^[a-zA-Z0-9_-]{3,50}$/;
  return usernameRegex.test(username);
}

/**
 * Validate email format
 * @param email The email to validate
 * @returns true if email is valid, false otherwise
 */
function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate password strength
 * @param password The password to validate
 * @returns true if password meets requirements, false otherwise
 */
function isValidPassword(password: string): boolean {
  if (!password || typeof password !== 'string') {
    return false;
  }

  // Password must be at least 8 characters long
  // Additional requirements can be added here as needed
  return password.length >= 8;
}

/**
 * Create an admin user if it doesn't exist
 */
async function createAdminUserIfNeeded(): Promise<void> {
  // Check if admin user creation is enabled
  if (!config.auth?.adminUser?.enabled) {
    return;
  }

  // Get admin user configuration
  const adminUsername = config.auth.adminUser.username || 'admin';
  const adminEmail = config.auth.adminUser.email || 'admin@example.com';
  const adminPassword = config.auth.adminUser.password;

  // Perform all validation checks first before any operations
  try {
    // Validate admin username format
    if (!adminUsername || typeof adminUsername !== 'string') {
      logger.error(
        'Admin user creation failed: Username is required and must be a string'
      );
      return;
    }

    if (!isValidUsername(adminUsername)) {
      logger.error('Admin user creation failed: Invalid username format', {
        reason:
          'Username must be 3-50 characters and contain only letters, numbers, underscores, and hyphens',
        providedLength: adminUsername.length,
      });
      return;
    }

    // Validate admin email format
    if (!adminEmail || typeof adminEmail !== 'string') {
      logger.error(
        'Admin user creation failed: Email is required and must be a string'
      );
      return;
    }

    if (!isValidEmail(adminEmail)) {
      logger.error('Admin user creation failed: Invalid email format', {
        reason:
          'Email must be a valid email address format (max 254 characters)',
        providedLength: adminEmail.length,
      });
      return;
    }

    // Validate password presence (without logging the actual password)
    if (!adminPassword || typeof adminPassword !== 'string') {
      logger.warn(
        'Admin user creation is enabled but no valid password is provided in configuration'
      );
      return;
    }

    // Validate password strength (never log password content)
    if (!isValidPassword(adminPassword)) {
      logger.error(
        'Admin user creation failed: Password does not meet security requirements',
        {
          reason: 'Password must be at least 8 characters long',
          passwordLength: adminPassword.length,
        }
      );
      return;
    }

    // Create user repository and service
    let userRepository;
    let userService;

    try {
      userRepository = await RepositoryFactory.createUserRepository();
      userService = new UserService(userRepository);
    } catch (error) {
      logger.error(
        'Admin user creation failed: Unable to initialize user service',
        { error: error instanceof Error ? error.message : String(error) }
      );
      return;
    }

    // Check if admin user already exists
    let existingUser;
    try {
      existingUser = await userService.getUserByUsername(adminUsername);
    } catch (error) {
      logger.error(
        'Admin user creation failed: Unable to check for existing user',
        {
          username: adminUsername,
          error: error instanceof Error ? error.message : String(error),
        }
      );
      return;
    }

    if (existingUser) {
      logger.info(`Admin user with username '${adminUsername}' already exists`);
      return;
    }

    // Create admin user
    try {
      await userService.createUser(
        {
          username: adminUsername,
          email: adminEmail,
          roles: [UserRole.ADMIN],
          isActive: true,
        },
        adminPassword
      );

      logger.info(
        `Successfully created admin user with username '${adminUsername}'`
      );
    } catch (error) {
      if (error instanceof Error) {
        // Check for specific user creation errors
        if (
          error.message.includes('username') &&
          error.message.includes('already exists')
        ) {
          logger.warn(
            `Admin user creation skipped: Username '${adminUsername}' already exists`
          );
        } else if (
          error.message.includes('email') &&
          error.message.includes('already exists')
        ) {
          logger.warn(
            `Admin user creation skipped: Email address already in use`
          );
        } else if (error.message.includes('validation')) {
          logger.error(
            'Admin user creation failed: User data validation error',
            {
              error: error.message,
            }
          );
        } else {
          logger.error('Admin user creation failed: User service error', {
            error: error.message,
          });
        }
      } else {
        logger.error(
          'Admin user creation failed: Unknown error occurred during user creation'
        );
      }
    }
  } catch (error) {
    // This should catch any unexpected errors not handled above
    logger.error(
      'Admin user creation failed: Unexpected error during initialization',
      { error: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Initialize the authentication system
 * @returns A promise that resolves when initialization is complete
 */
export async function initializeAuthentication(): Promise<void> {
  if (!config.auth?.enabled) {
    logger.info('Authentication is disabled');
    return;
  }

  // Create admin user if it doesn't exist
  await createAdminUserIfNeeded();

  logger.info('Initializing authentication system');

  try {
    // Initialize API key authentication if enabled
    if (config.auth.adapters.apiKey?.enabled) {
      const apiKeyAdapter = new ApiKeyAdapter({
        providerName: 'api-key',
        config: {
          keys: config.auth.adapters.apiKey.keys || {},
        },
      });
      registerAuthAdapter(apiKeyAdapter);
      logger.info(
        `API Key authentication enabled (${
          Object.keys(config.auth.adapters.apiKey.keys || {}).length
        } keys configured)`
      );
    }

    // Initialize Basic authentication if enabled
    if (config.auth.adapters.basicAuth?.enabled) {
      const basicAuthAdapter = new BasicAuthAdapter({
        providerName: 'basic-auth',
        config: {
          credentials: config.auth.adapters.basicAuth.credentials || {},
        },
      });
      registerAuthAdapter(basicAuthAdapter);
      logger.info(
        `Basic Authentication enabled (${
          Object.keys(config.auth.adapters.basicAuth.credentials || {}).length
        } credentials configured)`
      );
    }

    // Initialize OAuth2 authentication if enabled
    if (config.auth.adapters.oauth2?.enabled) {
      const oauth2Adapter = new OAuth2Adapter({
        providerName: 'oauth2',
        config: {
          jwksUri: config.auth.adapters.oauth2.jwksUri,
          introspectionEndpoint:
            config.auth.adapters.oauth2.introspectionEndpoint,
          clientId: config.auth.adapters.oauth2.clientId,
          clientSecret: config.auth.adapters.oauth2.clientSecret,
          userIdClaim: config.auth.adapters.oauth2.userIdClaim,
          audience: config.auth.adapters.oauth2.audience,
          issuer: config.auth.adapters.oauth2.issuer,
        },
      });
      registerAuthAdapter(oauth2Adapter);
      logger.info('OAuth2 authentication enabled');
    }

    logger.info('Authentication system initialized successfully');
  } catch (error) {
    logger.logError(
      'Failed to initialize authentication system',
      error as Error
    );
    throw error;
  }
}
