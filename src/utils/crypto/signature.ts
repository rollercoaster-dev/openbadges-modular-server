/**
 * Cryptographic utilities for Open Badges API
 *
 * This file contains utilities for digital signatures and verification
 * according to the Open Badges 3.0 specification.
 */

import * as crypto from 'crypto';
import { logger } from '../logging/logger.service';
import { config } from '../../config/config';
import { Shared } from 'openbadges-types';
import { toIRI } from '../types/iri-utils';

/**
 * Represents the structure of a Data Integrity Proof object.
 * Aligns with W3C Verifiable Credentials Data Model and Open Badges 3.0.
 */
export interface DataIntegrityProof {
  type: 'DataIntegrityProof';
  cryptosuite: string; // e.g., 'rsa-sha256', 'RsaSignature2018'
  created: Shared.DateTime; // ISO 8601 datetime string, branded type
  proofPurpose: 'assertionMethod' | string; // Typically 'assertionMethod' for badges
  verificationMethod: Shared.IRI; // IRI of the public key
  proofValue: string; // The signature, base64 encoded
}

/**
 * Generates a key pair for digital signatures
 * @returns An object containing the public and private keys
 */
export function generateKeyPair(options: { modulusLength?: number } = {}): { publicKey: string; privateKey: string } {
  // Default to 2048 bits if not specified
  const modulusLength = options.modulusLength || 2048;
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  return { publicKey, privateKey };
}

/**
 * Signs data with a private key
 * @param data The data to sign
 * @param privateKey The private key to use for signing
 * @returns The signature as a base64 string
 */
export function signData(data: string, privateKey: string): string {
  const sign = crypto.createSign('SHA256');
  sign.update(data);
  sign.end();
  return sign.sign(privateKey, 'base64');
}

/**
 * Verifies a signature against data and a public key
 * @param data The data that was signed
 * @param signature The signature to verify
 * @param publicKey The public key to use for verification
 * @returns True if the signature is valid, false otherwise
 */
export function verifySignature(data: string, signature: string, publicKey: string): boolean {
  try {
    const verify = crypto.createVerify('SHA256');
    verify.update(data);
    verify.end();
    return verify.verify(publicKey, signature, 'base64');
  } catch (error) {
    logger.logError('Signature verification error', error as Error);
    return false;
  }
}

/**
 * Creates a verification object for an assertion
 * @param dataToSign The data to sign (typically a canonical representation of the assertion)
 * @param privateKey The private key to use for signing
 * @returns A DataIntegrityProof object with the signature
 */
export function createVerification(dataToSign: string, privateKey: string): DataIntegrityProof {
  try {
    // Sign the data
    const signature = signData(dataToSign, privateKey);

    // Create the DataIntegrityProof object
    return {
      type: 'DataIntegrityProof',
      cryptosuite: 'rsa-sha256', // Placeholder, consider more specific like 'RsaSignature2018'
      created: new Date().toISOString() as Shared.DateTime,
      proofPurpose: 'assertionMethod',
      verificationMethod: toIRI(`${config.openBadges.baseUrl}/public-keys/default`), // Default public key IRI
      proofValue: signature
    };
  } catch (error) {
    logger.logError('Failed to create verification proof', error as Error);
    throw error;
  }
}

/**
 * Verifies an assertion's signature
 * @param dataToVerify The data to verify (typically a canonical representation of the assertion)
 * @param proof The DataIntegrityProof object with the signature
 * @param publicKey The public key to use for verification
 * @returns True if the signature is valid, false otherwise
 */
export function verifyAssertion(dataToVerify: string, proof: DataIntegrityProof, publicKey: string): boolean {
  try {
    if (!proof || !proof.proofValue) {
      logger.warn('Proof object is missing or has no proofValue');
      return false;
    }

    // Verify the signature
    return verifySignature(dataToVerify, proof.proofValue, publicKey);
  } catch (error) {
    logger.logError('Failed to verify assertion proof', error as Error);
    return false;
  }
}

/**
 * Hashes data using SHA-256
 * @param data The data to hash
 * @returns The hash as a hex string
 */
export function hashData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generates a nonce (number used once) for cryptographic operations
 * @param length The length of the nonce in bytes (default: 16)
 * @returns The nonce as a hex string
 */
export function generateNonce(length: number = 16): string {
  return crypto.randomBytes(length).toString('hex');
}
