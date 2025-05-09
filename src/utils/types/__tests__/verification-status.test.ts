/**
 * Tests for the verification status model
 */

import { describe, it, expect } from 'bun:test';
import {
  VerificationStatus,
  VerificationErrorCode,
  createVerificationStatus,
  createVerificationError,
  createSuccessfulVerification
} from '../verification-status';

describe('Verification Status Model', () => {
  describe('createVerificationStatus', () => {
    it('should create a verification status with default values', () => {
      const status = createVerificationStatus({});
      expect(status.isValid).toBe(false);
      expect(status.isExpired).toBe(false);
      expect(status.isRevoked).toBe(false);
      expect(status.hasValidSignature).toBe(false);
      expect(status.verifiedAt).toBeTruthy();
    });

    it('should create a verification status with provided values', () => {
      const status = createVerificationStatus({
        isValid: true,
        isExpired: true,
        isRevoked: true,
        hasValidSignature: true,
        errorCode: VerificationErrorCode.SIGNATURE_INVALID,
        details: 'Test details',
        verifiedAt: '2023-01-01T00:00:00Z',
        verificationMethod: 'test-method',
        cryptosuite: 'test-cryptosuite'
      });

      expect(status.isValid).toBe(true);
      expect(status.isExpired).toBe(true);
      expect(status.isRevoked).toBe(true);
      expect(status.hasValidSignature).toBe(true);
      expect(status.errorCode).toBe(VerificationErrorCode.SIGNATURE_INVALID);
      expect(status.details).toBe('Test details');
      expect(status.verifiedAt).toBe('2023-01-01T00:00:00Z');
      expect(status.verificationMethod).toBe('test-method');
      expect(status.cryptosuite).toBe('test-cryptosuite');
    });
  });

  describe('createVerificationError', () => {
    it('should create a verification error status', () => {
      const status = createVerificationError(
        VerificationErrorCode.SIGNATURE_INVALID,
        'Invalid signature'
      );

      expect(status.isValid).toBe(false);
      expect(status.errorCode).toBe(VerificationErrorCode.SIGNATURE_INVALID);
      expect(status.details).toBe('Invalid signature');
      expect(status.verifiedAt).toBeTruthy();
    });
  });

  describe('createSuccessfulVerification', () => {
    it('should create a successful verification status', () => {
      const status = createSuccessfulVerification();

      expect(status.isValid).toBe(true);
      expect(status.isExpired).toBe(false);
      expect(status.isRevoked).toBe(false);
      expect(status.hasValidSignature).toBe(true);
      expect(status.details).toBe('Verification successful');
      expect(status.verifiedAt).toBeTruthy();
    });

    it('should create a successful verification status with additional options', () => {
      const status = createSuccessfulVerification({
        verificationMethod: 'test-method',
        cryptosuite: 'test-cryptosuite'
      });

      expect(status.isValid).toBe(true);
      expect(status.verificationMethod).toBe('test-method');
      expect(status.cryptosuite).toBe('test-cryptosuite');
    });
  });
});
