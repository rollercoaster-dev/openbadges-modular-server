// test/e2e/assertion.e2e.test.ts
import { describe, it, expect } from 'bun:test';
import { config } from '../../src/config/config';
import { logger } from '../../src/utils/logging/logger.service';

// Base URL for the API
const API_URL = process.env['API_BASE_URL'] || `http://${config.server.host}:${config.server.port}`;
// const ISSUERS_ENDPOINT = `${API_URL}/v3/issuers`; // Not used in this simplified test
// const BADGE_CLASSES_ENDPOINT = `${API_URL}/v3/badge-classes`; // Not used in this simplified test
const ASSERTIONS_ENDPOINT = `${API_URL}/v3/assertions`;

// API key for protected endpoints
const API_KEY = 'verysecretkeye2e';

describe('Assertion API - E2E', () => {
  // No resources to clean up in this simplified test

  it('should verify assertion API endpoints', async () => {
    // Test the assertions endpoint
    let assertionsResponse: Response;
    try {
      assertionsResponse = await fetch(ASSERTIONS_ENDPOINT, {
        method: 'GET',
        headers: {
          'X-API-Key': API_KEY
        }
      });
    } catch (error) {
      logger.error('Failed to fetch assertions', { error });
      throw error;
    }

    // Verify the response status code
    if (assertionsResponse.status !== 200) {
  const body = await assertionsResponse.text();
  logger.error(`GET /v3/assertions failed`, { status: assertionsResponse.status, body });
}
expect(assertionsResponse.status).toBe(200);
    logger.info(`Assertions endpoint responded with status ${assertionsResponse.status}`);

    // Test the assertion POST endpoint
    let assertionPostResponse: Response;
    try {
      assertionPostResponse = await fetch(ASSERTIONS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify({
          '@context': 'https://w3id.org/openbadges/v3',
          type: 'Assertion',
          recipient: {
            type: 'email',
            identity: 'sha256$' + Buffer.from('test@example.com').toString('hex'),
            hashed: true,
            salt: 'test'
          },
          badge: 'test-badge-class-id',
          issuedOn: new Date().toISOString()
        })
      });
    } catch (error) {
      logger.error('Failed to test assertion POST endpoint', { error });
      throw error;
    }

    // Verify the response status code
    if (assertionPostResponse.status !== 400) {
  const body = await assertionPostResponse.text();
  logger.error(`POST /v3/assertions failed (should be 400)`, { status: assertionPostResponse.status, body });
}
expect(assertionPostResponse.status).toBe(400);
    logger.info(`Assertion POST endpoint responded with status ${assertionPostResponse.status}`);

    // Test the verification endpoint with a dummy assertion ID
    const dummyAssertionId = 'test-assertion-id';
    let verifyResponse: Response;
    try {
      verifyResponse = await fetch(`${ASSERTIONS_ENDPOINT}/${dummyAssertionId}/verify`, {
        method: 'GET',
        headers: {
          'X-API-Key': API_KEY
        }
      });
    } catch (error) {
      logger.error(`Failed to test verification endpoint`, { error });
      throw error;
    }

    // Verify the response status code
    if (verifyResponse.status !== 404) {
  const body = await verifyResponse.text();
  logger.error(`GET /v3/assertions/:id/verify failed (should be 404)`, { status: verifyResponse.status, body });
}
expect(verifyResponse.status).toBe(404);
    logger.info(`Verification endpoint responded with status ${verifyResponse.status}`);
  });

  // No cleanup needed in this simplified test
});
