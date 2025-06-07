/**
 * Type definitions for proof systems in Open Badges 3.0
 *
 * This file defines TypeScript types for different proof formats supported
 * by the Open Badges 3.0 specification, including DataIntegrityProof and JWT proofs.
 */

import { Shared } from 'openbadges-types';
import { DataIntegrityProof } from '../crypto/signature';

/**
 * JWT Header for Open Badges JWT proofs
 * Follows RFC 7515 (JWS) and W3C VC-JOSE-COSE specifications
 */
export interface JWTProofHeader {
  /** Algorithm used for signing (e.g., 'RS256', 'ES256', 'EdDSA') */
  alg: 'RS256' | 'RS384' | 'RS512' | 'ES256' | 'ES384' | 'ES512' | 'EdDSA';
  
  /** Type of token, always 'JWT' for JWT proofs */
  typ: 'JWT';
  
  /** Key ID - identifier for the key used to sign the JWT */
  kid?: string;
  
  /** Additional header parameters as needed */
  [key: string]: unknown;
}

/**
 * JWT Payload for Open Badges JWT proofs
 * Contains the VerifiableCredential as JWT claims
 */
export interface JWTProofPayload {
  /** Issuer - who issued the JWT */
  iss: Shared.IRI;
  
  /** Subject - who the JWT is about (typically the credential subject) */
  sub?: string;
  
  /** Audience - who the JWT is intended for */
  aud?: string | string[];
  
  /** Expiration time (Unix timestamp) */
  exp?: number;
  
  /** Not before time (Unix timestamp) */
  nbf?: number;
  
  /** Issued at time (Unix timestamp) */
  iat?: number;
  
  /** JWT ID - unique identifier for the JWT */
  jti?: string;
  
  /** Verifiable Credential - the main content */
  vc: VerifiableCredentialClaims;
  
  /** Additional claims as needed */
  [key: string]: unknown;
}

/**
 * Verifiable Credential claims within JWT payload
 */
export interface VerifiableCredentialClaims {
  /** JSON-LD context */
  '@context': string | string[];
  
  /** Credential ID */
  id?: Shared.IRI;
  
  /** Credential type */
  type: string | string[];
  
  /** Credential subject */
  credentialSubject: Record<string, unknown>;
  
  /** Valid from date (ISO 8601) */
  validFrom?: string;
  
  /** Valid until date (ISO 8601) */
  validUntil?: string;
  
  /** Credential status information */
  credentialStatus?: Record<string, unknown>;
  
  /** Additional credential properties */
  [key: string]: unknown;
}

/**
 * JWT Proof object for Open Badges
 * Represents a complete JWT proof with header, payload, and signature
 */
export interface JWTProof {
  /** Proof type identifier */
  type: 'JwtProof2020' | 'JsonWebSignature2020';
  
  /** Creation timestamp (ISO 8601) */
  created: Shared.DateTime;
  
  /** Verification method IRI */
  verificationMethod: Shared.IRI;
  
  /** Proof purpose */
  proofPurpose: 'assertionMethod' | 'authentication' | 'keyAgreement' | 'capabilityInvocation' | 'capabilityDelegation';
  
  /** The JWT in compact serialization format (header.payload.signature) */
  jws: string;
  
  /** Additional proof properties */
  [key: string]: unknown;
}

/**
 * Union type for all supported proof formats
 */
export type ProofType = DataIntegrityProof | JWTProof;

/**
 * Array of proofs for assertions that support multiple proofs
 */
export type ProofArray = ProofType[];

/**
 * Proof format enumeration
 */
export enum ProofFormat {
  DataIntegrity = 'DataIntegrityProof',
  JWT = 'JwtProof2020',
  JWS = 'JsonWebSignature2020'
}

/**
 * Proof generation options
 */
export interface ProofGenerationOptions {
  /** Format of proof to generate */
  format: ProofFormat;
  
  /** Key ID to use for signing */
  keyId?: string;
  
  /** Algorithm to use for signing */
  algorithm?: string;
  
  /** Verification method IRI */
  verificationMethod?: Shared.IRI;
  
  /** Proof purpose */
  proofPurpose?: string;
  
  /** Additional options */
  [key: string]: unknown;
}

/**
 * Proof verification result
 */
export interface ProofVerificationResult {
  /** Whether the proof is valid */
  isValid: boolean;
  
  /** Proof format that was verified */
  format: ProofFormat;
  
  /** Verification method used */
  verificationMethod?: Shared.IRI;
  
  /** Algorithm used */
  algorithm?: string;
  
  /** Error message if verification failed */
  error?: string;
  
  /** Additional verification details */
  details?: Record<string, unknown>;
}

/**
 * Multiple proof verification result
 */
export interface MultipleProofVerificationResult {
  /** Overall validity - true if at least one proof is valid */
  isValid: boolean;
  
  /** Results for each individual proof */
  proofResults: ProofVerificationResult[];
  
  /** Number of valid proofs */
  validProofCount: number;
  
  /** Total number of proofs */
  totalProofCount: number;
  
  /** Verification timestamp */
  verifiedAt: string;
}

/**
 * Type guard to check if a proof is a DataIntegrityProof
 */
export function isDataIntegrityProof(proof: unknown): proof is DataIntegrityProof {
  return (
    typeof proof === 'object' &&
    proof !== null &&
    'type' in proof &&
    (proof as { type: string }).type === 'DataIntegrityProof'
  );
}

/**
 * Type guard to check if a proof is a JWT proof
 */
export function isJWTProof(proof: unknown): proof is JWTProof {
  return (
    typeof proof === 'object' &&
    proof !== null &&
    'type' in proof &&
    ['JwtProof2020', 'JsonWebSignature2020'].includes((proof as { type: string }).type) &&
    'jws' in proof
  );
}

/**
 * Type guard to check if proofs is an array
 */
export function isProofArray(proofs: unknown): proofs is ProofArray {
  return Array.isArray(proofs) && proofs.every(proof => 
    isDataIntegrityProof(proof) || isJWTProof(proof)
  );
}
