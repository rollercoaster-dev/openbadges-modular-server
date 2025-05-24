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
import { SqliteUserRepository } from '@infrastructure/database/modules/sqlite/repositories/sqlite-user.repository';
import { SqliteConnectionManager } from '@infrastructure/database/modules/sqlite/connection/sqlite-connection.manager';
import { UserRole, UserPermission } from '@domains/user/user.entity';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import * as schema from '@infrastructure/database/modules/sqlite/schema';
import { getMigrationsPath } from '@tests/test-utils/migrations-path';
import { Shared } from 'openbadges-types';

let db: ReturnType<typeof drizzle<typeof schema>>;
let repository: SqliteUserRepository;
let testDbInstance: Database;
let connectionManager: SqliteConnectionManager;

const MIGRATIONS_PATH = getMigrationsPath();

describe('SqliteUserRepository Integration', () => {
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
    repository = new SqliteUserRepository(connectionManager);
  });

  beforeEach(async () => {
    // Clear table for clean tests
    await db.delete(schema.users);
  });

  afterAll(async () => {
    // Cleanup
    await connectionManager.disconnect();
  });

  it('should create a user with proper ID generation', async () => {
    // Test data
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: 'hashed_password',
      firstName: 'Test',
      lastName: 'User',
      roles: [UserRole.USER],
      permissions: [UserPermission.VIEW_BACKPACK],
      isActive: true,
    };

    // Create user
    const user = await repository.create(userData);

    // Verify user was created with proper ID
    expect(user).toBeDefined();
    expect(user.id).toBeDefined();
    expect(user.username).toBe(userData.username);
    expect(user.email).toBe(userData.email);
    expect(user.passwordHash).toBe(userData.passwordHash);
    expect(user.firstName).toBe(userData.firstName);
    expect(user.lastName).toBe(userData.lastName);
    expect(user.roles).toEqual(userData.roles);
    expect(user.permissions).toEqual(userData.permissions);
    expect(user.isActive).toBe(userData.isActive);
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  });

  it('should find a user by ID', async () => {
    // Create a test user
    const userData = {
      username: 'findbyid',
      email: 'findbyid@example.com',
      passwordHash: 'hashed_password',
    };
    const createdUser = await repository.create(userData);

    // Find by ID
    const foundUser = await repository.findById(createdUser.id);

    // Verify user was found
    expect(foundUser).toBeDefined();
    expect(foundUser?.id).toBe(createdUser.id);
    expect(foundUser?.username).toBe(userData.username);
    expect(foundUser?.email).toBe(userData.email);
  });

  it('should return null when finding a non-existent user by ID', async () => {
    // Find by non-existent ID
    const foundUser = await repository.findById(
      'urn:uuid:non-existent' as Shared.IRI
    );

    // Verify null was returned
    expect(foundUser).toBeNull();
  });

  it('should find a user by username', async () => {
    // Create a test user
    const userData = {
      username: 'findbyusername',
      email: 'findbyusername@example.com',
      passwordHash: 'hashed_password',
    };
    await repository.create(userData);

    // Find by username
    const foundUser = await repository.findByUsername(userData.username);

    // Verify user was found
    expect(foundUser).toBeDefined();
    expect(foundUser?.username).toBe(userData.username);
    expect(foundUser?.email).toBe(userData.email);
  });

  it('should find a user by email', async () => {
    // Create a test user
    const userData = {
      username: 'findbyemail',
      email: 'findbyemail@example.com',
      passwordHash: 'hashed_password',
    };
    await repository.create(userData);

    // Find by email
    const foundUser = await repository.findByEmail(userData.email);

    // Verify user was found
    expect(foundUser).toBeDefined();
    expect(foundUser?.username).toBe(userData.username);
    expect(foundUser?.email).toBe(userData.email);
  });

  it('should update a user', async () => {
    // Create a test user
    const userData = {
      username: 'updateuser',
      email: 'updateuser@example.com',
      passwordHash: 'hashed_password',
    };
    const createdUser = await repository.create(userData);

    // Update data
    const updateData = {
      firstName: 'Updated',
      lastName: 'User',
      isActive: false,
    };

    // Update user
    const updatedUser = await repository.update(createdUser.id, updateData);

    // Verify user was updated
    expect(updatedUser).toBeDefined();
    expect(updatedUser?.id).toBe(createdUser.id);
    expect(updatedUser?.username).toBe(userData.username); // unchanged
    expect(updatedUser?.email).toBe(userData.email); // unchanged
    expect(updatedUser?.firstName).toBe(updateData.firstName); // updated
    expect(updatedUser?.lastName).toBe(updateData.lastName); // updated
    expect(updatedUser?.isActive).toBe(updateData.isActive); // updated
  });

  it('should return null when updating a non-existent user', async () => {
    // Update non-existent user
    const updatedUser = await repository.update(
      'urn:uuid:non-existent' as Shared.IRI,
      {
        firstName: 'Updated',
      }
    );

    // Verify null was returned
    expect(updatedUser).toBeNull();
  });

  it('should delete a user', async () => {
    // Create a test user
    const userData = {
      username: 'deleteuser',
      email: 'deleteuser@example.com',
      passwordHash: 'hashed_password',
    };
    const createdUser = await repository.create(userData);

    // Delete user
    const deleted = await repository.delete(createdUser.id);

    // Verify user was deleted
    expect(deleted).toBe(true);

    // Verify user no longer exists
    const foundUser = await repository.findById(createdUser.id);
    expect(foundUser).toBeNull();
  });

  it('should find users by query', async () => {
    // Create test users
    await repository.create({
      username: 'user1',
      email: 'user1@example.com',
      passwordHash: 'hash1',
      isActive: true,
      roles: [UserRole.ADMIN],
    });
    await repository.create({
      username: 'user2',
      email: 'user2@example.com',
      passwordHash: 'hash2',
      isActive: true,
      roles: [UserRole.USER],
    });
    await repository.create({
      username: 'inactive',
      email: 'inactive@example.com',
      passwordHash: 'hash3',
      isActive: false,
      roles: [UserRole.USER],
    });

    // Find by username
    const usernameResults = await repository.findByQuery({ username: 'user' });
    expect(usernameResults.length).toBe(2);

    // Find by email
    const emailResults = await repository.findByQuery({ email: 'example' });
    expect(emailResults.length).toBe(3);

    // Find by isActive
    const activeResults = await repository.findByQuery({ isActive: true });
    expect(activeResults.length).toBe(2);

    // Find by role
    const adminResults = await repository.findByQuery({ role: UserRole.ADMIN });
    expect(adminResults.length).toBe(1);
    expect(adminResults[0].username).toBe('user1');

    // Test combined conditions with AND logic (the correct implementation)
    // This should return only users that are BOTH active AND have the USER role
    const combinedResults = await repository.findByQuery({
      isActive: true,
      role: UserRole.USER,
    });
    // We should get only active users with 'user' role (user2)
    expect(combinedResults.length).toBe(1);
    expect(combinedResults[0].username).toBe('user2');
    expect(combinedResults[0].isActive).toBe(true);
    expect(combinedResults[0].roles).toContain(UserRole.USER);
  });

  it('should properly combine multiple query conditions with AND logic', async () => {
    // Create test users with specific combinations
    await repository.create({
      username: 'activeadmin',
      email: 'activeadmin@test.com',
      passwordHash: 'hash1',
      isActive: true,
      roles: [UserRole.ADMIN],
    });
    await repository.create({
      username: 'inactiveadmin',
      email: 'inactiveadmin@test.com',
      passwordHash: 'hash2',
      isActive: false,
      roles: [UserRole.ADMIN],
    });
    await repository.create({
      username: 'activeuser',
      email: 'activeuser@test.com',
      passwordHash: 'hash3',
      isActive: true,
      roles: [UserRole.USER],
    });

    // Test username + isActive combination
    const activeUsersWithTest = await repository.findByQuery({
      username: 'active',
      isActive: true,
    });
    expect(activeUsersWithTest.length).toBe(2); // activeadmin and activeuser
    expect(activeUsersWithTest.every((u) => u.isActive)).toBe(true);
    expect(
      activeUsersWithTest.every((u) => u.username.includes('active'))
    ).toBe(true);

    // Test email + role combination
    const adminWithTestEmail = await repository.findByQuery({
      email: 'test.com',
      role: UserRole.ADMIN,
    });
    expect(adminWithTestEmail.length).toBe(2); // both admin users
    expect(
      adminWithTestEmail.every((u) => u.roles.includes(UserRole.ADMIN))
    ).toBe(true);
    expect(adminWithTestEmail.every((u) => u.email.includes('test.com'))).toBe(
      true
    );

    // Test three conditions combined
    const specificUser = await repository.findByQuery({
      username: 'active',
      isActive: true,
      role: UserRole.ADMIN,
    });
    expect(specificUser.length).toBe(1); // only activeadmin
    expect(specificUser[0].username).toBe('activeadmin');
  });

  it('should count users by query', async () => {
    // Create test users
    await repository.create({
      username: 'count1',
      email: 'count1@example.com',
      passwordHash: 'hash1',
      isActive: true,
      roles: [UserRole.ADMIN],
    });
    await repository.create({
      username: 'count2',
      email: 'count2@example.com',
      passwordHash: 'hash2',
      isActive: false,
      roles: [UserRole.USER],
    });

    // Count all
    const allCount = await repository.countByQuery({});
    expect(allCount).toBe(2);

    // Count by isActive
    const activeCount = await repository.countByQuery({ isActive: true });
    expect(activeCount).toBe(1);

    // Count by role
    const adminCount = await repository.countByQuery({ role: UserRole.ADMIN });
    expect(adminCount).toBe(1);
  });

  it('should expose a mapper through getMapper()', async () => {
    // Verify the mapper is accessible
    const mapper = repository.getMapper();
    expect(mapper).toBeDefined();
    expect(mapper.toDomain).toBeInstanceOf(Function);
  });
});
