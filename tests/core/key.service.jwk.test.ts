/**
 * Unit tests for KeyService JWK functionality
 *
 * Tests the JWK conversion, key rotation, and JWKS generation features
 * of the KeyService class.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { KeyService, KeyStatus, JsonWebKey } from '../../src/core/key.service';
import { KeyType } from '../../src/utils/crypto/signature';
import * as fs from 'fs';
import * as path from 'path';

describe('KeyService JWK Functionality', () => {
  const testKeysDir = path.join(process.cwd(), 'test-keys-jwk');

  beforeEach(async () => {
    // Create test keys directory
    if (!fs.existsSync(testKeysDir)) {
      fs.mkdirSync(testKeysDir, { recursive: true });
    }

    // Set up test environment
    process.env.KEYS_DIR = testKeysDir;
    
    // Initialize KeyService with test directory
    await KeyService.initialize();
  });

  afterEach(async () => {
    // Clean up test keys directory
    if (fs.existsSync(testKeysDir)) {
      const files = fs.readdirSync(testKeysDir);
      for (const file of files) {
        fs.unlinkSync(path.join(testKeysDir, file));
      }
      fs.rmdirSync(testKeysDir);
    }
  });

  describe('JWK Conversion', () => {
    it('should convert RSA public key to JWK format', async () => {
      // Generate an RSA key pair
      const keyPair = await KeyService.generateKeyPair('test-rsa', KeyType.RSA);
      
      // Convert to JWK
      const jwk = KeyService.convertPemToJwk(keyPair.publicKey, KeyType.RSA, 'test-rsa');
      
      // Verify JWK structure
      expect(jwk.kty).toBe('RSA');
      expect(jwk.use).toBe('sig');
      expect(jwk.key_ops).toEqual(['verify']);
      expect(jwk.alg).toBe('RS256');
      expect(jwk.kid).toBe('test-rsa');
      expect(jwk.n).toBeDefined();
      expect(jwk.e).toBeDefined();
      expect(typeof jwk.n).toBe('string');
      expect(typeof jwk.e).toBe('string');
    });

    it('should convert Ed25519 public key to JWK format', async () => {
      // Generate an Ed25519 key pair
      const keyPair = await KeyService.generateKeyPair('test-ed25519', KeyType.Ed25519);
      
      // Convert to JWK
      const jwk = KeyService.convertPemToJwk(keyPair.publicKey, KeyType.Ed25519, 'test-ed25519');
      
      // Verify JWK structure
      expect(jwk.kty).toBe('OKP');
      expect(jwk.use).toBe('sig');
      expect(jwk.key_ops).toEqual(['verify']);
      expect(jwk.alg).toBe('EdDSA');
      expect(jwk.kid).toBe('test-ed25519');
      expect(jwk.crv).toBe('Ed25519');
      expect(jwk.x).toBeDefined();
      expect(typeof jwk.x).toBe('string');
    });

    it('should throw error for unsupported key type', () => {
      const mockPublicKey = '-----BEGIN PUBLIC KEY-----\nMOCK\n-----END PUBLIC KEY-----';
      
      expect(() => {
        KeyService.convertPemToJwk(mockPublicKey, 'UNSUPPORTED' as KeyType, 'test');
      }).toThrow('Unsupported key type for JWK conversion');
    });
  });

  describe('JWKS Generation', () => {
    it('should generate JWKS with active keys only', async () => {
      // Generate multiple keys
      await KeyService.generateKeyPair('active-rsa', KeyType.RSA);
      await KeyService.generateKeyPair('active-ed25519', KeyType.Ed25519);
      const inactiveKey = await KeyService.generateKeyPair('inactive-rsa', KeyType.RSA);
      
      // Mark one key as inactive
      await KeyService.setKeyStatus('inactive-rsa', KeyStatus.INACTIVE);
      
      // Get JWKS
      const jwks = await KeyService.getJwkSet();
      
      // Should include default + 2 active keys (not the inactive one)
      expect(jwks.keys.length).toBe(3); // default + active-rsa + active-ed25519
      
      // Verify all keys are properly formatted
      for (const key of jwks.keys) {
        expect(key.kty).toBeDefined();
        expect(key.use).toBe('sig');
        expect(key.key_ops).toEqual(['verify']);
        expect(key.kid).toBeDefined();
      }
      
      // Verify inactive key is not included
      const keyIds = jwks.keys.map(k => k.kid);
      expect(keyIds).not.toContain('inactive-rsa');
    });

    it('should return empty JWKS when no active keys exist', async () => {
      // Mark default key as inactive
      await KeyService.setKeyStatus('default', KeyStatus.INACTIVE);
      
      // Get JWKS
      const jwks = await KeyService.getJwkSet();
      
      // Should be empty
      expect(jwks.keys.length).toBe(0);
    });
  });

  describe('Key Rotation', () => {
    it('should rotate a key successfully', async () => {
      // Generate a test key
      const originalKey = await KeyService.generateKeyPair('rotate-test', KeyType.RSA);
      
      // Rotate the key
      const newKey = await KeyService.rotateKey('rotate-test', KeyType.RSA);
      
      // Verify new key is different
      expect(newKey.publicKey).not.toBe(originalKey.publicKey);
      expect(newKey.privateKey).not.toBe(originalKey.privateKey);
      
      // Verify original key status
      const statusInfo = KeyService.getKeyStatusInfo();
      expect(statusInfo.get('rotate-test')?.status).toBe(KeyStatus.INACTIVE);
      
      // Verify new key exists and is active
      const newKeyId = `rotate-test-${expect.any(Number)}`;
      const newKeyExists = Array.from(statusInfo.keys()).some(id => 
        id.startsWith('rotate-test-') && statusInfo.get(id)?.status === KeyStatus.ACTIVE
      );
      expect(newKeyExists).toBe(true);
    });

    it('should handle default key rotation', async () => {
      const originalDefault = await KeyService.getDefaultPublicKey();
      
      // Rotate default key
      const newKey = await KeyService.rotateKey('default', KeyType.RSA);
      
      // Verify default key is updated
      const newDefault = await KeyService.getDefaultPublicKey();
      expect(newDefault).toBe(newKey.publicKey);
      expect(newDefault).not.toBe(originalDefault);
    });

    it('should throw error when rotating non-existent key', async () => {
      await expect(KeyService.rotateKey('non-existent')).rejects.toThrow(
        'Key with ID non-existent not found'
      );
    });
  });

  describe('Key Status Management', () => {
    it('should set key status correctly', async () => {
      // Generate a test key
      await KeyService.generateKeyPair('status-test', KeyType.RSA);
      
      // Set status to inactive
      await KeyService.setKeyStatus('status-test', KeyStatus.INACTIVE);
      
      // Verify status
      const statusInfo = KeyService.getKeyStatusInfo();
      expect(statusInfo.get('status-test')?.status).toBe(KeyStatus.INACTIVE);
    });

    it('should get comprehensive key status information', async () => {
      // Generate test keys
      await KeyService.generateKeyPair('test1', KeyType.RSA);
      await KeyService.generateKeyPair('test2', KeyType.Ed25519);
      
      // Set different statuses
      await KeyService.setKeyStatus('test1', KeyStatus.INACTIVE);
      await KeyService.setKeyStatus('test2', KeyStatus.REVOKED);
      
      // Get status info
      const statusInfo = KeyService.getKeyStatusInfo();
      
      // Verify information
      expect(statusInfo.size).toBeGreaterThanOrEqual(3); // default + test1 + test2
      expect(statusInfo.get('test1')?.status).toBe(KeyStatus.INACTIVE);
      expect(statusInfo.get('test2')?.status).toBe(KeyStatus.REVOKED);
      expect(statusInfo.get('default')?.status).toBe(KeyStatus.ACTIVE);
      
      // Verify metadata exists
      for (const [keyId, info] of statusInfo.entries()) {
        expect(info.metadata).toBeDefined();
        expect(info.metadata?.created).toBeDefined();
        expect(info.metadata?.keyType).toBeDefined();
      }
    });

    it('should throw error when setting status for non-existent key', async () => {
      await expect(KeyService.setKeyStatus('non-existent', KeyStatus.INACTIVE)).rejects.toThrow(
        'Key with ID non-existent not found'
      );
    });
  });
});
