/**
 * PostgreSQL mapper for StatusList entities
 */

import { StatusList } from '@domains/status-list/status-list.entity';
import {
  StatusListData,
  CredentialStatusEntryData,
  StatusPurpose,
} from '@domains/status-list/status-list.types';
import { statusLists, credentialStatusEntries } from '../schema';
import { logger } from '@utils/logging/logger.service';
import { convertUuid } from '@infrastructure/database/utils/type-conversion';

/**
 * Type for PostgreSQL status list record
 */
export type PostgresStatusListRecord = typeof statusLists.$inferSelect;

/**
 * Type for PostgreSQL credential status entry record
 */
export type PostgresCredentialStatusEntryRecord =
  typeof credentialStatusEntries.$inferSelect;

/**
 * PostgreSQL StatusList mapper
 */
export class PostgresStatusListMapper {
  /**
   * Converts a StatusList domain entity to PostgreSQL persistence format
   */
  toPersistence(entity: StatusList): Record<string, unknown> {
    try {
      return {
        issuerId: convertUuid(entity.issuerId, 'postgresql', 'to'),
        purpose: entity.purpose,
        statusSize: entity.statusSize,
        encodedList: entity.encodedList,
        ttl: entity.ttl || null,
        totalEntries: entity.totalEntries,
        usedEntries: entity.usedEntries,
        metadata: entity.metadata ? JSON.stringify(entity.metadata) : null,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
      };
    } catch (error) {
      logger.error('Failed to convert StatusList to persistence format', {
        error: error instanceof Error ? error.message : String(error),
        entityId: entity.id,
      });
      throw new Error('Failed to convert StatusList to persistence format');
    }
  }

  /**
   * Converts a PostgreSQL record to StatusList domain entity
   */
  toDomain(record: PostgresStatusListRecord): StatusList {
    try {
      const data: StatusListData = {
        id: record.id,
        issuerId: convertUuid(record.issuerId, 'postgresql', 'from'),
        purpose: record.purpose as StatusPurpose,
        statusSize: record.statusSize,
        encodedList: record.encodedList,
        ttl: record.ttl || undefined,
        totalEntries: record.totalEntries,
        usedEntries: record.usedEntries,
        metadata: record.metadata
          ? JSON.parse(record.metadata as string)
          : undefined,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      };

      return StatusList.fromData(data);
    } catch (error) {
      logger.error(
        'Failed to convert PostgreSQL record to StatusList domain entity',
        {
          error: error instanceof Error ? error.message : String(error),
          recordId: record.id,
        }
      );
      throw new Error(
        'Failed to convert PostgreSQL record to StatusList domain entity'
      );
    }
  }

  /**
   * Converts a CredentialStatusEntry domain entity to PostgreSQL persistence format
   */
  statusEntryToPersistence(
    entity: CredentialStatusEntryData
  ): Record<string, unknown> {
    try {
      return {
        credentialId: convertUuid(entity.credentialId, 'postgresql', 'to'),
        statusListId: entity.statusListId,
        statusListIndex: entity.statusListIndex,
        statusSize: entity.statusSize,
        purpose: entity.purpose,
        currentStatus: entity.currentStatus,
        statusReason: entity.statusReason || null,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
      };
    } catch (error) {
      logger.error(
        'Failed to convert CredentialStatusEntry to persistence format',
        {
          error: error instanceof Error ? error.message : String(error),
          entityId: entity.id,
        }
      );
      throw new Error(
        'Failed to convert CredentialStatusEntry to persistence format'
      );
    }
  }

  /**
   * Converts a PostgreSQL record to CredentialStatusEntry domain entity
   */
  statusEntryToDomain(
    record: PostgresCredentialStatusEntryRecord
  ): CredentialStatusEntryData {
    try {
      return {
        id: record.id,
        credentialId: convertUuid(record.credentialId, 'postgresql', 'from'),
        statusListId: record.statusListId,
        statusListIndex: record.statusListIndex,
        statusSize: record.statusSize,
        purpose: record.purpose as StatusPurpose,
        currentStatus: record.currentStatus,
        statusReason: record.statusReason || undefined,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      };
    } catch (error) {
      logger.error(
        'Failed to convert PostgreSQL record to CredentialStatusEntry domain entity',
        {
          error: error instanceof Error ? error.message : String(error),
          recordId: record.id,
        }
      );
      throw new Error(
        'Failed to convert PostgreSQL record to CredentialStatusEntry domain entity'
      );
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
      throw new Error(
        'StatusList usedEntries must be between 0 and totalEntries'
      );
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
      throw new Error(
        'CredentialStatusEntry statusListIndex must be non-negative'
      );
    }

    if (entity.statusSize < 1 || entity.statusSize > 8) {
      throw new Error(
        'CredentialStatusEntry statusSize must be between 1 and 8'
      );
    }

    if (!entity.purpose) {
      throw new Error('CredentialStatusEntry purpose is required');
    }

    if (entity.currentStatus < 0) {
      throw new Error(
        'CredentialStatusEntry currentStatus must be non-negative'
      );
    }

    const maxStatus = Math.pow(2, entity.statusSize) - 1;
    if (entity.currentStatus > maxStatus) {
      throw new Error(
        `CredentialStatusEntry currentStatus must not exceed ${maxStatus} for ${entity.statusSize}-bit status`
      );
    }
  }

  /**
   * Converts multiple PostgreSQL records to StatusList domain entities
   */
  toDomainArray(records: PostgresStatusListRecord[]): StatusList[] {
    return records.map((record) => this.toDomain(record));
  }

  /**
   * Converts multiple PostgreSQL records to CredentialStatusEntry domain entities
   */
  statusEntryToDomainArray(
    records: PostgresCredentialStatusEntryRecord[]
  ): CredentialStatusEntryData[] {
    return records.map((record) => this.statusEntryToDomain(record));
  }

  /**
   * Converts multiple StatusList entities to PostgreSQL persistence format
   */
  toPersistenceArray(entities: StatusList[]): Array<Record<string, unknown>> {
    return entities.map((entity) => this.toPersistence(entity));
  }

  /**
   * Converts multiple CredentialStatusEntry entities to PostgreSQL persistence format
   */
  statusEntryToPersistenceArray(
    entities: CredentialStatusEntryData[]
  ): Array<Record<string, unknown>> {
    return entities.map((entity) => this.statusEntryToPersistence(entity));
  }
}
