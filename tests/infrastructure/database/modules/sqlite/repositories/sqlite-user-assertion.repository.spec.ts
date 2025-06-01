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
import { SqliteUserAssertionRepository } from '@infrastructure/database/modules/sqlite/repositories/sqlite-user-assertion.repository';
import { SqliteConnectionManager } from '@infrastructure/database/modules/sqlite/connection/sqlite-connection.manager';
import { UserAssertionStatus } from '@domains/backpack/backpack.types';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import * as schema from '@infrastructure/database/modules/sqlite/schema';
import { Shared } from 'openbadges-types';
import { createId } from '@paralleldrive/cuid2';
import { getMigrationsPath } from '@tests/test-utils/migrations-path';
import { convertUuid } from '@infrastructure/database/utils/type-conversion';

let db: ReturnType<typeof drizzle<typeof schema>>;
let repository: SqliteUserAssertionRepository;
let testDbInstance: Database;
let connectionManager: SqliteConnectionManager;

const MIGRATIONS_PATH = getMigrationsPath();

// Test data
const createTestPlatformUser = async (
  db: ReturnType<typeof drizzle<typeof schema>>
) => {
  const platformId = `urn:uuid:${createId()}` as Shared.IRI;
  const userId = `urn:uuid:${createId()}` as Shared.IRI;

  // Insert platform with unique name to avoid conflicts
  await db.insert(schema.platforms).values({
    id: convertUuid(platformId as string, 'sqlite', 'to') as string,
    name: `Test Platform ${platformId}`, // Ensure name is unique
    clientId: `client-${platformId}`,
    publicKey: 'test-public-key',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Insert platform user
  await db.insert(schema.platformUsers).values({
    id: convertUuid(userId as string, 'sqlite', 'to') as string,
    platformId: convertUuid(platformId as string, 'sqlite', 'to') as string,
    externalUserId: `ext-${userId}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  return userId;
};

const createTestAssertion = async (
  db: ReturnType<typeof drizzle<typeof schema>>
) => {
  const issuerId = `urn:uuid:${createId()}` as Shared.IRI;
  const badgeClassId = `urn:uuid:${createId()}` as Shared.IRI;
  const assertionId = `urn:uuid:${createId()}` as Shared.IRI;

  // Insert issuer
  await db.insert(schema.issuers).values({
    id: convertUuid(issuerId as string, 'sqlite', 'to') as string,
    name: 'Test Issuer',
    url: 'https://example.com',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Insert badge class
  await db.insert(schema.badgeClasses).values({
    id: convertUuid(badgeClassId as string, 'sqlite', 'to') as string,
    issuerId: convertUuid(issuerId as string, 'sqlite', 'to') as string,
    name: 'Test Badge',
    description: 'Test Badge Description',
    image: 'badge.png',
    criteria: '{"id": "https://example.com/criteria"}',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Insert assertion
  await db.insert(schema.assertions).values({
    id: convertUuid(assertionId as string, 'sqlite', 'to') as string,
    badgeClassId: convertUuid(badgeClassId as string, 'sqlite', 'to') as string,
    recipient: JSON.stringify({
      identity: 'sha256$abcdef',
      type: 'email',
      hashed: true,
    }),
    issuedOn: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  return assertionId;
};

describe('SqliteUserAssertionRepository Integration', () => {
  beforeAll(async () => {
    // Initialize in-memory SQLite database
    testDbInstance = new Database(':memory:');
    db = drizzle(testDbInstance, { schema });

    try {
      // Run migrations to set up tables
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
    repository = new SqliteUserAssertionRepository(connectionManager);
  });

  beforeEach(async () => {
    // Clear tables for clean tests
    await db.delete(schema.userAssertions);
    await db.delete(schema.assertions);
    await db.delete(schema.badgeClasses);
    await db.delete(schema.issuers);
    await db.delete(schema.platformUsers);
    await db.delete(schema.platforms);
  });

  afterAll(async () => {
    await connectionManager.disconnect();
    testDbInstance.close();
  });

  it('should add an assertion to a user', async () => {
    // Create test data
    const userId = await createTestPlatformUser(db);
    const assertionId = await createTestAssertion(db);

    // Add assertion to user
    const userAssertion = await repository.addAssertion(userId, assertionId);

    // Verify assertion was added
    expect(userAssertion).toBeDefined();
    expect(userAssertion.id).toBeDefined();
    expect(userAssertion.userId).toBe(userId);
    expect(userAssertion.assertionId).toBe(assertionId);
    expect(userAssertion.status).toBe(UserAssertionStatus.ACTIVE);
  });

  it('should add an assertion with metadata', async () => {
    // Create test data
    const userId = await createTestPlatformUser(db);
    const assertionId = await createTestAssertion(db);
    const metadata = { source: 'test', importDate: new Date().toISOString() };

    // Add assertion with metadata
    const userAssertion = await repository.addAssertion(
      userId,
      assertionId,
      metadata
    );

    // Verify assertion was added with metadata
    expect(userAssertion).toBeDefined();
    expect(userAssertion.metadata).toEqual(metadata);
  });

  it('should add an assertion using params object', async () => {
    // Create test data
    const userId = await createTestPlatformUser(db);
    const assertionId = await createTestAssertion(db);
    const metadata = { source: 'params' };

    // Add assertion using params object
    const userAssertion = await repository.addAssertion({
      userId,
      assertionId,
      metadata,
    });

    // Verify assertion was added
    expect(userAssertion).toBeDefined();
    expect(userAssertion.userId).toBe(userId);
    expect(userAssertion.assertionId).toBe(assertionId);
    expect(userAssertion.metadata).toEqual(metadata);
  });

  it('should remove an assertion from a user', async () => {
    // Create test data
    const userId = await createTestPlatformUser(db);
    const assertionId = await createTestAssertion(db);

    // Add assertion to user
    await repository.addAssertion(userId, assertionId);

    // Remove assertion
    const removed = await repository.removeAssertion(userId, assertionId);

    // Verify assertion was removed
    expect(removed).toBe(true);

    // Verify assertion is no longer associated
    const hasAssertion = await repository.hasAssertion(userId, assertionId);
    expect(hasAssertion).toBe(false);
  });

  it('should update assertion status', async () => {
    // Create test data
    const userId = await createTestPlatformUser(db);
    const assertionId = await createTestAssertion(db);

    // Add assertion to user
    await repository.addAssertion(userId, assertionId);

    // Update status to DELETED
    const updated = await repository.updateStatus(
      userId,
      assertionId,
      UserAssertionStatus.DELETED
    );

    // Verify status was updated
    expect(updated).toBe(true);

    // Verify assertion has new status
    const userAssertion = await repository.findByUserAndAssertion(
      userId,
      assertionId
    );
    expect(userAssertion?.status).toBe(UserAssertionStatus.DELETED);
  });

  it('should get user assertions', async () => {
    // Create test data
    const userId = await createTestPlatformUser(db);
    const assertion1Id = await createTestAssertion(db);
    const assertion2Id = await createTestAssertion(db);
    const assertion3Id = await createTestAssertion(db);

    // Add assertions with different statuses
    await repository.addAssertion(userId, assertion1Id);
    await repository.addAssertion(userId, assertion2Id);
    await repository.addAssertion(userId, assertion3Id);

    // Update one to DELETED
    await repository.updateStatus(
      userId,
      assertion3Id,
      UserAssertionStatus.DELETED
    );

    // Get all assertions (not deleted)
    const assertions = await repository.getUserAssertions(userId);

    // Verify correct assertions are returned
    expect(assertions.length).toBe(2); // Excludes DELETED by default

    // Get all assertions with specific status
    const activeAssertions = await repository.getUserAssertions(userId, {
      status: UserAssertionStatus.ACTIVE,
    });
    expect(activeAssertions.length).toBe(2);

    const deletedAssertions = await repository.getUserAssertions(userId, {
      status: UserAssertionStatus.DELETED,
    });
    expect(deletedAssertions.length).toBe(1);
  });

  it('should check if user has assertion', async () => {
    // Create test data
    const userId = await createTestPlatformUser(db);
    const assertionId = await createTestAssertion(db);

    // Check before adding
    const hasBefore = await repository.hasAssertion(userId, assertionId);
    expect(hasBefore).toBe(false);

    // Add assertion
    await repository.addAssertion(userId, assertionId);

    // Check after adding
    const hasAfter = await repository.hasAssertion(userId, assertionId);
    expect(hasAfter).toBe(true);

    // Mark as deleted
    await repository.updateStatus(
      userId,
      assertionId,
      UserAssertionStatus.DELETED
    );

    // Check after deleting (should be false)
    const hasAfterDelete = await repository.hasAssertion(userId, assertionId);
    expect(hasAfterDelete).toBe(false);
  });

  it('should find by user and assertion', async () => {
    // Create test data
    const userId = await createTestPlatformUser(db);
    const assertionId = await createTestAssertion(db);

    // Add assertion
    await repository.addAssertion(userId, assertionId, { note: 'test note' });

    // Find by user and assertion
    const userAssertion = await repository.findByUserAndAssertion(
      userId,
      assertionId
    );

    // Verify found
    expect(userAssertion).toBeDefined();
    expect(userAssertion?.userId).toBe(userId);
    expect(userAssertion?.assertionId).toBe(assertionId);
    expect(userAssertion?.metadata).toEqual({ note: 'test note' });

    // Check for non-existent
    const notFound = await repository.findByUserAndAssertion(
      userId,
      'non-existent' as Shared.IRI
    );
    expect(notFound).toBeNull();
  });

  it('should get assertion users', async () => {
    // Create test data
    const user1Id = await createTestPlatformUser(db);
    const user2Id = await createTestPlatformUser(db);
    const assertionId = await createTestAssertion(db);

    // Add assertion to multiple users
    await repository.addAssertion(user1Id, assertionId);
    await repository.addAssertion(user2Id, assertionId);

    // Get assertion users
    const users = await repository.getAssertionUsers(assertionId);

    // Verify correct users are returned
    expect(users.length).toBe(2);
    expect(users.map((u) => u.userId)).toContain(user1Id);
    expect(users.map((u) => u.userId)).toContain(user2Id);
  });

  it('should expose a mapper through getMapper()', () => {
    // Verify the mapper is accessible
    const mapper = repository.getMapper();
    expect(mapper).toBeDefined();
  });
});
