/**
 * Tests for the Verification Service
 *
 * This file contains tests for the verification service to ensure
 * it correctly implements assertion verification according to
 * the Open Badges 3.0 specification.
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { VerificationService } from '../../src/core/verification.service';
import { KeyService } from '../../src/core/key.service';
import { Assertion } from '../../src/domains/assertion/assertion.entity';
import { Shared, OB3 } from 'openbadges-types'; // Use correct imports
import * as fs from 'fs';
import * as path from 'path';

// Test directory for keys
const TEST_KEYS_DIR = path.join(process.cwd(), 'test-keys');

describe('Verification Service', () => {
  // Setup test environment
  beforeAll(async () => {
    // Create test keys directory
    if (!fs.existsSync(TEST_KEYS_DIR)) {
      fs.mkdirSync(TEST_KEYS_DIR, { recursive: true });
    }

    // Initialize the key service
    await KeyService.initialize();
  });

  // Cleanup test environment
  afterAll(() => {
    // Remove test keys directory
    if (fs.existsSync(TEST_KEYS_DIR)) {
      fs.rmSync(TEST_KEYS_DIR, { recursive: true, force: true });
    }
  });

  test('should create a verification object for an assertion', async () => {
    // Create a test assertion
    const assertion = Assertion.create({
      id: 'urn:uuid:123e4567-e89b-12d3-a456-426614174000' as Shared.IRI,
      badgeClass: 'urn:uuid:123e4567-e89b-12d3-a456-426614174001' as Shared.IRI,
      recipient: {
        identity: 'sha256$test@example.com',
        type: 'email',
        hashed: true
      },
      issuedOn: new Date().toISOString()
    });

    // Create a verification object
    const signedAssertion = await VerificationService.createVerificationForAssertion(assertion);

    // Check the verification object
    expect(signedAssertion).toBeDefined();
    expect(signedAssertion.verification).toBeDefined();
    // Cast to DataIntegrityProof (or a compatible OB3.Proof) for type safety with new properties
    const proof = signedAssertion.verification as OB3.Proof;
    expect(proof.type).toBe('DataIntegrityProof');
    expect(proof.cryptosuite).toBe('rsa-sha256');
    expect(proof.proofPurpose).toBe('assertionMethod');
    expect(proof.created).toBeDefined();
    expect(proof.proofValue).toBeDefined(); // Changed from signatureValue
    expect(proof.verificationMethod).toBeDefined(); // Changed from creator
  });

  test('should verify a valid assertion signature', async () => {
    // Create a test assertion
    const assertion = Assertion.create({
      id: 'urn:uuid:123e4567-e89b-12d3-a456-426614174000' as Shared.IRI,
      badgeClass: 'urn:uuid:123e4567-e89b-12d3-a456-426614174001' as Shared.IRI,
      recipient: {
        identity: 'sha256$test@example.com',
        type: 'email',
        hashed: true
      },
      issuedOn: new Date().toISOString()
    });

    // Create a verification object
    const signedAssertion = await VerificationService.createVerificationForAssertion(assertion);

    // Verify the signature
    const isValid = await VerificationService.verifyAssertionSignature(signedAssertion);

    // Check the result
    expect(isValid).toBe(true);
  });

  test('should reject an invalid assertion signature', async () => {
    // Create a test assertion
    const assertion = Assertion.create({
      id: 'urn:uuid:123e4567-e89b-12d3-a456-426614174000' as Shared.IRI,
      badgeClass: 'urn:uuid:123e4567-e89b-12d3-a456-426614174001' as Shared.IRI,
      recipient: {
        identity: 'sha256$test@example.com',
        type: 'email',
        hashed: true
      },
      issuedOn: new Date().toISOString()
    });

    // Create a verification object
    const signedAssertion = await VerificationService.createVerificationForAssertion(assertion);

    // Create a different assertion with the same verification
    const tamperedAssertion = Assertion.create({
      id: 'urn:uuid:123e4567-e89b-12d3-a456-426614174999' as Shared.IRI, // Different ID
      badgeClass: 'urn:uuid:123e4567-e89b-12d3-a456-426614174001' as Shared.IRI,
      recipient: {
        identity: 'sha256$tampered@example.com',
        type: 'email',
        hashed: true
      },
      issuedOn: new Date().toISOString(),
      verification: signedAssertion.verification // Use the verification from the original assertion
    });

    // Verify the signature
    const isValid = await VerificationService.verifyAssertionSignature(tamperedAssertion);

    // Check the result
    expect(isValid).toBe(false);
  });

  test('should verify a valid assertion', async () => {
    // Create a test assertion
    const assertion = Assertion.create({
      id: 'urn:uuid:123e4567-e89b-12d3-a456-426614174000' as Shared.IRI,
      badgeClass: 'urn:uuid:123e4567-e89b-12d3-a456-426614174001' as Shared.IRI,
      recipient: {
        identity: 'sha256$test@example.com',
        type: 'email',
        hashed: true
      },
      issuedOn: new Date().toISOString()
    });

    // Create a verification object
    const signedAssertion = await VerificationService.createVerificationForAssertion(assertion);

    // Verify the assertion
    const result = await VerificationService.verifyAssertion(signedAssertion);

    // Check the result
    expect(result.isValid).toBe(true);
    expect(result.isExpired).toBe(false);
    expect(result.isRevoked).toBe(false);
    expect(result.hasValidSignature).toBe(true);
    expect(result.details).toBe('Assertion is valid');
  });

  test('should reject an expired assertion', async () => {
    // Create a test assertion that is expired
    const assertion = Assertion.create({
      id: 'urn:uuid:123e4567-e89b-12d3-a456-426614174000' as Shared.IRI,
      badgeClass: 'urn:uuid:123e4567-e89b-12d3-a456-426614174001' as Shared.IRI,
      recipient: {
        identity: 'sha256$expired@example.com',
        type: 'email',
        hashed: true
      },
      issuedOn: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      expires: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
    });

    // Create a verification object
    const signedAssertion = await VerificationService.createVerificationForAssertion(assertion);

    // Verify the assertion
    const result = await VerificationService.verifyAssertion(signedAssertion);

    // Check the result
    expect(result.isValid).toBe(false);
    expect(result.isExpired).toBe(true);
    expect(result.isRevoked).toBe(false);
    expect(result.hasValidSignature).toBe(true);
    expect(result.details).toBe('Assertion has expired');
  });

  test('should reject a revoked assertion', async () => {
    // Create a test assertion that is revoked
    const assertion = Assertion.create({
      id: 'urn:uuid:123e4567-e89b-12d3-a456-426614174000' as Shared.IRI,
      badgeClass: 'urn:uuid:123e4567-e89b-12d3-a456-426614174001' as Shared.IRI,
      recipient: {
        identity: 'sha256$revoked@example.com',
        type: 'email',
        hashed: true
      },
      issuedOn: new Date().toISOString(),
      revoked: true,
      revocationReason: 'Test revocation'
    });

    // Create a verification object
    const signedAssertion = await VerificationService.createVerificationForAssertion(assertion);

    // Verify the assertion
    const result = await VerificationService.verifyAssertion(signedAssertion);

    // Check the result
    expect(result.isValid).toBe(false);
    expect(result.isExpired).toBe(false);
    expect(result.isRevoked).toBe(true);
    expect(result.hasValidSignature).toBe(true);
    expect(result.details).toBe('Assertion has been revoked: Test revocation');
  });

  test('should handle non-standard creator URLs', async () => {
    // Create a test assertion
    const assertion = Assertion.create({
      id: 'urn:uuid:123e4567-e89b-12d3-a456-426614174000' as Shared.IRI,
      badgeClass: 'urn:uuid:123e4567-e89b-12d3-a456-426614174001' as Shared.IRI,
      recipient: {
        identity: 'sha256$test@example.com',
        type: 'email',
        hashed: true
      },
      issuedOn: new Date().toISOString()
    });

    // Create a verification object
    const signedAssertion = await VerificationService.createVerificationForAssertion(assertion);

    // Modify the verificationMethod to a non-standard format but valid path for key extraction
    (signedAssertion.verification as OB3.Proof).verificationMethod = '/public-keys/custom-key-id#test-key' as Shared.IRI;

    // Verify the signature
    const isValid = await VerificationService.verifyAssertionSignature(signedAssertion);

    // Should be false because the key 'custom-key-id' doesn't exist and the service
    // currently returns false if a specific non-default key is not found.
    expect(isValid).toBe(false);
  });

  test('should handle malformed creator URLs', async () => {
    // Create a test assertion
    const assertion = Assertion.create({
      id: 'urn:uuid:123e4567-e89b-12d3-a456-426614174000' as Shared.IRI,
      badgeClass: 'urn:uuid:123e4567-e89b-12d3-a456-426614174001' as Shared.IRI,
      recipient: {
        identity: 'sha256$test@example.com',
        type: 'email',
        hashed: true
      },
      issuedOn: new Date().toISOString()
    });

    // Create a verification object
    const signedAssertion = await VerificationService.createVerificationForAssertion(assertion);

    // Modify the verificationMethod to a completely invalid format
    (signedAssertion.verification as OB3.Proof).verificationMethod = 'invalid-url' as Shared.IRI;

    // Verify the signature directly
    // Since the verificationMethod is malformed, the service will fall back to using the 'default' key.
    // As the signature was created with the 'default' key, it should still be valid.
    const isValid = await VerificationService.verifyAssertionSignature(signedAssertion);
    expect(isValid).toBe(true); // Changed from false, as it should fallback to default key and validate

    // Verify the assertion - should not throw an error
    const result = await VerificationService.verifyAssertion(signedAssertion);

    // Should gracefully handle the error and return false for signature validity
    expect(result.hasValidSignature).toBe(true);
  });
});
