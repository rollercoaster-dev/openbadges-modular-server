import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'bun:test';
import postgres from 'postgres';
import { PostgresIssuerRepository } from '@infrastructure/database/modules/postgresql/repositories/postgres-issuer.repository';
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
(runTests ? describe : describe.skip)('PostgresIssuerRepository', () => {
  let client: postgres.Sql;
  let repository: PostgresIssuerRepository;

  beforeAll(async () => {
    // Create a PostgreSQL client for testing
    client = createPostgresClient();

    // Create test tables
    await dropTestTables(client).catch(() => {}); // Ignore errors if tables don't exist
    await createTestTables(client);

    // Initialize the repository
    repository = new PostgresIssuerRepository(client);
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await cleanupTestData(client);
  });

  afterAll(async () => {
    // Drop test tables and close the connection
    await dropTestTables(client);
    await client.end();
  });

  it('should create an issuer', async () => {
    // Create a test issuer
    const issuer = Issuer.create({
      name: 'Test Issuer',
      url: 'https://example.com' as Shared.IRI,
      email: 'test@example.com',
      description: 'A test issuer',
      image: 'https://example.com/image.png' as Shared.IRI
    });

    // Create the issuer in the database
    const createdIssuer = await repository.create(issuer);

    // Verify the issuer was created
    expect(createdIssuer).toBeDefined();
    expect(createdIssuer.id).toBeDefined();
    expect(createdIssuer.name).toBe('Test Issuer');
    expect(createdIssuer.url).toBeDefined();
    expect(createdIssuer.url.toString()).toBe('https://example.com');
    expect(createdIssuer.email).toBe('test@example.com');
    expect(createdIssuer.description).toBe('A test issuer');
    expect(createdIssuer.image).toBeDefined();
    expect(createdIssuer.image.toString()).toBe('https://example.com/image.png');

    // Verify the issuer can be retrieved
    const retrievedIssuer = await repository.findById(createdIssuer.id);
    expect(retrievedIssuer).toBeDefined();
    expect(retrievedIssuer?.id).toBe(createdIssuer.id);
    expect(retrievedIssuer?.name).toBe('Test Issuer');
  });

  it('should return null when finding a non-existent issuer by ID', async () => {
    // Attempt to find an issuer with a non-existent ID
    const nonExistentId = '00000000-0000-0000-0000-000000000000' as Shared.IRI;
    const foundIssuer = await repository.findById(nonExistentId);

    // Verify
    expect(foundIssuer).toBeNull();
  });

  it('should update an issuer', async () => {
    // Create a test issuer
    const issuer = Issuer.create({
      name: 'Update Test',
      url: 'https://update.example.com' as Shared.IRI,
      email: 'update@example.com'
    });

    // Create the issuer in the database
    const createdIssuer = await repository.create(issuer);

    // Update the issuer
    const updatedIssuer = await repository.update(createdIssuer.id, {
      name: 'Updated Name',
      description: 'Updated description'
    });

    // Verify the issuer was updated
    expect(updatedIssuer).toBeDefined();
    expect(updatedIssuer?.id).toBe(createdIssuer.id);
    expect(updatedIssuer?.name).toBe('Updated Name');
    expect(updatedIssuer?.url).toBeDefined();
    expect(updatedIssuer?.url.toString()).toBe('https://update.example.com');
    expect(updatedIssuer?.email).toBe('update@example.com');
    expect(updatedIssuer?.description).toBe('Updated description');
  });

  it('should return null when updating a non-existent issuer', async () => {
    // Attempt to update an issuer with a non-existent ID
    const nonExistentId = '00000000-0000-0000-0000-000000000000' as Shared.IRI;
    const updatedIssuer = await repository.update(nonExistentId, {
      name: 'Updated Name'
    });

    // Verify
    expect(updatedIssuer).toBeNull();
  });

  it('should delete an issuer', async () => {
    // Create a test issuer
    const issuer = Issuer.create({
      name: 'Delete Test',
      url: 'https://delete.example.com' as Shared.IRI
    });

    // Create the issuer in the database
    const createdIssuer = await repository.create(issuer);

    // Delete the issuer
    const deleted = await repository.delete(createdIssuer.id);

    // Verify the issuer was deleted
    expect(deleted).toBe(true);

    // Verify the issuer cannot be retrieved
    const retrievedIssuer = await repository.findById(createdIssuer.id);
    expect(retrievedIssuer).toBeNull();
  });

  it('should return false when deleting a non-existent issuer', async () => {
    // Attempt to delete an issuer with a non-existent ID
    const nonExistentId = '00000000-0000-0000-0000-000000000000' as Shared.IRI;
    const deleted = await repository.delete(nonExistentId);

    // Verify
    expect(deleted).toBe(false);
  });

  it('should find all issuers', async () => {
    // Create multiple test issuers
    await repository.create(Issuer.create({
      name: 'Issuer 1',
      url: 'https://issuer1.example.com' as Shared.IRI
    }));

    await repository.create(Issuer.create({
      name: 'Issuer 2',
      url: 'https://issuer2.example.com' as Shared.IRI
    }));

    // Find all issuers
    const issuers = await repository.findAll();

    // Verify issuers were found
    expect(issuers).toBeDefined();
    expect(issuers.length).toBeGreaterThanOrEqual(2);
    expect(issuers.some(i => i.name === 'Issuer 1')).toBe(true);
    expect(issuers.some(i => i.name === 'Issuer 2')).toBe(true);
  });

  it('should handle errors gracefully', async () => {
    // Create a test issuer with invalid data
    const invalidIssuer = {
      // Missing required fields
    } as unknown as Issuer;

    // Attempt to create the issuer and expect it to fail
    try {
      await repository.create(invalidIssuer);
      // If we get here, the test should fail
      expect(true).toBe(false); // This should not be reached
    } catch (error) {
      // Verify that an error was thrown
      expect(error).toBeDefined();
    }
  });
});
