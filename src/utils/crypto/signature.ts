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
  cryptosuite: string; // e.g., 'rsa-sha256', 'ed25519-2020', 'eddsa-rdfc-2022'
  created: Shared.DateTime; // ISO 8601 datetime string, branded type
  proofPurpose: 'assertionMethod' | string; // Typically 'assertionMethod' for badges
  verificationMethod: Shared.IRI; // IRI of the public key
  proofValue: string; // The signature, base64 encoded
}

/**
 * Supported key types for digital signatures
 */
export enum KeyType {
  RSA = 'rsa',
  Ed25519 = 'ed25519'
}

/**
 * Generates a key pair for digital signatures
 * @param keyType The type of key pair to generate (defaults to RSA)
 * @param options Additional options for key generation
 * @returns An object containing the public and private keys
 */
export function generateKeyPair(
  keyType: KeyType = KeyType.RSA,
  options: { modulusLength?: number } = {}
): { publicKey: string; privateKey: string } {
  switch (keyType) {
    case KeyType.RSA:
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

    case KeyType.Ed25519:
      // Generate Ed25519 key pair
      const ed25519KeyPair = crypto.generateKeyPairSync('ed25519', {
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });
      return {
        publicKey: ed25519KeyPair.publicKey,
        privateKey: ed25519KeyPair.privateKey
      };

    default:
      throw new Error(`Unsupported key type: ${keyType}`);
  }
}

/**
 * Detects the type of key from the key material
 * @param key The key material (public or private)
 * @returns The detected key type
 */
export function detectKeyType(key: string): KeyType {
  try {
    // First, check for explicit RSA headers which are definitive
    if (key.includes('BEGIN RSA PRIVATE KEY') || key.includes('BEGIN RSA PUBLIC KEY')) {
      return KeyType.RSA;
    }

    // For generic PEM headers, we need more sophisticated detection
    if (key.includes('BEGIN PRIVATE KEY') || key.includes('BEGIN PUBLIC KEY')) {
      try {
        // Try to create a key object and examine its algorithm
        const keyObj = key.includes('PRIVATE')
          ? crypto.createPrivateKey(key)
          : crypto.createPublicKey(key);

        // Get the key details
        const keyDetails = keyObj.asymmetricKeyDetails;

        // If we have key details with the name property
        if (keyDetails && keyDetails.namedCurve) {
          // Ed25519 keys will have a namedCurve of 'ED25519'
          if (keyDetails.namedCurve === 'ED25519') {
            return KeyType.Ed25519;
          }
        }

        // If we have key details with modulusLength, it's RSA
        if (keyDetails && 'modulusLength' in keyDetails) {
          return KeyType.RSA;
        }

        // Fallback to length-based heuristic if we couldn't determine from key details
        // Ed25519 keys are typically much shorter than RSA keys
        if (key.length < 500) {
          logger.info('Detected likely Ed25519 key based on key length');
          return KeyType.Ed25519;
        }
      } catch (_error) {
        logger.warn('Error examining key details, falling back to length-based detection');
        // Fallback to length-based detection
        if (key.length < 500) {
          return KeyType.Ed25519;
        }
      }
    }

    // If we can't determine for sure, default to RSA as it's more common
    logger.info('Could not definitively determine key type, defaulting to RSA');
    return KeyType.RSA;
  } catch (error) {
    // If there's an error in detection, default to RSA
    logger.warn('Error detecting key type, defaulting to RSA');
    logger.logError('Key type detection error', error as Error);
    return KeyType.RSA;
  }
}

/**
 * Signs data with a private key
 * @param data The data to sign
 * @param privateKey The private key to use for signing
 * @param keyType Optional key type (if not provided, will be auto-detected)
 * @returns The signature as a base64 string
 */
export function signData(data: string, privateKey: string, keyType?: KeyType): string {
  // Auto-detect key type if not provided
  if (!keyType) {
    logger.warn('Key type not provided. Auto-detecting key type for signing.');
  }
  const actualKeyType = keyType || detectKeyType(privateKey);

  switch (actualKeyType) {
    case KeyType.RSA:
      const sign = crypto.createSign('SHA256');
      sign.update(data);
      sign.end();
      return sign.sign(privateKey, 'base64');

    case KeyType.Ed25519:
      try {
        // For Ed25519, we use the crypto.sign method
        const privateKeyBuffer = crypto.createPrivateKey(privateKey);
        const signature = crypto.sign(null, Buffer.from(data), privateKeyBuffer);
        return signature.toString('base64');
      } catch (error) {
        logger.logError('Error signing data with Ed25519', error as Error);
        throw error;
      }

    default:
      throw new Error(`Unsupported key type for signing: ${actualKeyType}`);
  }
}

/**
 * Verifies a signature against data and a public key
 * @param data The data that was signed
 * @param signature The signature to verify
 * @param publicKey The public key to use for verification
 * @param keyType Optional key type (if not provided, will be auto-detected)
 * @returns True if the signature is valid, false otherwise
 */
export function verifySignature(data: string, signature: string, publicKey: string, keyType?: KeyType): boolean {
  try {
    // Auto-detect key type if not provided
    const actualKeyType = keyType || detectKeyType(publicKey);

    switch (actualKeyType) {
      case KeyType.RSA:
        const verify = crypto.createVerify('SHA256');
        verify.update(data);
        verify.end();
        return verify.verify(publicKey, signature, 'base64');

      case KeyType.Ed25519:
        try {
          // For Ed25519, we use the crypto.verify method
          const publicKeyBuffer = crypto.createPublicKey(publicKey);
          return crypto.verify(
            null,
            Buffer.from(data),
            publicKeyBuffer,
            Buffer.from(signature, 'base64')
          );
        } catch (error) {
          logger.logError('Error verifying Ed25519 signature', error as Error);
          return false;
        }

      default:
        logger.warn(`Unsupported key type for verification: ${actualKeyType}`);
        return false;
    }
  } catch (error) {
    logger.logError('Signature verification error', error as Error);
    return false;
  }
}

/**
 * Supported cryptosuites for data integrity proofs
 */
export enum Cryptosuite {
  RsaSha256 = 'rsa-sha256',
  Ed25519 = 'ed25519-2020',
  EddsaRdfc2022 = 'eddsa-rdfc-2022'
}

/**
 * Creates a verification object for an assertion
 * @param dataToSign The data to sign (typically a canonical representation of the assertion)
 * @param privateKey The private key to use for signing
 * @param keyType Optional key type (if not provided, will be auto-detected)
 * @param cryptosuite Optional cryptosuite to use (if not provided, will be determined from key type)
 * @param verificationMethodId Optional verification method ID (if not provided, will use default)
 * @returns A DataIntegrityProof object with the signature
 */
export function createVerification(
  dataToSign: string,
  privateKey: string,
  keyType?: KeyType,
  cryptosuite?: Cryptosuite,
  verificationMethodId?: string
): DataIntegrityProof {
  try {
    // Auto-detect key type if not provided
    const actualKeyType = keyType || detectKeyType(privateKey);

    // Determine cryptosuite based on key type if not provided
    let actualCryptosuite = cryptosuite;
    if (!actualCryptosuite) {
      switch (actualKeyType) {
        case KeyType.RSA:
          actualCryptosuite = Cryptosuite.RsaSha256;
          break;
        case KeyType.Ed25519:
          actualCryptosuite = Cryptosuite.Ed25519;
          break;
        default:
          throw new Error(`Unsupported key type for creating verification: ${actualKeyType}`);
      }
    }

    // Sign the data with the appropriate key type
    const signature = signData(dataToSign, privateKey, actualKeyType);

    // Determine verification method ID
    const methodId = verificationMethodId ||
      `${config.openBadges.baseUrl}/public-keys/default`;

    // Create the DataIntegrityProof object
    return {
      type: 'DataIntegrityProof',
      cryptosuite: actualCryptosuite,
      created: new Date().toISOString() as Shared.DateTime,
      proofPurpose: 'assertionMethod',
      verificationMethod: toIRI(methodId),
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

    // Determine key type based on cryptosuite
    let keyType: KeyType | undefined;
    if (proof.cryptosuite) {
      switch (proof.cryptosuite) {
        case Cryptosuite.RsaSha256:
          keyType = KeyType.RSA;
          break;
        case Cryptosuite.Ed25519:
        case Cryptosuite.EddsaRdfc2022:
          keyType = KeyType.Ed25519;
          break;
        default:
          // For unknown cryptosuites, we'll try to auto-detect the key type
          logger.warn(`Unknown cryptosuite: ${proof.cryptosuite}, attempting auto-detection`);
          break;
      }
    }

    // Verify the signature with the appropriate key type
    return verifySignature(dataToVerify, proof.proofValue, publicKey, keyType);
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
