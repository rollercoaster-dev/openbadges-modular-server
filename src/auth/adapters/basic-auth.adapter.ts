/**
 * Basic Authentication Adapter
 *
 * This adapter provides HTTP Basic Authentication support, which is useful
 * for simple system integrations and developer tools. It's not recommended
 * for user-facing authentication due to security limitations.
 */

import { AuthAdapter, AuthAdapterOptions, AuthenticationResult } from './auth-adapter.interface';
import { logger } from '../../utils/logging/logger.service';

interface BasicAuthCredential {
  password: string;
  userId: string;
  claims?: Record<string, unknown>;
}

interface BasicAuthConfig {
  /**
   * Username-password pairs and their associated user information
   */
  credentials: Record<string, BasicAuthCredential>;
}

// Type Guard function
function isBasicAuthConfig(config: unknown): config is BasicAuthConfig {
  if (
    !config ||
    typeof config !== 'object' ||
    config === null ||
    !('credentials' in config) || // Use 'in' operator for type safety
    typeof (config as Record<string, unknown>).credentials !== 'object' ||
    (config as Record<string, unknown>).credentials === null
  ) {
    return false;
  }

  // Optional: Add deeper validation for each credential if needed
  // const creds = (config as BasicAuthConfig).credentials;
  // for (const key in creds) {
  //   if (typeof creds[key]?.password !== 'string' || typeof creds[key]?.userId !== 'string') {
  //     return false;
  //   }
  // }

  return true;
}

export class BasicAuthAdapter implements AuthAdapter {
  private readonly providerName: string = 'basic-auth';
  private readonly config: BasicAuthConfig;

  constructor(options: AuthAdapterOptions) {
    const providerName = options.providerName || 'basic-auth'; // Default provider name

    if (options.providerName) {
      this.providerName = options.providerName;
    }

    // Use the type guard to validate
    if (!isBasicAuthConfig(options.config)) {
      throw new Error(`Invalid configuration provided for ${providerName}: 'credentials' object is missing or invalid.`);
    }

    // If the guard passes, options.config is known to be BasicAuthConfig
    this.config = options.config;

    // Validate configuration
    if (!this.config.credentials || Object.keys(this.config.credentials).length === 0) {
      logger.warn(`No credentials configured for ${this.providerName} adapter`);
    }
  }

  getProviderName(): string {
    return this.providerName;
  }

  canHandle(request: Request): boolean {
    const authHeader = request.headers.get('Authorization');
    return authHeader !== null && authHeader.startsWith('Basic ');
  }

  async authenticate(request: Request): Promise<AuthenticationResult> {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return {
        isAuthenticated: false,
        error: 'No Basic auth credentials provided',
        provider: this.providerName
      };
    }

    // Extract and decode the Base64 credentials
    try {
      const base64Credentials = authHeader.substring(6); // Remove 'Basic ' prefix
      const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');

      // Use split with regex to handle passwords that may contain colons
      // This splits on the first colon only, preserving any colons in the password
      const [username, password] = credentials.split(/:(.+)/).filter(Boolean);

      if (!username || !password) {
        return {
          isAuthenticated: false,
          error: 'Invalid Basic auth format',
          provider: this.providerName
        };
      }

      // Check if the credentials are valid
      const userConfig = this.config.credentials[username];

      if (!userConfig || userConfig.password !== password) {
        logger.debug(`Invalid Basic auth attempt for username: ${username}`);
        return {
          isAuthenticated: false,
          error: 'Invalid username or password',
          provider: this.providerName
        };
      }

      return {
        isAuthenticated: true,
        userId: userConfig.userId,
        claims: {
          ...userConfig.claims || {},
          username
        },
        provider: this.providerName
      };
    } catch (error) {
      logger.logError('Basic auth parsing error', error as Error);
      return {
        isAuthenticated: false,
        error: 'Malformed Basic auth header',
        provider: this.providerName
      };
    }
  }
}