import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { SqliteBadgeClassRepository } from '@infrastructure/database/modules/sqlite/repositories/sqlite-badge-class.repository';
import { SqliteConnectionManager } from '@infrastructure/database/modules/sqlite/connection/sqlite-connection.manager';
import { queryLogger } from '@utils/logging/logger.service';
import { createId } from '@paralleldrive/cuid2';
import * as schema from '@infrastructure/database/modules/sqlite/schema';
import { toIRI } from '@utils/types/iri-utils';
import { SensitiveValue } from '@rollercoaster-dev/rd-logger';
import { EXAMPLE_ISSUER_URL } from '@/constants/urls';

import { getMigrationsPath } from '@tests/test-utils/migrations-path';

const MIGRATIONS_FOLDER = getMigrationsPath();

const mockIssuer = {
  id: `urn:uuid:${createId()}`,
  type: 'Profile',
  name: 'Test Issuer',
  url: EXAMPLE_ISSUER_URL,
  email: 'issuer@example.com',
};

// Helper to create valid plain object data resembling BadgeClass structure
const createTestDataObject = () => {
  return {
    id: toIRI(`urn:uuid:${createId()}`), // Convert string to IRI type
    issuer: toIRI(mockIssuer.id), // Convert issuer ID to IRI type
    name: 'Test Badge',
    description: 'A badge for testing',
    criteria: {
      narrative: 'Complete the test steps.',
    },
    type: 'BadgeClass',
  };
};

describe('SqliteBadgeClassRepository Integration - Query Logging', () => {
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let sqliteDb: Database;
  let connectionManager: SqliteConnectionManager;
  let repository: SqliteBadgeClassRepository;

  beforeEach(async () => {
    sqliteDb = new Database(':memory:');
    db = drizzle(sqliteDb, { schema, logger: true });
    queryLogger.configure({ enabled: true });
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });

    // Create connection manager and repository
    connectionManager = new SqliteConnectionManager(sqliteDb, {
      maxConnectionAttempts: 3,
      connectionRetryDelayMs: 1000,
    });
    await connectionManager.connect();
    repository = new SqliteBadgeClassRepository(connectionManager);
    queryLogger.clearLogs();
  });

  afterEach(() => {
    sqliteDb.close();
  });

  it('should log query on create', async () => {
    const testBadgeData = createTestDataObject();
    await repository.create(testBadgeData);
    const logs = queryLogger.getLogs();

    expect(logs).toBeArrayOfSize(1);
    const log = logs[0];
    expect(log.query).toBe('INSERT BadgeClass');
    expect(log.database).toBe('sqlite');
    expect(log.duration).toBeGreaterThanOrEqual(0);
    expect(log.params).toBeArrayOfSize(1);
  });

  it('should log query on findAll', async () => {
    await repository.findAll();
    const logs = queryLogger.getLogs();

    expect(logs).toBeArrayOfSize(1);
    const log = logs[0];
    expect(log.query).toBe('SELECT All BadgeClasses');
    expect(log.database).toBe('sqlite');
    expect(log.duration).toBeGreaterThanOrEqual(0);
    expect(log.params).toBeUndefined();
  });

  it('should log query on findById', async () => {
    const testBadgeData = createTestDataObject();
    await repository.create(testBadgeData);
    queryLogger.clearLogs();

    await repository.findById(testBadgeData.id);
    const logs = queryLogger.getLogs();

    expect(logs).toBeArrayOfSize(1);
    const log = logs[0];
    expect(log.query).toBe('SELECT BadgeClass by ID');
    expect(log.database).toBe('sqlite');
    expect(log.duration).toBeGreaterThanOrEqual(0);
    expect(log.params).toBeArrayOfSize(1);
    expect(log.params?.[0]).toBe(testBadgeData.id);
  });

  it('should log queries on update', async () => {
    const testBadgeData = createTestDataObject();
    await repository.create(testBadgeData);
    queryLogger.clearLogs();

    // Create a new plain object with updated data
    const updatedBadgeData = {
      ...testBadgeData,
      name: 'Updated Test Badge Name',
    };
    await repository.update(testBadgeData.id, updatedBadgeData);

    const logs = queryLogger.getLogs();

    // Expect logs for findById (in update) and the actual UPDATE
    expect(logs).toBeArrayOfSize(2);

    const findLog = logs[0];
    expect(findLog.query).toBe('SELECT BadgeClass by ID');
    expect(findLog.params?.[0]).toBe(testBadgeData.id);

    const updateLog = logs[1];
    expect(updateLog.query).toBe('UPDATE BadgeClass');
    expect(updateLog.database).toBe('sqlite');
    expect(updateLog.duration).toBeGreaterThanOrEqual(0);
    expect(updateLog.params).toBeArrayOfSize(2);
    expect(updateLog.params?.[0]).toBe(testBadgeData.id);

    // Check the second parameter (updated data)
    // The second parameter should be a SensitiveValue instance
    const sensitiveParam = updateLog.params?.[1];
    expect(sensitiveParam).toBeInstanceOf(SensitiveValue);

    // Since SensitiveValue's value property is private, we can't directly access it
    // Instead, we'll verify the object has the expected string representation
    // The SensitiveValue class redacts its contents when converted to a string
    const paramString = String(sensitiveParam);
    expect(paramString).toBe('[REDACTED]');
  });

  it('should log query on delete', async () => {
    const testBadgeData = createTestDataObject();
    await repository.create(testBadgeData);
    queryLogger.clearLogs();

    await repository.delete(testBadgeData.id);
    const logs = queryLogger.getLogs();

    expect(logs).toBeArrayOfSize(1);
    const log = logs[0];
    expect(log.query).toBe('DELETE BadgeClass');
    expect(log.database).toBe('sqlite');
    expect(log.duration).toBeGreaterThanOrEqual(0);
    expect(log.params).toBeArrayOfSize(1);
    expect(log.params?.[0]).toBe(testBadgeData.id);
  });
});
