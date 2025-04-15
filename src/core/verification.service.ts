/**
 * Verification service for Open Badges API
 * 
 * This service handles the verification of assertions according to
 * the Open Badges 3.0 specification.
 */

import { Assertion } from '../domains/assertion/assertion.entity';
import { KeyService } from './key.service';
import { createVerification, verifyAssertion } from '../utils/crypto/signature';
import { config } from '../config/config';

export class VerificationService {
  /**
   * Creates a verification object for an assertion
   * @param assertion The assertion to create verification for
   * @returns The assertion with verification added
   */
  static createVerificationForAssertion(assertion: Assertion): Assertion {
    // Create verification object
    const verification = createVerification(
      assertion.id,
      KeyService.getDefaultPrivateKey()
    );
    
    // Create a new assertion with the verification
    return Assertion.create({
      ...assertion.toObject(),
      verification
    });
  }
  
  /**
   * Verifies an assertion's signature
   * @param assertion The assertion to verify
   * @returns True if the assertion is valid, false otherwise
   */
  static verifyAssertionSignature(assertion: Assertion): boolean {
    if (!assertion.verification || !assertion.verification.signatureValue) {
      return false;
    }
    
    return verifyAssertion(
      assertion.id,
      assertion.verification,
      KeyService.getDefaultPublicKey()
    );
  }
  
  /**
   * Verifies an assertion's validity (not expired, not revoked, valid signature)
   * @param assertion The assertion to verify
   * @returns An object containing verification results
   */
  static verifyAssertion(assertion: Assertion): {
    isValid: boolean;
    isExpired: boolean;
    isRevoked: boolean;
    hasValidSignature: boolean;
  } {
    // Check if revoked
    const isRevoked = !!assertion.revoked;
    
    // Check if expired
    let isExpired = false;
    if (assertion.expires) {
      const expiryDate = new Date(assertion.expires);
      const now = new Date();
      isExpired = expiryDate < now;
    }
    
    // Check signature
    const hasValidSignature = this.verifyAssertionSignature(assertion);
    
    // Overall validity
    const isValid = !isRevoked && !isExpired && hasValidSignature;
    
    return {
      isValid,
      isExpired,
      isRevoked,
      hasValidSignature
    };
  }
}
