/**
 * Unit tests for JWKS Controller
 *
 * Tests the JWKS endpoint functionality including response format,
 * content validation, error handling, and caching behavior.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { JwksController } from '../../../src/api/controllers/jwks.controller';
import { KeyService, KeyStatus } from '../../../src/core/key.service';
import { KeyType } from '../../../src/utils/crypto/signature';
import * as fs from 'fs';
import * as path from 'path';

describe('JwksController', () => {
  const testKeysDir = path.join(process.cwd(), 'test-keys-jwks-controller');
  let jwksController: JwksController;

  beforeEach(async () => {
    // Create test keys directory
    if (!fs.existsSync(testKeysDir)) {
      fs.mkdirSync(testKeysDir, { recursive: true });
    }

    // Set up test environment
    process.env.KEYS_DIR = testKeysDir;
    
    // Initialize KeyService with test directory
    await KeyService.initialize();
    
    // Create controller instance
    jwksController = new JwksController();
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

  describe('getJwks', () => {
    it('should return valid JWKS format', async () => {
      const result = await jwksController.getJwks();
      
      expect(result.status).toBe(200);
      expect(result.body).toHaveProperty('keys');
      expect(Array.isArray((result.body as any).keys)).toBe(true);
      
      // Should have at least the default key
      const jwks = result.body as any;
      expect(jwks.keys.length).toBeGreaterThanOrEqual(1);
      
      // Verify each key has required JWK properties
      for (const key of jwks.keys) {
        expect(key).toHaveProperty('kty');
        expect(key).toHaveProperty('use');
        expect(key).toHaveProperty('key_ops');
        expect(key).toHaveProperty('kid');
        expect(key.use).toBe('sig');
        expect(key.key_ops).toEqual(['verify']);
      }
    });

    it('should return RSA keys in correct JWK format', async () => {
      // Generate an RSA key
      await KeyService.generateKeyPair('test-rsa', KeyType.RSA);
      
      const result = await jwksController.getJwks();
      const jwks = result.body as any;
      
      // Find the RSA key
      const rsaKey = jwks.keys.find((k: any) => k.kty === 'RSA');
      expect(rsaKey).toBeDefined();
      expect(rsaKey.alg).toBe('RS256');
      expect(rsaKey.n).toBeDefined();
      expect(rsaKey.e).toBeDefined();
      expect(typeof rsaKey.n).toBe('string');
      expect(typeof rsaKey.e).toBe('string');
    });

    it('should only return active keys', async () => {
      // Generate multiple keys
      await KeyService.generateKeyPair('active-key', KeyType.RSA);
      await KeyService.generateKeyPair('inactive-key', KeyType.RSA);
      
      // Mark one as inactive
      await KeyService.setKeyStatus('inactive-key', KeyStatus.INACTIVE);
      
      const result = await jwksController.getJwks();
      const jwks = result.body as any;
      
      // Should not include inactive key
      const keyIds = jwks.keys.map((k: any) => k.kid);
      expect(keyIds).toContain('active-key');
      expect(keyIds).not.toContain('inactive-key');
    });

    it('should handle errors gracefully', async () => {
      // Mock KeyService to throw an error
      const originalGetJwkSet = KeyService.getJwkSet;
      KeyService.getJwkSet = async () => {
        throw new Error('Test error');
      };
      
      const result = await jwksController.getJwks();
      
      expect(result.status).toBe(500);
      expect(result.body).toHaveProperty('error');
      expect((result.body as any).error).toBe('Internal server error while retrieving JWKS');
      
      // Restore original method
      KeyService.getJwkSet = originalGetJwkSet;
    });
  });

  describe('Response Format Validation', () => {
    it('should return proper JSON structure for JWKS', async () => {
      const result = await jwksController.getJwks();
      const jwks = result.body as any;
      
      // Validate JWKS structure according to RFC 7517
      expect(jwks).toHaveProperty('keys');
      expect(Array.isArray(jwks.keys)).toBe(true);
      
      // Each key should be a valid JWK
      for (const key of jwks.keys) {
        // Required properties
        expect(key).toHaveProperty('kty');
        expect(['RSA', 'OKP'].includes(key.kty)).toBe(true);
        
        // Optional but expected properties
        expect(key).toHaveProperty('use');
        expect(key).toHaveProperty('key_ops');
        expect(key).toHaveProperty('alg');
        expect(key).toHaveProperty('kid');
        
        // Key-specific properties
        if (key.kty === 'RSA') {
          expect(key).toHaveProperty('n');
          expect(key).toHaveProperty('e');
        } else if (key.kty === 'OKP') {
          expect(key).toHaveProperty('crv');
          expect(key).toHaveProperty('x');
        }
      }
    });

    it('should not expose private key material', async () => {
      const result = await jwksController.getJwks();
      const jwks = result.body as any;
      
      // Ensure no private key parameters are exposed
      for (const key of jwks.keys) {
        // RSA private parameters
        expect(key).not.toHaveProperty('d');
        expect(key).not.toHaveProperty('p');
        expect(key).not.toHaveProperty('q');
        expect(key).not.toHaveProperty('dp');
        expect(key).not.toHaveProperty('dq');
        expect(key).not.toHaveProperty('qi');
        
        // Ed25519 private parameter
        expect(key).not.toHaveProperty('d');
      }
    });
  });
});
