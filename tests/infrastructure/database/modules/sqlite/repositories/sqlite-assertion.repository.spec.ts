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
import { SqliteAssertionRepository } from '@infrastructure/database/modules/sqlite/repositories/sqlite-assertion.repository';
import { SqliteConnectionManager } from '@infrastructure/database/modules/sqlite/connection/sqlite-connection.manager';
import { Assertion } from '@domains/assertion/assertion.entity';
import { queryLogger } from '@utils/logging/logger.service';
import { SensitiveValue } from '@rollercoaster-dev/rd-logger';
import { Shared, OB2 } from 'openbadges-types';
import { createId } from '@paralleldrive/cuid2';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { assertions } from '@infrastructure/database/modules/sqlite/schema';
import * as schema from '@infrastructure/database/modules/sqlite/schema';
import { getMigrationsPath } from '@tests/test-utils/migrations-path';
import { EXAMPLE_ISSUER_URL } from '@/constants/urls';

// --- Test Setup ---
let db: ReturnType<typeof drizzle<typeof schema>>;
let repository: SqliteAssertionRepository;
let testDbInstance: Database;
let connectionManager: SqliteConnectionManager;
let testIssuerId: string;
let testBadgeClassId: string;

const MIGRATIONS_PATH = getMigrationsPath();

// Helper to create a test issuer in the database
const createTestIssuer = async (
  db: ReturnType<typeof drizzle<typeof schema>>
) => {
  const issuerId = `urn:uuid:${createId()}`;

  await db.insert(schema.issuers).values({
    id: issuerId,
    name: 'Test Issuer',
    url: EXAMPLE_ISSUER_URL,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  return issuerId;
};

// Helper to create a test badge class in the database
const createTestBadgeClass = async (
  db: ReturnType<typeof drizzle<typeof schema>>,
  issuerId: string
) => {
  const badgeClassId = `urn:uuid:${createId()}`;

  await db.insert(schema.badgeClasses).values({
    id: badgeClassId,
    issuerId: issuerId,
    name: 'Test Badge Class',
    description: 'A test badge class',
    image: 'https://example.com/badge.png',
    criteria: JSON.stringify({ narrative: 'Complete the test' }),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  return badgeClassId;
};

describe('SqliteAssertionRepository Integration - Query Logging', () => {
  beforeAll(async () => {
    // Initialize in-memory SQLite database
    testDbInstance = new Database(':memory:');
    db = drizzle(testDbInstance, { schema });

    // Apply migrations
    // Ensure the migration script can run against the in-memory DB
    // This might require configuration or adjustments to the migration script
    try {
      // NOTE: This assumes your migrations folder is configured correctly
      // and drizzle-kit generated migrations are compatible with bun:sqlite
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

    // Instantiate the real repository with the connection manager
    repository = new SqliteAssertionRepository(connectionManager);
  });

  beforeEach(async () => {
    // Clear all tables before each test
    await db.delete(assertions);
    await db.delete(schema.badgeClasses);
    await db.delete(schema.issuers);

    // Create test dependencies
    testIssuerId = await createTestIssuer(db);
    testBadgeClassId = await createTestBadgeClass(db, testIssuerId);

    // Clear logs captured by the queryLogger
    queryLogger.clearLogs();
  });

  afterAll(() => {
    // Close the database connection
    testDbInstance.close();
  });

  // --- Test Data ---
  const createTestAssertionData = (): Omit<Assertion, 'id'> => ({
    badgeClass: testBadgeClassId as Shared.IRI,
    issuer: testIssuerId as Shared.IRI,
    recipient: {
      type: 'email',
      identity: `test-${createId()}@example.com`,
      hashed: false, // Use non-hashed for easier testing if needed
    },
    issuedOn: new Date().toISOString(),
    verification: {
      type: 'hosted',
    },
    // Add other optional fields as needed for specific tests
    narrative: 'Test narrative',
  });

  // --- Test Cases ---

  it('should log query on create', async () => {
    const assertionData = createTestAssertionData();
    await repository.create(assertionData);

    const logs = queryLogger.getLogs();
    expect(logs.length).toBe(1);
    const log = logs[0];

    expect(log.query).toBe('INSERT Assertion');
    expect(log.database).toBe('sqlite');
    expect(log.duration).toBeGreaterThanOrEqual(0);
    expect(log.params).toBeUndefined();
  });

  it('should log query on findAll', async () => {
    // Arrange: Create some data first
    await repository.create(createTestAssertionData());
    await repository.create(createTestAssertionData());
    queryLogger.clearLogs(); // Clear logs from setup

    // Act
    await repository.findAll();

    // Assert
    const logs = queryLogger.getLogs();
    expect(logs.length).toBe(1);
    const log = logs[0];

    expect(log.query).toBe('SELECT All Assertions');
    expect(log.database).toBe('sqlite');
    expect(log.duration).toBeGreaterThanOrEqual(0);
    expect(log.params).toBeUndefined(); // No parameters for findAll
  });

  it('should log query on findById', async () => {
    const createdAssertion = await repository.create(createTestAssertionData());
    queryLogger.clearLogs(); // Clear logs from setup

    await repository.findById(createdAssertion.id);

    const logs = queryLogger.getLogs();
    expect(logs.length).toBe(1);
    const log = logs[0];

    expect(log.query).toBe('SELECT Assertion by ID');
    expect(log.database).toBe('sqlite');
    expect(log.duration).toBeGreaterThanOrEqual(0);
    expect(log.params).toEqual([createdAssertion.id]);
  });

  it('should log query on findByRecipient', async () => {
    const assertionData = createTestAssertionData();
    await repository.create(assertionData);
    queryLogger.clearLogs(); // Clear logs from setup
    // Type assertion needed as Assertion['recipient'] might be a union
    const recipientId = (assertionData.recipient as OB2.IdentityObject)
      .identity as Shared.IRI;

    await repository.findByRecipient(recipientId);

    const logs = queryLogger.getLogs();
    expect(logs.length).toBe(1);
    const log = logs[0];

    expect(log.query).toBe('SELECT Assertions by Recipient');
    expect(log.database).toBe('sqlite');
    expect(log.duration).toBeGreaterThanOrEqual(0);
    expect(log.params).toBeArrayOfSize(1);
    // Check that the parameter is an instance of SensitiveValue
    expect(log.params?.[0]).toBeInstanceOf(SensitiveValue);
  });

  it('should log queries on update (findById + update)', async () => {
    const createdAssertion = await repository.create(createTestAssertionData());
    queryLogger.clearLogs(); // Clear logs from setup

    const updateData = { narrative: 'Updated Narrative!' };
    await repository.update(createdAssertion.id, updateData);

    const logs = queryLogger.getLogs();
    expect(logs.length).toBe(2);

    // Check findById log
    const findLog = logs[0];
    expect(findLog.query).toBe('SELECT Assertion by ID');
    expect(findLog.params).toEqual([createdAssertion.id]);
    expect(findLog.database).toBe('sqlite');

    // Check update log
    const updateLog = logs[1];
    expect(updateLog.query).toBe('UPDATE Assertion');
    expect(updateLog.database).toBe('sqlite');
    expect(updateLog.duration).toBeGreaterThanOrEqual(0);
    expect(updateLog.params).toBeUndefined();
  });

  it('should log query on delete', async () => {
    const createdAssertion = await repository.create(createTestAssertionData());
    queryLogger.clearLogs(); // Clear logs from setup

    await repository.delete(createdAssertion.id);

    const logs = queryLogger.getLogs();
    expect(logs.length).toBe(1);
    const log = logs[0];

    expect(log.query).toBe('DELETE Assertion');
    expect(log.database).toBe('sqlite');
    expect(log.duration).toBeGreaterThanOrEqual(0);
    expect(log.params).toEqual([createdAssertion.id]);
  });

  // Add tests for revoke and verify similarly, checking logs for underlying operations
  it('should log queries on revoke (findById * 2 + update)', async () => {
    const createdAssertion = await repository.create(createTestAssertionData());
    queryLogger.clearLogs(); // Clear logs from setup

    const reason = 'Test Revocation';
    await repository.revoke(createdAssertion.id, reason);

    const logs = queryLogger.getLogs();
    expect(logs.length).toBe(3); // findById (revoke) -> findById (update) -> update

    // Check logs (simplified check, focus on query names)
    expect(logs[0].query).toBe('SELECT Assertion by ID');
    expect(logs[1].query).toBe('SELECT Assertion by ID');
    expect(logs[2].query).toBe('UPDATE Assertion');
    expect(logs[2].params).toBeUndefined();
    expect(logs[2].database).toBe('sqlite');
  });

  it('should log query on verify (findById)', async () => {
    const createdAssertion = await repository.create(createTestAssertionData());
    queryLogger.clearLogs(); // Clear logs from setup

    await repository.verify(createdAssertion.id);

    const logs = queryLogger.getLogs();
    expect(logs.length).toBe(1);
    const log = logs[0];

    expect(log.query).toBe('SELECT Assertion by ID');
    expect(log.database).toBe('sqlite');
    expect(log.duration).toBeGreaterThanOrEqual(0);
    expect(log.params).toEqual([createdAssertion.id]);
  });
});
