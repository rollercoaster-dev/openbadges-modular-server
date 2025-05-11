/**
 * Issuer API E2E Tests
 * 
 * This file contains end-to-end tests for the Issuer API endpoints.
 * It tests the complete CRUD lifecycle of issuers.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { logger } from '@/utils/logging/logger.service';
import { OPENBADGES_V3_CONTEXT_EXAMPLE } from '@/constants/urls';
import { TestDataHelper } from './helpers/test-data.helper';
import { resetDatabase } from './helpers/database-reset.helper';
import { API_URL, API_KEY } from './setup/globalSetup';

// The API router is mounted directly on the app, not at the basePath
const ISSUERS_ENDPOINT = `${API_URL}/issuers`;

describe('Issuer API - E2E', () => {
  // Initialize test data helper before all tests
  beforeAll(async () => {
    TestDataHelper.initialize(API_URL, API_KEY);
    logger.info('Issuer E2E tests: Initialized test data helper');
  });

  // Reset database before each test to ensure isolation
  beforeEach(async () => {
    await resetDatabase();
    logger.info('Issuer E2E tests: Reset database');
  });

  // Clean up test data after all tests
  afterAll(async () => {
    await TestDataHelper.cleanup();
    logger.info('Issuer E2E tests: Cleaned up test data');
  });

  describe('Create Issuer', () => {
    it('should create an issuer with valid data', async () => {
      // Prepare test data
      const issuerData = {
        '@context': OPENBADGES_V3_CONTEXT_EXAMPLE,
        type: 'Issuer',
        name: 'E2E Test Issuer',
        url: 'https://issuer.example.com',
        email: 'issuer@example.com',
        description: 'Issuer for E2E test.'
      };

      // Execute test
      const res = await fetch(ISSUERS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify(issuerData)
      });

      // Verify response
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toBeDefined();
      expect(body.id).toBeDefined();
      expect(body.name).toBe(issuerData.name);
      expect(body.url).toBe(issuerData.url);
      expect(body.email).toBe(issuerData.email);
      expect(body.description).toBe(issuerData.description);
      expect(body.type).toBe('Issuer');

      // Store ID for later tests
      const issuerId = body.id;
      logger.info('Created test issuer', { id: issuerId });
    });

    it('should fail to create issuer with invalid URL', async () => {
      // Prepare test data with invalid URL
      const invalidIssuerData = {
        '@context': OPENBADGES_V3_CONTEXT_EXAMPLE,
        type: 'Issuer',
        name: 'Bad URL Issuer',
        url: 'not-a-url',
        email: 'badurl@example.com'
      };

      // Execute test
      const res = await fetch(ISSUERS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify(invalidIssuerData)
      });

      // Verify response
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBeDefined();
    });

    it('should fail to create issuer without required fields', async () => {
      // Prepare test data with missing required fields
      const incompleteIssuerData = {
        '@context': OPENBADGES_V3_CONTEXT_EXAMPLE,
        type: 'Issuer',
        // Missing name, url, and email
        description: 'Incomplete issuer data'
      };

      // Execute test
      const res = await fetch(ISSUERS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify(incompleteIssuerData)
      });

      // Verify response
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBeDefined();
    });
  });

  describe('Read Issuer', () => {
    it('should retrieve an issuer by ID', async () => {
      // Create test issuer
      const { id: issuerId } = await TestDataHelper.createIssuer();

      // Execute test
      const res = await fetch(`${ISSUERS_ENDPOINT}/${issuerId}`, {
        method: 'GET',
        headers: { 'X-API-Key': API_KEY }
      });

      // Verify response
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toBeDefined();
      expect(body.id).toBe(issuerId);
      expect(body.name).toBeDefined();
      expect(body.url).toBeDefined();
      expect(body.email).toBeDefined();
      expect(body.type).toBe('Issuer');
    });

    it('should return 404 for non-existent issuer', async () => {
      // Execute test with non-existent ID
      const res = await fetch(`${ISSUERS_ENDPOINT}/nonexistent-id-12345`, {
        method: 'GET',
        headers: { 'X-API-Key': API_KEY }
      });

      // Verify response
      expect(res.status).toBe(404);
    });

    it('should list all issuers', async () => {
      // Create multiple test issuers
      const { id: issuerId1 } = await TestDataHelper.createIssuer({ name: 'Test Issuer 1' });
      const { id: issuerId2 } = await TestDataHelper.createIssuer({ name: 'Test Issuer 2' });

      // Execute test
      const res = await fetch(ISSUERS_ENDPOINT, {
        method: 'GET',
        headers: { 'X-API-Key': API_KEY }
      });

      // Verify response
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(2);
      
      // Verify both created issuers are in the list
      const ids = body.map((issuer: any) => issuer.id);
      expect(ids).toContain(issuerId1);
      expect(ids).toContain(issuerId2);
    });
  });

  describe('Update Issuer', () => {
    it('should update an existing issuer', async () => {
      // Create test issuer
      const { id: issuerId } = await TestDataHelper.createIssuer();

      // Prepare update data
      const updateData = {
        name: 'Updated Issuer Name',
        url: 'https://updated.example.com',
        description: 'Updated description.'
      };

      // Execute test
      const res = await fetch(`${ISSUERS_ENDPOINT}/${issuerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify(updateData)
      });

      // Verify response
      expect([200, 204]).toContain(res.status);

      // Fetch again to confirm update
      const getRes = await fetch(`${ISSUERS_ENDPOINT}/${issuerId}`, {
        method: 'GET',
        headers: { 'X-API-Key': API_KEY }
      });

      expect(getRes.status).toBe(200);
      const body = await getRes.json();
      expect(body.name).toBe(updateData.name);
      expect(body.url).toBe(updateData.url);
      expect(body.description).toBe(updateData.description);
    });

    it('should return 404 when updating non-existent issuer', async () => {
      // Prepare update data
      const updateData = {
        name: 'Updated Issuer Name',
        url: 'https://updated.example.com'
      };

      // Execute test with non-existent ID
      const res = await fetch(`${ISSUERS_ENDPOINT}/nonexistent-id-12345`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify(updateData)
      });

      // Verify response
      expect(res.status).toBe(404);
    });
  });

  describe('Delete Issuer', () => {
    it('should delete an existing issuer', async () => {
      // Create test issuer
      const { id: issuerId } = await TestDataHelper.createIssuer();

      // Execute delete
      const deleteRes = await fetch(`${ISSUERS_ENDPOINT}/${issuerId}`, {
        method: 'DELETE',
        headers: { 'X-API-Key': API_KEY }
      });

      // Verify delete response
      expect([200, 204]).toContain(deleteRes.status);

      // Verify issuer is deleted by trying to fetch it
      const getRes = await fetch(`${ISSUERS_ENDPOINT}/${issuerId}`, {
        method: 'GET',
        headers: { 'X-API-Key': API_KEY }
      });

      expect(getRes.status).toBe(404);
    });

    it('should return 404 when deleting non-existent issuer', async () => {
      // Execute test with non-existent ID
      const res = await fetch(`${ISSUERS_ENDPOINT}/nonexistent-id-12345`, {
        method: 'DELETE',
        headers: { 'X-API-Key': API_KEY }
      });

      // Verify response
      expect(res.status).toBe(404);
    });
  });
});
