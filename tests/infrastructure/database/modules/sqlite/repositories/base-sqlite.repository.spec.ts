/**
 * Test for Base SQLite Repository functionality
 *
 * This test verifies that the BaseSqliteRepository provides the expected
 * common functionality and that repositories extending it work correctly.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { SqliteConnectionManager } from '@infrastructure/database/modules/sqlite/connection/sqlite-connection.manager';
import { SqliteIssuerRepository } from '@infrastructure/database/modules/sqlite/repositories/sqlite-issuer.repository';
import { Issuer } from '@domains/issuer/issuer.entity';
import * as schema from '@infrastructure/database/modules/sqlite/schema';
import { getMigrationsPath } from '@tests/test-utils/migrations-path';
import { Shared } from 'openbadges-types';

describe('BaseSqliteRepository Integration Tests', () => {
  let client: Database;
  let connectionManager: SqliteConnectionManager;
  let issuerRepository: SqliteIssuerRepository;

  beforeEach(async () => {
    // Create in-memory database for testing
    client = new Database(':memory:');
    const db = drizzle(client, { schema });

    // Run migrations
    await migrate(db, { migrationsFolder: getMigrationsPath() });

    // Create connection manager and repository
    connectionManager = new SqliteConnectionManager(client, {
      maxConnectionAttempts: 3,
      connectionRetryDelayMs: 100,
      sqliteBusyTimeout: 1000,
      sqliteSyncMode: 'NORMAL',
      sqliteCacheSize: 1000,
    });

    await connectionManager.connect();
    issuerRepository = new SqliteIssuerRepository(connectionManager);
  });

  afterEach(async () => {
    await connectionManager.close();
    client.close();
  });

  test('should create issuer using base repository functionality', async () => {
    const issuerData = {
      name: 'Test Issuer',
      url: 'https://example.com' as Shared.IRI,
      email: 'test@example.com',
      description: 'A test issuer',
    };

    const createdIssuer = await issuerRepository.create(issuerData);

    expect(createdIssuer).toBeDefined();
    expect(createdIssuer.id).toBeDefined();
    expect(createdIssuer.name).toBe(issuerData.name);
    expect(createdIssuer.url).toBe(issuerData.url);
    expect(createdIssuer.email).toBe(issuerData.email);
    expect(createdIssuer.description).toBe(issuerData.description);
  });

  test('should find issuer by ID using base repository functionality', async () => {
    // First create an issuer
    const issuerData = {
      name: 'Test Issuer',
      url: 'https://example.com' as Shared.IRI,
      email: 'test@example.com',
      description: 'A test issuer',
    };

    const createdIssuer = await issuerRepository.create(issuerData);

    // Then find it by ID
    const foundIssuer = await issuerRepository.findById(createdIssuer.id);

    expect(foundIssuer).toBeDefined();
    expect(foundIssuer!.id).toBe(createdIssuer.id);
    expect(foundIssuer!.name).toBe(issuerData.name);
  });

  test('should return null for non-existent issuer', async () => {
    const nonExistentId = 'non-existent-id' as Shared.IRI;
    const foundIssuer = await issuerRepository.findById(nonExistentId);

    expect(foundIssuer).toBeNull();
  });

  test('should validate entity ID and throw error for invalid ID', async () => {
    const invalidId = '' as Shared.IRI;

    await expect(issuerRepository.findById(invalidId)).rejects.toThrow(
      'Invalid issuer ID: ID cannot be empty'
    );
  });

  test('should find all issuers using base repository functionality', async () => {
    // Create multiple issuers
    const issuerData1 = {
      name: 'Test Issuer 1',
      url: 'https://example1.com' as Shared.IRI,
      email: 'test1@example.com',
      description: 'First test issuer',
    };

    const issuerData2 = {
      name: 'Test Issuer 2',
      url: 'https://example2.com' as Shared.IRI,
      email: 'test2@example.com',
      description: 'Second test issuer',
    };

    await issuerRepository.create(issuerData1);
    await issuerRepository.create(issuerData2);

    // Find all issuers
    const allIssuers = await issuerRepository.findAll();

    expect(allIssuers).toHaveLength(2);
    expect(allIssuers.some(issuer => issuer.name === issuerData1.name)).toBe(true);
    expect(allIssuers.some(issuer => issuer.name === issuerData2.name)).toBe(true);
  });

  test('should update issuer using base repository functionality', async () => {
    // Create an issuer
    const issuerData = {
      name: 'Test Issuer',
      url: 'https://example.com' as Shared.IRI,
      email: 'test@example.com',
      description: 'A test issuer',
    };

    const createdIssuer = await issuerRepository.create(issuerData);

    // Update the issuer
    const updateData = {
      name: 'Updated Test Issuer',
      description: 'An updated test issuer',
    };

    const updatedIssuer = await issuerRepository.update(createdIssuer.id, updateData);

    expect(updatedIssuer).toBeDefined();
    expect(updatedIssuer!.id).toBe(createdIssuer.id);
    expect(updatedIssuer!.name).toBe(updateData.name);
    expect(updatedIssuer!.description).toBe(updateData.description);
    expect(updatedIssuer!.url).toBe(issuerData.url); // Should remain unchanged
    expect(updatedIssuer!.email).toBe(issuerData.email); // Should remain unchanged
  });

  test('should delete issuer using base repository functionality', async () => {
    // Create an issuer
    const issuerData = {
      name: 'Test Issuer',
      url: 'https://example.com' as Shared.IRI,
      email: 'test@example.com',
      description: 'A test issuer',
    };

    const createdIssuer = await issuerRepository.create(issuerData);

    // Delete the issuer
    const deleteResult = await issuerRepository.delete(createdIssuer.id);

    expect(deleteResult).toBe(true);

    // Verify it's deleted
    const foundIssuer = await issuerRepository.findById(createdIssuer.id);
    expect(foundIssuer).toBeNull();
  });

  test('should return false when deleting non-existent issuer', async () => {
    const nonExistentId = 'non-existent-id' as Shared.IRI;
    const deleteResult = await issuerRepository.delete(nonExistentId);

    expect(deleteResult).toBe(false);
  });

  test('should handle database errors gracefully', async () => {
    // Close the connection to simulate a database error
    await connectionManager.close();

    const issuerData = {
      name: 'Test Issuer',
      url: 'https://example.com' as Shared.IRI,
      email: 'test@example.com',
      description: 'A test issuer',
    };

    // Should throw an error with enhanced context
    await expect(issuerRepository.create(issuerData)).rejects.toThrow();
  });
});
