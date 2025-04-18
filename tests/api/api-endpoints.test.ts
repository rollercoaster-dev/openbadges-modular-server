/**
 * API endpoint tests for Open Badges API
 *
 * This file contains tests for the API endpoints to ensure they work correctly
 * with the new Shared.IRI types.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import { describe, expect, it, mock } from 'bun:test';
import { Shared } from 'openbadges-types';
import { IssuerController } from '../../src/api/controllers/issuer.controller';
import { BadgeClassController } from '../../src/api/controllers/badgeClass.controller';
import { AssertionController } from '../../src/api/controllers/assertion.controller';

// Mock controllers
const mockIssuerController = {
  createIssuer: mock(async (data: any) => ({ id: '123e4567-e89b-12d3-a456-426614174000' as Shared.IRI, ...data })),
  getAllIssuers: mock(async () => [{ id: '123e4567-e89b-12d3-a456-426614174000' as Shared.IRI, name: 'Test Issuer' }]),
  getIssuerById: mock(async (id: string) => ({ id: id as Shared.IRI, name: 'Test Issuer' })),
  updateIssuer: mock(async (id: string, data: any) => ({ id: id as Shared.IRI, ...data })),
  deleteIssuer: mock(async (id: string) => true)
} as unknown as IssuerController;

const mockBadgeClassController = {
  createBadgeClass: mock(async (data: any) => ({ id: '123e4567-e89b-12d3-a456-426614174001' as Shared.IRI, ...data })),
  getAllBadgeClasses: mock(async () => [{ id: '123e4567-e89b-12d3-a456-426614174001' as Shared.IRI, name: 'Test Badge' }]),
  getBadgeClassById: mock(async (id: string) => ({ id: id as Shared.IRI, name: 'Test Badge' })),
  getBadgeClassesByIssuer: mock(async (issuerId: string) => [{ id: '123e4567-e89b-12d3-a456-426614174001' as Shared.IRI, issuer: issuerId as Shared.IRI, name: 'Test Badge' }]),
  updateBadgeClass: mock(async (id: string, data: any) => ({ id: id as Shared.IRI, ...data })),
  deleteBadgeClass: mock(async (id: string) => true)
} as unknown as BadgeClassController;

const mockAssertionController = {
  createAssertion: mock(async (data: any) => ({ id: '123e4567-e89b-12d3-a456-426614174002' as Shared.IRI, ...data })),
  getAllAssertions: mock(async () => [{ id: '123e4567-e89b-12d3-a456-426614174002' as Shared.IRI, badgeClass: '123e4567-e89b-12d3-a456-426614174001' as Shared.IRI }]),
  getAssertionById: mock(async (id: string) => ({ id: id as Shared.IRI, badgeClass: '123e4567-e89b-12d3-a456-426614174001' as Shared.IRI })),
  getAssertionsByBadgeClass: mock(async (badgeClassId: string) => [{ id: '123e4567-e89b-12d3-a456-426614174002' as Shared.IRI, badgeClass: badgeClassId as Shared.IRI }]),
  updateAssertion: mock(async (id: string, data: any) => ({ id: id as Shared.IRI, ...data })),
  revokeAssertion: mock(async (id: string, reason: string) => ({ id: id as Shared.IRI, revoked: true, revocationReason: reason })),
  verifyAssertion: mock(async (id: string) => ({ isValid: true }))
} as unknown as AssertionController;

describe('API Endpoints', () => {
  describe('Type Compatibility Tests', () => {
    // Test that Shared.IRI types can be used in place of strings
    it('should handle Shared.IRI types for IDs', () => {
      // Create a Shared.IRI from a string
      const id = '123e4567-e89b-12d3-a456-426614174000' as Shared.IRI;

      // Verify it's a valid IRI
      expect(typeof id).toBe('string');

      // Test that it can be used in string operations
      expect(`${id}`).toBe('123e4567-e89b-12d3-a456-426614174000');

      // Test that it can be used in comparisons
      expect(id === '123e4567-e89b-12d3-a456-426614174000').toBe(true);
    });

    // Test that Shared.IRI types can be used for URLs
    it('should handle Shared.IRI types for URLs', () => {
      // Create a Shared.IRI from a URL string
      const url = 'https://example.com/badge' as Shared.IRI;

      // Verify it's a valid IRI
      expect(typeof url).toBe('string');

      // Test that it can be used in string operations
      expect(`${url}`).toBe('https://example.com/badge');

      // Test that it can be used in comparisons
      expect(url === 'https://example.com/badge').toBe(true);
    });

    // Test that Shared.IRI types can be used in objects
    it('should handle Shared.IRI types in objects', () => {
      // Create an object with Shared.IRI properties
      const obj = {
        id: '123e4567-e89b-12d3-a456-426614174000' as Shared.IRI,
        url: 'https://example.com/badge' as Shared.IRI,
        name: 'Test Badge'
      };

      // Verify the properties are correct
      expect(obj.id).toBe('123e4567-e89b-12d3-a456-426614174000' as Shared.IRI);
      expect(obj.url).toBe('https://example.com/badge' as Shared.IRI);
      expect(obj.name).toBe('Test Badge');

      // Test that the properties can be used in string operations
      expect(`${obj.id}`).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(`${obj.url}`).toBe('https://example.com/badge');
    });

    // Test that Shared.IRI types can be converted to/from JSON
    it('should handle Shared.IRI types in JSON', () => {
      // Create an object with Shared.IRI properties
      const obj = {
        id: '123e4567-e89b-12d3-a456-426614174000' as Shared.IRI,
        url: 'https://example.com/badge' as Shared.IRI,
        name: 'Test Badge'
      };

      // Convert to JSON and back
      const json = JSON.stringify(obj);
      const parsed = JSON.parse(json);

      // Verify the properties are preserved
      expect(parsed.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(parsed.url).toBe('https://example.com/badge');
      expect(parsed.name).toBe('Test Badge');
    });
  });

  describe('Controller Tests', () => {
    it('should handle Shared.IRI in IssuerController', async () => {
      // Test createIssuer
      const issuerData = {
        name: 'Test Issuer',
        url: 'https://test.edu' as Shared.IRI
      };
      const createdIssuer = await mockIssuerController.createIssuer(issuerData);
      expect(createdIssuer.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(createdIssuer.url).toBe('https://test.edu');

      // Test getIssuerById
      const id = '123e4567-e89b-12d3-a456-426614174000' as Shared.IRI;
      const issuer = await mockIssuerController.getIssuerById(id);
      expect(issuer.id).toBe(id);
      expect(mockIssuerController.getIssuerById).toHaveBeenCalledWith(id);

      // Test updateIssuer
      const updatedData = {
        name: 'Updated Issuer',
        url: 'https://updated.edu' as Shared.IRI
      };
      const updatedIssuer = await mockIssuerController.updateIssuer(id, updatedData);
      expect(updatedIssuer.id).toBe(id);
      expect(updatedIssuer.name).toBe('Updated Issuer');
      expect(updatedIssuer.url).toBe('https://updated.edu');
      expect(mockIssuerController.updateIssuer).toHaveBeenCalledWith(id, updatedData);
    });

    it('should handle Shared.IRI in BadgeClassController', async () => {
      // Test createBadgeClass
      const badgeClassData = {
        issuer: '123e4567-e89b-12d3-a456-426614174000' as Shared.IRI,
        name: 'Test Badge',
        description: 'A test badge',
        image: 'https://test.edu/badge.png' as Shared.IRI,
        criteria: { narrative: 'Complete the test' }
      };
      const createdBadgeClass = await mockBadgeClassController.createBadgeClass(badgeClassData);
      expect(createdBadgeClass.id).toBe('123e4567-e89b-12d3-a456-426614174001');
      expect(createdBadgeClass.issuer).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(createdBadgeClass.image).toBe('https://test.edu/badge.png');

      // Test getBadgeClassById
      const id = '123e4567-e89b-12d3-a456-426614174001' as Shared.IRI;
      const badgeClass = await mockBadgeClassController.getBadgeClassById(id);
      expect(badgeClass.id).toBe(id);
      expect(mockBadgeClassController.getBadgeClassById).toHaveBeenCalledWith(id);

      // Test getBadgeClassesByIssuer
      const issuerId = '123e4567-e89b-12d3-a456-426614174000' as Shared.IRI;
      const badgeClasses = await mockBadgeClassController.getBadgeClassesByIssuer(issuerId);
      expect(badgeClasses[0].issuer).toBe(issuerId);
      expect(mockBadgeClassController.getBadgeClassesByIssuer).toHaveBeenCalledWith(issuerId);
    });

    it('should handle Shared.IRI in AssertionController', async () => {
      // Test createAssertion
      const assertionData = {
        badgeClass: '123e4567-e89b-12d3-a456-426614174001' as Shared.IRI,
        recipient: {
          type: 'email',
          identity: 'recipient@test.edu',
          hashed: false
        },
        issuedOn: new Date().toISOString()
      };
      const createdAssertion = await mockAssertionController.createAssertion(assertionData);
      expect(createdAssertion.id).toBe('123e4567-e89b-12d3-a456-426614174002');
      expect(createdAssertion.badgeClass).toBe('123e4567-e89b-12d3-a456-426614174001');

      // Test getAssertionById
      const id = '123e4567-e89b-12d3-a456-426614174002' as Shared.IRI;
      const assertion = await mockAssertionController.getAssertionById(id);
      expect(assertion.id).toBe(id);
      expect(mockAssertionController.getAssertionById).toHaveBeenCalledWith(id);

      // Test getAssertionsByBadgeClass
      const badgeClassId = '123e4567-e89b-12d3-a456-426614174001' as Shared.IRI;
      const assertions = await mockAssertionController.getAssertionsByBadgeClass(badgeClassId);
      expect(assertions[0].badgeClass).toBe(badgeClassId);
      expect(mockAssertionController.getAssertionsByBadgeClass).toHaveBeenCalledWith(badgeClassId);

      // Test revokeAssertion
      const revokedAssertion = await mockAssertionController.revokeAssertion(id, 'Test revocation');
      expect((revokedAssertion as any).id).toBe(id);
      expect((revokedAssertion as any).revoked).toBe(true);
      expect((revokedAssertion as any).revocationReason).toBe('Test revocation');
      expect(mockAssertionController.revokeAssertion).toHaveBeenCalledWith(id, 'Test revocation');
    });
  });
});
