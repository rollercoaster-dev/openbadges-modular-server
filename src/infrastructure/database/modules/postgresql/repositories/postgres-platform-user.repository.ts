/**
 * PostgreSQL implementation of the PlatformUser repository
 *
 * This class implements the PlatformUserRepository interface using PostgreSQL
 */

import postgres from 'postgres';
import { PlatformUser } from '@domains/backpack/platform-user.entity';
import type { PlatformUserRepository } from '@domains/backpack/platform-user.repository';
import { Shared } from 'openbadges-types';
import { logger } from '@utils/logging/logger.service';

/**
 * PostgreSQL implementation of the PlatformUser repository
 *
 * @todo Implement this class
 */
export class PostgresPlatformUserRepository implements PlatformUserRepository {
  constructor(private client: postgres.Sql) {
    logger.info('PostgresPlatformUserRepository initialized');
  }

  async create(_user: Omit<PlatformUser, 'id'>): Promise<PlatformUser> {
    throw new Error('Method not implemented.');
  }

  async findById(_id: Shared.IRI): Promise<PlatformUser | null> {
    throw new Error('Method not implemented.');
  }

  async findByPlatformAndExternalId(_platformId: Shared.IRI, _externalUserId: string): Promise<PlatformUser | null> {
    throw new Error('Method not implemented.');
  }

  async update(_id: Shared.IRI, _user: Partial<PlatformUser>): Promise<PlatformUser | null> {
    throw new Error('Method not implemented.');
  }

  async delete(_id: Shared.IRI): Promise<boolean> {
    throw new Error('Method not implemented.');
  }
}