/**
 * Test to verify that numeric columns in status list tables work correctly
 * This test validates the fix for storing numeric values as text in PostgreSQL/SQLite
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { StatusList } from '@domains/status-list/status-list.entity';
import { StatusPurpose } from '@domains/status-list/status-list.types';
import { PostgresStatusListMapper } from '@infrastructure/database/modules/postgresql/mappers/postgres-status-list.mapper';
import { SqliteStatusListMapper } from '@infrastructure/database/modules/sqlite/mappers/sqlite-status-list.mapper';

describe('Status List Numeric Columns', () => {
  let statusList: StatusList;

  beforeEach(async () => {
    // Create a test status list with numeric values
    statusList = await StatusList.create({
      issuerId: 'test-issuer-id',
      purpose: StatusPurpose.REVOCATION,
      statusSize: 2,
      totalEntries: 262144,
      ttl: 86400000, // 24 hours in milliseconds
    });

    // Manually set some used entries for testing
    statusList.usedEntries = 1024;
  });

  describe('PostgreSQL Mapper', () => {
    let mapper: PostgresStatusListMapper;

    beforeEach(() => {
      mapper = new PostgresStatusListMapper();
    });

    it('should convert StatusList to persistence format with numeric values', () => {
      const persistenceData = mapper.toPersistence(statusList);

      // Verify that numeric fields are stored as numbers, not strings
      expect(typeof persistenceData.statusSize).toBe('number');
      expect(persistenceData.statusSize).toBe(2);

      expect(typeof persistenceData.totalEntries).toBe('number');
      expect(persistenceData.totalEntries).toBe(262144);

      expect(typeof persistenceData.usedEntries).toBe('number');
      expect(persistenceData.usedEntries).toBe(1024);

      expect(typeof persistenceData.ttl).toBe('number');
      expect(persistenceData.ttl).toBe(86400000);
    });

    it('should convert persistence data back to domain entity correctly', () => {
      // Simulate a database record with numeric values
      const mockRecord = {
        id: statusList.id,
        issuerId: statusList.issuerId,
        purpose: statusList.purpose,
        statusSize: 2, // numeric value
        encodedList: statusList.encodedList,
        ttl: 86400000, // numeric value
        totalEntries: 262144, // numeric value
        usedEntries: 1024, // numeric value
        metadata: null,
        createdAt: statusList.createdAt,
        updatedAt: statusList.updatedAt,
      };

      const domainEntity = mapper.toDomain(mockRecord);

      // Verify that numeric values are correctly converted
      expect(domainEntity.statusSize).toBe(2);
      expect(domainEntity.totalEntries).toBe(262144);
      expect(domainEntity.usedEntries).toBe(1024);
      expect(domainEntity.ttl).toBe(86400000);
    });

    it('should handle null ttl correctly', async () => {
      // Create status list without TTL
      const statusListWithoutTtl = await StatusList.create({
        issuerId: 'test-issuer-id',
        purpose: StatusPurpose.REVOCATION,
        statusSize: 1,
      });

      const persistenceData = mapper.toPersistence(statusListWithoutTtl);
      expect(persistenceData.ttl).toBeNull();

      // Test conversion back
      const mockRecord = {
        id: statusListWithoutTtl.id,
        issuerId: statusListWithoutTtl.issuerId,
        purpose: statusListWithoutTtl.purpose,
        statusSize: 1,
        encodedList: statusListWithoutTtl.encodedList,
        ttl: null,
        totalEntries: 131072,
        usedEntries: 0,
        metadata: null,
        createdAt: statusListWithoutTtl.createdAt,
        updatedAt: statusListWithoutTtl.updatedAt,
      };

      const domainEntity = mapper.toDomain(mockRecord);
      expect(domainEntity.ttl).toBeUndefined();
    });
  });

  describe('SQLite Mapper', () => {
    let mapper: SqliteStatusListMapper;

    beforeEach(() => {
      mapper = new SqliteStatusListMapper();
    });

    it('should convert StatusList to persistence format with numeric values', () => {
      const persistenceData = mapper.toPersistence(statusList);

      // Verify that numeric fields are stored as numbers, not strings
      expect(typeof persistenceData.statusSize).toBe('number');
      expect(persistenceData.statusSize).toBe(2);

      expect(typeof persistenceData.totalEntries).toBe('number');
      expect(persistenceData.totalEntries).toBe(262144);

      expect(typeof persistenceData.usedEntries).toBe('number');
      expect(persistenceData.usedEntries).toBe(1024);

      expect(typeof persistenceData.ttl).toBe('number');
      expect(persistenceData.ttl).toBe(86400000);
    });

    it('should convert persistence data back to domain entity correctly', () => {
      // Simulate a database record with numeric values (SQLite returns numbers for integer columns)
      const mockRecord = {
        id: statusList.id,
        issuerId: statusList.issuerId,
        purpose: statusList.purpose,
        statusSize: 2, // numeric value
        encodedList: statusList.encodedList,
        ttl: 86400000, // numeric value
        totalEntries: 262144, // numeric value
        usedEntries: 1024, // numeric value
        metadata: null,
        createdAt: Math.floor(statusList.createdAt.getTime() / 1000), // Unix timestamp
        updatedAt: Math.floor(statusList.updatedAt.getTime() / 1000), // Unix timestamp
      };

      const domainEntity = mapper.toDomain(mockRecord);

      // Verify that numeric values are correctly converted
      expect(domainEntity.statusSize).toBe(2);
      expect(domainEntity.totalEntries).toBe(262144);
      expect(domainEntity.usedEntries).toBe(1024);
      expect(domainEntity.ttl).toBe(86400000);
    });

    it('should handle null ttl correctly', async () => {
      // Create status list without TTL
      const statusListWithoutTtl = await StatusList.create({
        issuerId: 'test-issuer-id',
        purpose: StatusPurpose.REVOCATION,
        statusSize: 1,
      });

      const persistenceData = mapper.toPersistence(statusListWithoutTtl);
      expect(persistenceData.ttl).toBeNull();

      // Test conversion back
      const mockRecord = {
        id: statusListWithoutTtl.id,
        issuerId: statusListWithoutTtl.issuerId,
        purpose: statusListWithoutTtl.purpose,
        statusSize: 1,
        encodedList: statusListWithoutTtl.encodedList,
        ttl: null,
        totalEntries: 131072,
        usedEntries: 0,
        metadata: null,
        createdAt: Math.floor(statusListWithoutTtl.createdAt.getTime() / 1000),
        updatedAt: Math.floor(statusListWithoutTtl.updatedAt.getTime() / 1000),
      };

      const domainEntity = mapper.toDomain(mockRecord);
      expect(domainEntity.ttl).toBeUndefined();
    });
  });

  describe('Credential Status Entry Mappers', () => {
    it('should handle numeric values in credential status entries (PostgreSQL)', () => {
      const mapper = new PostgresStatusListMapper();

      const statusEntry = {
        id: 'test-entry-id',
        credentialId: 'test-credential-id',
        statusListId: statusList.id,
        statusListIndex: 12345,
        statusSize: 4,
        purpose: StatusPurpose.REVOCATION,
        currentStatus: 3,
        statusReason: 'Test reason',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const persistenceData = mapper.statusEntryToPersistence(statusEntry);

      // Verify numeric fields are numbers
      expect(typeof persistenceData.statusListIndex).toBe('number');
      expect(persistenceData.statusListIndex).toBe(12345);

      expect(typeof persistenceData.statusSize).toBe('number');
      expect(persistenceData.statusSize).toBe(4);

      expect(typeof persistenceData.currentStatus).toBe('number');
      expect(persistenceData.currentStatus).toBe(3);
    });

    it('should handle numeric values in credential status entries (SQLite)', () => {
      const mapper = new SqliteStatusListMapper();

      const statusEntry = {
        id: 'test-entry-id',
        credentialId: 'test-credential-id',
        statusListId: statusList.id,
        statusListIndex: 12345,
        statusSize: 4,
        purpose: StatusPurpose.REVOCATION,
        currentStatus: 3,
        statusReason: 'Test reason',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const persistenceData = mapper.statusEntryToPersistence(statusEntry);

      // Verify numeric fields are numbers
      expect(typeof persistenceData.statusListIndex).toBe('number');
      expect(persistenceData.statusListIndex).toBe(12345);

      expect(typeof persistenceData.statusSize).toBe('number');
      expect(persistenceData.statusSize).toBe(4);

      expect(typeof persistenceData.currentStatus).toBe('number');
      expect(persistenceData.currentStatus).toBe(3);
    });
  });
});
