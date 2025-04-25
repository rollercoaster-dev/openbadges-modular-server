/**
 * Integration tests for the PostgreSQL repositories
 *
 * This file contains tests for the PostgreSQL repository implementations
 * to ensure they correctly interact with the database.
 *
 * Note: These tests require a PostgreSQL database to be running.
 * They will create and use a test database.
 */

import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'bun:test';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

import { PostgresIssuerRepository } from '../../../../../src/infrastructure/database/modules/postgresql/repositories/postgres-issuer.repository';
import { PostgresBadgeClassRepository } from '../../../../../src/infrastructure/database/modules/postgresql/repositories/postgres-badge-class.repository';
import { PostgresAssertionRepository } from '../../../../../src/infrastructure/database/modules/postgresql/repositories/postgres-assertion.repository';
import { Issuer } from '../../../../../src/domains/issuer/issuer.entity';
import { BadgeClass } from '../../../../../src/domains/badgeClass/badgeClass.entity';
import { Assertion } from '../../../../../src/domains/assertion/assertion.entity';
import * as schema from '../../../../../src/infrastructure/database/modules/postgresql/schema';
import { Shared } from 'openbadges-types';

// Skip PostgreSQL tests in CI environment
const isCI = process.env.CI === 'true';

// Only try to connect if not in CI
let canConnect = false;
if (!isCI) {
  try {
    const sql = postgres(process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/openbadges_test');
    await sql`SELECT 1`;
    await sql.end();
    canConnect = true;
  } catch (error) {
    console.log('Could not connect to PostgreSQL:', error.message);
    // No connection
  }
}

const describePg = canConnect ? describe : describe.skip;

// Mock database connection for testing
// In a real implementation, use a test database
const TEST_DB_URL = process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/openbadges_test';

describePg('PostgreSQL Repositories', () => {
  let client: postgres.Sql;
  let db: ReturnType<typeof drizzle>;
  let issuerRepository: PostgresIssuerRepository;
  let badgeClassRepository: PostgresBadgeClassRepository;
  let assertionRepository: PostgresAssertionRepository;

  // Test data
  const testIssuerData = {
    name: 'Test University',
    url: 'https://test.edu' as Shared.IRI,
    email: 'badges@test.edu',
    description: 'A test university for testing',
    image: 'https://test.edu/logo.png' as Shared.IRI
  };

  // Setup database connection
  beforeAll(async () => {
    // Connect to database
    client = postgres(TEST_DB_URL);
    db = drizzle(client);

    // Create repositories
    issuerRepository = new PostgresIssuerRepository(client);
    badgeClassRepository = new PostgresBadgeClassRepository(client);
    assertionRepository = new PostgresAssertionRepository(client);

    // Run migrations or create tables
    try {
      // For testing purposes, we'll just create the tables directly
      // In a real implementation, use migrations
      await db.execute(/* sql */`
        DROP TABLE IF EXISTS assertions;
        DROP TABLE IF EXISTS badge_classes;
        DROP TABLE IF EXISTS issuers;

        CREATE TABLE IF NOT EXISTS issuers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          url TEXT NOT NULL,
          email TEXT,
          description TEXT,
          image TEXT,
          "publicKey" JSONB,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "additionalFields" JSONB
        );

        CREATE TABLE IF NOT EXISTS badge_classes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "issuerId" UUID NOT NULL REFERENCES issuers(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          description TEXT NOT NULL,
          image TEXT NOT NULL,
          criteria JSONB NOT NULL,
          alignment JSONB,
          tags JSONB,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "additionalFields" JSONB
        );

        CREATE TABLE IF NOT EXISTS assertions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "badgeClassId" UUID NOT NULL REFERENCES badge_classes(id) ON DELETE CASCADE,
          recipient JSONB NOT NULL,
          "issuedOn" TIMESTAMP NOT NULL DEFAULT NOW(),
          expires TIMESTAMP,
          evidence JSONB,
          verification JSONB,
          revoked JSONB,
          "revocationReason" TEXT,
          "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
          "additionalFields" JSONB
        );
      `);
    } catch (error) {
      console.error('Error setting up test database:', error);
      throw error;
    }
  });

  // Clean up database connection
  afterAll(async () => {
    // Drop tables
    await db.execute(/* sql */`
      DROP TABLE IF EXISTS assertions;
      DROP TABLE IF EXISTS badge_classes;
      DROP TABLE IF EXISTS issuers;
    `);

    // Close connection
    await client.end();
  });

  // Clean up data before each test
  beforeEach(async () => {
    // Clear tables
    await db.delete(schema.assertions);
    await db.delete(schema.badgeClasses);
    await db.delete(schema.issuers);
  });

  describe('IssuerRepository', () => {
    it('should create an issuer', async () => {
      // Create issuer entity
      const issuer = Issuer.create(testIssuerData);

      // Save to repository
      const createdIssuer = await issuerRepository.create(issuer);

      // Verify
      expect(createdIssuer).toBeDefined();
      expect(createdIssuer.id).toBeDefined();
      expect(createdIssuer.name).toBe(testIssuerData.name);
      expect(createdIssuer.url).toBe(testIssuerData.url);
      expect(createdIssuer.email).toBe(testIssuerData.email);
      expect(createdIssuer.description).toBe(testIssuerData.description);
      expect(createdIssuer.image).toBe(testIssuerData.image);
    });

    it('should find an issuer by ID', async () => {
      // Create issuer entity
      const issuer = Issuer.create(testIssuerData);

      // Save to repository
      const createdIssuer = await issuerRepository.create(issuer);

      // Find by ID
      const foundIssuer = await issuerRepository.findById(createdIssuer.id);

      // Verify
      expect(foundIssuer).toBeDefined();
      expect(foundIssuer!.id).toBe(createdIssuer.id);
      expect(foundIssuer!.name).toBe(testIssuerData.name);
      expect(foundIssuer!.url).toBe(testIssuerData.url);
    });

    it('should return null when finding a non-existent issuer by ID', async () => {
      // Attempt to find an issuer with a non-existent ID
      const nonExistentId = '00000000-0000-0000-0000-000000000000' as Shared.IRI;
      const foundIssuer = await issuerRepository.findById(nonExistentId);

      // Verify
      expect(foundIssuer).toBeNull();
    });

    it('should update an issuer', async () => {
      // Create issuer entity
      const issuer = Issuer.create(testIssuerData);

      // Save to repository
      const createdIssuer = await issuerRepository.create(issuer);

      // Update issuer
      const updatedIssuer = await issuerRepository.update(createdIssuer.id, {
        name: 'Updated University',
        description: 'An updated description'
      });

      // Verify
      expect(updatedIssuer).toBeDefined();
      expect(updatedIssuer!.id).toBe(createdIssuer.id);
      expect(updatedIssuer!.name).toBe('Updated University');
      expect(updatedIssuer!.description).toBe('An updated description');
      expect(updatedIssuer!.url).toBe(testIssuerData.url); // Unchanged
    });

    it('should return false when updating a non-existent issuer', async () => {
      // Attempt to update an issuer with a non-existent ID
      const nonExistentId = '00000000-0000-0000-0000-000000000000' as Shared.IRI;
      const updatedIssuer = await issuerRepository.update(nonExistentId, {
        name: 'Updated University',
        description: 'An updated description'
      });

      // Verify
      expect(updatedIssuer).toBeNull();
    });

    it('should delete an issuer', async () => {
      // Create issuer entity
      const issuer = Issuer.create(testIssuerData);

      // Save to repository
      const createdIssuer = await issuerRepository.create(issuer);

      // Delete issuer
      const deleted = await issuerRepository.delete(createdIssuer.id);

      // Verify
      expect(deleted).toBe(true);

      // Try to find the deleted issuer
      const foundIssuer = await issuerRepository.findById(createdIssuer.id);

      // Verify it's gone
      expect(foundIssuer).toBeNull();
    });

    it('should return false when deleting a non-existent issuer', async () => {
      // Attempt to delete an issuer with a non-existent ID
      const nonExistentId = '00000000-0000-0000-0000-000000000000' as Shared.IRI;
      const deleted = await issuerRepository.delete(nonExistentId);

      // Verify
      expect(deleted).toBe(false);
    });

    it('should find all issuers', async () => {
      // Create multiple issuers
      const issuer1 = Issuer.create({ ...testIssuerData, name: 'Issuer 1', url: 'https://issuer1.test' as Shared.IRI });
      const issuer2 = Issuer.create({ ...testIssuerData, name: 'Issuer 2', url: 'https://issuer2.test' as Shared.IRI });
      await issuerRepository.create(issuer1);
      await issuerRepository.create(issuer2);

      // Find all issuers
      const allIssuers = await issuerRepository.findAll();

      // Verify
      expect(allIssuers).toBeDefined();
      expect(allIssuers.length).toBe(2);
      expect(allIssuers.some(i => i.name === 'Issuer 1')).toBe(true);
      expect(allIssuers.some(i => i.name === 'Issuer 2')).toBe(true);
    });

    it('should return an empty array when finding all issuers and none exist', async () => {
      // Find all issuers when the table is empty
      const allIssuers = await issuerRepository.findAll();

      // Verify
      expect(allIssuers).toBeDefined();
      expect(allIssuers.length).toBe(0);
    });
  });

  describe('BadgeClassRepository', () => {
    let testIssuer: Issuer;

    beforeEach(async () => {
      // Create a test issuer for badge classes
      const issuer = Issuer.create(testIssuerData);
      testIssuer = await issuerRepository.create(issuer);
    });

    it('should create a badge class', async () => {
      // Create badge class entity
      const badgeClass = BadgeClass.create({
        issuer: testIssuer.id as Shared.IRI,
        name: 'Test Badge',
        description: 'A test badge for testing',
        image: 'https://test.edu/badges/test.png' as Shared.IRI,
        criteria: {
          narrative: 'Complete the test'
        }
      });

      // Save to repository
      const createdBadgeClass = await badgeClassRepository.create(badgeClass);

      // Verify
      expect(createdBadgeClass).toBeDefined();
      expect(createdBadgeClass.id).toBeDefined();
      expect(createdBadgeClass.issuer).toBe(testIssuer.id);
      expect(createdBadgeClass.name).toBe('Test Badge');
      expect(createdBadgeClass.description).toBe('A test badge for testing');
      expect(createdBadgeClass.image).toBe('https://test.edu/badges/test.png' as Shared.IRI);
      expect(createdBadgeClass.criteria).toEqual({
        narrative: 'Complete the test'
      });
    });

    it('should find a badge class by ID', async () => {
      // Create badge class entity
      const badgeClass = BadgeClass.create({
        issuer: testIssuer.id as Shared.IRI,
        name: 'Test Badge',
        description: 'A test badge for testing',
        image: 'https://test.edu/badges/test.png' as Shared.IRI,
        criteria: {
          narrative: 'Complete the test'
        }
      });

      // Save to repository
      const createdBadgeClass = await badgeClassRepository.create(badgeClass);

      // Find by ID
      const foundBadgeClass = await badgeClassRepository.findById(createdBadgeClass.id);

      // Verify
      expect(foundBadgeClass).toBeDefined();
      expect(foundBadgeClass!.id).toBe(createdBadgeClass.id);
      expect(foundBadgeClass!.issuer).toBe(testIssuer.id);
      expect(foundBadgeClass!.name).toBe('Test Badge');
    });

    it('should return null when finding a non-existent badge class by ID', async () => {
      // Attempt to find a badge class with a non-existent ID
      const nonExistentId = '00000000-0000-0000-0000-000000000000' as Shared.IRI;
      const foundBadgeClass = await badgeClassRepository.findById(nonExistentId);

      // Verify
      expect(foundBadgeClass).toBeNull();
    });

    it('should find badge classes by issuer', async () => {
      // Create multiple badge classes
      const badgeClass1 = BadgeClass.create({
        issuer: testIssuer.id as Shared.IRI,
        name: 'Test Badge 1',
        description: 'A test badge for testing',
        image: 'https://test.edu/badges/test1.png' as Shared.IRI,
        criteria: {
          narrative: 'Complete the test'
        }
      });

      const badgeClass2 = BadgeClass.create({
        issuer: testIssuer.id as Shared.IRI,
        name: 'Test Badge 2',
        description: 'Another test badge for testing',
        image: 'https://test.edu/badges/test2.png' as Shared.IRI,
        criteria: {
          narrative: 'Complete the test again'
        }
      });

      // Save to repository
      await badgeClassRepository.create(badgeClass1);
      await badgeClassRepository.create(badgeClass2);

      // Find by issuer
      const foundBadgeClasses = await badgeClassRepository.findByIssuer(testIssuer.id);

      // Verify
      expect(foundBadgeClasses).toBeDefined();
      expect(foundBadgeClasses.length).toBe(2);
      expect(foundBadgeClasses[0].issuer).toBe(testIssuer.id);
      expect(foundBadgeClasses[1].issuer).toBe(testIssuer.id);
    });

    it('should return an empty array when finding badge classes by issuer and none exist', async () => {
      // Find by issuer when the table is empty
      const foundBadgeClasses = await badgeClassRepository.findByIssuer(testIssuer.id);

      // Verify
      expect(foundBadgeClasses).toBeDefined();
      expect(foundBadgeClasses.length).toBe(0);
    });

    it('should find all badge classes', async () => {
      // Create multiple badge classes for the same issuer
      const badgeClass1 = BadgeClass.create({
        issuer: testIssuer.id as Shared.IRI,
        name: 'Badge 1',
        description: 'Description 1',
        image: 'https://test.edu/badge1.png' as Shared.IRI,
        criteria: { narrative: 'Criteria 1' }
      });
      const badgeClass2 = BadgeClass.create({
        issuer: testIssuer.id as Shared.IRI,
        name: 'Badge 2',
        description: 'Description 2',
        image: 'https://test.edu/badge2.png' as Shared.IRI,
        criteria: { narrative: 'Criteria 2' }
      });
      await badgeClassRepository.create(badgeClass1);
      await badgeClassRepository.create(badgeClass2);

      // Find all badge classes
      const allBadgeClasses = await badgeClassRepository.findAll();

      // Verify
      expect(allBadgeClasses).toBeDefined();
      expect(allBadgeClasses.length).toBe(2);
      expect(allBadgeClasses.some(b => b.name === 'Badge 1')).toBe(true);
      expect(allBadgeClasses.some(b => b.name === 'Badge 2')).toBe(true);
    });

    it('should return an empty array when finding all badge classes and none exist', async () => {
      // Find all badge classes when the table is empty
      const allBadgeClasses = await badgeClassRepository.findAll();

      // Verify
      expect(allBadgeClasses).toBeDefined();
      expect(allBadgeClasses.length).toBe(0);
    });

    it('should update a badge class', async () => {
      // Create badge class entity
      const badgeClass = BadgeClass.create({
        issuer: testIssuer.id as Shared.IRI,
        name: 'Test Badge',
        description: 'A test badge for testing',
        image: 'https://test.edu/badges/test.png' as Shared.IRI,
        criteria: {
          narrative: 'Complete the test'
        }
      });

      // Save to repository
      const createdBadgeClass = await badgeClassRepository.create(badgeClass);

      // Update badge class
      const updatedBadgeClass = await badgeClassRepository.update(createdBadgeClass.id, {
        name: 'Updated Badge',
        description: 'An updated description'
      });

      // Verify
      expect(updatedBadgeClass).toBeDefined();
      expect(updatedBadgeClass!.id).toBe(createdBadgeClass.id);
      expect(updatedBadgeClass!.name).toBe('Updated Badge');
      expect(updatedBadgeClass!.description).toBe('An updated description');
      expect(updatedBadgeClass!.issuer).toBe(testIssuer.id); // Unchanged
    });

    it('should return null when updating a non-existent badge class', async () => {
      // Attempt to update a badge class with a non-existent ID
      const nonExistentId = '00000000-0000-0000-0000-000000000000' as Shared.IRI;
      const updatedBadgeClass = await badgeClassRepository.update(nonExistentId, {
        name: 'Updated Badge',
        description: 'An updated description'
      });

      // Verify
      expect(updatedBadgeClass).toBeNull();
    });

    it('should delete a badge class', async () => {
      // Create badge class entity
      const badgeClass = BadgeClass.create({
        issuer: testIssuer.id as Shared.IRI,
        name: 'Test Badge',
        description: 'A test badge for testing',
        image: 'https://test.edu/badges/test.png' as Shared.IRI,
        criteria: {
          narrative: 'Complete the test'
        }
      });

      // Save to repository
      const createdBadgeClass = await badgeClassRepository.create(badgeClass);

      // Delete badge class
      const deleted = await badgeClassRepository.delete(createdBadgeClass.id);

      // Verify
      expect(deleted).toBe(true);

      // Try to find the deleted badge class
      const foundBadgeClass = await badgeClassRepository.findById(createdBadgeClass.id);

      // Verify it's gone
      expect(foundBadgeClass).toBeNull();
    });

    it('should return false when deleting a non-existent badge class', async () => {
      // Attempt to delete a badge class with a non-existent ID
      const nonExistentId = '00000000-0000-0000-0000-000000000000' as Shared.IRI;
      const deleted = await badgeClassRepository.delete(nonExistentId);

      // Verify
      expect(deleted).toBe(false);
    });
  });

  describe('AssertionRepository', () => {
    let testIssuer: Issuer;
    let testBadgeClass: BadgeClass;

    beforeEach(async () => {
      // Create a test issuer
      const issuer = Issuer.create(testIssuerData);
      testIssuer = await issuerRepository.create(issuer);

      // Create a test badge class
      const badgeClass = BadgeClass.create({
        issuer: testIssuer.id as Shared.IRI,
        name: 'Test Badge',
        description: 'A test badge for testing',
        image: 'https://test.edu/badges/test.png' as Shared.IRI,
        criteria: {
          narrative: 'Complete the test'
        }
      });
      testBadgeClass = await badgeClassRepository.create(badgeClass);
    });

    it('should create an assertion', async () => {
      // Create assertion entity
      const assertion = Assertion.create({
        badgeClass: testBadgeClass.id as Shared.IRI,
        recipient: {
          type: 'email',
          identity: 'recipient@test.edu',
          hashed: false
        },
        issuedOn: new Date().toISOString()
      });

      // Save to repository
      const createdAssertion = await assertionRepository.create(assertion);

      // Verify
      expect(createdAssertion).toBeDefined();
      expect(createdAssertion.id).toBeDefined();
      expect(createdAssertion.badgeClass).toBe(testBadgeClass.id);
      expect(createdAssertion.recipient).toEqual({
        type: 'email',
        identity: 'recipient@test.edu',
        hashed: false
      });
      expect(createdAssertion.issuedOn).toBeDefined();
    });

    it('should find an assertion by ID', async () => {
      // Create assertion entity
      const assertion = Assertion.create({
        badgeClass: testBadgeClass.id as Shared.IRI,
        recipient: {
          type: 'email',
          identity: 'recipient@test.edu',
          hashed: false
        },
        issuedOn: new Date().toISOString()
      });

      // Save to repository
      const createdAssertion = await assertionRepository.create(assertion);

      // Find by ID
      const foundAssertion = await assertionRepository.findById(createdAssertion.id);

      // Verify
      expect(foundAssertion).toBeDefined();
      expect(foundAssertion!.id).toBe(createdAssertion.id);
      expect(foundAssertion!.badgeClass).toBe(testBadgeClass.id);
      expect(foundAssertion!.recipient).toEqual({
        type: 'email',
        identity: 'recipient@test.edu',
        hashed: false
      });
    });

    it('should return null when finding a non-existent assertion by ID', async () => {
      // Attempt to find an assertion with a non-existent ID
      const nonExistentId = '00000000-0000-0000-0000-000000000000' as Shared.IRI;
      const foundAssertion = await assertionRepository.findById(nonExistentId);

      // Verify
      expect(foundAssertion).toBeNull();
    });

    it('should find assertions by badge class', async () => {
      // Create multiple assertions
      const assertion1 = Assertion.create({
        badgeClass: testBadgeClass.id as Shared.IRI,
        recipient: {
          type: 'email',
          identity: 'recipient1@test.edu',
          hashed: false
        },
        issuedOn: new Date().toISOString()
      });

      const assertion2 = Assertion.create({
        badgeClass: testBadgeClass.id as Shared.IRI,
        recipient: {
          type: 'email',
          identity: 'recipient2@test.edu',
          hashed: false
        },
        issuedOn: new Date().toISOString()
      });

      // Save to repository
      await assertionRepository.create(assertion1);
      await assertionRepository.create(assertion2);

      // Find by badge class
      const foundAssertions = await assertionRepository.findByBadgeClass(testBadgeClass.id);

      // Verify
      expect(foundAssertions).toBeDefined();
      expect(foundAssertions.length).toBe(2);
      expect(foundAssertions[0].badgeClass).toBe(testBadgeClass.id);
      expect(foundAssertions[1].badgeClass).toBe(testBadgeClass.id);
    });

    it('should return an empty array when finding assertions by badge class and none exist', async () => {
      // Find by badge class when the table is empty
      const foundAssertions = await assertionRepository.findByBadgeClass(testBadgeClass.id);

      // Verify
      expect(foundAssertions).toBeDefined();
      expect(foundAssertions.length).toBe(0);
    });

    it('should find assertions by recipient', async () => {
      // Create multiple assertions for the same recipient
      const recipientId = 'test-recipient@example.com';
      const assertion1 = Assertion.create({
        badgeClass: testBadgeClass.id as Shared.IRI,
        recipient: { type: 'email', identity: recipientId, hashed: false },
        issuedOn: new Date().toISOString()
      });
      const assertion2 = Assertion.create({
        badgeClass: testBadgeClass.id as Shared.IRI,
        recipient: { type: 'email', identity: recipientId, hashed: false },
        issuedOn: new Date().toISOString()
      });
      await assertionRepository.create(assertion1);
      await assertionRepository.create(assertion2);

      // Find by recipient
      const foundAssertions = await assertionRepository.findByRecipient(recipientId);

      // Verify
      expect(foundAssertions).toBeDefined();
      expect(foundAssertions.length).toBe(2);
      expect(foundAssertions[0].recipient.identity).toBe(recipientId);
      expect(foundAssertions[1].recipient.identity).toBe(recipientId);
    });

    it('should return an empty array when finding assertions by recipient and none exist', async () => {
      // Find by recipient when the table is empty
      const foundAssertions = await assertionRepository.findByRecipient('non-existent@example.com');

      // Verify
      expect(foundAssertions).toBeDefined();
      expect(foundAssertions.length).toBe(0);
    });

    it('should find all assertions', async () => {
      // Create multiple assertions
      const assertion1 = Assertion.create({
        badgeClass: testBadgeClass.id as Shared.IRI,
        recipient: { type: 'email', identity: 'recipient1@example.com', hashed: false },
        issuedOn: new Date().toISOString()
      });
      const assertion2 = Assertion.create({
        badgeClass: testBadgeClass.id as Shared.IRI,
        recipient: { type: 'email', identity: 'recipient2@example.com', hashed: false },
        issuedOn: new Date().toISOString()
      });
      await assertionRepository.create(assertion1);
      await assertionRepository.create(assertion2);

      // Find all assertions
      const allAssertions = await assertionRepository.findAll();

      // Verify
      expect(allAssertions).toBeDefined();
      expect(allAssertions.length).toBe(2);
    });

    it('should return an empty array when finding all assertions and none exist', async () => {
      // Find all assertions when the table is empty
      const allAssertions = await assertionRepository.findAll();

      // Verify
      expect(allAssertions).toBeDefined();
      expect(allAssertions.length).toBe(0);
    });

    it('should revoke an assertion', async () => {
      // Create assertion entity
      const assertion = Assertion.create({
        badgeClass: testBadgeClass.id as Shared.IRI,
        recipient: {
          type: 'email',
          identity: 'recipient@test.edu',
          hashed: false
        },
        issuedOn: new Date().toISOString()
      });

      // Save to repository
      const createdAssertion = await assertionRepository.create(assertion);

      // Revoke assertion
      const revokedAssertion = await assertionRepository.revoke(createdAssertion.id, 'Test revocation reason');

      // Verify
      expect(revokedAssertion).toBeDefined();
      expect(revokedAssertion!.id).toBe(createdAssertion.id);
      expect(revokedAssertion!.revoked).toBe(true);
      expect(revokedAssertion!.revocationReason).toBe('Test revocation reason');
    });

    it('should return null when revoking a non-existent assertion', async () => {
      // Attempt to revoke an assertion with a non-existent ID
      const nonExistentId = '00000000-0000-0000-0000-000000000000' as Shared.IRI;
      const revokedAssertion = await assertionRepository.revoke(nonExistentId, 'Test revocation reason');

      // Verify
      expect(revokedAssertion).toBeNull();
    });

    it('should verify an assertion', async () => {
      // Create assertion entity
      const assertion = Assertion.create({
        badgeClass: testBadgeClass.id as Shared.IRI,
        recipient: {
          type: 'email',
          identity: 'recipient@test.edu',
          hashed: false
        },
        issuedOn: new Date().toISOString()
      });

      // Save to repository
      const createdAssertion = await assertionRepository.create(assertion);

      // Verify assertion
      const verificationResult = await assertionRepository.verify(createdAssertion.id);

      // Verify
      expect(verificationResult.isValid).toBe(true);

      // Revoke assertion
      await assertionRepository.revoke(createdAssertion.id, 'Test revocation reason');

      // Verify revoked assertion
      const verificationResultAfterRevoke = await assertionRepository.verify(createdAssertion.id);

      // Verify
      expect(verificationResultAfterRevoke.isValid).toBe(false);
    });

    it('should return an invalid verification result when verifying a non-existent assertion', async () => {
      // Attempt to verify an assertion with a non-existent ID
      const nonExistentId = '00000000-0000-0000-0000-000000000000' as Shared.IRI;
      const verificationResult = await assertionRepository.verify(nonExistentId);

      // Verify
      expect(verificationResult.isValid).toBe(false);
      expect(verificationResult.reason).toBe('Assertion not found');
    });
  });
});
