/**
 * Verification service for Open Badges API
 *
 * This service handles the verification of assertions according to
 * the Open Badges 3.0 specification.
 */

import { Assertion } from '@domains/assertion/assertion.entity';
import { KeyService } from '@core/key.service';
import {
  createVerification,
  verifyAssertion,
  DataIntegrityProof, // Import local DataIntegrityProof
  Cryptosuite,
  KeyType,
  detectKeyType
} from '@utils/crypto/signature';
import { logger } from '@utils/logging/logger.service';
import type { OB3, Shared } from 'openbadges-types'; // For OB3.Proof and Shared types
import { VerificationStatus, VerificationErrorCode, createVerificationError, createSuccessfulVerification } from '@utils/types/verification-status';

// Type guard to check if an object is our specific DataIntegrityProof
function isDataIntegrityProof(proof: unknown): proof is DataIntegrityProof { // Uses local DataIntegrityProof
  return (
    typeof proof === 'object' &&
    proof !== null &&
    'type' in proof &&
    (proof as OB3.Proof).type === 'DataIntegrityProof' && // Check type property against OB3.Proof structure
    'cryptosuite' in proof && // Check for properties of local DataIntegrityProof
    'created' in proof &&
    'proofPurpose' in proof &&
    'verificationMethod' in proof &&
    'proofValue' in proof
  );
}

export class VerificationService {
  /**
   * Creates a verification object for an assertion
   * @param assertion The assertion to create verification for
   * @param keyId Optional key ID to use for signing (defaults to 'default')
   * @returns The assertion with verification added
   */
  static async createVerificationForAssertion(assertion: Assertion, keyId: string = 'default'): Promise<Assertion> {
    try {
      // Ensure the key service is initialized
      await KeyService.initialize();

      // Create a canonical representation of the assertion for signing
      // This ensures that the signature is based on the essential data
      const canonicalData = this.createCanonicalDataForSigning(assertion);

      // Get the key pair from the KeyService
      const keyPair = await KeyService.generateKeyPair(keyId);

      // Determine the appropriate cryptosuite based on key type
      let cryptosuite: Cryptosuite;
      switch (keyPair.keyType) {
        case KeyType.RSA:
          cryptosuite = Cryptosuite.RsaSha256;
          break;
        case KeyType.Ed25519:
          cryptosuite = Cryptosuite.Ed25519;
          break;
        default:
          cryptosuite = Cryptosuite.RsaSha256; // Default fallback
      }

      // Create verification object (now DataIntegrityProof)
      const proof = createVerification(
        canonicalData,
        keyPair.privateKey,
        keyPair.keyType,
        cryptosuite
      );

      // The verificationMethod in DataIntegrityProof already contains the key's IRI.
      // So, no need to manually set `proof.verificationMethod` like we did for `verification.creator`.

      // Get the assertion data as a plain object
      // Explicitly select the required fields from the assertion object
      const assertionData = {
        id: assertion.id,
        type: assertion.type,
        badgeClass: assertion.badgeClass,
        recipient: assertion.recipient,
        issuedOn: assertion.issuedOn,
        expires: assertion.expires,
        evidence: assertion.evidence,
        revoked: assertion.revoked,
        revocationReason: assertion.revocationReason,
        issuer: assertion.issuer,
        // Remove old verification property if it exists to avoid conflicts
        verification: undefined,
      };

      // Create a new assertion with the proof
      // The Assertion entity will need to be updated to accept a `proof` property.
      // For now, we assume it can be added or will replace 'verification'.
      return Assertion.create({
        ...assertionData,
        // createVerification returns local DataIntegrityProof, which is compatible with OB3.Proof here.
        verification: proof as unknown as OB3.Proof,
      });
    } catch (error) {
      logger.logError('Failed to create verification for assertion', error as Error);
      throw error;
    }
  }

  /**
   * Creates a canonical representation of the assertion for signing
   * This ensures that the signature is based on the essential data
   * and is not affected by non-essential changes
   *
   * @param data The assertion to create canonical data for
   * @returns A string representation of the canonical data
   */
  private static createCanonicalDataForSigning(data: Partial<Assertion>): string {
    // Create a minimal object with only the essential properties
    const essentialData = {
      id: data.id,
      type: data.type,
      // Use badgeClass property (internal) rather than badge (from toObject)
      badgeClass: data.badgeClass,
      recipient: data.recipient,
      issuedOn: data.issuedOn,
      expires: data.expires
    };

    // Convert to a stable string representation
    return JSON.stringify(essentialData, Object.keys(essentialData).sort());
  }

  /**
   * Verifies an assertion's signature
   * @param assertion The assertion to verify
   * @returns A verification status object with detailed information
   */
  public static async verifyAssertionSignature(
    assertion: Assertion
  ): Promise<VerificationStatus> {
    try {
      if (!assertion.verification || typeof assertion.verification !== 'object') {
        return createVerificationError(
          VerificationErrorCode.PROOF_MISSING,
          'Verification object is missing or not an object'
        );
      }

      const proofInput = assertion.verification as OB3.Proof; // Keep as Proof initially for verificationMethod access

      // Construct the data that was originally signed.
      // This means taking the assertion's content *excluding* the entire proof/verification field.
      const assertionDataToCanonicalize = { ...assertion };
      delete (assertionDataToCanonicalize as Partial<Assertion>).verification; // Remove the whole verification field

      const canonicalData = this.createCanonicalDataForSigning(assertionDataToCanonicalize);

      let keyId = 'default'; // Default key ID
      if (proofInput.verificationMethod) {
        try {
          // Attempt to extract keyId from the verificationMethod IRI
          // Example: https://example.com/public-keys/someKeyId#fragment
          // Example: /public-keys/someKeyId
          const VMethodStr = proofInput.verificationMethod as string;
          const match = VMethodStr.match(/\/public-keys\/([^#\/]+)/);
          if (match && match[1]) {
            keyId = match[1];
          }
        } catch (e: unknown) {
          logger.warn(`Error parsing verificationMethod URL: ${proofInput.verificationMethod}`, { message: (e as Error).message });
          // keyId remains 'default' if parsing fails
        }
      }

      // If a specific keyId was derived from verificationMethod and that key doesn't exist, fail verification.
      if (keyId !== 'default' && !(await KeyService.keyExists(keyId))) {
        return createVerificationError(
          VerificationErrorCode.KEY_NOT_FOUND,
          `Public key not found for specific keyId derived from verificationMethod: ${keyId}`
        );
      }

      // Gets specified key or 'default' key
      const publicKey = await KeyService.getPublicKey(keyId);

      if (!publicKey) {
        return createVerificationError(
          VerificationErrorCode.KEY_NOT_FOUND,
          `Public key not found for ID: ${keyId}. Cannot verify signature`
        );
      }

      // Before passing to verifyAssertion, ensure proofInput is actually a DataIntegrityProof
      if (!isDataIntegrityProof(proofInput)) {
        return createVerificationError(
          VerificationErrorCode.PROOF_INVALID,
          'Proof object is not a valid DataIntegrityProof structure'
        );
      }

      // Check if the proof has a proofValue
      if (!proofInput.proofValue) {
        return createVerificationError(
          VerificationErrorCode.SIGNATURE_MISSING,
          'Proof object does not contain a proofValue'
        );
      }

      // Determine key type based on cryptosuite
      let keyType: KeyType | undefined;
      let cryptosuite = proofInput.cryptosuite;

      if (cryptosuite) {
        switch (cryptosuite) {
          case Cryptosuite.RsaSha256:
            keyType = KeyType.RSA;
            break;
          case Cryptosuite.Ed25519:
          case Cryptosuite.EddsaRdfc2022:
            keyType = KeyType.Ed25519;
            break;
          default:
            // For unknown cryptosuites, we'll try to auto-detect the key type
            keyType = detectKeyType(publicKey);
            logger.warn(`Unknown cryptosuite: ${cryptosuite}, using auto-detected key type: ${keyType}`);
            break;
        }
      } else {
        // If no cryptosuite specified, auto-detect key type
        keyType = detectKeyType(publicKey);
        cryptosuite = keyType === KeyType.RSA ? Cryptosuite.RsaSha256 : Cryptosuite.Ed25519;
        logger.warn(`No cryptosuite specified, using auto-detected key type: ${keyType} and cryptosuite: ${cryptosuite}`);
      }

      // Pass canonicalData, the full proofObject (which includes cryptosuite and proofValue), and publicKey
      // proofInput is now known to be local DataIntegrityProof due to the guard
      const isValidSignature = verifyAssertion(
        canonicalData,
        proofInput, // This is now correctly typed as local DataIntegrityProof
        publicKey
      );

      if (!isValidSignature) {
        logger.warn(`Signature verification failed for assertion: ${assertion.id}`);
        return createVerificationError(
          VerificationErrorCode.SIGNATURE_VERIFICATION_FAILED,
          'Signature verification failed'
        );
      }

      // Return successful verification status
      return createSuccessfulVerification({
        verificationMethod: proofInput.verificationMethod as string,
        cryptosuite
      });
    } catch (error) {
      logger.logError('Error verifying assertion signature', error as Error);
      return createVerificationError(
        VerificationErrorCode.INTERNAL_ERROR,
        `Internal error: ${(error as Error).message}`
      );
    }
  }

  /**
   * Verifies an assertion's validity (not expired, not revoked, valid signature)
   * @param assertion The assertion to verify
   * @returns A verification status object with detailed information
   */
  static async verifyAssertion(assertion: Assertion): Promise<VerificationStatus> {
    try {
      // Check if revoked
      const isRevoked = !!assertion.revoked;
      let revocationReason = '';
      if (isRevoked && assertion.revocationReason) {
        revocationReason = assertion.revocationReason;
      }

      // Check if expired
      let isExpired = false;
      if (assertion.expires) {
        const expiryDate = new Date(assertion.expires);
        const now = new Date();
        isExpired = expiryDate < now;
      }

      // Check signature
      const signatureStatus = await this.verifyAssertionSignature(assertion);
      const hasValidSignature = signatureStatus.isValid;

      // If the assertion is revoked, return a revocation error
      if (isRevoked) {
        return createVerificationError(
          VerificationErrorCode.ASSERTION_REVOKED,
          `Assertion has been revoked${revocationReason ? `: ${revocationReason}` : ''}`
        );
      }

      // If the assertion is expired, return an expiration error
      if (isExpired) {
        return createVerificationError(
          VerificationErrorCode.ASSERTION_EXPIRED,
          'Assertion has expired'
        );
      }

      // If the signature is invalid, return the signature verification error
      if (!hasValidSignature) {
        return signatureStatus; // Already contains the appropriate error details
      }

      // If we get here, the assertion is valid
      return createSuccessfulVerification({
        verificationMethod: signatureStatus.verificationMethod,
        cryptosuite: signatureStatus.cryptosuite
      });
    } catch (error) {
      logger.logError('Failed to verify assertion', error as Error);
      return createVerificationError(
        VerificationErrorCode.INTERNAL_ERROR,
        `Error during verification process: ${(error as Error).message}`
      );
    }
  }

  /**
   * Verifies an assertion by ID
   * @param assertionId The ID of the assertion to verify
   * @param assertionRepository The repository to use for fetching the assertion
   * @returns A verification status object with detailed information
   */
  static async verifyAssertionById(
    assertionId: Shared.IRI,
    assertionRepository: { findById: (id: Shared.IRI) => Promise<Assertion | null> }
  ): Promise<VerificationStatus> {
    try {
      // Fetch the assertion
      const assertion = await assertionRepository.findById(assertionId);

      if (!assertion) {
        return createVerificationError(
          VerificationErrorCode.ASSERTION_NOT_FOUND,
          `Assertion with ID ${assertionId} not found`
        );
      }

      // Verify the assertion
      return await this.verifyAssertion(assertion);
    } catch (error) {
      logger.logError(`Failed to verify assertion with ID ${assertionId}`, error as Error);
      return createVerificationError(
        VerificationErrorCode.INTERNAL_ERROR,
        `Error during verification process: ${(error as Error).message}`
      );
    }
  }
}
