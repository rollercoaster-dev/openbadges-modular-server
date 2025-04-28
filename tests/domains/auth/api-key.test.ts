/**
 * API Key Tests
 *
 * This file contains tests for the API Key entity and repository.
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { ApiKey } from '../../../src/domains/auth/apiKey.entity';
import { RepositoryFactory } from '../../../src/infrastructure/repository.factory';
import { ApiKeyRepository } from '../../../src/domains/auth/apiKey.repository';
import { config } from '../../../src/config/config';
import { runMigrations } from '../../../src/infrastructure/database/migrations';

describe('API Key', () => {
  // Test the API Key entity
  describe('Entity', () => {
    test('should create a new API Key', () => {
      const apiKey = ApiKey.create({
        name: 'Test API Key',
        userId: 'test-user',
        description: 'Test API Key description',
        permissions: {
          roles: ['user'],
          permissions: ['read:badges']
        }
      });

      expect(apiKey).toBeDefined();
      expect(apiKey.id).toBeDefined();
      expect(apiKey.key).toBeDefined();
      expect(apiKey.name).toBe('Test API Key');
      expect(apiKey.userId).toBe('test-user');
      expect(apiKey.description).toBe('Test API Key description');
      expect(apiKey.permissions).toEqual({
        roles: ['user'],
        permissions: ['read:badges']
      });
      expect(apiKey.revoked).toBe(false);
      expect(apiKey.createdAt).toBeInstanceOf(Date);
      expect(apiKey.updatedAt).toBeInstanceOf(Date);
    });

    test('should check if an API Key is valid', () => {
      const apiKey = ApiKey.create({
        name: 'Test API Key',
        userId: 'test-user'
      });

      expect(apiKey.isValid()).toBe(true);

      // Test with an expired API Key
      const expiredApiKey = ApiKey.create({
        name: 'Expired API Key',
        userId: 'test-user',
        expiresAt: new Date(Date.now() - 1000) // 1 second ago
      });

      expect(expiredApiKey.isValid()).toBe(false);

      // Test with a revoked API Key
      const revokedApiKey = ApiKey.create({
        name: 'Revoked API Key',
        userId: 'test-user'
      });

      revokedApiKey.revoke();

      expect(revokedApiKey.isValid()).toBe(false);
    });

    test('should update the last used timestamp', () => {
      const apiKey = ApiKey.create({
        name: 'Test API Key',
        userId: 'test-user'
      });

      // Store the original values
      const originalLastUsedAt = apiKey.lastUsedAt;

      // Update the last used timestamp
      apiKey.updateLastUsed();

      // Check that the last used timestamp is updated
      expect(originalLastUsedAt).toBeUndefined();
      expect(apiKey.lastUsedAt).toBeDefined();
    });

    test('should revoke an API Key', () => {
      const apiKey = ApiKey.create({
        name: 'Test API Key',
        userId: 'test-user'
      });

      // Store the original values
      const originalRevoked = apiKey.revoked;

      // Revoke the API key
      apiKey.revoke();

      // Check that the API key is now revoked
      expect(originalRevoked).toBe(false);
      expect(apiKey.revoked).toBe(true);
    });
  });

  // TODO: Add repository tests once the database migration is fixed
  // For now, we'll just test the entity
});
