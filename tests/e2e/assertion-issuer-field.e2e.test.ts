import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { setupTestApp } from './setup/setup-test-app';
import type { Express } from 'express';
import type { Shared, OB3 } from 'openbadges-types';

describe('Assertion Issuer Field E2E Tests', () => {
  let app: Express;
  let testIssuer: any;
  let testBadgeClass: any;
  let testAssertion: any;

  beforeAll(async () => {
    app = await setupTestApp();
  });

  beforeEach(async () => {
    // Create test issuer
    const issuerResponse = await request(app)
      .post('/api/v1/issuers')
      .send({
        name: 'Test Issuer for Assertion',
        url: 'https://test-issuer.example.com',
        email: 'issuer@example.com',
        description: 'Test issuer for assertion issuer field tests',
      })
      .expect(201);

    testIssuer = issuerResponse.body;

    // Create test badge class
    const badgeClassResponse = await request(app)
      .post('/api/v1/badge-classes')
      .send({
        name: 'Test Badge Class',
        description: 'Test badge class for assertion issuer field tests',
        issuer: testIssuer.id,
        criteria: {
          narrative: 'Complete the test requirements',
        },
      })
      .expect(201);

    testBadgeClass = badgeClassResponse.body;
  });

  describe('v3.0 Assertion Creation with Issuer Field', () => {
    it('should create assertion with issuer field automatically populated', async () => {
      const assertionData = {
        badgeClass: testBadgeClass.id,
        recipient: {
          type: 'email',
          identity: 'recipient@example.com',
          hashed: false,
        },
      };

      const response = await request(app)
        .post('/api/v1/assertions?version=3.0')
        .send(assertionData)
        .expect(201);

      const assertion = response.body as OB3.VerifiableCredential;

      // Verify the assertion has the correct structure
      expect(assertion).toBeDefined();
      expect(assertion.type).toContain('VerifiableCredential');
      expect(assertion.type).toContain('OpenBadgeCredential');

      // Verify issuer field is present and correctly structured
      expect(assertion.issuer).toBeDefined();
      
      if (typeof assertion.issuer === 'string') {
        // If issuer is an IRI, it should match the test issuer
        expect(assertion.issuer).toBe(testIssuer.id);
      } else {
        // If issuer is an embedded object, it should have required fields
        expect(assertion.issuer.id).toBe(testIssuer.id);
        expect(assertion.issuer.type).toBe('Issuer');
        expect(assertion.issuer.name).toBe(testIssuer.name);
        expect(assertion.issuer.url).toBe(testIssuer.url);
      }

      // Store for cleanup
      testAssertion = assertion;
    });

    it('should fail to create v3.0 assertion if issuer cannot be determined', async () => {
      // Create a badge class with invalid issuer reference
      const invalidBadgeClassResponse = await request(app)
        .post('/api/v1/badge-classes')
        .send({
          name: 'Invalid Badge Class',
          description: 'Badge class with invalid issuer',
          issuer: 'urn:uuid:00000000-0000-0000-0000-000000000000', // Non-existent issuer
          criteria: {
            narrative: 'Complete the test requirements',
          },
        })
        .expect(400); // Should fail due to invalid issuer

      // If somehow the badge class was created, try to create assertion
      if (invalidBadgeClassResponse.status === 201) {
        const assertionData = {
          badgeClass: invalidBadgeClassResponse.body.id,
          recipient: {
            type: 'email',
            identity: 'recipient@example.com',
            hashed: false,
          },
        };

        await request(app)
          .post('/api/v1/assertions?version=3.0')
          .send(assertionData)
          .expect(400); // Should fail due to missing issuer
      }
    });
  });

  describe('v3.0 Assertion Retrieval with Issuer Field', () => {
    beforeEach(async () => {
      // Create a test assertion
      const assertionData = {
        badgeClass: testBadgeClass.id,
        recipient: {
          type: 'email',
          identity: 'recipient@example.com',
          hashed: false,
        },
      };

      const response = await request(app)
        .post('/api/v1/assertions?version=3.0')
        .send(assertionData)
        .expect(201);

      testAssertion = response.body;
    });

    it('should retrieve assertion with complete issuer data in v3.0 format', async () => {
      const response = await request(app)
        .get(`/api/v1/assertions/${testAssertion.id}?version=3.0`)
        .expect(200);

      const assertion = response.body as OB3.VerifiableCredential;

      // Verify the assertion structure
      expect(assertion.type).toContain('VerifiableCredential');
      expect(assertion.type).toContain('OpenBadgeCredential');

      // Verify issuer field is present and complete
      expect(assertion.issuer).toBeDefined();
      
      if (typeof assertion.issuer === 'object') {
        // Verify all required issuer fields are present
        expect(assertion.issuer.id).toBe(testIssuer.id);
        expect(assertion.issuer.type).toBe('Issuer');
        expect(assertion.issuer.name).toBe(testIssuer.name);
        expect(assertion.issuer.url).toBe(testIssuer.url);
        
        // Optional fields should be included if available
        if (testIssuer.email) {
          expect(assertion.issuer.email).toBe(testIssuer.email);
        }
        if (testIssuer.description) {
          expect(assertion.issuer.description).toBe(testIssuer.description);
        }
      }
    });

    it('should retrieve assertion with issuer field in v2.0 format for backward compatibility', async () => {
      const response = await request(app)
        .get(`/api/v1/assertions/${testAssertion.id}?version=2.0`)
        .expect(200);

      const assertion = response.body;

      // v2.0 format should still work but may have different issuer handling
      expect(assertion).toBeDefined();
      expect(assertion.id).toBe(testAssertion.id);
      
      // In v2.0, issuer might be referenced differently
      // This test ensures backward compatibility
    });

    it('should handle missing assertion gracefully', async () => {
      const nonExistentId = 'urn:uuid:00000000-0000-0000-0000-000000000000';
      
      await request(app)
        .get(`/api/v1/assertions/${nonExistentId}?version=3.0`)
        .expect(404);
    });
  });

  describe('v3.0 VerifiableCredential Compliance', () => {
    beforeEach(async () => {
      // Create a test assertion
      const assertionData = {
        badgeClass: testBadgeClass.id,
        recipient: {
          type: 'email',
          identity: 'recipient@example.com',
          hashed: false,
        },
      };

      const response = await request(app)
        .post('/api/v1/assertions?version=3.0')
        .send(assertionData)
        .expect(201);

      testAssertion = response.body;
    });

    it('should produce valid VerifiableCredential with proper issuer structure', async () => {
      const response = await request(app)
        .get(`/api/v1/assertions/${testAssertion.id}?version=3.0`)
        .expect(200);

      const vc = response.body as OB3.VerifiableCredential;

      // Verify VerifiableCredential structure
      expect(vc['@context']).toBeDefined();
      expect(vc.type).toContain('VerifiableCredential');
      expect(vc.id).toBeDefined();
      expect(vc.issuer).toBeDefined();
      expect(vc.issuanceDate).toBeDefined();
      expect(vc.credentialSubject).toBeDefined();

      // Verify issuer field compliance with W3C VC spec
      if (typeof vc.issuer === 'string') {
        // Issuer as IRI
        expect(vc.issuer).toMatch(/^urn:uuid:[0-9a-f-]+$/);
      } else {
        // Issuer as object
        expect(vc.issuer.id).toBeDefined();
        expect(vc.issuer.id).toMatch(/^urn:uuid:[0-9a-f-]+$/);
        expect(vc.issuer.type).toBe('Issuer');
        expect(vc.issuer.name).toBeDefined();
        expect(vc.issuer.url).toBeDefined();
      }

      // Verify credentialSubject has achievement with issuer reference
      expect(vc.credentialSubject.achievement).toBeDefined();
      expect(vc.credentialSubject.achievement.issuer).toBeDefined();
    });

    it('should maintain issuer consistency across credential structure', async () => {
      const response = await request(app)
        .get(`/api/v1/assertions/${testAssertion.id}?version=3.0`)
        .expect(200);

      const vc = response.body as OB3.VerifiableCredential;

      // Extract issuer IDs from different parts of the credential
      const vcIssuerId = typeof vc.issuer === 'string' 
        ? vc.issuer 
        : vc.issuer.id;
      
      const achievementIssuerId = typeof vc.credentialSubject.achievement.issuer === 'string'
        ? vc.credentialSubject.achievement.issuer
        : vc.credentialSubject.achievement.issuer.id;

      // Verify issuer consistency
      expect(vcIssuerId).toBe(achievementIssuerId);
      expect(vcIssuerId).toBe(testIssuer.id);
    });
  });

  describe('Batch Operations with Issuer Field', () => {
    it('should handle multiple assertions with consistent issuer data', async () => {
      const assertions = [];
      
      // Create multiple assertions
      for (let i = 0; i < 3; i++) {
        const assertionData = {
          badgeClass: testBadgeClass.id,
          recipient: {
            type: 'email',
            identity: `recipient${i}@example.com`,
            hashed: false,
          },
        };

        const response = await request(app)
          .post('/api/v1/assertions?version=3.0')
          .send(assertionData)
          .expect(201);

        assertions.push(response.body);
      }

      // Verify all assertions have consistent issuer data
      for (const assertion of assertions) {
        expect(assertion.issuer).toBeDefined();
        
        const issuerId = typeof assertion.issuer === 'string' 
          ? assertion.issuer 
          : assertion.issuer.id;
        
        expect(issuerId).toBe(testIssuer.id);
      }
    });
  });
});
