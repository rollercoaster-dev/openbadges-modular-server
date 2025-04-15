/**
 * Service for managing key pairs and signatures
 *
 * This service handles the generation, storage, and retrieval of key pairs
 * for digital signatures in the Open Badges API.
 */

import { generateKeyPair, signData, verifySignature } from '../utils/crypto/signature';

// In a production environment, these would be stored in a secure database
// For this implementation, we'll use in-memory storage
let keyPairs: Map<string, { publicKey: string; privateKey: string }> = new Map();

export class KeyService {
  /**
   * Initializes the key service by generating a default key pair if none exists
   */
  static async initialize(): Promise<void> {
    if (keyPairs.size === 0) {
      const defaultKeyPair = generateKeyPair();
      keyPairs.set('default', defaultKeyPair);
      console.log('Generated default key pair');
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
  static generateKeyPair(id: string): { publicKey: string; privateKey: string } {
    const keyPair = generateKeyPair();
    keyPairs.set(id, keyPair);
    return keyPair;
  }

  /**
   * Gets a public key by ID
   * @param id The ID of the key pair
   * @returns The public key
   */
  static getPublicKey(id: string): string {
    const keyPair = keyPairs.get(id);
    if (!keyPair) {
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
      throw new Error(`Key pair with ID ${id} not found`);
    }
    return keyPair.privateKey;
  }
}
