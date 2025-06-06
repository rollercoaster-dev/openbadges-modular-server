/**
 import { StatusListService } from '../../../src/core/status-list.service';
import { StatusListRepository } from '../../../src/domains/status-list/status-list.repository';
import { StatusList as _StatusList } from '../../../src/domains/status-list/status-list.entity';
import { StatusPurpose } from '../../../src/domains/status-list/status-list.types';it tests for StatusListService
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { StatusListService } from '../../../src/core/status-list.service';
import { StatusListRepository } from '../../../src/domains/status-list/status-list.repository';
import { StatusList as _StatusList } from '../../../src/domains/status-list/status-list.entity';
import { StatusPurpose } from '../../../src/domains/status-list/status-list.types';

// Mock StatusListRepository
const mockRepository = {
  create: mock(),
  findById: mock(),
  findMany: mock(),
  findAvailableStatusList: mock(),
  update: mock(),
  delete: mock(),
  createStatusEntry: mock(),
  findStatusEntry: mock(),
  findStatusEntriesByList: mock(),
  updateStatusEntry: mock(),
  updateCredentialStatus: mock(),
  deleteStatusEntry: mock(),
  findByIssuer: mock(),
  hasStatusEntry: mock(),
  getStatusListStats: mock(),
  findCredentialsNeedingStatus: mock(),
} as unknown as StatusListRepository;

describe('StatusListService', () => {
  let statusListService: StatusListService;

  beforeEach(() => {
    statusListService = new StatusListService(mockRepository);

    // Reset all mocks
    Object.values(mockRepository).forEach((mockFn) => {
      if (typeof mockFn === 'function' && 'mockReset' in mockFn) {
        mockFn.mockReset();
      }
    });
  });

  describe('createStatusList', () => {
    it('should create a new status list with default values', async () => {
      // Arrange
      const mockStatusList = {
        id: 'status-list-1',
        issuerId: 'issuer-1',
        purpose: StatusPurpose.REVOCATION,
        statusSize: 1,
        totalEntries: 131072, // Use minimum required value
        usedEntries: 0,
        encodedList:
          'H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAIC3AYbSVKsAQAAA',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockResolvedValue(mockStatusList);

      // Act
      const result = await statusListService.createStatusList({
        issuerId: 'issuer-1',
        purpose: StatusPurpose.REVOCATION,
      });

      // Assert
      expect(result).toEqual(mockStatusList);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          issuerId: 'issuer-1',
          purpose: StatusPurpose.REVOCATION,
          statusSize: 1,
          totalEntries: 131072, // Default minimum value
          usedEntries: 0,
        })
      );
    });

    it('should create a status list with custom parameters', async () => {
      // Arrange
      const mockStatusList = {
        id: 'status-list-1',
        issuerId: 'issuer-1',
        purpose: StatusPurpose.SUSPENSION,
        statusSize: 2,
        totalEntries: 200000, // Use valid value >= 131072
        usedEntries: 0,
        encodedList:
          'H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAIC3AYbSVKsAQAAA',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockResolvedValue(mockStatusList);

      // Act
      const result = await statusListService.createStatusList({
        issuerId: 'issuer-1',
        purpose: StatusPurpose.SUSPENSION,
        statusSize: 2,
        totalEntries: 200000,
      });

      // Assert
      expect(result).toEqual(mockStatusList);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          issuerId: 'issuer-1',
          purpose: StatusPurpose.SUSPENSION,
          statusSize: 2,
          totalEntries: 200000,
          usedEntries: 0,
        })
      );
    });
  });

  describe('findOrCreateStatusList', () => {
    it('should return existing status list when available', async () => {
      // Arrange
      const mockStatusList = {
        id: 'status-list-1',
        issuerId: 'issuer-1',
        purpose: StatusPurpose.REVOCATION,
        statusSize: 1,
        totalEntries: 131072,
        usedEntries: 50,
        encodedList:
          'H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAIC3AYbSVKsAQAAA',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findAvailableStatusList.mockResolvedValue(mockStatusList);

      // Act
      const result = await statusListService.findOrCreateStatusList(
        'issuer-1',
        StatusPurpose.REVOCATION,
        1
      );

      // Assert
      expect(result).toEqual(mockStatusList);
      expect(mockRepository.findAvailableStatusList).toHaveBeenCalledWith(
        'issuer-1',
        StatusPurpose.REVOCATION,
        1
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should create new status list when none available', async () => {
      // Arrange
      const mockNewStatusList = {
        id: 'status-list-2',
        issuerId: 'issuer-1',
        purpose: StatusPurpose.REVOCATION,
        statusSize: 1,
        totalEntries: 131072,
        usedEntries: 0,
        encodedList:
          'H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAIC3AYbSVKsAQAAA',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findAvailableStatusList.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(mockNewStatusList);

      // Act
      const result = await statusListService.findOrCreateStatusList(
        'issuer-1',
        StatusPurpose.REVOCATION,
        1
      );

      // Assert
      expect(result).toEqual(mockNewStatusList);
      expect(mockRepository.findAvailableStatusList).toHaveBeenCalledWith(
        'issuer-1',
        StatusPurpose.REVOCATION,
        1
      );
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          issuerId: 'issuer-1',
          purpose: StatusPurpose.REVOCATION,
          statusSize: 1,
        })
      );
    });
  });

  describe('getNextAvailableIndex', () => {
    it('should return next available index when status list has capacity', async () => {
      // Arrange
      const mockStatusList = {
        id: 'status-list-1',
        issuerId: 'issuer-1',
        purpose: StatusPurpose.REVOCATION,
        statusSize: 1,
        totalEntries: 131072,
        usedEntries: 42,
        encodedList:
          'H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAIC3AYbSVKsAQAAA',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findById.mockResolvedValue(mockStatusList);

      // Act
      const result = await statusListService.getNextAvailableIndex(
        'status-list-1'
      );

      // Assert
      expect(result).toBe(42);
      expect(mockRepository.findById).toHaveBeenCalledWith('status-list-1');
    });

    it('should return null when status list is at capacity', async () => {
      // Arrange
      const mockStatusList = {
        id: 'status-list-1',
        issuerId: 'issuer-1',
        purpose: StatusPurpose.REVOCATION,
        statusSize: 1,
        totalEntries: 131072,
        usedEntries: 131072, // At capacity
        encodedList:
          'H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAIC3AYbSVKsAQAAA',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findById.mockResolvedValue(mockStatusList);

      // Act
      const result = await statusListService.getNextAvailableIndex(
        'status-list-1'
      );

      // Assert
      expect(result).toBeNull();
    });

    it('should throw error when status list not found', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        statusListService.getNextAvailableIndex('non-existent-list')
      ).rejects.toThrow('Status list not found');
    });
  });

  describe('createStatusEntry', () => {
    it('should create status entry and update status list used entries', async () => {
      // Arrange
      const mockStatusList = {
        id: 'status-list-1',
        issuerId: 'issuer-1',
        purpose: StatusPurpose.REVOCATION,
        statusSize: 1,
        totalEntries: 131072,
        usedEntries: 5,
        encodedList:
          'H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAIC3AYbSVKsAQAAA',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockStatusEntry = {
        id: 'entry-1',
        credentialId: 'credential-1',
        statusListId: 'status-list-1',
        statusListIndex: 5,
        statusSize: 1,
        purpose: StatusPurpose.REVOCATION,
        currentStatus: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.createStatusEntry.mockResolvedValue(mockStatusEntry);
      mockRepository.findById.mockResolvedValue(mockStatusList);
      mockRepository.update.mockResolvedValue({
        ...mockStatusList,
        usedEntries: 6,
      });

      // Act
      const result = await statusListService.createStatusEntry({
        credentialId: 'credential-1',
        statusListId: 'status-list-1',
        statusListIndex: 5,
        statusSize: 1,
        purpose: StatusPurpose.REVOCATION,
        currentStatus: 0,
      });

      // Assert
      expect(result).toEqual(mockStatusEntry);
      expect(mockRepository.createStatusEntry).toHaveBeenCalledWith({
        credentialId: 'credential-1',
        statusListId: 'status-list-1',
        statusListIndex: 5,
        statusSize: 1,
        purpose: StatusPurpose.REVOCATION,
        currentStatus: 0,
      });
      expect(mockRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          usedEntries: 6,
        })
      );
    });
  });

  describe('updateCredentialStatus', () => {
    it('should successfully update credential status', async () => {
      // Arrange
      const mockStatusEntry = {
        id: 'entry-1',
        credentialId: 'credential-1',
        statusListId: 'status-list-1',
        statusListIndex: 5,
        statusSize: 1,
        purpose: StatusPurpose.REVOCATION,
        currentStatus: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.updateCredentialStatus.mockResolvedValue({
        success: true,
        statusEntry: mockStatusEntry,
      });

      // Act
      const result = await statusListService.updateCredentialStatus({
        credentialId: 'credential-1',
        status: 1,
        reason: 'Revoked for security reasons',
        purpose: StatusPurpose.REVOCATION,
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.statusEntry).toEqual(mockStatusEntry);
      expect(mockRepository.updateCredentialStatus).toHaveBeenCalledWith({
        credentialId: 'credential-1',
        status: 1,
        reason: 'Revoked for security reasons',
        purpose: StatusPurpose.REVOCATION,
      });
    });

    it('should handle update failures', async () => {
      // Arrange
      mockRepository.updateCredentialStatus.mockResolvedValue({
        success: false,
        error: 'Credential not found',
      });

      // Act
      const result = await statusListService.updateCredentialStatus({
        credentialId: 'non-existent-credential',
        status: 1,
        purpose: StatusPurpose.REVOCATION,
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Credential not found');
    });
  });

  describe('getStatusEntry', () => {
    it('should return status entry when found', async () => {
      // Arrange
      const mockStatusEntry = {
        id: 'entry-1',
        credentialId: 'credential-1',
        statusListId: 'status-list-1',
        statusListIndex: 5,
        statusSize: 1,
        purpose: StatusPurpose.REVOCATION,
        currentStatus: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findStatusEntry.mockResolvedValue(mockStatusEntry);

      // Act
      const result = await statusListService.getStatusEntry(
        'credential-1',
        StatusPurpose.REVOCATION
      );

      // Assert
      expect(result).toEqual(mockStatusEntry);
      expect(mockRepository.findStatusEntry).toHaveBeenCalledWith(
        'credential-1',
        StatusPurpose.REVOCATION
      );
    });

    it('should return null when not found', async () => {
      // Arrange
      mockRepository.findStatusEntry.mockResolvedValue(null);

      // Act
      const result = await statusListService.getStatusEntry(
        'non-existent-credential',
        StatusPurpose.REVOCATION
      );

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getStatusList', () => {
    it('should return status list when found', async () => {
      // Arrange
      const mockStatusList = {
        id: 'status-list-1',
        issuerId: 'issuer-1',
        purpose: StatusPurpose.REVOCATION,
        statusSize: 1,
        totalEntries: 131072,
        usedEntries: 0,
        encodedList:
          'H4sIAAAAAAAAA-3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAIC3AYbSVKsAQAAA',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findById.mockResolvedValue(mockStatusList);

      // Act
      const result = await statusListService.getStatusList('status-list-1');

      // Assert
      expect(result).toEqual(mockStatusList);
      expect(mockRepository.findById).toHaveBeenCalledWith('status-list-1');
    });

    it('should return null when not found', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);

      // Act
      const result = await statusListService.getStatusList('non-existent-list');

      // Assert
      expect(result).toBeNull();
    });
  });
});
