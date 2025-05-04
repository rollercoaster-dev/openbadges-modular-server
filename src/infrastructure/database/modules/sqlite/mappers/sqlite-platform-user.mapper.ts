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

    // Return database record
    return {
      id: convertUuid(data.id, 'sqlite', 'to') as string,
      platformId: convertUuid(data.platformId, 'sqlite', 'to') as string,
      externalUserId: data.externalUserId,
      displayName: data.displayName || null,
      email: data.email || null,
      metadata: convertJson(data.metadata, 'sqlite', 'to') as string | null,
      createdAt: convertTimestamp(data.createdAt, 'sqlite', 'to') as number,
      updatedAt: convertTimestamp(data.updatedAt, 'sqlite', 'to') as number
    };
  }

  /**
   * Converts a database record to a domain entity
   * @param record The database record to convert
   * @returns A domain entity
   */
  toDomain(record: InferSelectModel<typeof platformUsers>): PlatformUser {
    // Parse metadata
    const metadata = convertJson(record.metadata, 'sqlite', 'from') as Record<string, unknown> | undefined;

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
