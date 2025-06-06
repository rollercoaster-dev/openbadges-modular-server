/**
 * Unit tests for CredentialStatusService
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { CredentialStatusService } from '../../../src/core/credential-status.service';
import { StatusListService } from '../../../src/core/status-list.service';
import { StatusPurpose } from '../../../src/domains/status-list/status-list.types';
import { Shared } from 'openbadges-types';

describe('CredentialStatusService', () => {
  let credentialStatusService: CredentialStatusService;

  beforeEach(() => {
    // Create service with null dependency for testing utility methods
    credentialStatusService = new CredentialStatusService(
      null as unknown as StatusListService
    );
  });

  describe('createBitstringStatusListEntry', () => {
    it('should create BitstringStatusListEntry from status entry data', () => {
      // Arrange
      const statusEntry = {
        id: 'entry-1',
        credentialId: 'credential-1',
        statusListId: 'status-list-1',
        statusListIndex: 42,
        statusSize: 2,
        purpose: StatusPurpose.SUSPENSION,
        currentStatus: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act
      const result =
        credentialStatusService.createBitstringStatusListEntry(statusEntry);

      // Assert
      expect(result.type).toBe('BitstringStatusListEntry');
      expect(result.statusPurpose).toBe(StatusPurpose.SUSPENSION);
      expect(result.statusListIndex).toBe('42');
      expect(result.statusSize).toBe(2);
      expect(result.statusListCredential).toContain(
        '/v3/status-lists/status-list-1'
      );
    });

    it('should use default base URL when BASE_URL not set', () => {
      // Arrange
      const originalBaseUrl = process.env.BASE_URL;
      delete process.env.BASE_URL;

      const statusEntry = {
        id: 'entry-1',
        credentialId: 'credential-1',
        statusListId: 'test-list-123',
        statusListIndex: 0,
        statusSize: 1,
        purpose: StatusPurpose.REVOCATION,
        currentStatus: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act
      const result =
        credentialStatusService.createBitstringStatusListEntry(statusEntry);

      // Assert
      expect(result.statusListCredential).toBe(
        'https://localhost:3000/v3/status-lists/test-list-123' as Shared.IRI
      );

      // Restore original BASE_URL
      if (originalBaseUrl) {
        process.env.BASE_URL = originalBaseUrl;
      }
    });
  });
});
