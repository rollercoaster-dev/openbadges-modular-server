/**
 * E2E Test Data Generator
 *
 * This file contains utility functions for generating test data for E2E tests.
 */

import { EXAMPLE_BADGE_IMAGE_URL, EXAMPLE_ISSUER_URL } from '@/constants/urls';

/**
 * Creates a test issuer for E2E tests
 * @param name The name of the issuer
 * @returns The issuer data
 */
export function createTestIssuerData(name = 'E2E Test Issuer'): Record<string, unknown> {
  return {
    name,
    url: EXAMPLE_ISSUER_URL,
    email: `${name.toLowerCase().replace(/\s+/g, '-')}@example.com`,
    description: `${name} for E2E testing`
  };
}

/**
 * Creates a test badge class for E2E tests
 * @param issuerId The ID of the issuer
 * @param name The name of the badge class
 * @returns The badge class data
 */
export function createTestBadgeClassData(issuerId: string, name = 'E2E Test Badge Class'): Record<string, unknown> {
  return {
    name,
    description: `${name} for E2E testing`,
    image: EXAMPLE_BADGE_IMAGE_URL,
    criteria: {
      narrative: `Complete the ${name} test`
    },
    issuer: issuerId
  };
}

/**
 * Creates a test assertion for E2E tests
 * @param badgeClassId The ID of the badge class
 * @param recipientEmail The email of the recipient
 * @returns The assertion data
 */
export function createTestAssertionData(badgeClassId: string, recipientEmail = 'recipient@example.com'): Record<string, unknown> {
  const now = new Date();
  const expiresDate = new Date();
  expiresDate.setFullYear(expiresDate.getFullYear() + 1);

  return {
    badge: badgeClassId,
    recipient: {
      type: 'email',
      identity: recipientEmail,
      hashed: false
    },
    issuedOn: now.toISOString(),
    expires: expiresDate.toISOString()
  };
}

/**
 * Generates a random email address for testing
 * @returns A random email address
 */
export function generateRandomEmail(): string {
  const randomString = Math.random().toString(36).substring(2, 10);
  return `test-${randomString}@example.com`;
}
