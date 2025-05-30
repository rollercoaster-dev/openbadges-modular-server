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

  // Username must be 3-50 characters, start/end with alphanumeric, no consecutive special chars
  const usernameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9_-]*[a-zA-Z0-9])?$/;
  const reservedUsernames = [
    'admin',
    'root',
    'system',
    'administrator',
    'user',
  ];

  return (
    username.length >= 3 &&
    username.length <= 50 &&
    usernameRegex.test(username) &&
    !reservedUsernames.includes(username.toLowerCase())
  );
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

  // More comprehensive email validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return (
    email.length <= 254 &&
    email.length >= 5 &&
    emailRegex.test(email) &&
    !email.includes('..') && // No consecutive dots
    email.split('@').length === 2 // Exactly one @ symbol
  );
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

  // Password requirements: 8+ chars, uppercase, lowercase, number, special char
  const minLength = 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  return (
    password.length >= minLength &&
    hasUppercase &&
    hasLowercase &&
    hasNumber &&
    hasSpecialChar
  );
}

/**
 * Validation result interface
 */
interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate admin user configuration
 * @param username The username to validate
 * @param email The email to validate
 * @param password The password to validate
 * @returns Validation result with errors if any
 */
function validateAdminUserConfig(
  username: string,
  email: string,
  password: string
): ValidationResult {
  const errors: string[] = [];

  if (!username || typeof username !== 'string') {
    errors.push('Username is required and must be a string');
  } else if (!isValidUsername(username)) {
    errors.push(
      'Username must be 3-50 characters, start/end with alphanumeric, and not be a reserved name'
    );
  }

  if (!email || typeof email !== 'string') {
    errors.push('Email is required and must be a string');
  } else if (!isValidEmail(email)) {
    errors.push(
      'Email must be a valid email address format (5-254 characters)'
    );
  }

  if (!password || typeof password !== 'string') {
    errors.push('Password is required and must be a string');
  } else if (!isValidPassword(password)) {
    errors.push(
      'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
    );
  }

  return { isValid: errors.length === 0, errors };
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
    const validation = validateAdminUserConfig(
      adminUsername,
      adminEmail,
      adminPassword
    );
    if (!validation.isValid) {
      validation.errors.forEach((error) => {
        logger.error(`Admin user creation failed: ${error}`);
      });
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
        // Check for specific error types using error codes or specific error classes
        const errorMessage = error.message.toLowerCase();

        if (
          errorMessage.includes('unique') ||
          errorMessage.includes('duplicate')
        ) {
          logger.warn('Admin user creation skipped: User already exists');
        } else if (
          errorMessage.includes('validation') ||
          errorMessage.includes('constraint')
        ) {
          logger.error('Admin user creation failed: Invalid user data');
        } else {
          logger.error('Admin user creation failed: Database error');
        }

        // Log detailed error for debugging (consider removing in production)
        logger.debug('Admin user creation error details', {
          error: error.message,
        });
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
    logger.error(
      `Failed to initialize authentication system: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw error;
  }
}
