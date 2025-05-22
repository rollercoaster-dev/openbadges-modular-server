/**
 * Test for SQLite resource management in RepositoryFactory
 *
 * This test verifies that the RepositoryFactory properly manages SQLite
 * connection resources and cleans them up correctly.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { RepositoryFactory } from '@infrastructure/repository.factory';

describe('RepositoryFactory SQLite Resource Management', () => {
  beforeEach(async () => {
    // Ensure clean state before each test
    await RepositoryFactory.close();
  });

  afterEach(async () => {
    // Clean up after each test
    await RepositoryFactory.close();
  });

  test('should initialize and close SQLite connection manager properly', async () => {
    // Initialize with SQLite configuration
    await RepositoryFactory.initialize({
      type: 'sqlite',
      connectionString: '', // Not used for SQLite
      sqliteFile: ':memory:', // Use in-memory database for testing
    });

    // Verify that repositories can be created (indicating successful initialization)
    const issuerRepo = await RepositoryFactory.createIssuerRepository();
    expect(issuerRepo).toBeDefined();

    const badgeClassRepo = await RepositoryFactory.createBadgeClassRepository();
    expect(badgeClassRepo).toBeDefined();

    const assertionRepo = await RepositoryFactory.createAssertionRepository();
    expect(assertionRepo).toBeDefined();

    const apiKeyRepo = await RepositoryFactory.createApiKeyRepository();
    expect(apiKeyRepo).toBeDefined();

    const platformRepo = await RepositoryFactory.createPlatformRepository();
    expect(platformRepo).toBeDefined();

    const platformUserRepo =
      await RepositoryFactory.createPlatformUserRepository();
    expect(platformUserRepo).toBeDefined();

    const userAssertionRepo =
      await RepositoryFactory.createUserAssertionRepository();
    expect(userAssertionRepo).toBeDefined();

    const userRepo = await RepositoryFactory.createUserRepository();
    expect(userRepo).toBeDefined();

    // Close should not throw an error
    await expect(RepositoryFactory.close()).resolves.toBeUndefined();
  });

  test('should handle multiple initializations gracefully', async () => {
    const sqliteConfig = {
      type: 'sqlite',
      connectionString: '',
      sqliteFile: ':memory:',
    };

    // First initialization
    await RepositoryFactory.initialize(sqliteConfig);

    // Second initialization should not throw (should be skipped)
    await expect(
      RepositoryFactory.initialize(sqliteConfig)
    ).resolves.toBeUndefined();

    // Should still be able to create repositories
    const issuerRepo = await RepositoryFactory.createIssuerRepository();
    expect(issuerRepo).toBeDefined();

    await RepositoryFactory.close();
  });

  test('should throw error when creating repositories without initialization', async () => {
    // Ensure factory is not initialized
    await RepositoryFactory.close();

    // Should throw error when trying to create repositories without initialization
    await expect(RepositoryFactory.createIssuerRepository()).rejects.toThrow(
      'SQLite connection manager not initialized'
    );
    await expect(
      RepositoryFactory.createBadgeClassRepository()
    ).rejects.toThrow('SQLite connection manager not initialized');
    await expect(RepositoryFactory.createAssertionRepository()).rejects.toThrow(
      'SQLite connection manager not initialized'
    );
    await expect(RepositoryFactory.createApiKeyRepository()).rejects.toThrow(
      'SQLite connection manager not initialized'
    );
    await expect(RepositoryFactory.createPlatformRepository()).rejects.toThrow(
      'SQLite connection manager not initialized'
    );
    await expect(
      RepositoryFactory.createPlatformUserRepository()
    ).rejects.toThrow('SQLite connection manager not initialized');
    await expect(
      RepositoryFactory.createUserAssertionRepository()
    ).rejects.toThrow('SQLite connection manager not initialized');
    await expect(RepositoryFactory.createUserRepository()).rejects.toThrow(
      'SQLite connection manager not initialized'
    );
  });

  test('should handle close() when not initialized', async () => {
    // Ensure factory is not initialized
    await RepositoryFactory.close();

    // Close should not throw when not initialized
    await expect(RepositoryFactory.close()).resolves.toBeUndefined();
  });

  test('should reuse the same connection manager across repository creations', async () => {
    await RepositoryFactory.initialize({
      type: 'sqlite',
      connectionString: '',
      sqliteFile: ':memory:',
    });

    // Create multiple repositories
    const issuerRepo1 = await RepositoryFactory.createIssuerRepository();
    const issuerRepo2 = await RepositoryFactory.createIssuerRepository();
    const badgeClassRepo = await RepositoryFactory.createBadgeClassRepository();

    // All should be defined (indicating they share the same underlying connection)
    expect(issuerRepo1).toBeDefined();
    expect(issuerRepo2).toBeDefined();
    expect(badgeClassRepo).toBeDefined();

    await RepositoryFactory.close();
  });
});
