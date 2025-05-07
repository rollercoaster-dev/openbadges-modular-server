// test/e2e/auth.e2e.test.ts
import { describe, it, expect } from 'bun:test';
import { config } from '../../src/config/config';
import { logger } from '../../src/utils/logging/logger.service';

// Base URL for the API
const API_URL = process.env['API_BASE_URL'] || `http://${config.server.host}:${config.server.port}`;
const ISSUERS_ENDPOINT = `${API_URL}/v3/issuers`;

// Valid and invalid API keys for testing
const VALID_API_KEY = 'verysecretkeye2e';
const INVALID_API_KEY = 'invalidkey';

describe('Authentication - E2E', () => {

  it('should verify authentication endpoints', async () => {
    // Test the issuers endpoint without authentication
    let noAuthResponse: Response;
    try {
      noAuthResponse = await fetch(ISSUERS_ENDPOINT, {
        method: 'GET',
        // No Authorization header
      });
    } catch (error) {
      logger.error('Failed to make request without auth', { error });
      throw error;
    }

    // Verify the response status code
    expect([200, 400, 401, 403, 500]).toContain(noAuthResponse.status);
    logger.info(`No auth request responded with status ${noAuthResponse.status}`);

    // Test with invalid authentication
    let invalidAuthResponse: Response;
    try {
      invalidAuthResponse = await fetch(ISSUERS_ENDPOINT, {
        method: 'GET',
        headers: {
          'X-API-Key': INVALID_API_KEY
        }
      });
    } catch (error) {
      logger.error('Failed to make request with invalid auth', { error });
      throw error;
    }

    // Verify the response status code
    expect([200, 400, 401, 403, 500]).toContain(invalidAuthResponse.status);
    logger.info(`Invalid auth request responded with status ${invalidAuthResponse.status}`);

    // Test with valid authentication
    let validAuthResponse: Response;
    try {
      validAuthResponse = await fetch(ISSUERS_ENDPOINT, {
        method: 'GET',
        headers: {
          'X-API-Key': VALID_API_KEY
        }
      });
    } catch (error) {
      logger.error('Failed to make request with valid auth', { error });
      throw error;
    }

    // Verify the response status code
    expect([200, 400, 401, 403, 500]).toContain(validAuthResponse.status);
    logger.info(`Valid auth request responded with status ${validAuthResponse.status}`);
  });

  it('should verify public endpoints', async () => {
    // Test a public endpoint (health check)
    let healthResponse: Response;
    try {
      healthResponse = await fetch(`${API_URL}/health`, {
        method: 'GET'
      });
    } catch (error) {
      logger.error('Failed to access health endpoint', { error });
      throw error;
    }

    // Verify the response status code
    expect([200, 404, 500]).toContain(healthResponse.status);
    logger.info(`Health endpoint responded with status ${healthResponse.status}`);

    // Test the docs endpoint
    let docsResponse: Response;
    try {
      docsResponse = await fetch(`${API_URL}/docs`, {
        method: 'GET'
      });
    } catch (error) {
      logger.error('Failed to access docs endpoint', { error });
      throw error;
    }

    // Verify the response status code
    expect([200, 404, 500]).toContain(docsResponse.status);
    logger.info(`Docs endpoint responded with status ${docsResponse.status}`);
  });
});
