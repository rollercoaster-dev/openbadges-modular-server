/**
 * Test Data Helper for E2E Tests
 *
 * This helper provides methods for creating and cleaning up test data
 * for E2E tests. It tracks created entities for automatic cleanup.
 */

import { logger } from '@/utils/logging/logger.service';
import crypto from 'crypto';

export class TestDataHelper {
  private static entities: Map<string, string[]> = new Map();
  private static apiUrl: string;
  private static apiKey: string;

  /**
   * Initialize the test data helper
   * @param apiUrl Base URL for the API
   * @param apiKey API key for authentication
   */
  static initialize(apiUrl: string, apiKey: string): void {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
    this.entities = new Map();
    this.entities.set('issuers', []);
    this.entities.set('badgeClasses', []);
    this.entities.set('assertions', []);
    logger.info('TestDataHelper initialized', {
      apiUrl,
      apiKeyProvided: !!apiKey,
      apiKeyLength: apiKey?.length || 0
    });
  }

  /**
   * Create a test issuer
   * @param customData Custom data to override defaults
   * @returns Created issuer ID and data
   */
  static async createIssuer(customData = {}): Promise<{ id: string, data: Record<string, unknown> }> {
    // Create issuer data with OB2 format
    // Don't include createdAt/updatedAt as they're not allowed by the validation schema
    const issuerData = {
      name: `Test Issuer ${Date.now()}`,
      url: 'https://issuer.example.com',
      email: 'issuer@example.com',
      description: 'Test issuer for E2E tests',
      type: 'Issuer', // OB2 format
      ...customData
    };

    logger.debug('Creating issuer with data:', {
      issuerData,
      apiUrl: this.apiUrl,
      apiKeyProvided: !!this.apiKey,
      apiKeyLength: this.apiKey?.length || 0
    });

    try {
      // Add a small delay to ensure the database is ready
      await new Promise(resolve => setTimeout(resolve, 100));

      const res = await fetch(`${this.apiUrl}/v3/issuers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify(issuerData)
      });

      const responseText = await res.text();
      logger.debug('Issuer creation response:', {
        status: res.status,
        statusText: res.statusText,
        responseText
      });

      if (!res.ok) {
        throw new Error(`Failed to create issuer: ${res.status} ${res.statusText} - ${responseText}`);
      }

      // Parse the response text as JSON
      const data = JSON.parse(responseText) as Record<string, unknown>;
      const id = data.id as string;
      this.entities.get('issuers')?.push(id);
      logger.info('Created test issuer', { id });

      // Add a small delay to ensure the issuer is fully created
      await new Promise(resolve => setTimeout(resolve, 100));

      return { id, data };
    } catch (error) {
      logger.error('Error creating issuer', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        issuerData
      });
      throw error;
    }
  }

  /**
   * Create a test badge class
   * @param issuerId Issuer ID to associate with the badge class
   * @param customData Custom data to override defaults
   * @returns Created badge class ID and data
   */
  static async createBadgeClass(issuerId: string, customData = {}): Promise<{ id: string, data: Record<string, unknown> }> {
    const badgeClassData = {
      type: 'BadgeClass',
      name: `Test Badge Class ${Date.now()}`,
      description: 'Test badge class for E2E tests',
      image: 'https://example.com/badge.png',
      criteria: {
        narrative: 'Test criteria for E2E tests'
      },
      issuer: issuerId,
      ...customData
    };

    const res = await fetch(`${this.apiUrl}/v3/badge-classes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      },
      body: JSON.stringify(badgeClassData)
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to create badge class: ${res.status} ${res.statusText} - ${errorText}`);
    }

    const data = await res.json() as Record<string, unknown>;
    const id = data.id as string;
    this.entities.get('badgeClasses')?.push(id);
    logger.info('Created test badge class', { id, issuerId });
    return { id, data };
  }

  /**
   * Create a test assertion
   * @param badgeClassId Badge class ID to associate with the assertion
   * @param customData Custom data to override defaults
   * @returns Created assertion ID and data
   */
  static async createAssertion(badgeClassId: string, customData = {}): Promise<{ id: string, data: Record<string, unknown> }> {
    // Generate a hashed recipient identity
    const email = `recipient-${Date.now()}@example.com`;
    const salt = crypto.randomBytes(16).toString('hex');
    const hashedIdentity = `sha256$${crypto.createHash('sha256').update(email + salt).digest('hex')}`;

    const assertionData = {
      type: 'Assertion',
      badge: badgeClassId,
      recipient: {
        type: 'email',
        identity: hashedIdentity,
        hashed: true,
        salt
      },
      issuedOn: new Date().toISOString(),
      ...customData
    };

    const res = await fetch(`${this.apiUrl}/v3/assertions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      },
      body: JSON.stringify(assertionData)
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to create assertion: ${res.status} ${res.statusText} - ${errorText}`);
    }

    const data = await res.json() as Record<string, unknown>;
    const id = data.id as string;
    this.entities.get('assertions')?.push(id);
    logger.info('Created test assertion', { id, badgeClassId });
    return { id, data };
  }

  /**
   * Clean up all created test data
   */
  static async cleanup(): Promise<void> {
    // Clean up in reverse order of dependencies
    await this.cleanupEntities('assertions');
    await this.cleanupEntities('badgeClasses');
    await this.cleanupEntities('issuers');
    logger.info('Test data cleanup completed');
  }

  /**
   * Clean up entities of a specific type
   * @param entityType Type of entity to clean up
   */
  private static async cleanupEntities(entityType: string): Promise<void> {
    const ids = this.entities.get(entityType) || [];
    logger.info(`Cleaning up ${ids.length} ${entityType}`);

    for (const id of ids) {
      try {
        // Map entity type to endpoint
        const endpoint = entityType === 'badgeClasses'
          ? 'badge-classes'
          : entityType;

        const url = `${this.apiUrl}/v3/${endpoint}/${id}`;
        const res = await fetch(url, {
          method: 'DELETE',
          headers: { 'X-API-Key': this.apiKey }
        });

        if (!res.ok) {
          logger.warn(`Failed to delete ${entityType} with ID ${id}`, {
            status: res.status,
            statusText: res.statusText
          });
        }
      } catch (error) {
        logger.warn(`Error cleaning up ${entityType} with ID ${id}`, {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    this.entities.set(entityType, []);
  }
}
