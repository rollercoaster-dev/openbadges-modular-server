/**
 * API Key Authentication Adapter
 *
 * This adapter provides API key-based authentication for headless integrations.
 * API keys are passed in the X-API-Key header and validated against configured keys.
 */

import { AuthAdapter, AuthAdapterOptions, AuthenticationResult } from './auth-adapter.interface';
import { ApiKeyRepository } from '../../domains/auth/apiKey.repository';
import { logger } from '../../utils/logging/logger.service';

interface ApiKeyConfig {
  /**
   * Map of API keys to user IDs with optional metadata
   */
  keys: Record<string, {
    userId: string;
    description?: string;
    claims?: Record<string, unknown>;
  }>;
}

// Type guard to check if an object conforms to ApiKeyConfig
function isApiKeyConfig(config: unknown): config is ApiKeyConfig {
  return (
    typeof config === 'object' &&
    config !== null &&
    typeof (config as ApiKeyConfig).keys === 'object' && // Check if keys property exists and is an object
    (config as ApiKeyConfig).keys !== null
  );
}

export class ApiKeyAdapter implements AuthAdapter {
  private readonly providerName: string = 'api-key';
  private readonly apiKeyConfig: ApiKeyConfig;
  private readonly headerName: string = 'X-API-Key';
  public apiKeyRepository!: Partial<ApiKeyRepository>; // Exposed for testing

  constructor(options: AuthAdapterOptions) {
    if (options.providerName) {
      this.providerName = options.providerName;
    }

    // Use the type guard for validation
    if (!isApiKeyConfig(options.config)) {
      throw new Error('Invalid or missing ApiKeyConfig structure provided.');
    }
    // Type guard ensures options.config is ApiKeyConfig here
    this.apiKeyConfig = options.config;

    // Validate config contents
    if (!this.apiKeyConfig.keys || Object.keys(this.apiKeyConfig.keys).length === 0) {
      logger.warn(`No API keys configured for ${this.providerName} adapter`);
    }
  }

  getProviderName(): string {
    return this.providerName;
  }

  canHandle(request: Request): boolean {
    return request.headers.has(this.headerName);
  }

  async authenticate(request: Request): Promise<AuthenticationResult> {
    const apiKey = request.headers.get(this.headerName);

    if (!apiKey) {
      return {
        isAuthenticated: false,
        error: 'No API key provided',
        provider: this.providerName
      };
    }

    // Check if the API key exists in the configuration
    const keyConfig = this.apiKeyConfig.keys[apiKey];

    if (!keyConfig) {
      logger.warn(`Invalid API key attempt: ${apiKey.substring(0, 8)}...`);
      return {
        isAuthenticated: false,
        error: 'Invalid API key',
        provider: this.providerName
      };
    }

    return {
      isAuthenticated: true,
      userId: keyConfig.userId,
      claims: {
        ...keyConfig.claims || {},
        apiKeyDescription: keyConfig.description
      },
      provider: this.providerName
    };
  }
}