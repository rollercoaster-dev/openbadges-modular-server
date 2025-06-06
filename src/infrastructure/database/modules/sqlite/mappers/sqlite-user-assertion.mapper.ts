/**
 * SQLite mapper for the UserAssertion domain entity
 *
 * This class implements the Data Mapper pattern for the UserAssertion entity,
 * handling the conversion between domain entities and database records.
 */

import { UserAssertion } from '@domains/backpack/user-assertion.entity';
import { Shared } from 'openbadges-types';
import {
  convertJson,
  convertTimestamp,
  convertUuid,
} from '@infrastructure/database/utils/type-conversion';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { userAssertions } from '../schema';
// Import logger if needed for error handling
// import { logger } from '@utils/logging/logger.service';
import { UserAssertionStatus } from '@domains/backpack/backpack.types';

/**
 * SQLite mapper for the UserAssertion domain entity
 */
export class SqliteUserAssertionMapper {
  /**
   * Converts a domain entity to a database record
   * @param entity The domain entity to convert
   * @returns A database record suitable for insertion
   */
  toPersistence(
    entity: UserAssertion
  ): InferInsertModel<typeof userAssertions> {
    // Get entity data
    const data = entity.toObject();

    // Create the record with required fields
    const record: InferInsertModel<typeof userAssertions> = {
      id: convertUuid(data.id as string, 'sqlite', 'to') as string,
      userId: convertUuid(data.userId as string, 'sqlite', 'to') as string,
      assertionId: convertUuid(
        data.assertionId as string,
        'sqlite',
        'to'
      ) as string,
      addedAt: convertTimestamp(data.addedAt as Date, 'sqlite', 'to') as number,
      // updatedAt will be set by the repository during insert/update
      updatedAt: data.updatedAt
        ? (convertTimestamp(data.updatedAt as Date, 'sqlite', 'to') as number)
        : Date.now(),
    };

    // Add optional fields if they exist
    // Use type assertion with Record<string, unknown> to add optional fields
    const extendedRecord = record as Record<string, unknown>;

    if (data.status !== undefined) {
      extendedRecord.status = String(data.status);
    }

    if (data.metadata !== undefined) {
      extendedRecord.metadata = convertJson(
        data.metadata,
        'sqlite',
        'to'
      ) as string;
    }

    return record;
  }

  /**
   * Converts a database record to a domain entity
   * @param record The database record to convert
   * @returns A domain entity
   */
  toDomain(record: InferSelectModel<typeof userAssertions>): UserAssertion {
    // Parse metadata
    const parsedMetadata = convertJson(record.metadata, 'sqlite', 'from');
    const metadata =
      typeof parsedMetadata === 'object'
        ? (parsedMetadata as Record<string, unknown>)
        : undefined;

    // Create and return domain entity
    return UserAssertion.create({
      id: convertUuid(record.id, 'sqlite', 'from') as Shared.IRI,
      userId: convertUuid(record.userId, 'sqlite', 'from') as Shared.IRI,
      assertionId: convertUuid(
        record.assertionId,
        'sqlite',
        'from'
      ) as Shared.IRI,
      addedAt: convertTimestamp(record.addedAt, 'sqlite', 'from') as Date,
      updatedAt: convertTimestamp(record.updatedAt, 'sqlite', 'from') as Date,
      status: record.status as UserAssertionStatus,
      metadata,
    });
  }
}
