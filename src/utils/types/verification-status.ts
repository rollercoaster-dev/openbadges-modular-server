/**
 * Verification status model for Open Badges API
 *
 * This file defines the verification status model used to provide detailed
 * information about the verification process.
 */

/**
 * Verification error codes
 */
export enum VerificationErrorCode {
  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  
  // Assertion errors
  ASSERTION_NOT_FOUND = 'ASSERTION_NOT_FOUND',
  ASSERTION_EXPIRED = 'ASSERTION_EXPIRED',
  ASSERTION_REVOKED = 'ASSERTION_REVOKED',
  
  // Signature errors
  SIGNATURE_MISSING = 'SIGNATURE_MISSING',
  SIGNATURE_INVALID = 'SIGNATURE_INVALID',
  SIGNATURE_VERIFICATION_FAILED = 'SIGNATURE_VERIFICATION_FAILED',
  
  // Key errors
  KEY_NOT_FOUND = 'KEY_NOT_FOUND',
  KEY_TYPE_MISMATCH = 'KEY_TYPE_MISMATCH',
  
  // Proof errors
  PROOF_MISSING = 'PROOF_MISSING',
  PROOF_INVALID = 'PROOF_INVALID',
  PROOF_TYPE_UNSUPPORTED = 'PROOF_TYPE_UNSUPPORTED',
  CRYPTOSUITE_UNSUPPORTED = 'CRYPTOSUITE_UNSUPPORTED'
}

/**
 * Verification status model
 */
export interface VerificationStatus {
  // Overall status
  isValid: boolean;
  
  // Specific status flags
  isExpired: boolean;
  isRevoked: boolean;
  hasValidSignature: boolean;
  
  // Error information
  errorCode?: VerificationErrorCode;
  details?: string;
  
  // Verification metadata
  verifiedAt: string; // ISO date string
  verificationMethod?: string;
  cryptosuite?: string;
}

/**
 * Creates a verification status object
 * @param status The verification status
 * @returns A verification status object
 */
export function createVerificationStatus(status: Partial<VerificationStatus>): VerificationStatus {
  return {
    isValid: status.isValid ?? false,
    isExpired: status.isExpired ?? false,
    isRevoked: status.isRevoked ?? false,
    hasValidSignature: status.hasValidSignature ?? false,
    errorCode: status.errorCode,
    details: status.details,
    verifiedAt: status.verifiedAt ?? new Date().toISOString(),
    verificationMethod: status.verificationMethod,
    cryptosuite: status.cryptosuite
  };
}

/**
 * Creates a verification error status
 * @param errorCode The error code
 * @param details Additional details about the error
 * @returns A verification status object with the error
 */
export function createVerificationError(
  errorCode: VerificationErrorCode,
  details?: string
): VerificationStatus {
  return createVerificationStatus({
    isValid: false,
    errorCode,
    details,
    verifiedAt: new Date().toISOString()
  });
}

/**
 * Creates a successful verification status
 * @param options Additional options for the verification status
 * @returns A verification status object indicating success
 */
export function createSuccessfulVerification(
  options?: {
    verificationMethod?: string;
    cryptosuite?: string;
  }
): VerificationStatus {
  return createVerificationStatus({
    isValid: true,
    isExpired: false,
    isRevoked: false,
    hasValidSignature: true,
    details: 'Verification successful',
    verifiedAt: new Date().toISOString(),
    verificationMethod: options?.verificationMethod,
    cryptosuite: options?.cryptosuite
  });
}
