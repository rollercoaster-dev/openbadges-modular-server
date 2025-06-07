/**
 * JWT Proof utilities for Open Badges 3.0
 *
 * This module provides functions for generating and verifying JWT proofs
 * according to the W3C VC-JOSE-COSE specification and Open Badges 3.0 requirements.
 */

import { SignJWT, jwtVerify, importJWK, importPKCS8, importSPKI, JWTPayload, JWTHeaderParameters } from 'jose';
import { Shared } from 'openbadges-types';
import { logger } from '../logging/logger.service';
import { 
  JWTProof, 
  JWTProofHeader, 
  JWTProofPayload, 
  VerifiableCredentialClaims,
  ProofVerificationResult,
  ProofFormat
} from '../types/proof.types';

/**
 * Supported JWT algorithms for Open Badges
 */
export const SUPPORTED_JWT_ALGORITHMS = [
  'RS256', 'RS384', 'RS512',  // RSA with SHA
  'ES256', 'ES384', 'ES512',  // ECDSA with SHA
  'EdDSA'                     // EdDSA (Ed25519/Ed448)
] as const;

export type SupportedJWTAlgorithm = typeof SUPPORTED_JWT_ALGORITHMS[number];

/**
 * JWT proof generation options
 */
export interface JWTProofGenerationOptions {
  /** Private key in PEM format or JWK */
  privateKey: string | Record<string, unknown>;
  
  /** Algorithm to use for signing */
  algorithm: SupportedJWTAlgorithm;
  
  /** Key ID for the JWT header */
  keyId?: string;
  
  /** Verification method IRI */
  verificationMethod: Shared.IRI;
  
  /** Proof purpose */
  proofPurpose?: string;
  
  /** Issuer IRI */
  issuer: Shared.IRI;
  
  /** Subject (optional) */
  subject?: string;
  
  /** Audience (optional) */
  audience?: string | string[];
  
  /** Expiration time in seconds from now (optional) */
  expiresIn?: number;
  
  /** Not before time in seconds from now (optional) */
  notBefore?: number;
}

/**
 * JWT proof verification options
 */
export interface JWTProofVerificationOptions {
  /** Public key in PEM format or JWK */
  publicKey: string | Record<string, unknown>;
  
  /** Expected issuer (optional) */
  expectedIssuer?: Shared.IRI;
  
  /** Expected audience (optional) */
  expectedAudience?: string | string[];
  
  /** Clock tolerance in seconds (default: 60) */
  clockTolerance?: number;
}

/**
 * Generates a JWT proof for a Verifiable Credential
 * 
 * @param credentialData The Verifiable Credential data to include in the JWT
 * @param options JWT proof generation options
 * @returns Promise resolving to a JWTProof object
 */
export async function generateJWTProof(
  credentialData: VerifiableCredentialClaims,
  options: JWTProofGenerationOptions
): Promise<JWTProof> {
  try {
    logger.info('Generating JWT proof', { 
      algorithm: options.algorithm,
      keyId: options.keyId,
      verificationMethod: options.verificationMethod 
    });

    // Import the private key
    const privateKey = await importPrivateKey(options.privateKey, options.algorithm);

    // Prepare JWT payload
    const now = Math.floor(Date.now() / 1000);
    const payload: JWTProofPayload = {
      iss: options.issuer,
      iat: now,
      vc: credentialData
    };

    // Add optional claims
    if (options.subject) payload.sub = options.subject;
    if (options.audience) payload.aud = options.audience;
    if (options.expiresIn) payload.exp = now + options.expiresIn;
    if (options.notBefore) payload.nbf = now + options.notBefore;

    // Create and sign JWT
    const jwt = await new SignJWT(payload as JWTPayload)
      .setProtectedHeader({
        alg: options.algorithm,
        typ: 'JWT',
        ...(options.keyId && { kid: options.keyId })
      } as JWTHeaderParameters)
      .sign(privateKey);

    // Create the JWT proof object
    const jwtProof: JWTProof = {
      type: 'JwtProof2020',
      created: new Date().toISOString() as Shared.DateTime,
      verificationMethod: options.verificationMethod,
      proofPurpose: options.proofPurpose || 'assertionMethod',
      jws: jwt
    };

    logger.info('JWT proof generated successfully', { 
      proofType: jwtProof.type,
      verificationMethod: jwtProof.verificationMethod 
    });

    return jwtProof;

  } catch (error) {
    logger.error('Failed to generate JWT proof', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      algorithm: options.algorithm 
    });
    throw new Error(`JWT proof generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Verifies a JWT proof
 * 
 * @param jwtProof The JWT proof to verify
 * @param options Verification options
 * @returns Promise resolving to verification result
 */
export async function verifyJWTProof(
  jwtProof: JWTProof,
  options: JWTProofVerificationOptions
): Promise<ProofVerificationResult> {
  try {
    logger.info('Verifying JWT proof', { 
      proofType: jwtProof.type,
      verificationMethod: jwtProof.verificationMethod 
    });

    // Import the public key
    const publicKey = await importPublicKey(options.publicKey);

    // Verify the JWT
    const { payload, protectedHeader } = await jwtVerify(jwtProof.jws, publicKey, {
      issuer: options.expectedIssuer,
      audience: options.expectedAudience,
      clockTolerance: options.clockTolerance || 60
    });

    // Validate the payload structure
    if (!payload.vc) {
      throw new Error('JWT payload missing vc claim');
    }

    logger.info('JWT proof verified successfully', { 
      algorithm: protectedHeader.alg,
      issuer: payload.iss 
    });

    return {
      isValid: true,
      format: ProofFormat.JWT,
      verificationMethod: jwtProof.verificationMethod,
      algorithm: protectedHeader.alg,
      details: {
        issuer: payload.iss,
        subject: payload.sub,
        audience: payload.aud,
        issuedAt: payload.iat,
        expiresAt: payload.exp
      }
    };

  } catch (error) {
    logger.warn('JWT proof verification failed', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      verificationMethod: jwtProof.verificationMethod 
    });

    return {
      isValid: false,
      format: ProofFormat.JWT,
      verificationMethod: jwtProof.verificationMethod,
      error: error instanceof Error ? error.message : 'Unknown verification error'
    };
  }
}

/**
 * Extracts the Verifiable Credential from a JWT proof
 * 
 * @param jwtProof The JWT proof containing the credential
 * @returns The extracted Verifiable Credential claims
 */
export function extractCredentialFromJWT(jwtProof: JWTProof): VerifiableCredentialClaims | null {
  try {
    // Decode JWT payload without verification (for extraction only)
    const [, payloadBase64] = jwtProof.jws.split('.');
    const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
    const payload = JSON.parse(payloadJson) as JWTProofPayload;
    
    return payload.vc || null;
  } catch (error) {
    logger.error('Failed to extract credential from JWT', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return null;
  }
}

/**
 * Imports a private key for JWT signing
 * 
 * @param key Private key in PEM format or JWK object
 * @param algorithm The algorithm that will be used with this key
 * @returns Promise resolving to the imported key
 */
async function importPrivateKey(
  key: string | Record<string, unknown>, 
  algorithm: SupportedJWTAlgorithm
): Promise<CryptoKey> {
  if (typeof key === 'string') {
    // PEM format
    return await importPKCS8(key, algorithm);
  } else {
    // JWK format
    return await importJWK(key, algorithm);
  }
}

/**
 * Imports a public key for JWT verification
 * 
 * @param key Public key in PEM format or JWK object
 * @returns Promise resolving to the imported key
 */
async function importPublicKey(key: string | Record<string, unknown>): Promise<CryptoKey> {
  if (typeof key === 'string') {
    // PEM format - try SPKI first
    return await importSPKI(key, 'RS256'); // Algorithm will be determined from JWT header
  } else {
    // JWK format
    return await importJWK(key);
  }
}

/**
 * Validates that an algorithm is supported for JWT proofs
 * 
 * @param algorithm The algorithm to validate
 * @returns True if the algorithm is supported
 */
export function isSupportedJWTAlgorithm(algorithm: string): algorithm is SupportedJWTAlgorithm {
  return SUPPORTED_JWT_ALGORITHMS.includes(algorithm as SupportedJWTAlgorithm);
}

/**
 * Gets the recommended algorithm for a given key type
 * 
 * @param keyType The type of key (e.g., 'RSA', 'EC', 'Ed25519')
 * @returns The recommended algorithm
 */
export function getRecommendedAlgorithm(keyType: string): SupportedJWTAlgorithm {
  switch (keyType.toLowerCase()) {
    case 'rsa':
      return 'RS256';
    case 'ec':
    case 'ecdsa':
      return 'ES256';
    case 'ed25519':
    case 'eddsa':
      return 'EdDSA';
    default:
      return 'RS256'; // Default fallback
  }
}
