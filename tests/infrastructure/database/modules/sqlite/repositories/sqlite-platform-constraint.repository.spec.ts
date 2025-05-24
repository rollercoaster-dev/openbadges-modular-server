/**
 * Test for SQLite Platform Repository UNIQUE constraint handling
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
} from 'bun:test';
import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { SqliteConnectionManager } from '@infrastructure/database/modules/sqlite/connection/sqlite-connection.manager';
import { SqlitePlatformRepository } from '@infrastructure/database/modules/sqlite/repositories/sqlite-platform.repository';

import { PlatformStatus } from '@domains/backpack/backpack.types';
import * as schema from '@infrastructure/database/modules/sqlite/schema';
import { getMigrationsPath } from '@tests/test-utils/migrations-path';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';

import { toIRI } from '@utils/types/iri-utils';
import { DuplicateClientIdError } from '@/domains/backpack/platform.errors';

// --- Test Setup ---
let db: ReturnType<typeof drizzle<typeof schema>>;
let repository: SqlitePlatformRepository;
let testDbInstance: Database;
let connectionManager: SqliteConnectionManager;

const MIGRATIONS_PATH = getMigrationsPath();

describe('SqlitePlatformRepository constraint handling', () => {
  beforeAll(async () => {
    // Initialize in-memory SQLite database
    testDbInstance = new Database(':memory:');
    db = drizzle(testDbInstance, { schema });

    // Apply migrations
    try {
      migrate(db, { migrationsFolder: MIGRATIONS_PATH });
    } catch (_error) {
      // Fail fast if migrations don't work
      throw new Error('SQLite migration failed, cannot run integration tests.');
    }

    // Create connection manager for the new pattern
    connectionManager = new SqliteConnectionManager(testDbInstance, {
      maxConnectionAttempts: 3,
      connectionRetryDelayMs: 1000,
    });

    // Connect the connection manager
    await connectionManager.connect();

    // Create repository
    repository = new SqlitePlatformRepository(connectionManager);
  });

  beforeEach(async () => {
    // Clear the platforms table before each test
    await db.delete(schema.platforms).execute();
  });

  afterAll(() => {
    // Close the database connection
    testDbInstance.close();
  });

  it('should throw DuplicateClientIdError when creating platform with duplicate clientId', async () => {
    // Create first platform
    const platform1 = await repository.create({
      name: 'Test Platform 1',
      clientId: 'duplicate-client-id',
      publicKey: 'test-public-key-1',
      status: PlatformStatus.ACTIVE,
    });

    expect(platform1).toBeDefined();

    // Try to create second platform with the same clientId
    await expect(
      repository.create({
        name: 'Test Platform 2',
        clientId: 'duplicate-client-id', // Same clientId
        publicKey: 'test-public-key-2',
        status: PlatformStatus.ACTIVE,
      })
    ).rejects.toThrow(DuplicateClientIdError);
  });

  it('should throw DuplicateClientIdError when updating platform with duplicate clientId', async () => {
    // Create two platforms with different clientIds
    await repository.create({
      name: 'Test Platform 1',
      clientId: 'client-id-1',
      publicKey: 'test-public-key-1',
      status: PlatformStatus.ACTIVE,
    });

    const platform2 = await repository.create({
      name: 'Test Platform 2',
      clientId: 'client-id-2',
      publicKey: 'test-public-key-2',
      status: PlatformStatus.ACTIVE,
    });

    // Try to update platform2 to use platform1's clientId
    await expect(
      repository.update(toIRI(platform2.id as string), {
        clientId: 'client-id-1',
      })
    ).rejects.toThrow(DuplicateClientIdError);
  });
});
