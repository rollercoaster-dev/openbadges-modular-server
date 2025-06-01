/**
 * API endpoint tests for Open Badges API
 *
 * This file contains tests for the API endpoints to ensure they work correctly
 * with the new Shared.IRI types.
 */

import { describe, expect, it, mock } from 'bun:test';
import { Shared, OB2, OB3 } from 'openbadges-types';
import { IssuerController } from '@/api/controllers/issuer.controller';
import { BadgeClassController } from '@/api/controllers/badgeClass.controller';
import { AssertionController } from '@/api/controllers/assertion.controller';
import { toIRI } from '@/utils/types/iri-utils';
import { toDateTime } from '@/utils/types/type-utils';
import {
  BadgeVersion,
  BADGE_VERSION_CONTEXTS,
} from '@/utils/version/badge-version';

// Mock controllers
const mockIssuerController = {
  createIssuer: mock(
    async (
      data: Partial<OB2.Profile | OB3.Issuer>
    ): Promise<OB2.Profile | OB3.Issuer> => {
      return { id: toIRI('123e4567-e89b-12d3-a456-426614174000'), ...data } as
        | OB2.Profile
        | OB3.Issuer;
    }
  ),
  getIssuerById: mock(async (id: string): Promise<OB2.Profile | OB3.Issuer> => {
    return {
      id: toIRI(id),
      name: 'Test Issuer',
      url: toIRI('https://test.edu'),
    } as OB2.Profile | OB3.Issuer;
  }),
  updateIssuer: mock(
    async (
      id: string,
      data: Partial<OB2.Profile | OB3.Issuer>
    ): Promise<OB2.Profile | OB3.Issuer> => {
      return { id: toIRI(id), ...data } as OB2.Profile | OB3.Issuer;
    }
  ),
  deleteIssuer: mock(
    async (_id: string, _version?: unknown): Promise<boolean> => {
      return true;
    }
  ),
} as unknown as IssuerController;

const mockBadgeClassController = {
  createBadgeClass: mock(
    async (
      data: Partial<OB2.BadgeClass | OB3.Achievement>
    ): Promise<OB2.BadgeClass | OB3.Achievement> => {
      return { id: toIRI('123e4567-e89b-12d3-a456-426614174001'), ...data } as
        | OB2.BadgeClass
        | OB3.Achievement;
    }
  ),
  getBadgeClassById: mock(
    async (id: string): Promise<OB2.BadgeClass | OB3.Achievement> => {
      return {
        id: toIRI(id),
        issuer: toIRI('123e4567-e89b-12d3-a456-426614174000'),
        name: 'Test Badge',
        description: 'A test badge',
        image: toIRI('https://test.edu/badge.png'),
        criteria: { narrative: 'Complete the test' },
      } as OB2.BadgeClass | OB3.Achievement;
    }
  ),
  updateBadgeClass: mock(
    async (
      id: string,
      data: Partial<OB2.BadgeClass | OB3.Achievement>
    ): Promise<OB2.BadgeClass | OB3.Achievement> => {
      return { id: toIRI(id), ...data } as OB2.BadgeClass | OB3.Achievement;
    }
  ),
  deleteBadgeClass: mock(
    async (_id: string, _version?: unknown): Promise<boolean> => {
      return true;
    }
  ),
  getBadgeClassesByIssuer: mock(
    async (issuerId: string): Promise<(OB2.BadgeClass | OB3.Achievement)[]> => {
      return [
        {
          type: 'BadgeClass',
          id: toIRI('123e4567-e89b-12d3-a456-426614174001'),
          issuer: toIRI(issuerId),
          name: 'Test Badge',
          description: 'A test badge',
          image: toIRI('https://test.edu/badge.png'),
          criteria: { narrative: 'Complete the test' },
        },
      ];
    }
  ),
} as unknown as BadgeClassController;

const mockAssertionController = {
  createAssertion: mock(
    async (
      data: Partial<OB2.Assertion | OB3.VerifiableCredential>
    ): Promise<OB2.Assertion | OB3.VerifiableCredential> => {
      return { id: toIRI('123e4567-e89b-12d3-a456-426614174002'), ...data } as
        | OB2.Assertion
        | OB3.VerifiableCredential;
    }
  ),
  getAssertionById: mock(
    async (id: string): Promise<OB2.Assertion | OB3.VerifiableCredential> => {
      return {
        '@context': BADGE_VERSION_CONTEXTS[BadgeVersion.V2],
        type: 'Assertion',
        id: toIRI(id),
        badgeClass: toIRI('123e4567-e89b-12d3-a456-426614174001'),
        badge: toIRI('123e4567-e89b-12d3-a456-426614174001'),
        recipient: {
          type: 'email',
          identity: 'recipient@test.edu',
          hashed: false,
        } as OB2.IdentityObject,
        issuedOn: toDateTime(new Date().toISOString()),
        verification: { type: 'HostedBadge' },
      } as OB2.Assertion;
    }
  ),
  getAssertionsByBadgeClass: mock(
    async (
      badgeClassId: string
    ): Promise<(OB2.Assertion | OB3.VerifiableCredential)[]> => {
      return [
        {
          '@context': BADGE_VERSION_CONTEXTS[BadgeVersion.V2],
          type: 'Assertion',
          id: toIRI('123e4567-e89b-12d3-a456-426614174002'),
          badgeClass: toIRI(badgeClassId),
          badge: toIRI(badgeClassId),
          recipient: {
            type: 'email',
            identity: 'recipient@test.edu',
            hashed: false,
          } as OB2.IdentityObject,
          issuedOn: toDateTime(new Date().toISOString()),
          verification: { type: 'HostedBadge' },
        },
      ];
    }
  ) as unknown as () => Promise<(OB2.Assertion | OB3.VerifiableCredential)[]>,
  revokeAssertion: mock(
    async (_id: string, _reason: string): Promise<boolean> => {
      return true;
    }
  ),
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
        name: 'Test Badge',
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
        name: 'Test Badge',
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
        url: toIRI('https://test.edu'),
      };
      const createdIssuer = await mockIssuerController.createIssuer(issuerData);
      expect(createdIssuer.id).toBe(
        toIRI('123e4567-e89b-12d3-a456-426614174000')
      );
      expect(createdIssuer.url).toBe(toIRI('https://test.edu'));

      // Test getIssuerById
      const id = toIRI('123e4567-e89b-12d3-a456-426614174000');
      const issuer = await mockIssuerController.getIssuerById(id);
      expect(issuer.id).toBe(id);
      expect(mockIssuerController.getIssuerById).toHaveBeenCalledWith(id);

      // Test updateIssuer
      const updatedData = {
        name: 'Updated Issuer',
        url: toIRI('https://updated.edu'),
      };
      const updatedIssuer = await mockIssuerController.updateIssuer(
        id,
        updatedData
      );
      expect(updatedIssuer.id).toBe(id);
      expect(updatedIssuer.name).toBe('Updated Issuer');
      expect(updatedIssuer.url).toBe(toIRI('https://updated.edu'));
      expect(mockIssuerController.updateIssuer).toHaveBeenCalledWith(
        id,
        updatedData
      );
    });

    it('should handle Shared.IRI in BadgeClassController', async () => {
      // Test createBadgeClass
      const badgeClassData = {
        issuer: toIRI('123e4567-e89b-12d3-a456-426614174000'),
        name: 'Test Badge',
        description: 'A test badge',
        image: toIRI('https://test.edu/badge.png'),
        criteria: { narrative: 'Complete the test' },
      };
      const createdBadgeClass = await mockBadgeClassController.createBadgeClass(
        badgeClassData
      );
      expect(createdBadgeClass.id).toBe(
        toIRI('123e4567-e89b-12d3-a456-426614174001')
      );
      expect(createdBadgeClass.issuer).toBe(
        toIRI('123e4567-e89b-12d3-a456-426614174000')
      );
      expect(createdBadgeClass.image).toBe(toIRI('https://test.edu/badge.png'));

      // Test getBadgeClassById
      const id = toIRI('123e4567-e89b-12d3-a456-426614174001');
      const badgeClass = await mockBadgeClassController.getBadgeClassById(id);
      expect(badgeClass.id).toBe(id);
      expect(mockBadgeClassController.getBadgeClassById).toHaveBeenCalledWith(
        id
      );

      // Test getBadgeClassesByIssuer
      const issuerId = toIRI('123e4567-e89b-12d3-a456-426614174000');
      const badgeClasses =
        await mockBadgeClassController.getBadgeClassesByIssuer(issuerId);
      expect(badgeClasses[0].issuer).toBe(issuerId);
      expect(
        mockBadgeClassController.getBadgeClassesByIssuer
      ).toHaveBeenCalledWith(issuerId);
    });

    it('should handle Shared.IRI in AssertionController', async () => {
      // Test createAssertion
      const assertionData = {
        badge: toIRI('123e4567-e89b-12d3-a456-426614174001'), // Changed from badgeClass to badge to match DTO
        recipient: {
          type: 'email',
          identity: 'recipient@test.edu',
          hashed: false,
        },
        issuedOn: toDateTime(new Date().toISOString()),
      };
      const createdAssertion = await mockAssertionController.createAssertion(
        assertionData
      );
      expect(createdAssertion.id).toBe(
        toIRI('123e4567-e89b-12d3-a456-426614174002')
      );
      // The property is called 'badge' in the DTO but the internal model and response use 'badgeClass'
      expect(createdAssertion.badge || createdAssertion.badgeClass).toBe(
        toIRI('123e4567-e89b-12d3-a456-426614174001')
      );

      // Test getAssertionById
      const id = toIRI('123e4567-e89b-12d3-a456-426614174002');
      const assertion = await mockAssertionController.getAssertionById(id);
      expect(assertion.id).toBe(id);
      expect(mockAssertionController.getAssertionById).toHaveBeenCalledWith(id);

      // Test getAssertionsByBadgeClass
      const badgeClassId = toIRI('123e4567-e89b-12d3-a456-426614174001');
      const assertions =
        await mockAssertionController.getAssertionsByBadgeClass(badgeClassId);
      expect(assertions[0].badgeClass).toBe(badgeClassId);
      expect(
        mockAssertionController.getAssertionsByBadgeClass
      ).toHaveBeenCalledWith(badgeClassId);

      // Test revokeAssertion
      const wasRevoked = await mockAssertionController.revokeAssertion(
        id,
        'Test revocation'
      );
      expect(wasRevoked).toBe(true);
      expect(mockAssertionController.revokeAssertion).toHaveBeenCalledWith(
        id,
        'Test revocation'
      );
    });
  });

  describe('Batch Operations', () => {
    describe('POST /v3/credentials/batch', () => {
      it('should create multiple credentials successfully', async () => {
        // First create a badge class
        const badgeClassData = {
          name: 'Batch Test Badge',
          description: 'A badge for testing batch operations',
          image: 'https://example.com/badge.png',
          criteria: {
            narrative: 'Complete the batch test',
          },
        };

        const badgeClassResponse = await app.request('/v3/badge-classes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(badgeClassData),
        });

        expect(badgeClassResponse.status).toBe(201);
        const badgeClass = await badgeClassResponse.json();

        // Now create batch credentials
        const batchData = {
          credentials: [
            {
              recipient: {
                identity: 'batch-user1@example.com',
                type: 'email',
              },
              badgeClass: badgeClass.id,
              evidence: [
                {
                  id: 'https://example.com/evidence1',
                  type: 'Evidence',
                  name: 'Batch Evidence 1',
                },
              ],
            },
            {
              recipient: {
                identity: 'batch-user2@example.com',
                type: 'email',
              },
              badgeClass: badgeClass.id,
              evidence: [
                {
                  id: 'https://example.com/evidence2',
                  type: 'Evidence',
                  name: 'Batch Evidence 2',
                },
              ],
            },
          ],
        };

        const response = await app.request('/v3/credentials/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(batchData),
        });

        expect(response.status).toBe(201);
        const result = await response.json();

        expect(result.summary.total).toBe(2);
        expect(result.summary.successful).toBe(2);
        expect(result.summary.failed).toBe(0);
        expect(result.results).toHaveLength(2);
        expect(result.results[0].success).toBe(true);
        expect(result.results[0].data).toBeDefined();
        expect(result.results[1].success).toBe(true);
        expect(result.results[1].data).toBeDefined();
      });

      it('should handle partial failures in batch creation', async () => {
        const batchData = {
          credentials: [
            {
              recipient: {
                identity: 'valid-user@example.com',
                type: 'email',
              },
              badgeClass: 'valid-badge-class-id', // This should exist from previous tests
              evidence: [
                {
                  id: 'https://example.com/evidence',
                  type: 'Evidence',
                  name: 'Valid Evidence',
                },
              ],
            },
            {
              recipient: {
                identity: 'invalid-user@example.com',
                type: 'email',
              },
              badgeClass: 'nonexistent-badge-class-id', // This doesn't exist
              evidence: [
                {
                  id: 'https://example.com/evidence',
                  type: 'Evidence',
                  name: 'Invalid Evidence',
                },
              ],
            },
          ],
        };

        const response = await app.request('/v3/credentials/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(batchData),
        });

        expect(response.status).toBe(201);
        const result = await response.json();

        expect(result.summary.total).toBe(2);
        expect(result.summary.successful).toBeLessThanOrEqual(1);
        expect(result.summary.failed).toBeGreaterThanOrEqual(1);
        expect(result.results).toHaveLength(2);
      });

      it('should require authentication', async () => {
        const batchData = {
          credentials: [
            {
              recipient: {
                identity: 'test@example.com',
                type: 'email',
              },
              badgeClass: 'test-badge-class',
              evidence: [],
            },
          ],
        };

        const response = await app.request('/v3/credentials/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(batchData),
        });

        expect(response.status).toBe(401);
      });

      it('should validate request body', async () => {
        const invalidBatchData = {
          credentials: [], // Empty array should fail validation
        };

        const response = await app.request('/v3/credentials/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(invalidBatchData),
        });

        expect(response.status).toBe(400);
        const result = await response.json();
        expect(result.success).toBe(false);
        expect(result.error).toBe('Validation error');
      });
    });

    describe('GET /v3/credentials/batch', () => {
      let createdCredentialIds: string[] = [];

      beforeAll(async () => {
        // Create some test credentials first
        const badgeClassData = {
          name: 'Batch Retrieval Test Badge',
          description: 'A badge for testing batch retrieval',
          image: 'https://example.com/badge.png',
          criteria: {
            narrative: 'Complete the batch retrieval test',
          },
        };

        const badgeClassResponse = await app.request('/v3/badge-classes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(badgeClassData),
        });

        const badgeClass = await badgeClassResponse.json();

        // Create individual credentials
        for (let i = 1; i <= 3; i++) {
          const credentialData = {
            recipient: {
              identity: `batch-retrieval-user${i}@example.com`,
              type: 'email',
            },
            badgeClass: badgeClass.id,
            evidence: [
              {
                id: `https://example.com/evidence${i}`,
                type: 'Evidence',
                name: `Batch Retrieval Evidence ${i}`,
              },
            ],
          };

          const response = await app.request('/v3/credentials', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify(credentialData),
          });

          const credential = await response.json();
          createdCredentialIds.push(credential.id);
        }
      });

      it('should retrieve multiple credentials successfully', async () => {
        const idsParam = createdCredentialIds.slice(0, 2).join(',');

        const response = await app.request(`/v3/credentials/batch?ids=${idsParam}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        expect(response.status).toBe(200);
        const result = await response.json();

        expect(result.summary.total).toBe(2);
        expect(result.summary.successful).toBe(2);
        expect(result.summary.failed).toBe(0);
        expect(result.results).toHaveLength(2);
        expect(result.results[0].success).toBe(true);
        expect(result.results[0].data).toBeDefined();
        expect(result.results[1].success).toBe(true);
        expect(result.results[1].data).toBeDefined();
      });

      it('should handle missing credentials gracefully', async () => {
        const idsParam = `${createdCredentialIds[0]},nonexistent-id`;

        const response = await app.request(`/v3/credentials/batch?ids=${idsParam}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        expect(response.status).toBe(200);
        const result = await response.json();

        expect(result.summary.total).toBe(2);
        expect(result.summary.successful).toBe(1);
        expect(result.summary.failed).toBe(1);
        expect(result.results[0].success).toBe(true);
        expect(result.results[1].success).toBe(false);
        expect(result.results[1].error).toBe('Assertion not found');
      });

      it('should require authentication', async () => {
        const response = await app.request('/v3/credentials/batch?ids=test-id', {
          method: 'GET',
        });

        expect(response.status).toBe(401);
      });

      it('should validate query parameters', async () => {
        const response = await app.request('/v3/credentials/batch', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        expect(response.status).toBe(400);
        const result = await response.json();
        expect(result.success).toBe(false);
        expect(result.error).toBe('Validation error');
      });
    });

    describe('PUT /v3/credentials/batch/status', () => {
      let testCredentialIds: string[] = [];

      beforeAll(async () => {
        // Create test credentials for status updates
        const badgeClassData = {
          name: 'Batch Status Test Badge',
          description: 'A badge for testing batch status updates',
          image: 'https://example.com/badge.png',
          criteria: {
            narrative: 'Complete the batch status test',
          },
        };

        const badgeClassResponse = await app.request('/v3/badge-classes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(badgeClassData),
        });

        const badgeClass = await badgeClassResponse.json();

        // Create individual credentials
        for (let i = 1; i <= 2; i++) {
          const credentialData = {
            recipient: {
              identity: `batch-status-user${i}@example.com`,
              type: 'email',
            },
            badgeClass: badgeClass.id,
            evidence: [
              {
                id: `https://example.com/evidence${i}`,
                type: 'Evidence',
                name: `Batch Status Evidence ${i}`,
              },
            ],
          };

          const response = await app.request('/v3/credentials', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify(credentialData),
          });

          const credential = await response.json();
          testCredentialIds.push(credential.id);
        }
      });

      it('should update multiple credential statuses successfully', async () => {
        const updateData = {
          updates: [
            {
              id: testCredentialIds[0],
              status: 'revoked',
              reason: 'Test revocation',
            },
            {
              id: testCredentialIds[1],
              status: 'suspended',
              reason: 'Test suspension',
            },
          ],
        };

        const response = await app.request('/v3/credentials/batch/status', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(updateData),
        });

        expect(response.status).toBe(200);
        const result = await response.json();

        expect(result.summary.total).toBe(2);
        expect(result.summary.successful).toBe(2);
        expect(result.summary.failed).toBe(0);
        expect(result.results).toHaveLength(2);
        expect(result.results[0].success).toBe(true);
        expect(result.results[1].success).toBe(true);
      });

      it('should handle updates for non-existent credentials', async () => {
        const updateData = {
          updates: [
            {
              id: testCredentialIds[0],
              status: 'active',
            },
            {
              id: 'nonexistent-credential-id',
              status: 'revoked',
            },
          ],
        };

        const response = await app.request('/v3/credentials/batch/status', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(updateData),
        });

        expect(response.status).toBe(200);
        const result = await response.json();

        expect(result.summary.total).toBe(2);
        expect(result.summary.successful).toBe(1);
        expect(result.summary.failed).toBe(1);
        expect(result.results[0].success).toBe(true);
        expect(result.results[1].success).toBe(false);
        expect(result.results[1].error).toContain('not found');
      });

      it('should require authentication', async () => {
        const updateData = {
          updates: [
            {
              id: 'test-id',
              status: 'revoked',
            },
          ],
        };

        const response = await app.request('/v3/credentials/batch/status', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData),
        });

        expect(response.status).toBe(401);
      });

      it('should validate request body', async () => {
        const invalidUpdateData = {
          updates: [], // Empty array should fail validation
        };

        const response = await app.request('/v3/credentials/batch/status', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(invalidUpdateData),
        });

        expect(response.status).toBe(400);
        const result = await response.json();
        expect(result.success).toBe(false);
        expect(result.error).toBe('Validation error');
      });
    });
  });
});
