/**
 * Test Data Helper for E2E Tests
 * 
 * This helper provides methods for creating and cleaning up test data
 * for E2E tests. It tracks created entities for automatic cleanup.
 */

import { logger } from '@/utils/logging/logger.service';
import { OPENBADGES_V3_CONTEXT_EXAMPLE } from '@/constants/urls';
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
    logger.info('TestDataHelper initialized', { apiUrl });
  }

  /**
   * Create a test issuer
   * @param customData Custom data to override defaults
   * @returns Created issuer ID and data
   */
  static async createIssuer(customData = {}): Promise<{ id: string, data: any }> {
    const issuerData = {
      '@context': OPENBADGES_V3_CONTEXT_EXAMPLE,
      type: 'Issuer',
      name: `Test Issuer ${Date.now()}`,
      url: 'https://issuer.example.com',
      email: 'issuer@example.com',
      description: 'Test issuer for E2E tests',
      ...customData
    };

    const res = await fetch(`${this.apiUrl}/issuers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      },
      body: JSON.stringify(issuerData)
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to create issuer: ${res.status} ${res.statusText} - ${errorText}`);
    }

    const data = await res.json();
    this.entities.get('issuers')?.push(data.id);
    logger.info('Created test issuer', { id: data.id });
    return { id: data.id, data };
  }

  /**
   * Create a test badge class
   * @param issuerId Issuer ID to associate with the badge class
   * @param customData Custom data to override defaults
   * @returns Created badge class ID and data
   */
  static async createBadgeClass(issuerId: string, customData = {}): Promise<{ id: string, data: any }> {
    const badgeClassData = {
      '@context': OPENBADGES_V3_CONTEXT_EXAMPLE,
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

    const res = await fetch(`${this.apiUrl}/badge-classes`, {
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

    const data = await res.json();
    this.entities.get('badgeClasses')?.push(data.id);
    logger.info('Created test badge class', { id: data.id, issuerId });
    return { id: data.id, data };
  }

  /**
   * Create a test assertion
   * @param badgeClassId Badge class ID to associate with the assertion
   * @param customData Custom data to override defaults
   * @returns Created assertion ID and data
   */
  static async createAssertion(badgeClassId: string, customData = {}): Promise<{ id: string, data: any }> {
    // Generate a hashed recipient identity
    const email = `recipient-${Date.now()}@example.com`;
    const salt = crypto.randomBytes(16).toString('hex');
    const hashedIdentity = `sha256$${crypto.createHash('sha256').update(email + salt).digest('hex')}`;

    const assertionData = {
      '@context': OPENBADGES_V3_CONTEXT_EXAMPLE,
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

    const res = await fetch(`${this.apiUrl}/assertions`, {
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

    const data = await res.json();
    this.entities.get('assertions')?.push(data.id);
    logger.info('Created test assertion', { id: data.id, badgeClassId });
    return { id: data.id, data };
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
        
        const url = `${this.apiUrl}/${endpoint}/${id}`;
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
