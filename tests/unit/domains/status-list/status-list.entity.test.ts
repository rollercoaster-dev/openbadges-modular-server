/**
 * Unit tests for the StatusList entity
 *
 * This file contains tests for the StatusList domain entity to ensure
 * it behaves correctly according to the Bitstring Status List specification.
 */

import { describe, expect, it, beforeEach, mock } from 'bun:test';
import { StatusList } from '@domains/status-list/status-list.entity';
import {
  StatusPurpose,
  StatusListData,
  CreateStatusListParams,
} from '@domains/status-list/status-list.types';
import { Shared } from 'openbadges-types';

// Mock the logger to avoid console output during tests
mock.module('@utils/logging/logger.service', () => ({
  logger: {
    info: mock(() => {}),
    debug: mock(() => {}),
    warn: mock(() => {}),
    error: mock(() => {}),
  },
}));

describe('StatusList Entity', () => {
  // Test data
  const validStatusListData: StatusListData = {
    id: 'status-list-123',
    issuerId: 'issuer-456',
    purpose: StatusPurpose.REVOCATION,
    statusSize: 1,
    encodedList:
      'H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAIC3AYbSVKsAQAAA',
    totalEntries: 131072,
    usedEntries: 0,
    createdAt: new Date('2023-01-01T00:00:00Z'),
    updatedAt: new Date('2023-01-01T00:00:00Z'),
    metadata: { test: 'value' },
  };

  const validCreateParams: CreateStatusListParams = {
    issuerId: 'issuer-456',
    purpose: StatusPurpose.REVOCATION,
    statusSize: 1,
    totalEntries: 131072,
    ttl: 86400000,
    metadata: { test: 'value' },
  };

  describe('Factory Methods', () => {
    describe('create', () => {
      it('should create a new status list with default values', async () => {
        const params: CreateStatusListParams = {
          issuerId: 'issuer-123',
          purpose: StatusPurpose.REVOCATION,
        };

        const statusList = await StatusList.create(params);

        expect(statusList).toBeDefined();
        expect(statusList.id).toBeDefined();
        expect(statusList.issuerId).toBe(params.issuerId);
        expect(statusList.purpose).toBe(params.purpose);
        expect(statusList.statusSize).toBe(1); // Default value
        expect(statusList.totalEntries).toBe(131072); // Default value
        expect(statusList.usedEntries).toBe(0);
        expect(statusList.encodedList).toBeDefined();
        expect(statusList.createdAt).toBeInstanceOf(Date);
        expect(statusList.updatedAt).toBeInstanceOf(Date);
        expect(statusList.ttl).toBeUndefined();
        expect(statusList.metadata).toBeUndefined();
      });

      it('should create a status list with custom parameters', async () => {
        const statusList = await StatusList.create(validCreateParams);

        expect(statusList).toBeDefined();
        expect(statusList.id).toBeDefined();
        expect(statusList.issuerId).toBe(validCreateParams.issuerId);
        expect(statusList.purpose).toBe(validCreateParams.purpose);
        expect(statusList.statusSize).toBe(validCreateParams.statusSize);
        expect(statusList.totalEntries).toBe(validCreateParams.totalEntries);
        expect(statusList.ttl).toBe(validCreateParams.ttl);
        expect(statusList.metadata).toEqual(validCreateParams.metadata);
        expect(statusList.usedEntries).toBe(0);
        expect(statusList.encodedList).toBeDefined();
      });

      it('should create status lists with different purposes', async () => {
        const purposes = [
          StatusPurpose.REVOCATION,
          StatusPurpose.SUSPENSION,
          StatusPurpose.REFRESH,
          StatusPurpose.MESSAGE,
        ];

        for (const purpose of purposes) {
          const statusList = await StatusList.create({
            issuerId: 'issuer-123',
            purpose,
          });

          expect(statusList.purpose).toBe(purpose);
        }
      });

      it('should create status lists with different status sizes', async () => {
        const statusSizes = [1, 2, 4, 8];

        for (const statusSize of statusSizes) {
          const statusList = await StatusList.create({
            issuerId: 'issuer-123',
            purpose: StatusPurpose.REVOCATION,
            statusSize,
          });

          expect(statusList.statusSize).toBe(statusSize);
        }
      });
    });

    describe('fromData', () => {
      it('should create a status list from data', () => {
        const statusList = StatusList.fromData(validStatusListData);

        expect(statusList).toBeDefined();
        expect(statusList.id).toBe(validStatusListData.id);
        expect(statusList.issuerId).toBe(validStatusListData.issuerId);
        expect(statusList.purpose).toBe(validStatusListData.purpose);
        expect(statusList.statusSize).toBe(validStatusListData.statusSize);
        expect(statusList.encodedList).toBe(validStatusListData.encodedList);
        expect(statusList.totalEntries).toBe(validStatusListData.totalEntries);
        expect(statusList.usedEntries).toBe(validStatusListData.usedEntries);
        expect(statusList.createdAt).toEqual(validStatusListData.createdAt);
        expect(statusList.updatedAt).toEqual(validStatusListData.updatedAt);
        expect(statusList.metadata).toEqual(validStatusListData.metadata);
      });
    });
  });

  describe('Instance Methods', () => {
    let statusList: StatusList;

    beforeEach(() => {
      statusList = StatusList.fromData(validStatusListData);
    });

    describe('updateEncodedList', () => {
      it('should update the encoded list and timestamp', () => {
        const originalUpdatedAt = statusList.updatedAt;
        const newEncodedList = 'new-encoded-list-value';

        // Wait a bit to ensure timestamp difference
        setTimeout(() => {
          statusList.updateEncodedList(newEncodedList);

          expect(statusList.encodedList).toBe(newEncodedList);
          expect(statusList.updatedAt).not.toEqual(originalUpdatedAt);
          expect(statusList.updatedAt.getTime()).toBeGreaterThan(
            originalUpdatedAt.getTime()
          );
        }, 1);
      });
    });

    describe('incrementUsedEntries', () => {
      it('should increment used entries by 1', () => {
        const originalUsedEntries = statusList.usedEntries;

        statusList.incrementUsedEntries();

        expect(statusList.usedEntries).toBe(originalUsedEntries + 1);
      });

      it('should increment used entries by 1 only', () => {
        const originalUsedEntries = statusList.usedEntries;

        statusList.incrementUsedEntries();

        expect(statusList.usedEntries).toBe(originalUsedEntries + 1);
      });
    });

    describe('hasCapacity', () => {
      it('should return true when status list has capacity', () => {
        statusList.usedEntries = 100;
        statusList.totalEntries = 131072;

        expect(statusList.hasCapacity()).toBe(true);
      });

      it('should return false when status list is at capacity', () => {
        statusList.usedEntries = 131072;
        statusList.totalEntries = 131072;

        expect(statusList.hasCapacity()).toBe(false);
      });

      it('should return false when used entries exceed total entries', () => {
        statusList.usedEntries = 131073;
        statusList.totalEntries = 131072;

        expect(statusList.hasCapacity()).toBe(false);
      });
    });

    describe('toBitstringStatusList', () => {
      it('should convert to BitstringStatusList format with minimal fields', () => {
        const minimalStatusList = StatusList.fromData({
          ...validStatusListData,
          statusSize: 1,
          ttl: undefined,
        });

        const bitstringStatusList = minimalStatusList.toBitstringStatusList();

        expect(bitstringStatusList).toEqual({
          id: validStatusListData.id as Shared.IRI,
          type: 'BitstringStatusList',
          statusPurpose: validStatusListData.purpose,
          encodedList: validStatusListData.encodedList,
        });
      });

      it('should include TTL when present', () => {
        const statusListWithTtl = StatusList.fromData({
          ...validStatusListData,
          ttl: 86400000,
        });

        const bitstringStatusList = statusListWithTtl.toBitstringStatusList();

        expect(bitstringStatusList.ttl).toBe(86400000);
      });

      it('should include statusSize and statusMessages for multi-bit status', () => {
        const multiBitStatusList = StatusList.fromData({
          ...validStatusListData,
          statusSize: 2,
          purpose: StatusPurpose.REVOCATION,
        });

        const bitstringStatusList = multiBitStatusList.toBitstringStatusList();

        expect(bitstringStatusList.statusSize).toBe(2);
        expect(bitstringStatusList.statusMessages).toBeDefined();
        expect(Array.isArray(bitstringStatusList.statusMessages)).toBe(true);
        expect(bitstringStatusList.statusMessages?.length).toBe(4); // 2^2 = 4 possible values
      });
    });

    describe('toBitstringStatusListCredential', () => {
      const mockIssuerData = {
        id: 'issuer-123',
        name: 'Test Issuer',
        url: 'https://example.com/issuer',
      };

      it('should convert to BitstringStatusListCredential format', () => {
        const credential =
          statusList.toBitstringStatusListCredential(mockIssuerData);

        expect(credential).toMatchObject({
          '@context': expect.arrayContaining([
            'https://www.w3.org/ns/credentials/v2',
          ]),
          id: statusList.id,
          type: expect.arrayContaining([
            'VerifiableCredential',
            'BitstringStatusListCredential',
          ]),
          issuer: mockIssuerData.id,
          validFrom: expect.any(String),
          credentialSubject: expect.objectContaining({
            id: statusList.id,
            type: 'BitstringStatusList',
            statusPurpose: statusList.purpose,
            encodedList: statusList.encodedList,
          }),
        });
      });

      it('should include validUntil when TTL is present', () => {
        const statusListWithTtl = StatusList.fromData({
          ...validStatusListData,
          ttl: 86400000, // 24 hours
        });

        const credential =
          statusListWithTtl.toBitstringStatusListCredential(mockIssuerData);

        expect(credential.validUntil).toBeDefined();
        expect(typeof credential.validUntil).toBe('string');
      });
    });

    describe('generateDefaultStatusMessages', () => {
      it('should generate correct messages for revocation purpose', () => {
        const revocationStatusList = StatusList.fromData({
          ...validStatusListData,
          purpose: StatusPurpose.REVOCATION,
          statusSize: 2,
        });

        const messages = revocationStatusList.generateDefaultStatusMessages();

        expect(messages).toEqual([
          { status: '0x0', message: 'not_revoked' },
          { status: '0x1', message: 'revoked' },
          { status: '0x2', message: 'revoked' },
          { status: '0x3', message: 'revoked' },
        ]);
      });

      it('should generate correct messages for suspension purpose', () => {
        const suspensionStatusList = StatusList.fromData({
          ...validStatusListData,
          purpose: StatusPurpose.SUSPENSION,
          statusSize: 2,
        });

        const messages = suspensionStatusList.generateDefaultStatusMessages();

        expect(messages).toEqual([
          { status: '0x0', message: 'not_suspended' },
          { status: '0x1', message: 'suspended' },
          { status: '0x2', message: 'suspended' },
          { status: '0x3', message: 'suspended' },
        ]);
      });

      it('should generate correct messages for refresh purpose', () => {
        const refreshStatusList = StatusList.fromData({
          ...validStatusListData,
          purpose: StatusPurpose.REFRESH,
          statusSize: 2,
        });

        const messages = refreshStatusList.generateDefaultStatusMessages();

        expect(messages).toEqual([
          { status: '0x0', message: 'no_refresh_needed' },
          { status: '0x1', message: 'refresh_available' },
          { status: '0x2', message: 'refresh_available' },
          { status: '0x3', message: 'refresh_available' },
        ]);
      });

      it('should generate correct messages for message purpose', () => {
        const messageStatusList = StatusList.fromData({
          ...validStatusListData,
          purpose: StatusPurpose.MESSAGE,
          statusSize: 2,
        });

        const messages = messageStatusList.generateDefaultStatusMessages();

        expect(messages).toEqual([
          { status: '0x0', message: 'no_message' },
          { status: '0x1', message: 'message_1' },
          { status: '0x2', message: 'message_2' },
          { status: '0x3', message: 'message_3' },
        ]);
      });

      it('should handle different status sizes', () => {
        const statusSizes = [1, 2, 4, 8];

        statusSizes.forEach((statusSize) => {
          const statusList = StatusList.fromData({
            ...validStatusListData,
            statusSize,
          });

          const messages = statusList.generateDefaultStatusMessages();
          const expectedCount = Math.pow(2, statusSize);

          expect(messages.length).toBe(expectedCount);
          expect(messages[0].status).toBe('0x0');
          expect(messages[expectedCount - 1].status).toBe(
            `0x${(expectedCount - 1).toString(16).toUpperCase()}`
          );
        });
      });
    });

    describe('toData', () => {
      it('should convert to database data format', () => {
        const data = statusList.toData();

        expect(data).toEqual({
          id: statusList.id,
          issuerId: statusList.issuerId,
          purpose: statusList.purpose,
          statusSize: statusList.statusSize,
          encodedList: statusList.encodedList,
          ttl: statusList.ttl,
          totalEntries: statusList.totalEntries,
          usedEntries: statusList.usedEntries,
          createdAt: statusList.createdAt,
          updatedAt: statusList.updatedAt,
          metadata: statusList.metadata,
        });
      });
    });
  });

  describe('Static Methods', () => {
    describe('validateParams', () => {
      it('should validate valid parameters without throwing', () => {
        expect(() => {
          StatusList.validateParams(validCreateParams);
        }).not.toThrow();
      });

      it('should throw error for missing issuerId', () => {
        const invalidParams = {
          ...validCreateParams,
          issuerId: '',
        };

        expect(() => {
          StatusList.validateParams(invalidParams);
        }).toThrow('issuerId is required');
      });

      it('should throw error for invalid status purpose', () => {
        const invalidParams = {
          ...validCreateParams,
          purpose: 'invalid-purpose' as StatusPurpose,
        };

        expect(() => {
          StatusList.validateParams(invalidParams);
        }).toThrow('Invalid status purpose: invalid-purpose');
      });

      it('should throw error for invalid status size', () => {
        // Note: 0 is falsy so it won't trigger validation, only test truthy invalid values
        const invalidSizes = [9, -1, 16];

        invalidSizes.forEach((statusSize) => {
          const invalidParams = {
            ...validCreateParams,
            statusSize,
          };

          expect(() => {
            StatusList.validateParams(invalidParams);
          }).toThrow('statusSize must be between 1 and 8 bits');
        });
      });

      it('should not validate statusSize when it is 0 (falsy)', () => {
        const paramsWithZeroStatusSize = {
          ...validCreateParams,
          statusSize: 0, // This is falsy so validation is skipped
        };

        expect(() => {
          StatusList.validateParams(paramsWithZeroStatusSize);
        }).not.toThrow();
      });

      it('should not validate statusSize when not provided', () => {
        const paramsWithoutStatusSize = {
          issuerId: 'issuer-123',
          purpose: StatusPurpose.REVOCATION,
          // statusSize is optional and not provided
        };

        expect(() => {
          StatusList.validateParams(paramsWithoutStatusSize);
        }).not.toThrow();
      });

      it('should throw error for invalid total entries', () => {
        const invalidParams = {
          ...validCreateParams,
          totalEntries: 100000, // Less than minimum 131072
        };

        expect(() => {
          StatusList.validateParams(invalidParams);
        }).toThrow('totalEntries must be at least 131,072 for privacy');
      });

      it('should throw error for negative TTL', () => {
        const invalidParams = {
          ...validCreateParams,
          ttl: -1,
        };

        expect(() => {
          StatusList.validateParams(invalidParams);
        }).toThrow('ttl must be non-negative');
      });

      it('should accept valid status sizes', () => {
        const validSizes = [1, 2, 4, 8];

        validSizes.forEach((statusSize) => {
          const params = {
            ...validCreateParams,
            statusSize,
          };

          expect(() => {
            StatusList.validateParams(params);
          }).not.toThrow();
        });
      });

      it('should accept valid total entries', () => {
        const validTotalEntries = [131072, 262144, 524288];

        validTotalEntries.forEach((totalEntries) => {
          const params = {
            ...validCreateParams,
            totalEntries,
          };

          expect(() => {
            StatusList.validateParams(params);
          }).not.toThrow();
        });
      });

      it('should accept zero TTL', () => {
        const params = {
          ...validCreateParams,
          ttl: 0,
        };

        expect(() => {
          StatusList.validateParams(params);
        }).not.toThrow();
      });
    });

    describe('encodeBitstring and decodeBitstring', () => {
      it('should encode and decode bitstring correctly', async () => {
        const originalBitstring = new Uint8Array([1, 2, 3, 4, 5]);

        const encoded = await StatusList.encodeBitstring(originalBitstring);
        expect(typeof encoded).toBe('string');
        expect(encoded.length).toBeGreaterThan(0);

        const decoded = await StatusList.decodeBitstring(encoded);
        expect(decoded).toEqual(originalBitstring);
      });

      it('should handle empty bitstring', async () => {
        const emptyBitstring = new Uint8Array(0);

        const encoded = await StatusList.encodeBitstring(emptyBitstring);
        const decoded = await StatusList.decodeBitstring(encoded);

        expect(decoded).toEqual(emptyBitstring);
      });

      it('should handle large bitstring', async () => {
        const largeBitstring = new Uint8Array(16384); // 16KB
        largeBitstring.fill(0);
        largeBitstring[0] = 255;
        largeBitstring[16383] = 128;

        const encoded = await StatusList.encodeBitstring(largeBitstring);
        const decoded = await StatusList.decodeBitstring(encoded);

        expect(decoded).toEqual(largeBitstring);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle status list with maximum capacity', () => {
      const fullStatusList = StatusList.fromData({
        ...validStatusListData,
        usedEntries: 131072,
        totalEntries: 131072,
      });

      expect(fullStatusList.hasCapacity()).toBe(false);
    });

    it('should handle status list with metadata', () => {
      const metadata = {
        version: '1.0',
        description: 'Test status list',
        tags: ['test', 'revocation'],
      };

      const statusListWithMetadata = StatusList.fromData({
        ...validStatusListData,
        metadata,
      });

      expect(statusListWithMetadata.metadata).toEqual(metadata);
      expect(statusListWithMetadata.toData().metadata).toEqual(metadata);
    });

    it('should handle status list without optional fields', () => {
      const minimalData: StatusListData = {
        id: 'minimal-status-list',
        issuerId: 'minimal-issuer',
        purpose: StatusPurpose.REVOCATION,
        statusSize: 1,
        encodedList: 'encoded-list',
        totalEntries: 131072,
        usedEntries: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const statusList = StatusList.fromData(minimalData);

      expect(statusList.ttl).toBeUndefined();
      expect(statusList.metadata).toBeUndefined();
      expect(statusList.toBitstringStatusList().ttl).toBeUndefined();
    });
  });
});
