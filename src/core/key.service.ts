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

// In-memory cache of key pairs
interface KeyPair {
  publicKey: string;
  privateKey: string;
  keyType: KeyType;
  cryptosuite?: Cryptosuite;
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
      // Define and ensure keys directory exists
      this.KEYS_DIR = path.join(process.cwd(), 'keys');
      const dirExists = await this.fileExists(this.KEYS_DIR);
      if (!dirExists) {
        await fs.promises.mkdir(this.KEYS_DIR, { recursive: true });
      }

      // Try to load existing keys first
      await this.loadKeys();

      // If no default key pair exists, generate one
      if (!keyPairs.has('default')) {
        const keyPairData = generateKeyPair();
        const defaultKeyPair: KeyPair = {
          ...keyPairData,
          keyType: KeyType.RSA,
          cryptosuite: Cryptosuite.RsaSha256
        };
        keyPairs.set('default', defaultKeyPair);

        // Save the new key pair
        await this.saveKeyPair('default', defaultKeyPair);

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
      if (!this.KEYS_DIR) {
        throw new Error('KeyService not initialized. KEYS_DIR is undefined.');
      }

      // Check if default key pair exists
      const publicKeyPath = path.join(this.KEYS_DIR, 'default.pub');
      const privateKeyPath = path.join(this.KEYS_DIR, 'default.key');

      const publicKeyExists = await this.fileExists(publicKeyPath);
      const privateKeyExists = await this.fileExists(privateKeyPath);
      if (publicKeyExists && privateKeyExists) {
        // Load default key pair
        const publicKey = await fs.promises.readFile(publicKeyPath, 'utf8');
        const privateKey = await fs.promises.readFile(privateKeyPath, 'utf8');
        const metadataPath = path.join(this.KEYS_DIR, 'default.meta.json');

        let keyType: KeyType;
        let cryptosuite: Cryptosuite;

        // Try to load metadata if it exists
        const metadataExists = await this.fileExists(metadataPath);
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

        keyPairs.set('default', {
          publicKey,
          privateKey,
          keyType,
          cryptosuite
        });
      }

      // Load other key pairs from the keys directory
      const files = await fs.promises.readdir(this.KEYS_DIR);
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
        const publicKeyPath = path.join(this.KEYS_DIR, `${keyId}.pub`);
        const privateKeyPath = path.join(this.KEYS_DIR, `${keyId}.key`);

        const publicKeyExists = await this.fileExists(publicKeyPath);
        const privateKeyExists = await this.fileExists(privateKeyPath);
        if (publicKeyExists && privateKeyExists) {
          const publicKey = await fs.promises.readFile(publicKeyPath, 'utf8');
          const privateKey = await fs.promises.readFile(privateKeyPath, 'utf8');
          const metadataPath = path.join(this.KEYS_DIR, `${keyId}.meta.json`);

          let keyType: KeyType;
          let cryptosuite: Cryptosuite;

          // Try to load metadata if it exists
          const metadataExists = await this.fileExists(metadataPath);
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

          keyPairs.set(keyId, {
            publicKey,
            privateKey,
            keyType,
            cryptosuite
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
      if (!this.KEYS_DIR) {
        throw new Error('KeyService not initialized. KEYS_DIR is undefined.');
      }

      const publicKeyPath = path.join(this.KEYS_DIR, `${id}.pub`);
      const privateKeyPath = path.join(this.KEYS_DIR, `${id}.key`);
      const metadataPath = path.join(this.KEYS_DIR, `${id}.meta.json`);

      // Save public key
      await fs.promises.writeFile(publicKeyPath, keyPair.publicKey, { mode: 0o644 }); // Read by all, write by owner

      // Save private key with restricted permissions
      await fs.promises.writeFile(privateKeyPath, keyPair.privateKey, { mode: 0o600 }); // Read/write by owner only

      // Save metadata (key type and cryptosuite)
      const metadata = {
        keyType: keyPair.keyType,
        cryptosuite: keyPair.cryptosuite,
        created: new Date().toISOString()
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
    if (!this.KEYS_DIR) {
      throw new Error('KeyService not initialized. KEYS_DIR is undefined.');
    }

    const publicKeyPath = path.join(this.KEYS_DIR, `${id}.pub`);
    const privateKeyPath = path.join(this.KEYS_DIR, `${id}.key`);

    const publicKeyExists = await this.fileExists(publicKeyPath);
    const privateKeyExists = await this.fileExists(privateKeyPath);

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

      // Create the full key pair object
      const keyPair: KeyPair = {
        ...keyPairData,
        keyType,
        cryptosuite
      };

      // Store in memory
      keyPairs.set(id, keyPair);

      // Save the new key pair
      await this.saveKeyPair(id, keyPair);

      return keyPair;
    } catch (error) {
      logger.logError(`Failed to generate key pair with ID: ${id}`, error as Error);
      throw error;
    }
  }

  /**
   * Gets a public key by ID
   * @param id The ID of the key pair
   * @returns The public key
   */
  static async getPublicKey(id: string): Promise<string> {
    const keyPair = keyPairs.get(id);
    if (!keyPair) {
      // Ensure KEYS_DIR is defined before proceeding
      if (!this.KEYS_DIR) {
        throw new Error('KeyService not initialized. KEYS_DIR is undefined.');
      }

      // Try to load the key from storage
      const publicKeyPath = path.join(this.KEYS_DIR, `${id}.pub`);
      const publicKeyExists = await this.fileExists(publicKeyPath);
      if (publicKeyExists) {
        return await fs.promises.readFile(publicKeyPath, 'utf8');
      }
      throw new Error(`Key pair with ID ${id} not found`);
    }
    return keyPair.publicKey;
  }

  /**
   * Gets a private key by ID
   * @param id The ID of the key pair
   * @returns The private key
   */
  static async getPrivateKey(id: string): Promise<string> {
    const keyPair = keyPairs.get(id);
    if (!keyPair) {
      // Ensure KEYS_DIR is defined before proceeding
      if (!this.KEYS_DIR) {
        throw new Error('KeyService not initialized. KEYS_DIR is undefined.');
      }

      // Try to load the key from storage
      const privateKeyPath = path.join(this.KEYS_DIR, `${id}.key`);
      const privateKeyExists = await this.fileExists(privateKeyPath);
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
      if (!this.KEYS_DIR) {
        throw new Error('KeyService not initialized. KEYS_DIR is undefined.');
      }

      // Don't allow deleting the default key pair
      if (id === 'default') {
        throw new Error('Cannot delete the default key pair');
      }

      // Remove from memory
      const removed = keyPairs.delete(id);

      // Remove from storage
      const publicKeyPath = path.join(this.KEYS_DIR, `${id}.pub`);
      const privateKeyPath = path.join(this.KEYS_DIR, `${id}.key`);

      const publicKeyExists = await this.fileExists(publicKeyPath);
      if (publicKeyExists) {
        await fs.promises.unlink(publicKeyPath);
      }

      const privateKeyExists = await this.fileExists(privateKeyPath);
      if (privateKeyExists) {
        await fs.promises.unlink(privateKeyPath);
      }

      return removed;
    } catch (error) {
      logger.logError(`Failed to delete key pair with ID: ${id}`, error as Error);
      throw error;
    }
  }
}
