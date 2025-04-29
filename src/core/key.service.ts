/**
 * Service for managing key pairs and signatures
 *
 * This service handles the generation, storage, and retrieval of key pairs
 * for digital signatures in the Open Badges API.
 */

import { generateKeyPair, signData, verifySignature } from '../utils/crypto/signature';
import { logger } from '../utils/logging/logger.service';
import * as fs from 'fs';
import * as path from 'path';

// In-memory cache of key pairs
let keyPairs: Map<string, { publicKey: string; privateKey: string }> = new Map();

// Path to store keys
const KEYS_DIR = path.join(process.cwd(), 'keys');
const DEFAULT_KEY_PATH = path.join(KEYS_DIR, 'default');

// Ensure keys directory exists
if (!fs.existsSync(KEYS_DIR)) {
  fs.mkdirSync(KEYS_DIR, { recursive: true });
}

export class KeyService {
  /**
   * Initializes the key service by loading or generating a default key pair
   */
  static async initialize(): Promise<void> {
    try {
      // Try to load existing keys first
      await this.loadKeys();

      // If no default key pair exists, generate one
      if (!keyPairs.has('default')) {
        const defaultKeyPair = generateKeyPair();
        keyPairs.set('default', defaultKeyPair);

        // Save the new key pair
        await this.saveKeyPair('default', defaultKeyPair);

        logger.info('Generated and saved default key pair');
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
      // Check if default key pair exists
      const publicKeyPath = `${DEFAULT_KEY_PATH}.pub`;
      const privateKeyPath = `${DEFAULT_KEY_PATH}.key`;

      if (fs.existsSync(publicKeyPath) && fs.existsSync(privateKeyPath)) {
        // Load default key pair
        const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
        const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

        keyPairs.set('default', { publicKey, privateKey });
      }

      // Load other key pairs from the keys directory
      const files = fs.readdirSync(KEYS_DIR);
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
        const publicKeyPath = path.join(KEYS_DIR, `${keyId}.pub`);
        const privateKeyPath = path.join(KEYS_DIR, `${keyId}.key`);

        if (fs.existsSync(publicKeyPath) && fs.existsSync(privateKeyPath)) {
          const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
          const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

          keyPairs.set(keyId, { publicKey, privateKey });
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
  private static async saveKeyPair(id: string, keyPair: { publicKey: string; privateKey: string }): Promise<void> {
    try {
      const publicKeyPath = path.join(KEYS_DIR, `${id}.pub`);
      const privateKeyPath = path.join(KEYS_DIR, `${id}.key`);

      // Save public key
      fs.writeFileSync(publicKeyPath, keyPair.publicKey, { mode: 0o644 }); // Read by all, write by owner

      // Save private key with restricted permissions
      fs.writeFileSync(privateKeyPath, keyPair.privateKey, { mode: 0o600 }); // Read/write by owner only

      logger.info(`Saved key pair with ID: ${id}`);
    } catch (error) {
      logger.logError(`Failed to save key pair with ID: ${id}`, error as Error);
      throw error;
    }
  }

  /**
   * Gets the default public key
   * @returns The default public key
   */
  static getDefaultPublicKey(): string {
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
  static getDefaultPrivateKey(): string {
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
  static signWithDefaultKey(data: string): string {
    const privateKey = this.getDefaultPrivateKey();
    return signData(data, privateKey);
  }

  /**
   * Verifies a signature using the default public key
   * @param data The data that was signed
   * @param signature The signature to verify
   * @returns True if the signature is valid, false otherwise
   */
  static verifyWithDefaultKey(data: string, signature: string): boolean {
    const publicKey = this.getDefaultPublicKey();
    return verifySignature(data, signature, publicKey);
  }

  /**
   * Generates a new key pair with the given ID
   * @param id The ID for the new key pair
   * @returns The generated key pair
   */
  static async generateKeyPair(id: string): Promise<{ publicKey: string; privateKey: string }> {
    try {
      const keyPair = generateKeyPair();
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
  static getPublicKey(id: string): string {
    const keyPair = keyPairs.get(id);
    if (!keyPair) {
      // Try to load the key from storage
      const publicKeyPath = path.join(KEYS_DIR, `${id}.pub`);
      if (fs.existsSync(publicKeyPath)) {
        return fs.readFileSync(publicKeyPath, 'utf8');
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
  static getPrivateKey(id: string): string {
    const keyPair = keyPairs.get(id);
    if (!keyPair) {
      // Try to load the key from storage
      const privateKeyPath = path.join(KEYS_DIR, `${id}.key`);
      if (fs.existsSync(privateKeyPath)) {
        return fs.readFileSync(privateKeyPath, 'utf8');
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
      // Don't allow deleting the default key pair
      if (id === 'default') {
        throw new Error('Cannot delete the default key pair');
      }

      // Remove from memory
      const removed = keyPairs.delete(id);

      // Remove from storage
      const publicKeyPath = path.join(KEYS_DIR, `${id}.pub`);
      const privateKeyPath = path.join(KEYS_DIR, `${id}.key`);

      if (fs.existsSync(publicKeyPath)) {
        fs.unlinkSync(publicKeyPath);
      }

      if (fs.existsSync(privateKeyPath)) {
        fs.unlinkSync(privateKeyPath);
      }

      return removed;
    } catch (error) {
      logger.logError(`Failed to delete key pair with ID: ${id}`, error as Error);
      throw error;
    }
  }
}
