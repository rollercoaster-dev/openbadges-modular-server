/**
 * Backpack Service
 *
 * This service handles operations related to the backpack functionality,
 * including managing platform users and their assertions.
 */

import { PlatformRepository } from './platform.repository';
import { PlatformUserRepository } from './platform-user.repository';
import { UserAssertionRepository } from './user-assertion.repository';
import { AssertionRepository } from '../assertion/assertion.repository';
import { Platform } from './platform.entity';
import { PlatformUser } from './platform-user.entity';
import { UserAssertion, UserAssertionData } from './user-assertion.entity';
import { logger } from '../../utils/logging/logger.service';
import { Shared } from 'openbadges-types';
import { UserAssertionStatus } from './backpack.types';
import {
  PlatformCreateParams,
  PlatformUpdateParams,
  PlatformQueryParams,
  UserAssertionCreateParams,
  UserAssertionQueryParams
} from './repository.types';

export class BackpackService {
  constructor(
    private platformRepository: PlatformRepository,
    private platformUserRepository: PlatformUserRepository,
    private userAssertionRepository: UserAssertionRepository,
    private assertionRepository: AssertionRepository
  ) {}

  /**
   * Creates a new platform
   * @param platform The platform data
   * @returns The created platform
   */
  async createPlatform(params: PlatformCreateParams): Promise<Platform> {
    try {
      return await this.platformRepository.create(params);
    } catch (error) {
      logger.logError('Failed to create platform', error as Error);
      throw new Error('Failed to create platform');
    }
  }

  /**
   * Gets all platforms
   * @returns All platforms
   */
  async getAllPlatforms(params?: PlatformQueryParams): Promise<Platform[]> {
    try {
      return await this.platformRepository.findAll(params);
    } catch (error) {
      logger.logError('Failed to get all platforms', error as Error);
      throw new Error('Failed to get platforms');
    }
  }

  /**
   * Gets a platform by ID
   * @param id The platform ID
   * @returns The platform if found, null otherwise
   */
  async getPlatformById(id: Shared.IRI): Promise<Platform | null> {
    try {
      return await this.platformRepository.findById(id);
    } catch (error) {
      logger.logError('Failed to get platform by ID', error as Error);
      throw new Error('Failed to get platform');
    }
  }

  /**
   * Updates a platform
   * @param id The platform ID
   * @param platform The updated platform data
   * @returns The updated platform if found, null otherwise
   */
  async updatePlatform(id: Shared.IRI, params: PlatformUpdateParams): Promise<Platform | null> {
    try {
      return await this.platformRepository.update(id, params);
    } catch (error) {
      logger.logError('Failed to update platform', error as Error);
      throw new Error('Failed to update platform');
    }
  }

  /**
   * Deletes a platform
   * @param id The platform ID
   * @returns True if the platform was deleted, false otherwise
   */
  async deletePlatform(id: Shared.IRI): Promise<boolean> {
    try {
      return await this.platformRepository.delete(id);
    } catch (error) {
      logger.logError('Failed to delete platform', error as Error);
      throw new Error('Failed to delete platform');
    }
  }

  /**
   * Gets or creates a platform user
   * @param platformId The platform ID
   * @param externalUserId The external user ID
   * @param displayName Optional display name
   * @param email Optional email
   * @returns The platform user
   */
  async getOrCreateUser(
    platformId: Shared.IRI,
    externalUserId: string,
    displayName?: string,
    email?: string
  ): Promise<PlatformUser> {
    try {
      // Check if the user already exists
      const existingUser = await this.platformUserRepository.findByPlatformAndExternalId(
        platformId,
        externalUserId
      );

      if (existingUser) {
        // Update user information if provided
        if ((displayName && existingUser.displayName !== displayName) ||
            (email && existingUser.email !== email)) {
          return await this.platformUserRepository.update(existingUser.id, {
            displayName: displayName || existingUser.displayName,
            email: email || existingUser.email
          }) as PlatformUser;
        }
        return existingUser;
      }

      // Create a new user
      return await this.platformUserRepository.create({
        platformId,
        externalUserId,
        displayName,
        email
      });
    } catch (error) {
      logger.logError('Failed to get or create platform user', error as Error);
      throw new Error('Failed to get or create user');
    }
  }

  /**
   * Adds an assertion to a user's backpack
   * @param userId The platform user ID
   * @param assertionId The assertion ID
   * @param metadata Optional metadata
   * @returns The user assertion
   */
  async addAssertion(
    userId: Shared.IRI,
    assertionId: Shared.IRI,
    metadata?: Record<string, unknown>
  ): Promise<UserAssertion>;

  /**
   * Adds an assertion to a user's backpack using params object
   * @param params The user assertion creation parameters
   * @returns The user assertion
   */
  async addAssertion(params: UserAssertionCreateParams): Promise<UserAssertion>;

  /**
   * Adds an assertion to a user's backpack
   * @param userIdOrParams The platform user ID or user assertion creation parameters
   * @param assertionId The assertion ID (optional if params object is provided)
   * @param metadata Optional metadata (optional if params object is provided)
   * @returns The user assertion
   */
  async addAssertion(
    userIdOrParams: Shared.IRI | UserAssertionCreateParams,
    assertionId?: Shared.IRI,
    metadata?: Record<string, unknown>
  ): Promise<UserAssertion> {
    try {
      // Handle params object
      if (typeof userIdOrParams !== 'string') {
        const params = userIdOrParams;

        // Check if the assertion exists
        const assertion = await this.assertionRepository.findById(params.assertionId);
        if (!assertion) {
          throw new Error('Assertion not found');
        }

        // Add the assertion to the user's backpack
        return await this.userAssertionRepository.addAssertion(params);
      }

      // Handle individual parameters
      if (!assertionId) {
        throw new Error('Assertion ID is required');
      }

      // Check if the assertion exists
      const assertion = await this.assertionRepository.findById(assertionId);
      if (!assertion) {
        throw new Error('Assertion not found');
      }

      // Add the assertion to the user's backpack
      return await this.userAssertionRepository.addAssertion(userIdOrParams, assertionId, metadata);
    } catch (error) {
      logger.logError('Failed to add assertion to backpack', error as Error);
      throw new Error('Failed to add assertion to backpack');
    }
  }

  /**
   * Removes an assertion from a user's backpack
   * @param userId The platform user ID
   * @param assertionId The assertion ID
   * @returns True if the assertion was removed, false otherwise
   */
  async removeAssertion(userId: Shared.IRI, assertionId: Shared.IRI): Promise<boolean> {
    try {
      return await this.userAssertionRepository.removeAssertion(userId, assertionId);
    } catch (error) {
      logger.logError('Failed to remove assertion from backpack', error as Error);
      throw new Error('Failed to remove assertion from backpack');
    }
  }

  /**
   * Updates the status of an assertion in a user's backpack
   * @param userId The platform user ID
   * @param assertionId The assertion ID
   * @param status The new status
   * @returns True if the status was updated, false otherwise
   */
  async updateAssertionStatus(
    userId: Shared.IRI,
    assertionId: Shared.IRI,
    status: UserAssertionStatus
  ): Promise<boolean> {
    try {
      return await this.userAssertionRepository.updateStatus(userId, assertionId, status);
    } catch (error) {
      logger.logError('Failed to update assertion status', error as Error);
      throw new Error('Failed to update assertion status');
    }
  }

  /**
   * Gets all assertions in a user's backpack
   * @param userId The platform user ID
   * @returns The assertions in the user's backpack
   */
  async getUserAssertions(userId: Shared.IRI, params?: UserAssertionQueryParams): Promise<UserAssertion[]> {
    try {
      return await this.userAssertionRepository.getUserAssertions(userId, params);
    } catch (error) {
      logger.logError('Failed to get user assertions', error as Error);
      throw new Error('Failed to get assertions from backpack');
    }
  }

  /**
   * Checks if a user has an assertion in their backpack
   * @param userId The platform user ID
   * @param assertionId The assertion ID
   * @returns True if the user has the assertion, false otherwise
   */
  async hasAssertion(userId: Shared.IRI, assertionId: Shared.IRI): Promise<boolean> {
    try {
      return await this.userAssertionRepository.hasAssertion(userId, assertionId);
    } catch (error) {
      logger.logError('Failed to check if user has assertion', error as Error);
      throw new Error('Failed to check assertion in backpack');
    }
  }
}
