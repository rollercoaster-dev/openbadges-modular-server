/**
 * Tests for the signature utilities
 */

import { describe, it, expect, beforeAll } from 'bun:test';
import {
  generateKeyPair,
  signData,
  verifySignature,
  createVerification,
  verifyAssertion,
  KeyType,
  Cryptosuite
} from '../signature';

describe('Signature Utilities', () => {
  // Test data
  const testData = 'Hello, world!';
  let rsaKeyPair: { publicKey: string; privateKey: string };
  let ed25519KeyPair: { publicKey: string; privateKey: string };

  // Generate key pairs before running tests
  beforeAll(() => {
    rsaKeyPair = generateKeyPair(KeyType.RSA);
    ed25519KeyPair = generateKeyPair(KeyType.Ed25519);
  });

  describe('Key Generation', () => {
    it('should generate RSA key pairs', () => {
      expect(rsaKeyPair.publicKey).toBeTruthy();
      expect(rsaKeyPair.privateKey).toBeTruthy();
      expect(rsaKeyPair.publicKey).toContain('BEGIN PUBLIC KEY');
      expect(rsaKeyPair.privateKey).toContain('BEGIN PRIVATE KEY');
    });

    it('should generate Ed25519 key pairs', () => {
      expect(ed25519KeyPair.publicKey).toBeTruthy();
      expect(ed25519KeyPair.privateKey).toBeTruthy();
      expect(ed25519KeyPair.publicKey).toContain('BEGIN PUBLIC KEY');
      expect(ed25519KeyPair.privateKey).toContain('BEGIN PRIVATE KEY');
    });
  });

  describe('RSA Signatures', () => {
    it('should sign data with RSA key', () => {
      const signature = signData(testData, rsaKeyPair.privateKey, KeyType.RSA);
      expect(signature).toBeTruthy();
    });

    it('should verify RSA signatures', () => {
      const signature = signData(testData, rsaKeyPair.privateKey, KeyType.RSA);
      const isValid = verifySignature(testData, signature, rsaKeyPair.publicKey, KeyType.RSA);
      expect(isValid).toBe(true);
    });

    it('should reject invalid RSA signatures', () => {
      const signature = signData(testData, rsaKeyPair.privateKey, KeyType.RSA);
      const isValid = verifySignature('Different data', signature, rsaKeyPair.publicKey, KeyType.RSA);
      expect(isValid).toBe(false);
    });
  });

  describe('Ed25519 Signatures', () => {
    it('should sign data with Ed25519 key', () => {
      const signature = signData(testData, ed25519KeyPair.privateKey, KeyType.Ed25519);
      expect(signature).toBeTruthy();
    });

    it('should verify Ed25519 signatures', () => {
      const signature = signData(testData, ed25519KeyPair.privateKey, KeyType.Ed25519);
      const isValid = verifySignature(testData, signature, ed25519KeyPair.publicKey, KeyType.Ed25519);
      expect(isValid).toBe(true);
    });

    it('should reject invalid Ed25519 signatures', () => {
      const signature = signData(testData, ed25519KeyPair.privateKey, KeyType.Ed25519);
      const isValid = verifySignature('Different data', signature, ed25519KeyPair.publicKey, KeyType.Ed25519);
      expect(isValid).toBe(false);
    });
  });

  describe('Verification Objects', () => {
    it('should create RSA verification objects', () => {
      const verification = createVerification(
        testData,
        rsaKeyPair.privateKey,
        KeyType.RSA,
        Cryptosuite.RsaSha256
      );
      expect(verification.type).toBe('DataIntegrityProof');
      expect(verification.cryptosuite).toBe(Cryptosuite.RsaSha256);
      expect(verification.proofValue).toBeTruthy();
    });

    it('should create Ed25519 verification objects', () => {
      const verification = createVerification(
        testData,
        ed25519KeyPair.privateKey,
        KeyType.Ed25519,
        Cryptosuite.Ed25519
      );
      expect(verification.type).toBe('DataIntegrityProof');
      expect(verification.cryptosuite).toBe(Cryptosuite.Ed25519);
      expect(verification.proofValue).toBeTruthy();
    });

    it('should verify RSA verification objects', () => {
      const verification = createVerification(
        testData,
        rsaKeyPair.privateKey,
        KeyType.RSA,
        Cryptosuite.RsaSha256
      );
      const isValid = verifyAssertion(testData, verification, rsaKeyPair.publicKey);
      expect(isValid).toBe(true);
    });

    it('should verify Ed25519 verification objects', () => {
      const verification = createVerification(
        testData,
        ed25519KeyPair.privateKey,
        KeyType.Ed25519,
        Cryptosuite.Ed25519
      );
      const isValid = verifyAssertion(testData, verification, ed25519KeyPair.publicKey);
      expect(isValid).toBe(true);
    });
  });

  describe('Key Type Detection', () => {
    it('should detect RSA keys with explicit type', () => {
      // Explicitly use RSA for both signing and verification
      const signature = signData(testData, rsaKeyPair.privateKey, KeyType.RSA);
      const isValid = verifySignature(testData, signature, rsaKeyPair.publicKey, KeyType.RSA);
      expect(isValid).toBe(true);
    });

    it('should detect Ed25519 keys with explicit type', () => {
      // Explicitly use Ed25519 for both signing and verification
      const signature = signData(testData, ed25519KeyPair.privateKey, KeyType.Ed25519);
      const isValid = verifySignature(testData, signature, ed25519KeyPair.publicKey, KeyType.Ed25519);
      expect(isValid).toBe(true);
    });
  });
});
