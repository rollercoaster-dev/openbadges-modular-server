/**
 * PostgreSQL implementation of the Platform repository
 *
 * This class implements the PlatformRepository interface using PostgreSQL
 */

import postgres from 'postgres';
import { Platform } from '@domains/backpack/platform.entity';
import type { PlatformRepository } from '@domains/backpack/platform.repository';
import { Shared } from 'openbadges-types';
import { logger } from '@utils/logging/logger.service';

/**
 * PostgreSQL implementation of the Platform repository
 *
 * @todo Implement this class
 */
export class PostgresPlatformRepository implements PlatformRepository {
  constructor(private client: postgres.Sql) {
    logger.info('PostgresPlatformRepository initialized');
  }

  async create(_platform: Omit<Platform, 'id'>): Promise<Platform> {
    throw new Error('Method not implemented.');
  }

  async findAll(): Promise<Platform[]> {
    throw new Error('Method not implemented.');
  }

  async findById(_id: Shared.IRI): Promise<Platform | null> {
    throw new Error('Method not implemented.');
  }

  async findByClientId(_clientId: string): Promise<Platform | null> {
    throw new Error('Method not implemented.');
  }

  async update(_id: Shared.IRI, _platform: Partial<Platform>): Promise<Platform | null> {
    throw new Error('Method not implemented.');
  }

  async delete(_id: Shared.IRI): Promise<boolean> {
    throw new Error('Method not implemented.');
  }
}
