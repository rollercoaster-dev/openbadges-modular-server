/**
 * Unit tests for the cryptographic utilities
 *
 * This file contains tests for the cryptographic utilities to ensure
 * they correctly implement digital signatures and verification
 * according to the Open Badges 3.0 specification.
 */

import { describe, expect, it, beforeEach } from 'bun:test';
import {
  generateKeyPair,
  signData,
  verifySignature,
  createVerification,
  verifyAssertion,
  hashData,
  KeyType
} from '@/utils/crypto/signature';

describe('Cryptographic Utilities', () => {
  describe('Key Pair Generation', () => {
    it('should generate a valid key pair', () => {
      const keyPair = generateKeyPair();

      expect(keyPair).toBeDefined();
      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.privateKey).toBeDefined();
      expect(keyPair.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(keyPair.privateKey).toContain('-----BEGIN PRIVATE KEY-----');
    });
  });

  describe('Data Signing and Verification', () => {
    it('should sign data and verify the signature', () => {
      const keyPair = generateKeyPair(KeyType.RSA);
      const data = 'test data to sign';

      // Sign the data
      const signature = signData(data, keyPair.privateKey, KeyType.RSA);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');

      // Verify the signature
      const isValid = verifySignature(data, signature, keyPair.publicKey, KeyType.RSA);

      expect(isValid).toBe(true);
    });

    it('should reject invalid signatures', () => {
      const keyPair = generateKeyPair(KeyType.RSA);
      const data = 'test data to sign';

      // Sign the data
      const signature = signData(data, keyPair.privateKey, KeyType.RSA);

      // Verify with wrong data
      const isValidWrongData = verifySignature('wrong data', signature, keyPair.publicKey, KeyType.RSA);
      expect(isValidWrongData).toBe(false);

      // Verify with wrong signature
      const isValidWrongSignature = verifySignature(data, 'wrong signature', keyPair.publicKey, KeyType.RSA);
      expect(isValidWrongSignature).toBe(false);

      // Generate a different key pair
      const otherKeyPair = generateKeyPair(KeyType.RSA);

      // Verify with wrong public key
      const isValidWrongKey = verifySignature(data, signature, otherKeyPair.publicKey, KeyType.RSA);
      expect(isValidWrongKey).toBe(false);
    });
  });

  describe('Assertion Verification', () => {
    it('should create a verification object with the correct structure', () => {
      const keyPair = generateKeyPair(KeyType.RSA);
      const assertionId = '123e4567-e89b-12d3-a456-426614174002';

      // Create verification object
      const verification = createVerification(assertionId, keyPair.privateKey, KeyType.RSA);

      expect(verification).toBeDefined();
      expect(verification.type).toBe('DataIntegrityProof');
      expect(verification.cryptosuite).toBe('rsa-sha256');
      expect(verification.created).toBeDefined();
      expect(verification.proofPurpose).toBe('assertionMethod');
      expect(verification.verificationMethod).toBeDefined();
      // Check if verificationMethod matches the expected IRI format
      expect(verification.verificationMethod).toMatch(/^https?:\/\/[^/]+\/public-keys\/default$/);
      expect(verification.proofValue).toBeDefined();
    });

    it('should create a verification object with a valid signature', () => {
      const keyPair = generateKeyPair(KeyType.RSA);
      const assertionId = '123e4567-e89b-12d3-a456-426614174002';

      // Create verification object
      const verification = createVerification(assertionId, keyPair.privateKey, KeyType.RSA);

      // Verify the assertion
      const isValid = verifyAssertion(assertionId, verification, keyPair.publicKey);

      expect(isValid).toBe(true);
    });

    it('should reject invalid assertion verifications', () => {
      const keyPair = generateKeyPair(KeyType.RSA);
      const assertionId = '123e4567-e89b-12d3-a456-426614174002';

      // Create verification object
      const verification = createVerification(assertionId, keyPair.privateKey, KeyType.RSA);

      // Verify with wrong assertion ID
      const isValidWrongId = verifyAssertion('wrong-id', verification, keyPair.publicKey);
      expect(isValidWrongId).toBe(false);

      // Verify with missing verification
      const isValidNoVerification = verifyAssertion(assertionId, null, keyPair.publicKey);
      expect(isValidNoVerification).toBe(false);

      // Verify with missing signature
      const isValidNoSignature = verifyAssertion(assertionId, { ...verification, proofValue: null }, keyPair.publicKey);
      expect(isValidNoSignature).toBe(false);

      // Generate a different key pair
      const otherKeyPair = generateKeyPair(KeyType.RSA);

      // Verify with wrong public key
      const isValidWrongKey = verifyAssertion(assertionId, verification, otherKeyPair.publicKey);
      expect(isValidWrongKey).toBe(false);
    });
  });

  describe('verifyAssertion', () => {
    const assertionId = 'test-assertion-id';
    let localKeyPair: { publicKey: string; privateKey: string };

    beforeEach(() => {
      localKeyPair = generateKeyPair(KeyType.RSA);
    });

    it('should return true for a valid signature', () => {
      const verification = createVerification(assertionId, localKeyPair.privateKey, KeyType.RSA);
      const isValid = verifyAssertion(assertionId, verification, localKeyPair.publicKey);
      expect(isValid).toBe(true);
    });

    it('should return false for an invalid signature', () => {
      const verification = createVerification(assertionId, localKeyPair.privateKey, KeyType.RSA);
      const tamperedVerification = { ...verification, proofValue: 'tampered' };
      const isValid = verifyAssertion(assertionId, tamperedVerification, localKeyPair.publicKey);
      expect(isValid).toBe(false);
    });

    it('should return false if verification object is missing proofValue', () => {
      const verification = createVerification(assertionId, localKeyPair.privateKey, KeyType.RSA);
      const isValidNoSignature = verifyAssertion(assertionId, { ...verification, proofValue: null }, localKeyPair.publicKey);
      expect(isValidNoSignature).toBe(false);
    });

    it('should return false if verification object is null', () => {
      const isValidNoVerification = verifyAssertion(assertionId, null, localKeyPair.publicKey);
      expect(isValidNoVerification).toBe(false);
    });
  });

  describe('Data Hashing', () => {
    it('should hash data consistently', () => {
      const data = 'test data to hash';

      // Hash the data
      const hash1 = hashData(data);
      const hash2 = hashData(data);

      expect(hash1).toBeDefined();
      expect(typeof hash1).toBe('string');
      expect(hash1).toBe(hash2); // Same data should produce same hash

      // Hash different data
      const hash3 = hashData('different data');

      expect(hash3).not.toBe(hash1); // Different data should produce different hash
    });
  });
});
