/**
 * Integration test for StatusList2021 with Assertion entity
 * This test verifies that Task 1.2.9 is completed correctly
 */

import { describe, it, expect } from 'bun:test';
import { Assertion } from '../../src/domains/assertion/assertion.entity';
import { BadgeVersion } from '../../src/utils/version/badge-version';
import {
  StatusPurpose,
  BitstringStatusListEntry,
} from '../../src/domains/status-list/status-list.types';
import { Shared } from 'openbadges-types';

describe('StatusList2021 Integration with Assertion Entity', () => {
  describe('BitstringStatusListEntry Integration', () => {
    it('should create assertion with BitstringStatusListEntry credentialStatus', () => {
      const credentialStatus: BitstringStatusListEntry = {
        type: 'BitstringStatusListEntry',
        statusPurpose: StatusPurpose.REVOCATION,
        statusListIndex: '42',
        statusListCredential:
          'https://example.com/status-lists/test-list-1' as Shared.IRI,
        statusSize: 1,
      };

      const assertion = Assertion.create({
        id: 'https://example.com/assertions/test-assertion-1' as Shared.IRI,
        badgeClass: 'https://example.com/badge-classes/test-badge-1' as Shared.IRI,
        recipient: {
          type: 'email',
          identity: 'test@example.com',
          hashed: false,
        },
        issuedOn: new Date().toISOString(),
        credentialStatus,
      });

      expect(assertion.credentialStatus).toEqual(credentialStatus);
      expect(assertion.credentialStatus?.type).toBe('BitstringStatusListEntry');
      expect(assertion.credentialStatus?.statusPurpose).toBe(
        StatusPurpose.REVOCATION
      );
      expect(assertion.credentialStatus?.statusListIndex).toBe('42');
    });

    it('should serialize assertion with credentialStatus to v3.0 format', () => {
      const credentialStatus: BitstringStatusListEntry = {
        type: 'BitstringStatusListEntry',
        statusPurpose: StatusPurpose.REVOCATION,
        statusListIndex: '42',
        statusListCredential:
          'https://example.com/status-lists/test-list-1' as Shared.IRI,
        statusSize: 1,
      };

      const assertion = Assertion.create({
        id: 'https://example.com/assertions/test-assertion-1' as Shared.IRI,
        badgeClass: 'https://example.com/badge-classes/test-badge-1' as Shared.IRI,
        recipient: {
          type: 'email',
          identity: 'test@example.com',
          hashed: false,
        },
        issuedOn: new Date().toISOString(),
        credentialStatus,
        issuer: 'https://example.com/issuers/test-issuer-1' as Shared.IRI,
      });

      const v3Object = assertion.toObject(BadgeVersion.V3);

      expect(v3Object.credentialStatus).toEqual(credentialStatus);
      expect(v3Object.credentialStatus?.type).toBe('BitstringStatusListEntry');
      expect(v3Object.credentialStatus?.statusPurpose).toBe(
        StatusPurpose.REVOCATION
      );
    });

    it('should not create placeholder credentialStatus for revoked assertions', () => {
      const assertion = Assertion.create({
        id: 'https://example.com/assertions/test-assertion-1' as Shared.IRI,
        badgeClass: 'https://example.com/badge-classes/test-badge-1' as Shared.IRI,
        recipient: {
          type: 'email',
          identity: 'test@example.com',
          hashed: false,
        },
        issuedOn: new Date().toISOString(),
        revoked: true, // This should NOT create a placeholder credentialStatus
      });

      expect(assertion.credentialStatus).toBeUndefined();
      expect(assertion.revoked).toBe(true);
    });

    it('should handle suspension status purpose', () => {
      const credentialStatus: BitstringStatusListEntry = {
        type: 'BitstringStatusListEntry',
        statusPurpose: StatusPurpose.SUSPENSION,
        statusListIndex: '123',
        statusListCredential:
          'https://example.com/status-lists/suspension-list' as Shared.IRI,
        statusSize: 2,
      };

      const assertion = Assertion.create({
        id: 'https://example.com/assertions/test-assertion-2' as Shared.IRI,
        badgeClass: 'https://example.com/badge-classes/test-badge-1' as Shared.IRI,
        recipient: {
          type: 'email',
          identity: 'test@example.com',
          hashed: false,
        },
        issuedOn: new Date().toISOString(),
        credentialStatus,
      });

      expect(assertion.credentialStatus?.statusPurpose).toBe(
        StatusPurpose.SUSPENSION
      );
      expect(assertion.credentialStatus?.statusSize).toBe(2);
    });

    it('should serialize to JSON-LD with credentialStatus', () => {
      const credentialStatus: BitstringStatusListEntry = {
        type: 'BitstringStatusListEntry',
        statusPurpose: StatusPurpose.REVOCATION,
        statusListIndex: '42',
        statusListCredential:
          'https://example.com/status-lists/test-list-1' as Shared.IRI,
        statusSize: 1,
      };

      const assertion = Assertion.create({
        id: 'https://example.com/assertions/test-assertion-1' as Shared.IRI,
        badgeClass: 'https://example.com/badge-classes/test-badge-1' as Shared.IRI,
        recipient: {
          type: 'email',
          identity: 'test@example.com',
          hashed: false,
        },
        issuedOn: new Date().toISOString(),
        credentialStatus,
        issuer: 'https://example.com/issuers/test-issuer-1' as Shared.IRI,
      });

      const jsonLd = assertion.toJsonLd(BadgeVersion.V3);

      // Check that credentialStatus is included in the output
      expect(jsonLd).toHaveProperty('credentialStatus');
      expect((jsonLd as Record<string, unknown>).credentialStatus).toEqual(credentialStatus);
      expect(jsonLd.type).toEqual([
        'VerifiableCredential',
        'OpenBadgeCredential',
      ]);
    });
  });

  describe('Type Safety', () => {
    it('should use BitstringStatusListEntry type instead of OB3.CredentialStatus', () => {
      // This test verifies that our type definitions are correct
      const credentialStatus: BitstringStatusListEntry = {
        type: 'BitstringStatusListEntry',
        statusPurpose: StatusPurpose.REVOCATION,
        statusListIndex: '42',
        statusListCredential:
          'https://example.com/status-lists/test-list-1' as Shared.IRI,
        statusSize: 1,
      };

      const assertion = Assertion.create({
        id: 'https://example.com/assertions/test-assertion-1' as Shared.IRI,
        badgeClass: 'https://example.com/badge-classes/test-badge-1' as Shared.IRI,
        recipient: {
          type: 'email',
          identity: 'test@example.com',
          hashed: false,
        },
        issuedOn: new Date().toISOString(),
        credentialStatus, // This should compile without type errors
      });

      // TypeScript should infer the correct type
      const status = assertion.credentialStatus;
      if (status) {
        expect(status.type).toBe('BitstringStatusListEntry');
        expect(typeof status.statusListIndex).toBe('string');
        expect(typeof status.statusSize).toBe('number');
      }
    });
  });
});
