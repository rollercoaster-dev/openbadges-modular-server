/**
 * SQLite mapper for StatusList entities
 */

import { StatusList } from '@domains/status-list/status-list.entity';
import {
  StatusListData,
  CredentialStatusEntryData,
  StatusPurpose
} from '@domains/status-list/status-list.types';
import { statusLists, credentialStatusEntries } from '../schema';
import { logger } from '@utils/logging/logger.service';

/**
 * Type for SQLite status list record
 */
export type SqliteStatusListRecord = typeof statusLists.$inferSelect;

/**
 * Type for SQLite credential status entry record
 */
export type SqliteCredentialStatusEntryRecord = typeof credentialStatusEntries.$inferSelect;

/**
 * SQLite StatusList mapper
 */
export class SqliteStatusListMapper {
  /**
   * Converts a StatusList domain entity to SQLite persistence format
   */
  toPersistence(entity: StatusList): typeof statusLists.$inferInsert {
    try {
      return {
        id: entity.id,
        issuerId: entity.issuerId,
        purpose: entity.purpose,
        statusSize: entity.statusSize.toString(),
        encodedList: entity.encodedList,
        ttl: entity.ttl?.toString(),
        totalEntries: entity.totalEntries.toString(),
        usedEntries: entity.usedEntries.toString(),
        metadata: entity.metadata ? JSON.stringify(entity.metadata) : null,
        createdAt: Math.floor(entity.createdAt.getTime() / 1000), // Convert to Unix timestamp
        updatedAt: Math.floor(entity.updatedAt.getTime() / 1000)  // Convert to Unix timestamp
      };
    } catch (error) {
      logger.error('Failed to convert StatusList to persistence format', {
        error: error instanceof Error ? error.message : String(error),
        entityId: entity.id
      });
      throw new Error('Failed to convert StatusList to persistence format');
    }
  }

  /**
   * Converts a SQLite record to StatusList domain entity
   */
  toDomain(record: SqliteStatusListRecord): StatusList {
    try {
      const data: StatusListData = {
        id: record.id,
        issuerId: record.issuerId,
        purpose: record.purpose as StatusPurpose,
        statusSize: parseInt(record.statusSize, 10),
        encodedList: record.encodedList,
        ttl: record.ttl ? parseInt(record.ttl, 10) : undefined,
        totalEntries: parseInt(record.totalEntries, 10),
        usedEntries: parseInt(record.usedEntries, 10),
        metadata: record.metadata ? JSON.parse(record.metadata) : undefined,
        createdAt: new Date(record.createdAt * 1000), // Convert from Unix timestamp
        updatedAt: new Date(record.updatedAt * 1000)  // Convert from Unix timestamp
      };

      return StatusList.fromData(data);
    } catch (error) {
      logger.error('Failed to convert SQLite record to StatusList domain entity', {
        error: error instanceof Error ? error.message : String(error),
        recordId: record.id
      });
      throw new Error('Failed to convert SQLite record to StatusList domain entity');
    }
  }

  /**
   * Converts a CredentialStatusEntry domain entity to SQLite persistence format
   */
  statusEntryToPersistence(entity: CredentialStatusEntryData): typeof credentialStatusEntries.$inferInsert {
    try {
      return {
        id: entity.id,
        credentialId: entity.credentialId,
        statusListId: entity.statusListId,
        statusListIndex: entity.statusListIndex.toString(),
        statusSize: entity.statusSize.toString(),
        purpose: entity.purpose,
        currentStatus: entity.currentStatus.toString(),
        statusReason: entity.statusReason || null,
        createdAt: Math.floor(entity.createdAt.getTime() / 1000), // Convert to Unix timestamp
        updatedAt: Math.floor(entity.updatedAt.getTime() / 1000)  // Convert to Unix timestamp
      };
    } catch (error) {
      logger.error('Failed to convert CredentialStatusEntry to persistence format', {
        error: error instanceof Error ? error.message : String(error),
        entityId: entity.id
      });
      throw new Error('Failed to convert CredentialStatusEntry to persistence format');
    }
  }

  /**
   * Converts a SQLite record to CredentialStatusEntry domain entity
   */
  statusEntryToDomain(record: SqliteCredentialStatusEntryRecord): CredentialStatusEntryData {
    try {
      return {
        id: record.id,
        credentialId: record.credentialId,
        statusListId: record.statusListId,
        statusListIndex: parseInt(record.statusListIndex, 10),
        statusSize: parseInt(record.statusSize, 10),
        purpose: record.purpose as StatusPurpose,
        currentStatus: parseInt(record.currentStatus, 10),
        statusReason: record.statusReason || undefined,
        createdAt: new Date(record.createdAt * 1000), // Convert from Unix timestamp
        updatedAt: new Date(record.updatedAt * 1000)  // Convert from Unix timestamp
      };
    } catch (error) {
      logger.error('Failed to convert SQLite record to CredentialStatusEntry domain entity', {
        error: error instanceof Error ? error.message : String(error),
        recordId: record.id
      });
      throw new Error('Failed to convert SQLite record to CredentialStatusEntry domain entity');
    }
  }

  /**
   * Validates a StatusList entity before persistence
   */
  validateForPersistence(entity: StatusList): void {
    if (!entity.id) {
      throw new Error('StatusList ID is required');
    }

    if (!entity.issuerId) {
      throw new Error('StatusList issuerId is required');
    }

    if (!entity.purpose) {
      throw new Error('StatusList purpose is required');
    }

    if (!entity.encodedList) {
      throw new Error('StatusList encodedList is required');
    }

    if (entity.statusSize < 1 || entity.statusSize > 8) {
      throw new Error('StatusList statusSize must be between 1 and 8');
    }

    if (entity.totalEntries < 131072) {
      throw new Error('StatusList totalEntries must be at least 131,072');
    }

    if (entity.usedEntries < 0 || entity.usedEntries > entity.totalEntries) {
      throw new Error('StatusList usedEntries must be between 0 and totalEntries');
    }
  }

  /**
   * Validates a CredentialStatusEntry entity before persistence
   */
  validateStatusEntryForPersistence(entity: CredentialStatusEntryData): void {
    if (!entity.id) {
      throw new Error('CredentialStatusEntry ID is required');
    }

    if (!entity.credentialId) {
      throw new Error('CredentialStatusEntry credentialId is required');
    }

    if (!entity.statusListId) {
      throw new Error('CredentialStatusEntry statusListId is required');
    }

    if (entity.statusListIndex < 0) {
      throw new Error('CredentialStatusEntry statusListIndex must be non-negative');
    }

    if (entity.statusSize < 1 || entity.statusSize > 8) {
      throw new Error('CredentialStatusEntry statusSize must be between 1 and 8');
    }

    if (!entity.purpose) {
      throw new Error('CredentialStatusEntry purpose is required');
    }

    if (entity.currentStatus < 0) {
      throw new Error('CredentialStatusEntry currentStatus must be non-negative');
    }

    const maxStatus = Math.pow(2, entity.statusSize) - 1;
    if (entity.currentStatus > maxStatus) {
      throw new Error(`CredentialStatusEntry currentStatus must not exceed ${maxStatus} for ${entity.statusSize}-bit status`);
    }
  }

  /**
   * Converts multiple SQLite records to StatusList domain entities
   */
  toDomainArray(records: SqliteStatusListRecord[]): StatusList[] {
    return records.map(record => this.toDomain(record));
  }

  /**
   * Converts multiple SQLite records to CredentialStatusEntry domain entities
   */
  statusEntryToDomainArray(records: SqliteCredentialStatusEntryRecord[]): CredentialStatusEntryData[] {
    return records.map(record => this.statusEntryToDomain(record));
  }

  /**
   * Converts multiple StatusList entities to SQLite persistence format
   */
  toPersistenceArray(entities: StatusList[]): Array<typeof statusLists.$inferInsert> {
    return entities.map(entity => this.toPersistence(entity));
  }

  /**
   * Converts multiple CredentialStatusEntry entities to SQLite persistence format
   */
  statusEntryToPersistenceArray(entities: CredentialStatusEntryData[]): Array<typeof credentialStatusEntries.$inferInsert> {
    return entities.map(entity => this.statusEntryToPersistence(entity));
  }
}
