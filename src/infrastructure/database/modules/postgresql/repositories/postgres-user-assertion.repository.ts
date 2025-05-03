/**
 * PostgreSQL implementation of the UserAssertion repository
 *
 * This class implements the UserAssertionRepository interface using PostgreSQL
 */

import postgres from 'postgres';
import { UserAssertion } from '@domains/backpack/user-assertion.entity';
import type { UserAssertionRepository } from '@domains/backpack/user-assertion.repository';
import { Shared } from 'openbadges-types';
import { logger } from '@utils/logging/logger.service';
import { UserAssertionStatus } from '@domains/backpack/backpack.types';

/**
 * PostgreSQL implementation of the UserAssertion repository
 *
 * @todo Implement this class
 */
export class PostgresUserAssertionRepository implements UserAssertionRepository {
  constructor(private client: postgres.Sql) {
    logger.info('PostgresUserAssertionRepository initialized');
  }

  async addAssertion(_userId: Shared.IRI, _assertionId: Shared.IRI, _metadata?: Record<string, unknown>): Promise<UserAssertion> {
    throw new Error('Method not implemented.');
  }

  async removeAssertion(_userId: Shared.IRI, _assertionId: Shared.IRI): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  async updateStatus(_userId: Shared.IRI, _assertionId: Shared.IRI, _status: UserAssertionStatus): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  async getUserAssertions(_userId: Shared.IRI): Promise<UserAssertion[]> {
    throw new Error('Method not implemented.');
  }

  async getAssertionUsers(_assertionId: Shared.IRI): Promise<UserAssertion[]> {
    throw new Error('Method not implemented.');
  }

  async hasAssertion(_userId: Shared.IRI, _assertionId: Shared.IRI): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  async findByUserAndAssertion(_userId: Shared.IRI, _assertionId: Shared.IRI): Promise<UserAssertion | null> {
    throw new Error('Method not implemented.');
  }
}