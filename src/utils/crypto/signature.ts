/**
 * Cryptographic utilities for Open Badges API
 *
 * This file contains utilities for digital signatures and verification
 * according to the Open Badges 3.0 specification.
 */

import * as crypto from 'crypto';
import { logger } from '../logging/logger.service';

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
 * @returns A verification object with the signature
 */
export function createVerification(dataToSign: string, privateKey: string): any {
  try {
    // Sign the data
    const signature = signData(dataToSign, privateKey);

    // Create the verification object
    return {
      type: 'SignedBadge',
      creator: 'https://example.org/public-keys/default', // Default creator URL
      created: new Date().toISOString(),
      signatureValue: signature
    };
  } catch (error) {
    logger.logError('Failed to create verification', error as Error);
    throw error;
  }
}

/**
 * Verifies an assertion's signature
 * @param dataToVerify The data to verify (typically a canonical representation of the assertion)
 * @param verification The verification object with the signature
 * @param publicKey The public key to use for verification
 * @returns True if the signature is valid, false otherwise
 */
export function verifyAssertion(dataToVerify: string, verification: any, publicKey: string): boolean {
  try {
    if (!verification || !verification.signatureValue) {
      logger.warn('Verification object is missing or has no signature value');
      return false;
    }

    // Verify the signature
    return verifySignature(dataToVerify, verification.signatureValue, publicKey);
  } catch (error) {
    logger.logError('Failed to verify assertion', error as Error);
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
