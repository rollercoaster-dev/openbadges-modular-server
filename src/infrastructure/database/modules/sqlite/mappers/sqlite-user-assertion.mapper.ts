/**
 * SQLite mapper for the UserAssertion domain entity
 *
 * This class implements the Data Mapper pattern for the UserAssertion entity,
 * handling the conversion between domain entities and database records.
 */

import { UserAssertion } from '@domains/backpack/user-assertion.entity';
import { Shared } from 'openbadges-types';
import { convertJson, convertTimestamp, convertUuid } from '@infrastructure/database/utils/type-conversion';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { userAssertions } from '../schema';
import { logger } from '@utils/logging/logger.service';
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
  toPersistence(entity: UserAssertion): InferInsertModel<typeof userAssertions> {
    // Get entity data
    const data = entity.toObject();

    // Return database record
    return {
      id: convertUuid(data.id, 'sqlite', 'to') as string,
      userId: convertUuid(data.userId, 'sqlite', 'to') as string,
      assertionId: convertUuid(data.assertionId, 'sqlite', 'to') as string,
      addedAt: convertTimestamp(data.addedAt, 'sqlite', 'to') as number,
      status: data.status,
      metadata: convertJson(data.metadata, 'sqlite', 'to') as string | null
    };
  }

  /**
   * Converts a database record to a domain entity
   * @param record The database record to convert
   * @returns A domain entity
   */
  toDomain(record: InferSelectModel<typeof userAssertions>): UserAssertion {
    // Parse metadata
    const metadata = convertJson(record.metadata, 'sqlite', 'from') as Record<string, unknown> | undefined;

    // Create and return domain entity
    return UserAssertion.create({
      id: convertUuid(record.id, 'sqlite', 'from') as Shared.IRI,
      userId: convertUuid(record.userId, 'sqlite', 'from') as Shared.IRI,
      assertionId: convertUuid(record.assertionId, 'sqlite', 'from') as Shared.IRI,
      addedAt: convertTimestamp(record.addedAt, 'sqlite', 'from') as Date,
      status: record.status as UserAssertionStatus,
      metadata
    });
  }
}
