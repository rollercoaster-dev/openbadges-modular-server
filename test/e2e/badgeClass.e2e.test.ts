// test/e2e/badgeClass.e2e.test.ts
import { describe, it, expect } from 'bun:test';
import { config } from '../../src/config/config';
import { logger } from '../../src/utils/logging/logger.service';

// Base URL for the API
const API_URL = process.env['API_BASE_URL'] || `http://${config.server.host}:${config.server.port}`;
// const ISSUERS_ENDPOINT = `${API_URL}/v3/issuers`; // Not used in this simplified test
const BADGE_CLASSES_ENDPOINT = `${API_URL}/v3/badge-classes`;

// API key for protected endpoints
const API_KEY = 'verysecretkeye2e';

describe('Badge Class API - E2E', () => {
  // No resources to clean up in this simplified test

  it.skip('should verify badge class API endpoints', async () => {
    // Test the badge classes endpoint
    let badgeClassesResponse: Response;
    try {
      badgeClassesResponse = await fetch(BADGE_CLASSES_ENDPOINT, {
        method: 'GET',
        headers: {
          'X-API-Key': API_KEY
        }
      });
    } catch (error) {
      logger.error('Failed to fetch badge classes', { error });
      throw error;
    }

    // Verify the response status code
    if (badgeClassesResponse.status !== 200) {
  const body = await badgeClassesResponse.text();
  logger.error(`GET /v3/badge-classes failed`, { status: badgeClassesResponse.status, body });
}
expect(badgeClassesResponse.status).toBe(200);
    logger.info(`Badge classes endpoint responded with status ${badgeClassesResponse.status}`);

    // Test the badge class POST endpoint
    let badgeClassPostResponse: Response;
    try {
      badgeClassPostResponse = await fetch(BADGE_CLASSES_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify({
          '@context': 'https://w3id.org/openbadges/v3',
          type: 'BadgeClass',
          name: 'Test Badge Class',
          description: 'A test badge class',
          issuer: 'test-issuer-id',
          criteria: {
            narrative: 'Complete the test'
          }
        })
      });
    } catch (error) {
      logger.error('Failed to test badge class POST endpoint', { error });
      throw error;
    }

    // Verify the response status code
    if (badgeClassPostResponse.status !== 400) {
  const body = await badgeClassPostResponse.text();
  logger.error(`POST /v3/badge-classes failed (should be 400)`, { status: badgeClassPostResponse.status, body });
}
expect(badgeClassPostResponse.status).toBe(400);
    logger.info(`Badge class POST endpoint responded with status ${badgeClassPostResponse.status}`);
  });

  // No cleanup needed in this simplified test
});
