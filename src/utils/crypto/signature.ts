/**
 * Cryptographic utilities for Open Badges API
 * 
 * This file contains utilities for digital signatures and verification
 * according to the Open Badges 3.0 specification.
 */

import * as crypto from 'crypto';
import { config } from '../../config/config';

/**
 * Generates a key pair for digital signatures
 * @returns An object containing the public and private keys
 */
export function generateKeyPair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
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
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Creates a verification object for an assertion
 * @param assertionId The ID of the assertion
 * @param privateKey The private key to use for signing
 * @returns A verification object with the signature
 */
export function createVerification(assertionId: string, privateKey: string): any {
  const dataToSign = assertionId;
  const signature = signData(dataToSign, privateKey);
  
  return {
    type: 'SignedBadge',
    creator: `${config.openBadges.baseUrl}/public-key`,
    created: new Date().toISOString(),
    signatureValue: signature
  };
}

/**
 * Verifies an assertion's signature
 * @param assertionId The ID of the assertion
 * @param verification The verification object with the signature
 * @param publicKey The public key to use for verification
 * @returns True if the signature is valid, false otherwise
 */
export function verifyAssertion(assertionId: string, verification: any, publicKey: string): boolean {
  if (!verification || !verification.signatureValue) {
    return false;
  }
  
  const dataToVerify = assertionId;
  return verifySignature(dataToVerify, verification.signatureValue, publicKey);
}

/**
 * Hashes data using SHA-256
 * @param data The data to hash
 * @returns The hash as a hex string
 */
export function hashData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}
