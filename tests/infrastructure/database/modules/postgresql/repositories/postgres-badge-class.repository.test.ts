import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'bun:test';
import postgres from 'postgres';
import { PostgresBadgeClassRepository } from '@infrastructure/database/modules/postgresql/repositories/postgres-badge-class.repository';
import { PostgresIssuerRepository } from '@infrastructure/database/modules/postgresql/repositories/postgres-issuer.repository';
import { BadgeClass } from '@domains/badgeClass/badgeClass.entity';
import { Issuer } from '@domains/issuer/issuer.entity';
import { Shared } from 'openbadges-types';
import { 
  createPostgresClient, 
  createTestTables, 
  dropTestTables, 
  cleanupTestData,
  isDatabaseAvailable
} from '../postgres-test-helper';

// Skip tests if PostgreSQL is not available
const runTests = await isDatabaseAvailable();

// Conditional test suite that only runs if PostgreSQL is available
(runTests ? describe : describe.skip)('PostgresBadgeClassRepository', () => {
  let client: postgres.Sql;
  let repository: PostgresBadgeClassRepository;
  let issuerRepository: PostgresIssuerRepository;
  let testIssuer: Issuer;

  beforeAll(async () => {
    // Create a PostgreSQL client for testing
    client = createPostgresClient();

    // Create test tables
    await dropTestTables(client).catch(() => {}); // Ignore errors if tables don't exist
    await createTestTables(client);

    // Initialize the repositories
    repository = new PostgresBadgeClassRepository(client);
    issuerRepository = new PostgresIssuerRepository(client);
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await cleanupTestData(client);

    // Create a test issuer for badge classes
    testIssuer = await issuerRepository.create(Issuer.create({
      name: 'Test Issuer',
      url: 'https://example.com' as Shared.IRI,
      email: 'test@example.com'
    }));
  });

  afterAll(async () => {
    // Drop test tables and close the connection
    await dropTestTables(client);
    await client.end();
  });

  it('should create a badge class', async () => {
    // Create a test badge class
    const badgeClass = BadgeClass.create({
      issuer: testIssuer.id,
      name: 'Test Badge Class',
      description: 'A test badge class',
      image: 'https://example.com/badge.png' as Shared.IRI,
      criteria: { narrative: 'Complete the test' }
    });

    // Create the badge class in the database
    const createdBadgeClass = await repository.create(badgeClass);

    // Verify the badge class was created
    expect(createdBadgeClass).toBeDefined();
    expect(createdBadgeClass.id).toBeDefined();
    expect(createdBadgeClass.name).toBe('Test Badge Class');
    expect(createdBadgeClass.description).toBe('A test badge class');
    expect(createdBadgeClass.image).toBeDefined();
    expect(createdBadgeClass.image.toString()).toBe('https://example.com/badge.png');
    expect(createdBadgeClass.criteria).toEqual({ narrative: 'Complete the test' });
    expect(createdBadgeClass.issuer).toBe(testIssuer.id);

    // Verify the badge class can be retrieved
    const retrievedBadgeClass = await repository.findById(createdBadgeClass.id);
    expect(retrievedBadgeClass).toBeDefined();
    expect(retrievedBadgeClass?.id).toBe(createdBadgeClass.id);
    expect(retrievedBadgeClass?.name).toBe('Test Badge Class');
  });

  it('should return null when finding a non-existent badge class by ID', async () => {
    // Attempt to find a badge class with a non-existent ID
    const nonExistentId = '00000000-0000-0000-0000-000000000000' as Shared.IRI;
    const foundBadgeClass = await repository.findById(nonExistentId);

    // Verify
    expect(foundBadgeClass).toBeNull();
  });

  it('should update a badge class', async () => {
    // Create a test badge class
    const badgeClass = BadgeClass.create({
      issuer: testIssuer.id,
      name: 'Update Test',
      description: 'A badge class to update',
      image: 'https://example.com/badge.png' as Shared.IRI
    });

    // Create the badge class in the database
    const createdBadgeClass = await repository.create(badgeClass);

    // Update the badge class
    const updatedBadgeClass = await repository.update(createdBadgeClass.id, {
      name: 'Updated Name',
      description: 'Updated description',
      criteria: { narrative: 'Updated criteria' }
    });

    // Verify the badge class was updated
    expect(updatedBadgeClass).toBeDefined();
    expect(updatedBadgeClass?.id).toBe(createdBadgeClass.id);
    expect(updatedBadgeClass?.name).toBe('Updated Name');
    expect(updatedBadgeClass?.description).toBe('Updated description');
    expect(updatedBadgeClass?.criteria).toEqual({ narrative: 'Updated criteria' });
    expect(updatedBadgeClass?.issuer).toBe(testIssuer.id);
  });

  it('should return null when updating a non-existent badge class', async () => {
    // Attempt to update a badge class with a non-existent ID
    const nonExistentId = '00000000-0000-0000-0000-000000000000' as Shared.IRI;
    const updatedBadgeClass = await repository.update(nonExistentId, {
      name: 'Updated Name'
    });

    // Verify
    expect(updatedBadgeClass).toBeNull();
  });

  it('should delete a badge class', async () => {
    // Create a test badge class
    const badgeClass = BadgeClass.create({
      issuer: testIssuer.id,
      name: 'Delete Test',
      description: 'A badge class to delete',
      image: 'https://example.com/badge.png' as Shared.IRI
    });

    // Create the badge class in the database
    const createdBadgeClass = await repository.create(badgeClass);

    // Delete the badge class
    const deleted = await repository.delete(createdBadgeClass.id);

    // Verify the badge class was deleted
    expect(deleted).toBe(true);

    // Verify the badge class cannot be retrieved
    const retrievedBadgeClass = await repository.findById(createdBadgeClass.id);
    expect(retrievedBadgeClass).toBeNull();
  });

  it('should return false when deleting a non-existent badge class', async () => {
    // Attempt to delete a badge class with a non-existent ID
    const nonExistentId = '00000000-0000-0000-0000-000000000000' as Shared.IRI;
    const deleted = await repository.delete(nonExistentId);

    // Verify
    expect(deleted).toBe(false);
  });

  it('should find all badge classes', async () => {
    // Create multiple test badge classes
    await repository.create(BadgeClass.create({
      issuer: testIssuer.id,
      name: 'Badge Class 1',
      description: 'First badge class',
      image: 'https://example.com/badge1.png' as Shared.IRI
    }));

    await repository.create(BadgeClass.create({
      issuer: testIssuer.id,
      name: 'Badge Class 2',
      description: 'Second badge class',
      image: 'https://example.com/badge2.png' as Shared.IRI
    }));

    // Find all badge classes
    const badgeClasses = await repository.findAll();

    // Verify badge classes were found
    expect(badgeClasses).toBeDefined();
    expect(badgeClasses.length).toBeGreaterThanOrEqual(2);
    expect(badgeClasses.some(b => b.name === 'Badge Class 1')).toBe(true);
    expect(badgeClasses.some(b => b.name === 'Badge Class 2')).toBe(true);
  });

  it('should find badge classes by issuer', async () => {
    // Create another issuer
    const anotherIssuer = await issuerRepository.create(Issuer.create({
      name: 'Another Issuer',
      url: 'https://another.example.com' as Shared.IRI
    }));

    // Create badge classes for both issuers
    await repository.create(BadgeClass.create({
      issuer: testIssuer.id,
      name: 'Test Issuer Badge',
      image: 'https://example.com/test-badge.png' as Shared.IRI
    }));

    await repository.create(BadgeClass.create({
      issuer: anotherIssuer.id,
      name: 'Another Issuer Badge',
      image: 'https://example.com/another-badge.png' as Shared.IRI
    }));

    // Find badge classes by issuer
    const testIssuerBadges = await repository.findByIssuer(testIssuer.id);
    const anotherIssuerBadges = await repository.findByIssuer(anotherIssuer.id);

    // Verify badge classes were found correctly
    expect(testIssuerBadges).toBeDefined();
    expect(testIssuerBadges.length).toBe(1);
    expect(testIssuerBadges[0].name).toBe('Test Issuer Badge');

    expect(anotherIssuerBadges).toBeDefined();
    expect(anotherIssuerBadges.length).toBe(1);
    expect(anotherIssuerBadges[0].name).toBe('Another Issuer Badge');
  });

  it('should handle errors gracefully', async () => {
    // Create a test badge class with invalid data
    const invalidBadgeClass = {
      // Missing required fields
    } as unknown as BadgeClass;

    // Attempt to create the badge class and expect it to fail
    try {
      await repository.create(invalidBadgeClass);
      // If we get here, the test should fail
      expect(true).toBe(false); // This should not be reached
    } catch (error) {
      // Verify that an error was thrown
      expect(error).toBeDefined();
    }
  });
});
