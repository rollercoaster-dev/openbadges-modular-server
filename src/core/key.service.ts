/**
 * Service for managing key pairs and signatures
 *
 * This service handles the generation, storage, and retrieval of key pairs
 * for digital signatures in the Open Badges API.
 */

import { generateKeyPair, signData, verifySignature, KeyType, detectKeyType, Cryptosuite } from '../utils/crypto/signature';
import { logger } from '../utils/logging/logger.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * JSON Web Key (JWK) format as defined in RFC 7517
 */
export interface JsonWebKey {
  kty: string; // Key Type (e.g., 'RSA', 'OKP')
  use?: string; // Public Key Use (e.g., 'sig' for signature)
  key_ops?: string[]; // Key Operations
  alg?: string; // Algorithm
  kid?: string; // Key ID
  x5u?: string; // X.509 URL
  x5c?: string[]; // X.509 Certificate Chain
  x5t?: string; // X.509 Certificate SHA-1 Thumbprint
  'x5t#S256'?: string; // X.509 Certificate SHA-256 Thumbprint

  // RSA-specific parameters
  n?: string; // Modulus
  e?: string; // Exponent

  // Ed25519-specific parameters (OKP - Octet Key Pair)
  crv?: string; // Curve (e.g., 'Ed25519')
  x?: string; // The public key
}

/**
 * JSON Web Key Set (JWKS) format
 */
export interface JsonWebKeySet {
  keys: JsonWebKey[];
}

/**
 * Key status for rotation management
 */
export enum KeyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  REVOKED = 'revoked'
}

/**
 * Extended metadata for key management
 */
export interface KeyMetadata {
  keyType: KeyType;
  cryptosuite?: Cryptosuite;
  created: string;
  status: KeyStatus;
  rotatedAt?: string;
  expiresAt?: string;
}

// In-memory cache of key pairs
interface KeyPair {
  publicKey: string;
  privateKey: string;
  keyType: KeyType;
  cryptosuite?: Cryptosuite;
  status?: KeyStatus;
  metadata?: KeyMetadata;
}

let keyPairs: Map<string, KeyPair> = new Map();

/**
 * Key service class
 */
export class KeyService {
  // Path to store keys - initialized in initialize()
  private static KEYS_DIR: string | undefined;

  /**
   * Helper function to check if a file exists
   * @param filePath The path to the file
   * @returns True if the file exists, false otherwise
   */
  private static async fileExists(filePath: string): Promise<boolean> {
    return fs.promises.access(filePath).then(() => true).catch(() => false);
  }

  /**
   * Initializes the key service by loading or generating a default key pair
   */
  static async initialize(): Promise<void> {
    try {
      // Clear existing state for test isolation
      keyPairs.clear();

      // Define and ensure keys directory exists - respect KEYS_DIR env var
      KeyService.KEYS_DIR = process.env.KEYS_DIR
        ? path.resolve(process.env.KEYS_DIR)
        : path.join(process.cwd(), 'keys');
      const dirExists = await KeyService.fileExists(KeyService.KEYS_DIR);
      if (!dirExists) {
        await fs.promises.mkdir(KeyService.KEYS_DIR, { recursive: true });
      }

      // Try to load existing keys first
      await KeyService.loadKeys();

      // If no default key pair exists, generate one
      if (!keyPairs.has('default')) {
        const keyPairData = generateKeyPair();
        const metadata: KeyMetadata = {
          created: new Date().toISOString(),
          keyType: KeyType.RSA,
          cryptosuite: Cryptosuite.RsaSha256,
          status: KeyStatus.ACTIVE
        };
        const defaultKeyPair: KeyPair = {
          ...keyPairData,
          keyType: KeyType.RSA,
          cryptosuite: Cryptosuite.RsaSha256,
          metadata,
          status: KeyStatus.ACTIVE
        };
        keyPairs.set('default', defaultKeyPair);

        // Save the new key pair
        await KeyService.saveKeyPair('default', defaultKeyPair);

        logger.info('Generated and saved default RSA key pair');
      } else {
        logger.info('Loaded existing default key pair');
      }
    } catch (error) {
      logger.logError('Failed to initialize key service', error as Error);
      throw error;
    }
  }

  /**
   * Loads all key pairs from storage
   */
  private static async loadKeys(): Promise<void> {
    try {
      // Ensure KEYS_DIR is defined before proceeding
      if (!KeyService.KEYS_DIR) {
        throw new Error('KeyService not initialized. KEYS_DIR is undefined.');
      }

      // Check if default key pair exists
      const publicKeyPath = path.join(KeyService.KEYS_DIR, 'default.pub');
      const privateKeyPath = path.join(KeyService.KEYS_DIR, 'default.key');

      const publicKeyExists = await KeyService.fileExists(publicKeyPath);
      const privateKeyExists = await KeyService.fileExists(privateKeyPath);
      if (publicKeyExists && privateKeyExists) {
        // Load default key pair
        const publicKey = await fs.promises.readFile(publicKeyPath, 'utf8');
        const privateKey = await fs.promises.readFile(privateKeyPath, 'utf8');
        const metadataPath = path.join(KeyService.KEYS_DIR, 'default.meta.json');

        let keyType: KeyType;
        let cryptosuite: Cryptosuite;

        // Try to load metadata if it exists
        const metadataExists = await KeyService.fileExists(metadataPath);
        if (metadataExists) {
          try {
            const metadataContent = await fs.promises.readFile(metadataPath, 'utf8');
            const metadata = JSON.parse(metadataContent);
            keyType = metadata.keyType;
            cryptosuite = metadata.cryptosuite;
            logger.info('Loaded key metadata from file');
          } catch (error) {
            // If metadata file exists but can't be parsed, fall back to detection
            logger.warn('Failed to parse key metadata, falling back to detection');
            logger.logError('Metadata parsing error', error as Error);
            keyType = detectKeyType(publicKey);
            cryptosuite = keyType === KeyType.RSA ? Cryptosuite.RsaSha256 : Cryptosuite.Ed25519;
          }
        } else {
          // If no metadata file, detect key type from the loaded key
          keyType = detectKeyType(publicKey);

          // Determine cryptosuite based on key type
          switch (keyType) {
            case KeyType.RSA:
              cryptosuite = Cryptosuite.RsaSha256;
              break;
            case KeyType.Ed25519:
              cryptosuite = Cryptosuite.Ed25519;
              break;
            default:
              cryptosuite = Cryptosuite.RsaSha256; // Default fallback
          }

          // Create metadata file for future use
          try {
            const metadata = {
              keyType,
              cryptosuite,
              created: new Date().toISOString()
            };
            await fs.promises.writeFile(metadataPath, JSON.stringify(metadata, null, 2), { mode: 0o644 });
            logger.info('Created metadata file for existing key');
          } catch (error) {
            logger.warn('Failed to create metadata file for existing key');
            logger.logError('Metadata creation error', error as Error);
          }
        }

        // Create metadata for loaded key if it doesn't exist
        let metadata: KeyMetadata;
        if (metadataExists) {
          try {
            const metadataContent = await fs.promises.readFile(metadataPath, 'utf8');
            metadata = JSON.parse(metadataContent);
          } catch (_error) {
            // Fallback metadata
            metadata = {
              created: new Date().toISOString(),
              keyType,
              cryptosuite,
              status: KeyStatus.ACTIVE
            };
          }
        } else {
          metadata = {
            created: new Date().toISOString(),
            keyType,
            cryptosuite,
            status: KeyStatus.ACTIVE
          };
        }

        keyPairs.set('default', {
          publicKey,
          privateKey,
          keyType,
          cryptosuite,
          metadata,
          status: metadata.status || KeyStatus.ACTIVE
        });
      }

      // Load other key pairs from the keys directory
      const files = await fs.promises.readdir(KeyService.KEYS_DIR);
      const keyIds = new Set<string>();

      // Find all key IDs (files ending with .pub)
      for (const file of files) {
        if (file.endsWith('.pub') && file !== 'default.pub') {
          const keyId = file.replace('.pub', '');
          keyIds.add(keyId);
        }
      }

      // Load each key pair
      for (const keyId of keyIds) {
        const publicKeyPath = path.join(KeyService.KEYS_DIR, `${keyId}.pub`);
        const privateKeyPath = path.join(KeyService.KEYS_DIR, `${keyId}.key`);

        const publicKeyExists = await KeyService.fileExists(publicKeyPath);
        const privateKeyExists = await KeyService.fileExists(privateKeyPath);
        if (publicKeyExists && privateKeyExists) {
          const publicKey = await fs.promises.readFile(publicKeyPath, 'utf8');
          const privateKey = await fs.promises.readFile(privateKeyPath, 'utf8');
          const metadataPath = path.join(KeyService.KEYS_DIR, `${keyId}.meta.json`);

          let keyType: KeyType;
          let cryptosuite: Cryptosuite;

          // Try to load metadata if it exists
          const metadataExists = await KeyService.fileExists(metadataPath);
          if (metadataExists) {
            try {
              const metadataContent = await fs.promises.readFile(metadataPath, 'utf8');
              const metadata = JSON.parse(metadataContent);
              keyType = metadata.keyType;
              cryptosuite = metadata.cryptosuite;
              logger.info(`Loaded metadata for key: ${keyId}`);
            } catch (error) {
              // If metadata file exists but can't be parsed, fall back to detection
              logger.warn(`Failed to parse metadata for key: ${keyId}`);
              logger.logError('Metadata parsing error', error as Error);
              keyType = detectKeyType(publicKey);
              cryptosuite = keyType === KeyType.RSA ? Cryptosuite.RsaSha256 : Cryptosuite.Ed25519;
            }
          } else {
            // If no metadata file, detect key type from the loaded key
            keyType = detectKeyType(publicKey);

            // Determine cryptosuite based on key type
            switch (keyType) {
              case KeyType.RSA:
                cryptosuite = Cryptosuite.RsaSha256;
                break;
              case KeyType.Ed25519:
                cryptosuite = Cryptosuite.Ed25519;
                break;
              default:
                cryptosuite = Cryptosuite.RsaSha256; // Default fallback
            }

            // Create metadata file for future use
            try {
              const metadata = {
                keyType,
                cryptosuite,
                created: new Date().toISOString()
              };
              await fs.promises.writeFile(metadataPath, JSON.stringify(metadata, null, 2), { mode: 0o644 });
              logger.info(`Created metadata file for existing key: ${keyId}`);
            } catch (error) {
              logger.warn(`Failed to create metadata file for key: ${keyId}`);
              logger.logError('Metadata creation error', error as Error);
            }
          }

          // Create metadata for loaded key if it doesn't exist
          let metadata: KeyMetadata;
          if (metadataExists) {
            try {
              const metadataContent = await fs.promises.readFile(metadataPath, 'utf8');
              metadata = JSON.parse(metadataContent);
            } catch (_error) {
              // Fallback metadata
              metadata = {
                created: new Date().toISOString(),
                keyType,
                cryptosuite,
                status: KeyStatus.ACTIVE
              };
            }
          } else {
            metadata = {
              created: new Date().toISOString(),
              keyType,
              cryptosuite,
              status: KeyStatus.ACTIVE
            };
          }

          keyPairs.set(keyId, {
            publicKey,
            privateKey,
            keyType,
            cryptosuite,
            metadata,
            status: metadata.status || KeyStatus.ACTIVE
          });
        }
      }
    } catch (error) {
      logger.logError('Failed to load keys', error as Error);
      throw error;
    }
  }

  /**
   * Saves a key pair to storage
   * @param id The ID of the key pair
   * @param keyPair The key pair to save
   */
  private static async saveKeyPair(id: string, keyPair: KeyPair): Promise<void> {
    try {
      // Ensure KEYS_DIR is defined before proceeding
      if (!KeyService.KEYS_DIR) {
        throw new Error('KeyService not initialized. KEYS_DIR is undefined.');
      }

      const publicKeyPath = path.join(KeyService.KEYS_DIR, `${id}.pub`);
      const privateKeyPath = path.join(KeyService.KEYS_DIR, `${id}.key`);
      const metadataPath = path.join(KeyService.KEYS_DIR, `${id}.meta.json`);

      // Save public key
      await fs.promises.writeFile(publicKeyPath, keyPair.publicKey, { mode: 0o644 }); // Read by all, write by owner

      // Save private key with restricted permissions
      await fs.promises.writeFile(privateKeyPath, keyPair.privateKey, { mode: 0o600 }); // Read/write by owner only

      // Save metadata (key type, cryptosuite, and status)
      const metadata: KeyMetadata = {
        keyType: keyPair.keyType,
        cryptosuite: keyPair.cryptosuite,
        created: keyPair.metadata?.created || new Date().toISOString(),
        status: keyPair.status || KeyStatus.ACTIVE,
        rotatedAt: keyPair.metadata?.rotatedAt,
        expiresAt: keyPair.metadata?.expiresAt
      };
      await fs.promises.writeFile(metadataPath, JSON.stringify(metadata, null, 2), { mode: 0o644 });

      logger.info(`Saved key pair with ID: ${id} (${keyPair.keyType})`);
    } catch (error) {
      logger.logError(`Failed to save key pair with ID: ${id}`, error as Error);
      throw error;
    }
  }

  /**
   * Gets the default public key
   * @returns The default public key
   */
  static async getDefaultPublicKey(): Promise<string> {
    const keyPair = keyPairs.get('default');
    if (!keyPair) {
      throw new Error('Default key pair not found');
    }
    return keyPair.publicKey;
  }

  /**
   * Gets the default private key
   * @returns The default private key
   */
  static async getDefaultPrivateKey(): Promise<string> {
    const keyPair = keyPairs.get('default');
    if (!keyPair) {
      throw new Error('Default key pair not found');
    }
    return keyPair.privateKey;
  }

  /**
   * Signs data using the default private key
   * @param data The data to sign
   * @returns The signature
   */
  static async signWithDefaultKey(data: string): Promise<string> {
    const keyPair = keyPairs.get('default');
    if (!keyPair) {
      throw new Error('Default key pair not found');
    }
    return signData(data, keyPair.privateKey, keyPair.keyType);
  }

  /**
   * Verifies a signature using the default public key
   * @param data The data that was signed
   * @param signature The signature to verify
   * @returns True if the signature is valid, false otherwise
   */
  static async verifyWithDefaultKey(data: string, signature: string): Promise<boolean> {
    const keyPair = keyPairs.get('default');
    if (!keyPair) {
      throw new Error('Default key pair not found');
    }
    return verifySignature(data, signature, keyPair.publicKey, keyPair.keyType);
  }

  /**
   * Checks if a specific key ID (other than 'default') exists in the loaded key pairs.
   * @param id The ID of the key pair to check.
   * @returns True if the key ID exists, false otherwise.
   */
  static async keyExists(id: string): Promise<boolean> {
    if (id === 'default') {
      // 'default' key is handled by getPublicKey/getPrivateKey which ensure it's loaded or generated.
      // This method is for checking existence of *specific, non-default* keys.
      // The 'default' key is always assumed to exist or be creatable by initialize().
      return true;
    }

    // First check in-memory cache
    if (keyPairs.has(id)) {
      return true;
    }

    // If not in memory, check if the key files exist on disk
    if (!KeyService.KEYS_DIR) {
      throw new Error('KeyService not initialized. KEYS_DIR is undefined.');
    }

    const publicKeyPath = path.join(KeyService.KEYS_DIR, `${id}.pub`);
    const privateKeyPath = path.join(KeyService.KEYS_DIR, `${id}.key`);

    const publicKeyExists = await KeyService.fileExists(publicKeyPath);
    const privateKeyExists = await KeyService.fileExists(privateKeyPath);

    return publicKeyExists && privateKeyExists;
  }

  /**
   * Generates a new key pair with the given ID
   * @param id The ID for the new key pair
   * @param keyType The type of key to generate (defaults to RSA)
   * @returns The generated key pair
   */
  static async generateKeyPair(id: string, keyType: KeyType = KeyType.RSA): Promise<KeyPair> {
    try {
      // Generate the key pair with the specified type
      const keyPairData = generateKeyPair(keyType);

      // Determine cryptosuite based on key type
      let cryptosuite: Cryptosuite;
      switch (keyType) {
        case KeyType.RSA:
          cryptosuite = Cryptosuite.RsaSha256;
          break;
        case KeyType.Ed25519:
          cryptosuite = Cryptosuite.Ed25519;
          break;
        default:
          cryptosuite = Cryptosuite.RsaSha256; // Default fallback
      }

      // Attach initial metadata
      const metadata: KeyMetadata = {
        created: new Date().toISOString(),
        keyType,
        cryptosuite,
        status: KeyStatus.ACTIVE
      };

      // Create the full key pair object
      const keyPair: KeyPair = {
        ...keyPairData,
        keyType,
        cryptosuite,
        metadata,
        status: KeyStatus.ACTIVE
      };

      // Store in memory
      keyPairs.set(id, keyPair);

      // Save the new key pair
      await KeyService.saveKeyPair(id, keyPair);

      return keyPair;
    } catch (error) {
      logger.logError(`Failed to generate key pair with ID: ${id}`, error as Error);
      throw error;
    }
  }

  /**
   * Gets a public key by ID
   *
   * This method retrieves the public key associated with the given ID. If the key pair
   * is not found in memory, it attempts to load the public key from storage.
   *
   * @param id The ID of the key pair
   * @returns A promise that resolves to the public key as a string
   */
  static async getPublicKey(id: string): Promise<string> {
    const keyPair = keyPairs.get(id);
    if (!keyPair) {
      // Ensure KEYS_DIR is defined before proceeding
      if (!KeyService.KEYS_DIR) {
        throw new Error('KeyService not initialized. KEYS_DIR is undefined.');
      }

      // Try to load the key from storage
      const publicKeyPath = path.join(KeyService.KEYS_DIR, `${id}.pub`);
      const publicKeyExists = await KeyService.fileExists(publicKeyPath);
      if (publicKeyExists) {
        return await fs.promises.readFile(publicKeyPath, 'utf8');
      }
      throw new Error(`Key pair with ID ${id} not found`);
    }
    return keyPair.publicKey;
  }

  /**
   * Gets a private key by ID
   *
   * This method retrieves the private key associated with the given ID. If the key pair
   * is not found in memory, it attempts to load the private key from storage.
   *
   * @param id The ID of the key pair
   * @returns A promise that resolves to the private key as a string
   */
  static async getPrivateKey(id: string): Promise<string> {
    const keyPair = keyPairs.get(id);
    if (!keyPair) {
      // Ensure KEYS_DIR is defined before proceeding
      if (!KeyService.KEYS_DIR) {
        throw new Error('KeyService not initialized. KEYS_DIR is undefined.');
      }

      // Try to load the key from storage
      const privateKeyPath = path.join(KeyService.KEYS_DIR, `${id}.key`);
      const privateKeyExists = await KeyService.fileExists(privateKeyPath);
      if (privateKeyExists) {
        return await fs.promises.readFile(privateKeyPath, 'utf8');
      }
      throw new Error(`Key pair with ID ${id} not found`);
    }
    return keyPair.privateKey;
  }

  /**
   * Lists all available key IDs
   * @returns Array of key IDs
   */
  static listKeyIds(): string[] {
    return Array.from(keyPairs.keys());
  }

  /**
   * Deletes a key pair by ID
   * @param id The ID of the key pair to delete
   * @returns True if the key pair was deleted, false otherwise
   */
  static async deleteKeyPair(id: string): Promise<boolean> {
    try {
      // Ensure KEYS_DIR is defined before proceeding
      if (!KeyService.KEYS_DIR) {
        throw new Error('KeyService not initialized. KEYS_DIR is undefined.');
      }

      // Don't allow deleting the default key pair
      if (id === 'default') {
        throw new Error('Cannot delete the default key pair');
      }

      // Remove from memory
      const removed = keyPairs.delete(id);

      // Remove from storage
      const publicKeyPath = path.join(KeyService.KEYS_DIR, `${id}.pub`);
      const privateKeyPath = path.join(KeyService.KEYS_DIR, `${id}.key`);

      const publicKeyExists = await KeyService.fileExists(publicKeyPath);
      if (publicKeyExists) {
        await fs.promises.unlink(publicKeyPath);
      }

      const privateKeyExists = await KeyService.fileExists(privateKeyPath);
      if (privateKeyExists) {
        await fs.promises.unlink(privateKeyPath);
      }

      return removed;
    } catch (error) {
      logger.logError(`Failed to delete key pair with ID: ${id}`, error as Error);
      throw error;
    }
  }

  /**
   * Rotates a key by marking it as inactive and generating a new active key
   * @param keyId The ID of the key to rotate
   * @param newKeyType The type of the new key (defaults to same as old key)
   * @returns The new key pair
   */
  static async rotateKey(keyId: string, newKeyType?: KeyType): Promise<KeyPair> {
    try {
      const existingKeyPair = keyPairs.get(keyId);
      if (!existingKeyPair) {
        throw new Error(`Key with ID ${keyId} not found`);
      }

      // Mark the existing key as inactive
      existingKeyPair.status = KeyStatus.INACTIVE;
      existingKeyPair.metadata = {
        ...existingKeyPair.metadata,
        keyType: existingKeyPair.keyType,
        cryptosuite: existingKeyPair.cryptosuite,
        created: existingKeyPair.metadata?.created || new Date().toISOString(),
        status: KeyStatus.INACTIVE,
        rotatedAt: new Date().toISOString()
      } as KeyMetadata;

      // Save the updated metadata for the old key
      await KeyService.saveKeyPair(keyId, existingKeyPair);

      // Generate a new key with the same ID (or create a new timestamped ID)
      const rotatedKeyId = `${keyId}-${Date.now()}`;
      const keyType = newKeyType || existingKeyPair.keyType;
      const newKeyPair = await KeyService.generateKeyPair(rotatedKeyId, keyType);

      // If this was the default key, update the default to point to the new key
      if (keyId === 'default') {
        // Simply repoint the in-memory alias; no extra disk copy.
        keyPairs.set('default', newKeyPair);
      }

      logger.info(`Key rotated successfully`, {
        oldKeyId: keyId,
        newKeyId: rotatedKeyId,
        keyType: keyType
      });

      return newKeyPair;
    } catch (error) {
      logger.logError(`Failed to rotate key ${keyId}`, error as Error);
      throw error;
    }
  }

  /**
   * Sets the status of a key
   * @param keyId The ID of the key
   * @param status The new status
   */
  static async setKeyStatus(keyId: string, status: KeyStatus): Promise<void> {
    try {
      const keyPair = keyPairs.get(keyId);
      if (!keyPair) {
        throw new Error(`Key with ID ${keyId} not found`);
      }

      keyPair.status = status;
      keyPair.metadata = {
        ...keyPair.metadata,
        keyType: keyPair.keyType,
        cryptosuite: keyPair.cryptosuite,
        created: keyPair.metadata?.created || new Date().toISOString(),
        status: status,
        rotatedAt: keyPair.metadata?.rotatedAt
      } as KeyMetadata;

      await KeyService.saveKeyPair(keyId, keyPair);

      logger.info(`Key status updated`, {
        keyId,
        status
      });
    } catch (error) {
      logger.logError(`Failed to set key status for ${keyId}`, error as Error);
      throw error;
    }
  }

  /**
   * Gets all keys with their status information
   * @returns Map of key IDs to their status and metadata
   */
  static getKeyStatusInfo(): Map<string, { status: KeyStatus; metadata?: KeyMetadata }> {
    const statusInfo = new Map<string, { status: KeyStatus; metadata?: KeyMetadata }>();

    for (const [keyId, keyPair] of keyPairs.entries()) {
      statusInfo.set(keyId, {
        status: keyPair.status || KeyStatus.ACTIVE,
        metadata: keyPair.metadata
      });
    }

    return statusInfo;
  }

  /**
   * Converts a PEM public key to JWK format
   * @param publicKeyPem The PEM-formatted public key
   * @param keyType The type of the key
   * @param keyId The key identifier
   * @returns The JWK representation of the public key
   */
  static convertPemToJwk(publicKeyPem: string, keyType: KeyType, keyId: string): JsonWebKey {
    try {
      const publicKeyObject = crypto.createPublicKey(publicKeyPem);

      switch (keyType) {
        case KeyType.RSA: {
          const keyDetails = publicKeyObject.export({ format: 'jwk' }) as { n: string; e: string };
          return {
            kty: 'RSA',
            use: 'sig',
            key_ops: ['verify'],
            alg: 'RS256',
            kid: keyId,
            n: keyDetails.n,
            e: keyDetails.e
          };
        }

        case KeyType.Ed25519: {
          const keyDetails = publicKeyObject.export({ format: 'jwk' }) as { x: string };
          return {
            kty: 'OKP',
            use: 'sig',
            key_ops: ['verify'],
            alg: 'EdDSA',
            kid: keyId,
            crv: 'Ed25519',
            x: keyDetails.x
          };
        }

        default:
          throw new Error(`Unsupported key type for JWK conversion: ${keyType}`);
      }
    } catch (error) {
      logger.logError(`Failed to convert PEM to JWK for key ${keyId}`, error as Error);
      throw error;
    }
  }

  /**
   * Gets all active public keys in JWK format
   * @returns Array of JWKs for active keys
   */
  static async getActivePublicKeysAsJwk(): Promise<JsonWebKey[]> {
    const jwks: JsonWebKey[] = [];

    for (const [keyId, keyPair] of keyPairs.entries()) {
      // Only include active keys (default to active if status not set)
      if (!keyPair.status || keyPair.status === KeyStatus.ACTIVE) {
        try {
          const jwk = KeyService.convertPemToJwk(keyPair.publicKey, keyPair.keyType, keyId);
          jwks.push(jwk);
        } catch (error) {
          logger.warn(`Failed to convert key ${keyId} to JWK, skipping`, {
            keyId,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }

    return jwks;
  }

  /**
   * Gets the complete JWKS (JSON Web Key Set)
   * @returns The JWKS containing all active public keys
   */
  static async getJwkSet(): Promise<JsonWebKeySet> {
    const keys = await KeyService.getActivePublicKeysAsJwk();
    return { keys };
  }
}
