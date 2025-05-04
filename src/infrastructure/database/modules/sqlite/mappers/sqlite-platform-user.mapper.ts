/**
 * SQLite mapper for the PlatformUser domain entity
 *
 * This class implements the Data Mapper pattern for the PlatformUser entity,
 * handling the conversion between domain entities and database records.
 */

import { PlatformUser } from '@domains/backpack/platform-user.entity';
import { Shared } from 'openbadges-types';
import { convertJson, convertTimestamp, convertUuid } from '@infrastructure/database/utils/type-conversion';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { platformUsers } from '../schema';
// Import logger if needed for error handling
// import { logger } from '@utils/logging/logger.service';

/**
 * SQLite mapper for the PlatformUser domain entity
 */
export class SqlitePlatformUserMapper {
  /**
   * Converts a domain entity to a database record
   * @param entity The domain entity to convert
   * @returns A database record suitable for insertion
   */
  toPersistence(entity: PlatformUser): InferInsertModel<typeof platformUsers> {
    // Get entity data
    const data = entity.toObject();

    // Create the record with required fields
    const record: InferInsertModel<typeof platformUsers> = {
      id: convertUuid(data.id as string, 'sqlite', 'to') as string,
      platformId: convertUuid(data.platformId as string, 'sqlite', 'to') as string,
      externalUserId: String(data.externalUserId),
      createdAt: convertTimestamp(data.createdAt as Date, 'sqlite', 'to') as number,
      updatedAt: convertTimestamp(data.updatedAt as Date, 'sqlite', 'to') as number
    };

    // Add optional fields if they exist
    if (data.displayName) {
      record.displayName = String(data.displayName);
    }

    if (data.email) {
      record.email = String(data.email);
    }

    if (data.metadata) {
      record.metadata = convertJson(data.metadata, 'sqlite', 'to') as string;
    }

    return record;
  }

  /**
   * Converts a database record to a domain entity
   * @param record The database record to convert
   * @returns A domain entity
   */
  toDomain(record: InferSelectModel<typeof platformUsers>): PlatformUser {
    // Parse metadata
    const parsedMetadata = convertJson(record.metadata, 'sqlite', 'from');
    const metadata = typeof parsedMetadata === 'object' ? parsedMetadata as Record<string, unknown> : undefined;

    // Create and return domain entity
    return PlatformUser.create({
      id: convertUuid(record.id, 'sqlite', 'from') as Shared.IRI,
      platformId: convertUuid(record.platformId, 'sqlite', 'from') as Shared.IRI,
      externalUserId: record.externalUserId,
      displayName: record.displayName || undefined,
      email: record.email || undefined,
      metadata,
      createdAt: convertTimestamp(record.createdAt, 'sqlite', 'from') as Date,
      updatedAt: convertTimestamp(record.updatedAt, 'sqlite', 'from') as Date
    });
  }
}
