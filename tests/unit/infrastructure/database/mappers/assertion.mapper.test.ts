import { describe, it, expect, beforeEach } from 'vitest';
import { PostgresAssertionMapper } from '../../../../../src/infrastructure/database/modules/postgresql/mappers/postgres-assertion.mapper';
import { SqliteAssertionMapper } from '../../../../../src/infrastructure/database/modules/sqlite/mappers/sqlite-assertion.mapper';
import { Assertion } from '../../../../../src/domains/assertion/assertion.entity';
import type { Shared } from 'openbadges-types';

describe('Assertion Mappers - Issuer Field Tests', () => {
  let postgresMapper: PostgresAssertionMapper;
  let sqliteMapper: SqliteAssertionMapper;
  let validAssertion: Assertion;

  beforeEach(() => {
    postgresMapper = new PostgresAssertionMapper();
    sqliteMapper = new SqliteAssertionMapper();
    
    validAssertion = Assertion.create({
      id: 'urn:uuid:12345678-1234-5678-9012-123456789012' as Shared.IRI,
      badgeClass: 'urn:uuid:87654321-4321-8765-2109-876543210987' as Shared.IRI,
      issuer: 'urn:uuid:11111111-1111-1111-1111-111111111111' as Shared.IRI,
      recipient: {
        type: 'email',
        hashed: false,
        identity: 'test@example.com',
      },
      issuedOn: '2023-01-01T00:00:00Z',
    });
  });

  describe('PostgreSQL Mapper', () => {
    describe('toPersistence', () => {
      it('should convert issuer IRI to UUID format for database storage', () => {
        const persistenceData = postgresMapper.toPersistence(validAssertion);

        expect(persistenceData.issuerId).toBe('11111111-1111-1111-1111-111111111111');
        expect(persistenceData.badgeClassId).toBe('87654321-4321-8765-2109-876543210987');
      });

      it('should handle assertion without issuer field', () => {
        const assertionWithoutIssuer = Assertion.create({
          id: 'urn:uuid:12345678-1234-5678-9012-123456789012' as Shared.IRI,
          badgeClass: 'urn:uuid:87654321-4321-8765-2109-876543210987' as Shared.IRI,
          recipient: {
            type: 'email',
            hashed: false,
            identity: 'test@example.com',
          },
          issuedOn: '2023-01-01T00:00:00Z',
        });

        const persistenceData = postgresMapper.toPersistence(assertionWithoutIssuer);

        expect(persistenceData.issuerId).toBeUndefined();
        expect(persistenceData.badgeClassId).toBe('87654321-4321-8765-2109-876543210987');
      });
    });

    describe('toDomain', () => {
      it('should convert UUID issuer_id back to IRI format', () => {
        const dbRecord = {
          id: '12345678-1234-5678-9012-123456789012',
          badgeClassId: '87654321-4321-8765-2109-876543210987',
          issuerId: '11111111-1111-1111-1111-111111111111',
          recipient: JSON.stringify({
            type: 'email',
            hashed: false,
            identity: 'test@example.com',
          }),
          issuedOn: new Date('2023-01-01T00:00:00Z'),
          expires: null,
          evidence: null,
          verification: null,
          revoked: null,
          revocationReason: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          additionalFields: null,
        };

        const domainEntity = postgresMapper.toDomain(dbRecord);

        expect(domainEntity.issuer).toBe('urn:uuid:11111111-1111-1111-1111-111111111111');
        expect(domainEntity.badgeClass).toBe('urn:uuid:87654321-4321-8765-2109-876543210987');
      });

      it('should handle null issuer_id', () => {
        const dbRecord = {
          id: '12345678-1234-5678-9012-123456789012',
          badgeClassId: '87654321-4321-8765-2109-876543210987',
          issuerId: null,
          recipient: JSON.stringify({
            type: 'email',
            hashed: false,
            identity: 'test@example.com',
          }),
          issuedOn: new Date('2023-01-01T00:00:00Z'),
          expires: null,
          evidence: null,
          verification: null,
          revoked: null,
          revocationReason: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          additionalFields: null,
        };

        const domainEntity = postgresMapper.toDomain(dbRecord);

        expect(domainEntity.issuer).toBeUndefined();
        expect(domainEntity.badgeClass).toBe('urn:uuid:87654321-4321-8765-2109-876543210987');
      });
    });
  });

  describe('SQLite Mapper', () => {
    describe('toPersistence', () => {
      it('should convert issuer IRI to text format for database storage', () => {
        const persistenceData = sqliteMapper.toPersistence(validAssertion);

        expect(persistenceData.issuerId).toBe('11111111-1111-1111-1111-111111111111');
        expect(persistenceData.badgeClassId).toBe('87654321-4321-8765-2109-876543210987');
      });

      it('should handle assertion without issuer field', () => {
        const assertionWithoutIssuer = Assertion.create({
          id: 'urn:uuid:12345678-1234-5678-9012-123456789012' as Shared.IRI,
          badgeClass: 'urn:uuid:87654321-4321-8765-2109-876543210987' as Shared.IRI,
          recipient: {
            type: 'email',
            hashed: false,
            identity: 'test@example.com',
          },
          issuedOn: '2023-01-01T00:00:00Z',
        });

        const persistenceData = sqliteMapper.toPersistence(assertionWithoutIssuer);

        expect(persistenceData.issuerId).toBeNull();
        expect(persistenceData.badgeClassId).toBe('87654321-4321-8765-2109-876543210987');
      });
    });

    describe('toDomain', () => {
      it('should convert text issuer_id back to IRI format', () => {
        const dbRecord = {
          id: '12345678-1234-5678-9012-123456789012',
          badgeClassId: '87654321-4321-8765-2109-876543210987',
          issuerId: '11111111-1111-1111-1111-111111111111',
          recipient: JSON.stringify({
            type: 'email',
            hashed: false,
            identity: 'test@example.com',
          }),
          issuedOn: 1672531200000, // 2023-01-01T00:00:00Z as timestamp
          expires: null,
          evidence: null,
          verification: null,
          revoked: null,
          revocationReason: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          additionalFields: null,
        };

        const domainEntity = sqliteMapper.toDomain(dbRecord);

        expect(domainEntity.issuer).toBe('urn:uuid:11111111-1111-1111-1111-111111111111');
        expect(domainEntity.badgeClass).toBe('urn:uuid:87654321-4321-8765-2109-876543210987');
      });

      it('should handle null issuer_id', () => {
        const dbRecord = {
          id: '12345678-1234-5678-9012-123456789012',
          badgeClassId: '87654321-4321-8765-2109-876543210987',
          issuerId: null,
          recipient: JSON.stringify({
            type: 'email',
            hashed: false,
            identity: 'test@example.com',
          }),
          issuedOn: 1672531200000,
          expires: null,
          evidence: null,
          verification: null,
          revoked: null,
          revocationReason: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          additionalFields: null,
        };

        const domainEntity = sqliteMapper.toDomain(dbRecord);

        expect(domainEntity.issuer).toBeUndefined();
        expect(domainEntity.badgeClass).toBe('urn:uuid:87654321-4321-8765-2109-876543210987');
      });
    });
  });
});
