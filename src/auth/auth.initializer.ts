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

/**
 * Initialize the authentication system
 * @returns A promise that resolves when initialization is complete
 */
export async function initializeAuthentication(): Promise<void> {
  if (!config.auth?.enabled) {
    logger.info('Authentication is disabled');
    return;
  }

  logger.info('Initializing authentication system');

  try {
    // Initialize API key authentication if enabled
    if (config.auth.adapters.apiKey?.enabled) {
      const apiKeyAdapter = new ApiKeyAdapter({
        providerName: 'api-key',
        config: {
          keys: config.auth.adapters.apiKey.keys || {}
        }
      });
      registerAuthAdapter(apiKeyAdapter);
      logger.info(`API Key authentication enabled (${Object.keys(config.auth.adapters.apiKey.keys || {}).length} keys configured)`);
    }

    // Initialize Basic authentication if enabled
    if (config.auth.adapters.basicAuth?.enabled) {
      const basicAuthAdapter = new BasicAuthAdapter({
        providerName: 'basic-auth',
        config: {
          credentials: config.auth.adapters.basicAuth.credentials || {}
        }
      });
      registerAuthAdapter(basicAuthAdapter);
      logger.info(`Basic Authentication enabled (${Object.keys(config.auth.adapters.basicAuth.credentials || {}).length} credentials configured)`);
    }

    // Initialize OAuth2 authentication if enabled
    if (config.auth.adapters.oauth2?.enabled) {
      const oauth2Adapter = new OAuth2Adapter({
        providerName: 'oauth2',
        config: {
          jwksUri: config.auth.adapters.oauth2.jwksUri,
          introspectionEndpoint: config.auth.adapters.oauth2.introspectionEndpoint,
          clientId: config.auth.adapters.oauth2.clientId,
          clientSecret: config.auth.adapters.oauth2.clientSecret,
          userIdClaim: config.auth.adapters.oauth2.userIdClaim,
          audience: config.auth.adapters.oauth2.audience,
          issuer: config.auth.adapters.oauth2.issuer
        }
      });
      registerAuthAdapter(oauth2Adapter);
      logger.info('OAuth2 authentication enabled');
    }

    logger.info('Authentication system initialized successfully');
  } catch (error) {
    logger.logError('Failed to initialize authentication system', error as Error);
    throw error;
  }
}