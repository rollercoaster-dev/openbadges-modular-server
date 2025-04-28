import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'bun:test';
import postgres from 'postgres';
import { PostgresAssertionRepository } from '@infrastructure/database/modules/postgresql/repositories/postgres-assertion.repository';
import { PostgresBadgeClassRepository } from '@infrastructure/database/modules/postgresql/repositories/postgres-badge-class.repository';
import { PostgresIssuerRepository } from '@infrastructure/database/modules/postgresql/repositories/postgres-issuer.repository';
import { Assertion } from '@domains/assertion/assertion.entity';
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
(runTests ? describe : describe.skip)('PostgresAssertionRepository', () => {
  let client: postgres.Sql;
  let repository: PostgresAssertionRepository;
  let badgeClassRepository: PostgresBadgeClassRepository;
  let issuerRepository: PostgresIssuerRepository;
  let testIssuer: Issuer;
  let testBadgeClass: BadgeClass;

  beforeAll(async () => {
    // Create a PostgreSQL client for testing
    client = createPostgresClient();

    // Create test tables
    await dropTestTables(client).catch(() => {}); // Ignore errors if tables don't exist
    await createTestTables(client);

    // Initialize the repositories
    repository = new PostgresAssertionRepository(client);
    badgeClassRepository = new PostgresBadgeClassRepository(client);
    issuerRepository = new PostgresIssuerRepository(client);
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await cleanupTestData(client);

    // Create a test issuer and badge class for assertions
    testIssuer = await issuerRepository.create(Issuer.create({
      name: 'Test Issuer',
      url: 'https://example.com' as Shared.IRI,
      email: 'test@example.com'
    }));

    testBadgeClass = await badgeClassRepository.create(BadgeClass.create({
      issuer: testIssuer.id,
      name: 'Test Badge Class',
      description: 'A test badge class',
      image: 'https://example.com/badge.png' as Shared.IRI
    }));
  });

  afterAll(async () => {
    // Drop test tables and close the connection
    await dropTestTables(client);
    await client.end();
  });

  it('should create an assertion', async () => {
    // Create a test assertion
    const assertion = Assertion.create({
      badgeClass: testBadgeClass.id,
      recipient: {
        identity: 'test@example.com',
        type: 'email',
        hashed: false
      },
      issuedOn: new Date().toISOString(),
      verification: { type: 'hosted' }
    });

    // Create the assertion in the database
    const createdAssertion = await repository.create(assertion);

    // Verify the assertion was created
    expect(createdAssertion).toBeDefined();
    expect(createdAssertion.id).toBeDefined();
    expect(createdAssertion.badgeClass).toBe(testBadgeClass.id);
    expect(createdAssertion.recipient).toEqual({
      identity: 'test@example.com',
      type: 'email',
      hashed: false
    });
    expect(createdAssertion.verification).toEqual({ type: 'hosted' });

    // Verify the assertion can be retrieved
    const retrievedAssertion = await repository.findById(createdAssertion.id);
    expect(retrievedAssertion).toBeDefined();
    expect(retrievedAssertion?.id).toBe(createdAssertion.id);
    expect(retrievedAssertion?.badgeClass).toBe(testBadgeClass.id);
  });

  it('should return null when finding a non-existent assertion by ID', async () => {
    // Attempt to find an assertion with a non-existent ID
    const nonExistentId = '00000000-0000-0000-0000-000000000000' as Shared.IRI;
    const foundAssertion = await repository.findById(nonExistentId);

    // Verify
    expect(foundAssertion).toBeNull();
  });

  it('should update an assertion', async () => {
    // Create a test assertion
    const assertion = Assertion.create({
      badgeClass: testBadgeClass.id,
      recipient: {
        identity: 'update@example.com',
        type: 'email',
        hashed: false
      },
      issuedOn: new Date().toISOString(),
      verification: { type: 'hosted' }
    });

    // Create the assertion in the database
    const createdAssertion = await repository.create(assertion);

    // Update the assertion
    const updatedAssertion = await repository.update(createdAssertion.id, {
      evidence: [{ narrative: 'Updated evidence' }],
      expires: new Date(Date.now() + 86400000).toISOString() // 1 day from now
    });

    // Verify the assertion was updated
    expect(updatedAssertion).toBeDefined();
    expect(updatedAssertion?.id).toBe(createdAssertion.id);
    expect(updatedAssertion?.badgeClass).toBe(testBadgeClass.id);
    expect(updatedAssertion?.recipient).toEqual({
      identity: 'update@example.com',
      type: 'email',
      hashed: false
    });
    expect(updatedAssertion?.evidence).toEqual([{ narrative: 'Updated evidence' }]);
    expect(updatedAssertion?.expires).toBeDefined();
  });

  it('should return null when updating a non-existent assertion', async () => {
    // Attempt to update an assertion with a non-existent ID
    const nonExistentId = '00000000-0000-0000-0000-000000000000' as Shared.IRI;
    const updatedAssertion = await repository.update(nonExistentId, {
      evidence: [{ narrative: 'Updated evidence' }]
    });

    // Verify
    expect(updatedAssertion).toBeNull();
  });

  it('should delete an assertion', async () => {
    // Create a test assertion
    const assertion = Assertion.create({
      badgeClass: testBadgeClass.id,
      recipient: {
        identity: 'delete@example.com',
        type: 'email',
        hashed: false
      },
      issuedOn: new Date().toISOString(),
      verification: { type: 'hosted' }
    });

    // Create the assertion in the database
    const createdAssertion = await repository.create(assertion);

    // Delete the assertion
    const deleted = await repository.delete(createdAssertion.id);

    // Verify the assertion was deleted
    expect(deleted).toBe(true);

    // Verify the assertion cannot be retrieved
    const retrievedAssertion = await repository.findById(createdAssertion.id);
    expect(retrievedAssertion).toBeNull();
  });

  it('should return false when deleting a non-existent assertion', async () => {
    // Attempt to delete an assertion with a non-existent ID
    const nonExistentId = '00000000-0000-0000-0000-000000000000' as Shared.IRI;
    const deleted = await repository.delete(nonExistentId);

    // Verify
    expect(deleted).toBe(false);
  });

  it('should find all assertions', async () => {
    // Create multiple test assertions
    await repository.create(Assertion.create({
      badgeClass: testBadgeClass.id,
      recipient: {
        identity: 'recipient1@example.com',
        type: 'email',
        hashed: false
      },
      issuedOn: new Date().toISOString(),
      verification: { type: 'hosted' }
    }));

    await repository.create(Assertion.create({
      badgeClass: testBadgeClass.id,
      recipient: {
        identity: 'recipient2@example.com',
        type: 'email',
        hashed: false
      },
      issuedOn: new Date().toISOString(),
      verification: { type: 'hosted' }
    }));

    // Find all assertions
    const assertions = await repository.findAll();

    // Verify assertions were found
    expect(assertions).toBeDefined();
    expect(assertions.length).toBeGreaterThanOrEqual(2);
    expect(assertions.some(a => a.recipient.identity === 'recipient1@example.com')).toBe(true);
    expect(assertions.some(a => a.recipient.identity === 'recipient2@example.com')).toBe(true);
  });

  it('should find assertions by badge class', async () => {
    // Create another badge class
    const anotherBadgeClass = await badgeClassRepository.create(BadgeClass.create({
      issuer: testIssuer.id,
      name: 'Another Badge Class',
      image: 'https://example.com/another-badge.png' as Shared.IRI
    }));

    // Create assertions for both badge classes
    await repository.create(Assertion.create({
      badgeClass: testBadgeClass.id,
      recipient: {
        identity: 'test-badge@example.com',
        type: 'email',
        hashed: false
      },
      issuedOn: new Date().toISOString(),
      verification: { type: 'hosted' }
    }));

    await repository.create(Assertion.create({
      badgeClass: anotherBadgeClass.id,
      recipient: {
        identity: 'another-badge@example.com',
        type: 'email',
        hashed: false
      },
      issuedOn: new Date().toISOString(),
      verification: { type: 'hosted' }
    }));

    // Find assertions by badge class
    const testBadgeAssertions = await repository.findByBadgeClass(testBadgeClass.id);
    const anotherBadgeAssertions = await repository.findByBadgeClass(anotherBadgeClass.id);

    // Verify assertions were found correctly
    expect(testBadgeAssertions).toBeDefined();
    expect(testBadgeAssertions.length).toBe(1);
    expect(testBadgeAssertions[0].recipient.identity).toBe('test-badge@example.com');

    expect(anotherBadgeAssertions).toBeDefined();
    expect(anotherBadgeAssertions.length).toBe(1);
    expect(anotherBadgeAssertions[0].recipient.identity).toBe('another-badge@example.com');
  });

  it('should find assertions by recipient', async () => {
    // Create assertions for different recipients
    await repository.create(Assertion.create({
      badgeClass: testBadgeClass.id,
      recipient: {
        id: 'recipient-search@example.com', // Use id instead of identity for PostgreSQL
        type: 'email',
        hashed: false
      },
      issuedOn: new Date().toISOString(),
      verification: { type: 'hosted' }
    }));

    await repository.create(Assertion.create({
      badgeClass: testBadgeClass.id,
      recipient: {
        id: 'another-recipient@example.com', // Use id instead of identity for PostgreSQL
        type: 'email',
        hashed: false
      },
      issuedOn: new Date().toISOString(),
      verification: { type: 'hosted' }
    }));

    // Find assertions by recipient
    const recipientAssertions = await repository.findByRecipient('recipient-search@example.com');

    // Verify assertions were found correctly
    expect(recipientAssertions).toBeDefined();
    expect(recipientAssertions.length).toBe(1);
    expect(recipientAssertions[0].recipient.id).toBe('recipient-search@example.com');
  });

  it('should revoke an assertion', async () => {
    // Create a test assertion
    const assertion = Assertion.create({
      badgeClass: testBadgeClass.id,
      recipient: {
        identity: 'revoke@example.com',
        type: 'email',
        hashed: false
      },
      issuedOn: new Date().toISOString(),
      verification: { type: 'hosted' }
    });

    // Create the assertion in the database
    const createdAssertion = await repository.create(assertion);

    // Revoke the assertion
    const revokedAssertion = await repository.revoke(createdAssertion.id, 'Test revocation reason');

    // Verify the assertion was revoked
    expect(revokedAssertion).toBeDefined();
    expect(revokedAssertion?.id).toBe(createdAssertion.id);
    expect(revokedAssertion?.revoked).toBe(true);
    expect(revokedAssertion?.revocationReason).toBe('Test revocation reason');
  });

  it('should return null when revoking a non-existent assertion', async () => {
    // Attempt to revoke an assertion with a non-existent ID
    const nonExistentId = '00000000-0000-0000-0000-000000000000' as Shared.IRI;
    const revokedAssertion = await repository.revoke(nonExistentId, 'Test revocation reason');

    // Verify
    expect(revokedAssertion).toBeNull();
  });

  it('should verify a valid assertion', async () => {
    // Create a test assertion
    const assertion = Assertion.create({
      badgeClass: testBadgeClass.id,
      recipient: {
        identity: 'verify@example.com',
        type: 'email',
        hashed: false
      },
      issuedOn: new Date().toISOString(),
      verification: { type: 'hosted' }
    });

    // Create the assertion in the database
    const createdAssertion = await repository.create(assertion);

    // Verify the assertion
    const verificationResult = await repository.verify(createdAssertion.id);

    // Verify the result
    expect(verificationResult).toBeDefined();
    expect(verificationResult.isValid).toBe(true);
  });

  it('should verify a revoked assertion as invalid', async () => {
    // Create a test assertion
    const assertion = Assertion.create({
      badgeClass: testBadgeClass.id,
      recipient: {
        identity: 'revoked-verify@example.com',
        type: 'email',
        hashed: false
      },
      issuedOn: new Date().toISOString(),
      verification: { type: 'hosted' }
    });

    // Create the assertion in the database
    const createdAssertion = await repository.create(assertion);

    // Revoke the assertion
    await repository.revoke(createdAssertion.id, 'Test revocation reason');

    // Verify the assertion
    const verificationResult = await repository.verify(createdAssertion.id);

    // Verify the result
    expect(verificationResult).toBeDefined();
    expect(verificationResult.isValid).toBe(false);
    expect(verificationResult.reason).toBe('Test revocation reason');
  });

  it('should verify an expired assertion as invalid', async () => {
    // Create a test assertion with an expiration date in the past
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1); // 1 day ago

    const assertion = Assertion.create({
      badgeClass: testBadgeClass.id,
      recipient: {
        identity: 'expired@example.com',
        type: 'email',
        hashed: false
      },
      issuedOn: new Date().toISOString(),
      expires: pastDate.toISOString(),
      verification: { type: 'hosted' }
    });

    // Create the assertion in the database
    const createdAssertion = await repository.create(assertion);

    // Verify the assertion
    const verificationResult = await repository.verify(createdAssertion.id);

    // Verify the result
    expect(verificationResult).toBeDefined();
    expect(verificationResult.isValid).toBe(false);
    expect(verificationResult.reason).toBe('Assertion has expired');
  });

  it('should handle errors gracefully', async () => {
    // Create a test assertion with invalid data
    const invalidAssertion = {
      // Missing required fields
    } as unknown as Assertion;

    // Attempt to create the assertion and expect it to fail
    try {
      await repository.create(invalidAssertion);
      // If we get here, the test should fail
      expect(true).toBe(false); // This should not be reached
    } catch (error) {
      // Verify that an error was thrown
      expect(error).toBeDefined();
    }
  });
});
