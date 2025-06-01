/**
 * Unit tests for the StatusListService
 *
 * This file contains comprehensive tests for the StatusListService to ensure
 * it correctly implements the W3C StatusList2021 specification.
 */

import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { StatusListService } from '@/core/status-list.service';
import {
  StatusList,
  CredentialStatusEntry,
  StatusListRepository,
  CredentialStatusEntryRepository,
  StatusPurpose,
  CredentialStatus,
  CreateStatusListOptions,
  UpdateCredentialStatusRequest,
} from '@/core/types/status-list.types';
import { Shared } from 'openbadges-types';

// Mock repositories
const mockStatusListRepository: StatusListRepository = {
  create: mock(),
  findById: mock(),
  findByIssuerAndPurpose: mock(),
  findAll: mock(),
  update: mock(),
  delete: mock(),
};

const mockCredentialStatusEntryRepository: CredentialStatusEntryRepository = {
  create: mock(),
  findById: mock(),
  findByCredentialId: mock(),
  findByStatusListId: mock(),
  update: mock(),
  delete: mock(),
  getNextAvailableIndex: mock(),
};

describe('StatusListService', () => {
  let statusListService: StatusListService;

  beforeEach(() => {
    // Reset all mocks
    Object.values(mockStatusListRepository).forEach((mockFn) => mockFn.mockReset());
    Object.values(mockCredentialStatusEntryRepository).forEach((mockFn) => mockFn.mockReset());

    // Create service instance
    statusListService = new StatusListService(
      mockStatusListRepository,
      mockCredentialStatusEntryRepository
    );
  });

  afterEach(() => {
    // Clean up after each test
    Object.values(mockStatusListRepository).forEach((mockFn) => mockFn.mockReset());
    Object.values(mockCredentialStatusEntryRepository).forEach((mockFn) => mockFn.mockReset());
  });

  describe('createStatusList', () => {
    test('should create a new status list successfully', async () => {
      const options: CreateStatusListOptions = {
        issuerId: 'https://example.com/issuer/1' as Shared.IRI,
        purpose: 'revocation' as StatusPurpose,
        size: 16384,
      };

      const expectedStatusList: StatusList = {
        id: 'https://example.com/status-lists/1' as Shared.IRI,
        issuerId: options.issuerId,
        purpose: options.purpose,
        bitstring: 'H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAIC3AYbSVKsAQAAA', // Empty compressed bitstring
        size: 16384,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock repository calls
      mockStatusListRepository.findByIssuerAndPurpose.mockResolvedValue(null);
      mockStatusListRepository.create.mockResolvedValue(expectedStatusList);

      const result = await statusListService.createStatusList(options);

      expect(result).toEqual(expectedStatusList);
      expect(mockStatusListRepository.findByIssuerAndPurpose).toHaveBeenCalledWith(
        options.issuerId,
        options.purpose
      );
      expect(mockStatusListRepository.create).toHaveBeenCalledWith({
        issuerId: options.issuerId,
        purpose: options.purpose,
        bitstring: expect.any(String),
        size: 16384,
      });
    });

    test('should return existing status list if one already exists', async () => {
      const options: CreateStatusListOptions = {
        issuerId: 'https://example.com/issuer/1' as Shared.IRI,
        purpose: 'revocation' as StatusPurpose,
      };

      const existingStatusList: StatusList = {
        id: 'https://example.com/status-lists/1' as Shared.IRI,
        issuerId: options.issuerId,
        purpose: options.purpose,
        bitstring: 'existing-bitstring',
        size: 16384,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockStatusListRepository.findByIssuerAndPurpose.mockResolvedValue(existingStatusList);

      const result = await statusListService.createStatusList(options);

      expect(result).toEqual(existingStatusList);
      expect(mockStatusListRepository.findByIssuerAndPurpose).toHaveBeenCalledWith(
        options.issuerId,
        options.purpose
      );
      expect(mockStatusListRepository.create).not.toHaveBeenCalled();
    });

    test('should use default size when not specified', async () => {
      const options: CreateStatusListOptions = {
        issuerId: 'https://example.com/issuer/1' as Shared.IRI,
        purpose: 'suspension' as StatusPurpose,
      };

      const expectedStatusList: StatusList = {
        id: 'https://example.com/status-lists/1' as Shared.IRI,
        issuerId: options.issuerId,
        purpose: options.purpose,
        bitstring: 'test-bitstring',
        size: 16384, // Default size
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockStatusListRepository.findByIssuerAndPurpose.mockResolvedValue(null);
      mockStatusListRepository.create.mockResolvedValue(expectedStatusList);

      const result = await statusListService.createStatusList(options);

      expect(result.size).toBe(16384);
      expect(mockStatusListRepository.create).toHaveBeenCalledWith({
        issuerId: options.issuerId,
        purpose: options.purpose,
        bitstring: expect.any(String),
        size: 16384,
      });
    });
  });

  describe('getStatusList', () => {
    test('should return status list by ID', async () => {
      const statusListId = 'https://example.com/status-lists/1' as Shared.IRI;
      const expectedStatusList: StatusList = {
        id: statusListId,
        issuerId: 'https://example.com/issuer/1' as Shared.IRI,
        purpose: 'revocation' as StatusPurpose,
        bitstring: 'test-bitstring',
        size: 16384,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockStatusListRepository.findById.mockResolvedValue(expectedStatusList);

      const result = await statusListService.getStatusList(statusListId);

      expect(result).toEqual(expectedStatusList);
      expect(mockStatusListRepository.findById).toHaveBeenCalledWith(statusListId);
    });

    test('should return null when status list not found', async () => {
      const statusListId = 'https://example.com/status-lists/nonexistent' as Shared.IRI;

      mockStatusListRepository.findById.mockResolvedValue(null);

      const result = await statusListService.getStatusList(statusListId);

      expect(result).toBeNull();
      expect(mockStatusListRepository.findById).toHaveBeenCalledWith(statusListId);
    });
  });

  describe('getStatusListCredential', () => {
    test('should return properly formatted StatusList2021Credential', async () => {
      const statusListId = 'https://example.com/status-lists/1' as Shared.IRI;
      const statusList: StatusList = {
        id: statusListId,
        issuerId: 'https://example.com/issuer/1' as Shared.IRI,
        purpose: 'revocation' as StatusPurpose,
        bitstring: 'H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAIC3AYbSVKsAQAAA',
        size: 16384,
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-01T00:00:00Z'),
      };

      mockStatusListRepository.findById.mockResolvedValue(statusList);

      const result = await statusListService.getStatusListCredential(statusListId);

      expect(result).toBeDefined();
      expect(result!['@context']).toEqual([
        'https://www.w3.org/2018/credentials/v1',
        'https://w3id.org/vc/status-list/2021/v1'
      ]);
      expect(result!.id).toBe(statusListId);
      expect(result!.type).toEqual(['VerifiableCredential', 'StatusList2021Credential']);
      expect(result!.issuer).toBe(statusList.issuerId);
      expect(result!.issuanceDate).toBe('2023-01-01T00:00:00.000Z');
      expect(result!.credentialSubject).toEqual({
        id: `${statusListId}#list`,
        type: 'StatusList2021',
        statusPurpose: 'revocation',
        encodedList: statusList.bitstring
      });
    });

    test('should return null when status list not found', async () => {
      const statusListId = 'https://example.com/status-lists/nonexistent' as Shared.IRI;

      mockStatusListRepository.findById.mockResolvedValue(null);

      const result = await statusListService.getStatusListCredential(statusListId);

      expect(result).toBeNull();
    });
  });

  describe('assignCredentialToStatusList', () => {
    test('should assign credential to status list successfully', async () => {
      const credentialId = 'https://example.com/credentials/1' as Shared.IRI;
      const issuerId = 'https://example.com/issuer/1' as Shared.IRI;
      const purpose: StatusPurpose = 'revocation';

      const statusList: StatusList = {
        id: 'https://example.com/status-lists/1' as Shared.IRI,
        issuerId,
        purpose,
        bitstring: 'test-bitstring',
        size: 16384,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const expectedStatusEntry: CredentialStatusEntry = {
        id: 'https://example.com/status-entries/1' as Shared.IRI,
        credentialId,
        statusListId: statusList.id,
        statusListIndex: 0,
        status: CredentialStatus.VALID,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock repository calls
      mockCredentialStatusEntryRepository.findByCredentialId.mockResolvedValue(null);
      mockStatusListRepository.findByIssuerAndPurpose.mockResolvedValue(statusList);
      mockCredentialStatusEntryRepository.getNextAvailableIndex.mockResolvedValue(0);
      mockCredentialStatusEntryRepository.create.mockResolvedValue(expectedStatusEntry);

      const result = await statusListService.assignCredentialToStatusList(
        credentialId,
        issuerId,
        purpose
      );

      expect(result).toEqual(expectedStatusEntry);
      expect(mockCredentialStatusEntryRepository.findByCredentialId).toHaveBeenCalledWith(credentialId);
      expect(mockStatusListRepository.findByIssuerAndPurpose).toHaveBeenCalledWith(issuerId, purpose);
      expect(mockCredentialStatusEntryRepository.getNextAvailableIndex).toHaveBeenCalledWith(statusList.id);
      expect(mockCredentialStatusEntryRepository.create).toHaveBeenCalledWith({
        credentialId,
        statusListId: statusList.id,
        statusListIndex: 0,
        status: CredentialStatus.VALID,
      });
    });

    test('should return existing status entry if credential already assigned', async () => {
      const credentialId = 'https://example.com/credentials/1' as Shared.IRI;
      const issuerId = 'https://example.com/issuer/1' as Shared.IRI;
      const purpose: StatusPurpose = 'revocation';

      const existingStatusEntry: CredentialStatusEntry = {
        id: 'https://example.com/status-entries/1' as Shared.IRI,
        credentialId,
        statusListId: 'https://example.com/status-lists/1' as Shared.IRI,
        statusListIndex: 5,
        status: CredentialStatus.VALID,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCredentialStatusEntryRepository.findByCredentialId.mockResolvedValue(existingStatusEntry);

      const result = await statusListService.assignCredentialToStatusList(
        credentialId,
        issuerId,
        purpose
      );

      expect(result).toEqual(existingStatusEntry);
      expect(mockCredentialStatusEntryRepository.findByCredentialId).toHaveBeenCalledWith(credentialId);
      expect(mockStatusListRepository.findByIssuerAndPurpose).not.toHaveBeenCalled();
      expect(mockCredentialStatusEntryRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateCredentialStatus', () => {
    test('should update credential status successfully', async () => {
      const credentialId = 'https://example.com/credentials/1' as Shared.IRI;
      const request: UpdateCredentialStatusRequest = {
        status: CredentialStatus.REVOKED_OR_SUSPENDED,
        reason: 'Badge awarded in error',
      };

      const statusEntry: CredentialStatusEntry = {
        id: 'https://example.com/status-entries/1' as Shared.IRI,
        credentialId,
        statusListId: 'https://example.com/status-lists/1' as Shared.IRI,
        statusListIndex: 5,
        status: CredentialStatus.VALID,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const statusList: StatusList = {
        id: statusEntry.statusListId,
        issuerId: 'https://example.com/issuer/1' as Shared.IRI,
        purpose: 'revocation' as StatusPurpose,
        bitstring: 'H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAIC3AYbSVKsAQAAA',
        size: 16384,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedStatusEntry: CredentialStatusEntry = {
        ...statusEntry,
        status: request.status,
        reason: request.reason,
        updatedAt: new Date(),
      };

      // Mock repository calls
      mockCredentialStatusEntryRepository.findByCredentialId.mockResolvedValue(statusEntry);
      mockStatusListRepository.findById.mockResolvedValue(statusList);
      mockStatusListRepository.update.mockResolvedValue({ ...statusList, updatedAt: new Date() });
      mockCredentialStatusEntryRepository.update.mockResolvedValue(updatedStatusEntry);

      const result = await statusListService.updateCredentialStatus(credentialId, request);

      expect(result).toBeDefined();
      expect(result.credentialId).toBe(credentialId);
      expect(result.status).toBe(request.status);
      expect(result.reason).toBe(request.reason);
      expect(mockCredentialStatusEntryRepository.findByCredentialId).toHaveBeenCalledWith(credentialId);
      expect(mockStatusListRepository.findById).toHaveBeenCalledWith(statusEntry.statusListId);
      expect(mockStatusListRepository.update).toHaveBeenCalled();
      expect(mockCredentialStatusEntryRepository.update).toHaveBeenCalled();
    });

    test('should throw error when credential status entry not found', async () => {
      const credentialId = 'https://example.com/credentials/nonexistent' as Shared.IRI;
      const request: UpdateCredentialStatusRequest = {
        status: CredentialStatus.REVOKED_OR_SUSPENDED,
      };

      mockCredentialStatusEntryRepository.findByCredentialId.mockResolvedValue(null);

      await expect(
        statusListService.updateCredentialStatus(credentialId, request)
      ).rejects.toThrow('No status entry found for credential');
    });

    test('should throw error when status list not found', async () => {
      const credentialId = 'https://example.com/credentials/1' as Shared.IRI;
      const request: UpdateCredentialStatusRequest = {
        status: CredentialStatus.REVOKED_OR_SUSPENDED,
      };

      const statusEntry: CredentialStatusEntry = {
        id: 'https://example.com/status-entries/1' as Shared.IRI,
        credentialId,
        statusListId: 'https://example.com/status-lists/nonexistent' as Shared.IRI,
        statusListIndex: 5,
        status: CredentialStatus.VALID,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCredentialStatusEntryRepository.findByCredentialId.mockResolvedValue(statusEntry);
      mockStatusListRepository.findById.mockResolvedValue(null);

      await expect(
        statusListService.updateCredentialStatus(credentialId, request)
      ).rejects.toThrow('Status list not found');
    });
  });

  describe('getCredentialStatus', () => {
    test('should return credential status entry', async () => {
      const credentialId = 'https://example.com/credentials/1' as Shared.IRI;
      const expectedStatusEntry: CredentialStatusEntry = {
        id: 'https://example.com/status-entries/1' as Shared.IRI,
        credentialId,
        statusListId: 'https://example.com/status-lists/1' as Shared.IRI,
        statusListIndex: 5,
        status: CredentialStatus.VALID,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCredentialStatusEntryRepository.findByCredentialId.mockResolvedValue(expectedStatusEntry);

      const result = await statusListService.getCredentialStatus(credentialId);

      expect(result).toEqual(expectedStatusEntry);
      expect(mockCredentialStatusEntryRepository.findByCredentialId).toHaveBeenCalledWith(credentialId);
    });

    test('should return null when credential status entry not found', async () => {
      const credentialId = 'https://example.com/credentials/nonexistent' as Shared.IRI;

      mockCredentialStatusEntryRepository.findByCredentialId.mockResolvedValue(null);

      const result = await statusListService.getCredentialStatus(credentialId);

      expect(result).toBeNull();
    });
  });

  describe('bitstring operations', () => {
    test('should generate valid bitstring', async () => {
      const size = 16384;
      const bitstring = await statusListService.generateBitstring(size);

      expect(bitstring).toBeDefined();
      expect(typeof bitstring).toBe('string');

      // Should be base64url encoded
      expect(bitstring).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    test('should encode and decode bitstring correctly', async () => {
      const originalData = new Uint8Array([0, 1, 2, 3, 4, 5]);

      const encoded = await statusListService.encodeBitstring(originalData);
      expect(encoded).toBeDefined();
      expect(typeof encoded).toBe('string');

      const decoded = await statusListService.decodeBitstring(encoded);
      expect(decoded).toEqual(originalData);
    });

    test('should update bitstring correctly', async () => {
      const statusList: StatusList = {
        id: 'https://example.com/status-lists/1' as Shared.IRI,
        issuerId: 'https://example.com/issuer/1' as Shared.IRI,
        purpose: 'revocation' as StatusPurpose,
        bitstring: await statusListService.generateBitstring(16384),
        size: 16384,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const index = 100;
      const status = CredentialStatus.REVOKED_OR_SUSPENDED;

      const updatedBitstring = await statusListService.updateBitstring(statusList, index, status);

      expect(updatedBitstring).toBeDefined();
      expect(typeof updatedBitstring).toBe('string');
      expect(updatedBitstring).not.toBe(statusList.bitstring);
    });

    test('should throw error when index is out of bounds', async () => {
      const statusList: StatusList = {
        id: 'https://example.com/status-lists/1' as Shared.IRI,
        issuerId: 'https://example.com/issuer/1' as Shared.IRI,
        purpose: 'revocation' as StatusPurpose,
        bitstring: await statusListService.generateBitstring(16384),
        size: 16384,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const index = 20000; // Out of bounds
      const status = CredentialStatus.REVOKED_OR_SUSPENDED;

      await expect(
        statusListService.updateBitstring(statusList, index, status)
      ).rejects.toThrow('Index 20000 is out of bounds');
    });
  });

  describe('createStatusList2021Entry', () => {
    test('should create proper StatusList2021Entry', () => {
      const credentialId = 'https://example.com/credentials/1' as Shared.IRI;
      const statusEntry: CredentialStatusEntry = {
        id: 'https://example.com/status-entries/1' as Shared.IRI,
        credentialId,
        statusListId: 'https://example.com/status-lists/1' as Shared.IRI,
        statusListIndex: 42,
        status: CredentialStatus.VALID,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const statusList: StatusList = {
        id: statusEntry.statusListId,
        issuerId: 'https://example.com/issuer/1' as Shared.IRI,
        purpose: 'revocation' as StatusPurpose,
        bitstring: 'test-bitstring',
        size: 16384,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = statusListService.createStatusList2021Entry(
        credentialId,
        statusEntry,
        statusList
      );

      expect(result).toEqual({
        id: `${credentialId}#status`,
        type: 'StatusList2021Entry',
        statusPurpose: 'revocation',
        statusListIndex: '42',
        statusListCredential: statusList.id,
      });
    });
  });

  describe('updateCredentialStatus', () => {
    test('should update credential status successfully', async () => {
      const credentialId = 'https://example.com/credentials/1' as Shared.IRI;
      const request: UpdateCredentialStatusRequest = {
        status: CredentialStatus.REVOKED_OR_SUSPENDED,
        reason: 'Badge awarded in error',
      };

      const statusEntry: CredentialStatusEntry = {
        id: 'https://example.com/status-entries/1' as Shared.IRI,
        credentialId,
        statusListId: 'https://example.com/status-lists/1' as Shared.IRI,
        statusListIndex: 5,
        status: CredentialStatus.VALID,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const statusList: StatusList = {
        id: statusEntry.statusListId,
        issuerId: 'https://example.com/issuer/1' as Shared.IRI,
        purpose: 'revocation' as StatusPurpose,
        bitstring: 'H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAIC3AYbSVKsAQAAA',
        size: 16384,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedStatusEntry: CredentialStatusEntry = {
        ...statusEntry,
        status: request.status,
        reason: request.reason,
        updatedAt: new Date(),
      };

      // Mock repository calls
      mockCredentialStatusEntryRepository.findByCredentialId.mockResolvedValue(statusEntry);
      mockStatusListRepository.findById.mockResolvedValue(statusList);
      mockStatusListRepository.update.mockResolvedValue({ ...statusList, updatedAt: new Date() });
      mockCredentialStatusEntryRepository.update.mockResolvedValue(updatedStatusEntry);

      const result = await statusListService.updateCredentialStatus(credentialId, request);

      expect(result).toBeDefined();
      expect(result.credentialId).toBe(credentialId);
      expect(result.status).toBe(request.status);
      expect(result.reason).toBe(request.reason);
      expect(mockCredentialStatusEntryRepository.findByCredentialId).toHaveBeenCalledWith(credentialId);
      expect(mockStatusListRepository.findById).toHaveBeenCalledWith(statusEntry.statusListId);
      expect(mockStatusListRepository.update).toHaveBeenCalled();
      expect(mockCredentialStatusEntryRepository.update).toHaveBeenCalled();
    });

    test('should throw error when credential status entry not found', async () => {
      const credentialId = 'https://example.com/credentials/nonexistent' as Shared.IRI;
      const request: UpdateCredentialStatusRequest = {
        status: CredentialStatus.REVOKED_OR_SUSPENDED,
      };

      mockCredentialStatusEntryRepository.findByCredentialId.mockResolvedValue(null);

      await expect(
        statusListService.updateCredentialStatus(credentialId, request)
      ).rejects.toThrow('No status entry found for credential');
    });
  });

  describe('bitstring operations', () => {
    test('should generate valid bitstring', async () => {
      const size = 16384;
      const bitstring = await statusListService.generateBitstring(size);

      expect(bitstring).toBeDefined();
      expect(typeof bitstring).toBe('string');

      // Should be base64url encoded
      expect(bitstring).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    test('should encode and decode bitstring correctly', async () => {
      const originalData = new Uint8Array([0, 1, 2, 3, 4, 5]);

      const encoded = await statusListService.encodeBitstring(originalData);
      expect(encoded).toBeDefined();
      expect(typeof encoded).toBe('string');

      const decoded = await statusListService.decodeBitstring(encoded);
      expect(decoded).toEqual(originalData);
    });
  });

  describe('createStatusList2021Entry', () => {
    test('should create proper StatusList2021Entry', () => {
      const credentialId = 'https://example.com/credentials/1' as Shared.IRI;
      const statusEntry: CredentialStatusEntry = {
        id: 'https://example.com/status-entries/1' as Shared.IRI,
        credentialId,
        statusListId: 'https://example.com/status-lists/1' as Shared.IRI,
        statusListIndex: 42,
        status: CredentialStatus.VALID,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const statusList: StatusList = {
        id: statusEntry.statusListId,
        issuerId: 'https://example.com/issuer/1' as Shared.IRI,
        purpose: 'revocation' as StatusPurpose,
        bitstring: 'test-bitstring',
        size: 16384,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = statusListService.createStatusList2021Entry(
        credentialId,
        statusEntry,
        statusList
      );

      expect(result).toEqual({
        id: `${credentialId}#status`,
        type: 'StatusList2021Entry',
        statusPurpose: 'revocation',
        statusListIndex: '42',
        statusListCredential: statusList.id,
      });
    });
  });
});
