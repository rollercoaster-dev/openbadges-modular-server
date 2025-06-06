/**
 * Tests for Database Synchronization Helper
 * 
 * These tests verify that our database synchronization utilities work correctly
 * and provide better alternatives to setTimeout-based approaches.
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { 
  ensureDatabaseSync, 
  ensureTransactionCommitted,
  retryWithBackoff,
  pollUntilCondition 
} from './database-sync.helper';
import { RepositoryFactory } from '@/infrastructure/repository.factory';
import { User } from '@/domains/user/user.entity';
import { UserRole } from '@/domains/user/user.entity';
import { createOrGenerateIRI } from '@/utils/types/type-utils';
import { logger } from '@/utils/logging/logger.service';

describe('Database Synchronization Helper', () => {
  beforeAll(async () => {
    // Initialize repository factory for testing
    try {
      await RepositoryFactory.initialize({
        type: 'sqlite',
        connectionString: '', // Empty string for SQLite as it uses sqliteFile
        sqliteFile: ':memory:',
      });
      logger.info('Repository factory initialized for database sync tests');
    } catch (error) {
      logger.error('Failed to initialize repository factory for tests', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  });

  afterAll(async () => {
    try {
      await RepositoryFactory.close();
      logger.info('Repository factory closed after database sync tests');
    } catch (error) {
      logger.warn('Error closing repository factory', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  describe('ensureTransactionCommitted', () => {
    it('should complete without throwing errors', async () => {
      // This test verifies that the basic transaction commit verification works
      await expect(ensureTransactionCommitted()).resolves.toBeUndefined();
    });

    it('should complete quickly with custom config', async () => {
      const startTime = Date.now();
      
      await ensureTransactionCommitted({
        maxWaitMs: 1000,
        pollIntervalMs: 10,
        maxAttempts: 10,
      });
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete quickly
    });
  });

  describe('ensureDatabaseSync', () => {
    it('should verify existing entities', async () => {
      // Create a test user
      const userRepository = await RepositoryFactory.createUserRepository();
      const testUser = User.create({
        id: createOrGenerateIRI(),
        username: `testuser${Date.now()}`,
        email: `test${Date.now()}@example.com`,
        firstName: 'Test',
        lastName: 'User',
        roles: [UserRole.USER],
        isActive: true,
      });

      await userRepository.create(testUser);

      // Verify the entity exists using our sync helper
      await expect(ensureDatabaseSync([testUser.id])).resolves.toBeUndefined();

      // Clean up
      await userRepository.delete(testUser.id);
    });

    it('should timeout for non-existent entities', async () => {
      const nonExistentId = createOrGenerateIRI();
      
      // This should timeout quickly since the entity doesn't exist
      await expect(
        ensureDatabaseSync([nonExistentId], {
          maxWaitMs: 500,
          pollIntervalMs: 50,
          maxAttempts: 5,
        })
      ).rejects.toThrow(/timeout|failed/);
    });
  });

  describe('retryWithBackoff', () => {
    it('should succeed on first attempt for successful operations', async () => {
      let attemptCount = 0;
      
      const result = await retryWithBackoff(async () => {
        attemptCount++;
        return 'success';
      });

      expect(result).toBe('success');
      expect(attemptCount).toBe(1);
    });

    it('should retry failed operations with exponential backoff', async () => {
      let attemptCount = 0;
      
      const result = await retryWithBackoff(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return 'success after retries';
      }, 3, 10); // 3 retries, 10ms base delay

      expect(result).toBe('success after retries');
      expect(attemptCount).toBe(3);
    });

    it('should fail after exhausting all retries', async () => {
      let attemptCount = 0;
      
      await expect(
        retryWithBackoff(async () => {
          attemptCount++;
          throw new Error('Persistent failure');
        }, 2, 10) // 2 retries, 10ms base delay
      ).rejects.toThrow('Persistent failure');

      expect(attemptCount).toBe(3); // Initial attempt + 2 retries
    });
  });

  describe('pollUntilCondition', () => {
    it('should succeed when condition is immediately true', async () => {
      await expect(
        pollUntilCondition(async () => true)
      ).resolves.toBeUndefined();
    });

    it('should succeed when condition becomes true after some attempts', async () => {
      let attemptCount = 0;
      
      await expect(
        pollUntilCondition(async () => {
          attemptCount++;
          return attemptCount >= 3;
        }, {
          pollIntervalMs: 10,
        })
      ).resolves.toBeUndefined();

      expect(attemptCount).toBeGreaterThanOrEqual(3);
    });

    it('should timeout when condition never becomes true', async () => {
      await expect(
        pollUntilCondition(async () => false, {
          maxWaitMs: 200,
          pollIntervalMs: 50,
          maxAttempts: 3,
        })
      ).rejects.toThrow(/timeout|failed/);
    });
  });

  describe('Performance comparison with setTimeout', () => {
    it('should be faster than equivalent setTimeout for existing data', async () => {
      // Create a test user
      const userRepository = await RepositoryFactory.createUserRepository();
      const testUser = User.create({
        id: createOrGenerateIRI(),
        username: `perftest${Date.now()}`,
        email: `perftest${Date.now()}@example.com`,
        firstName: 'Performance',
        lastName: 'Test',
        roles: [UserRole.USER],
        isActive: true,
      });

      await userRepository.create(testUser);

      // Measure our sync approach
      const syncStartTime = Date.now();
      await ensureDatabaseSync([testUser.id]);
      const syncDuration = Date.now() - syncStartTime;

      // Measure setTimeout approach
      const timeoutStartTime = Date.now();
      await new Promise((resolve) => setTimeout(resolve, 100));
      const timeoutDuration = Date.now() - timeoutStartTime;

      logger.info('Performance comparison', {
        syncDuration,
        timeoutDuration,
        improvement: timeoutDuration - syncDuration,
      });

      // Our approach should be faster than a 100ms timeout in most cases
      // (unless the system is extremely slow)
      expect(syncDuration).toBeLessThan(timeoutDuration);

      // Clean up
      await userRepository.delete(testUser.id);
    });
  });
});
