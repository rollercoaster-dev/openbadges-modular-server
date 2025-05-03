/**
 * Backpack Controller
 *
 * This controller handles HTTP requests related to the backpack functionality,
 * including platform management and user assertions.
 */

import { BackpackService } from './backpack.service';
import { Platform } from './platform.entity';
import { PlatformUser } from './platform-user.entity';
import { logger } from '../../utils/logging/logger.service';
import { BadgeVersion } from '../../utils/version/badge-version';
import { Shared } from 'openbadges-types';
import {
  ApiResponse,
  UserAssertionStatus,
  UserAssertionMetadata
} from './backpack.types';

export class BackpackController {
  constructor(private backpackService: BackpackService) {}

  /**
   * Creates a new platform
   * @param data The platform data
   * @returns The created platform
   */
  async createPlatform(data: Record<string, unknown>): Promise<{ status: number; body: ApiResponse<{ platform: Record<string, unknown> }> }> {
    try {
      const platform = await this.backpackService.createPlatform(data as Omit<Platform, 'id'>);
      return {
        status: 201,
        body: {
          success: true,
          platform: platform.toObject()
        }
      };
    } catch (error) {
      logger.logError('Failed to create platform', error as Error);
      return {
        status: 500,
        body: {
          success: false,
          error: 'Failed to create platform'
        }
      };
    }
  }

  /**
   * Gets all platforms
   * @returns All platforms
   */
  async getAllPlatforms(): Promise<{ status: number; body: ApiResponse<{ platforms: Record<string, unknown>[] }> }> {
    try {
      const platforms = await this.backpackService.getAllPlatforms();
      return {
        status: 200,
        body: {
          success: true,
          platforms: platforms.map(p => p.toObject())
        }
      };
    } catch (error) {
      logger.logError('Failed to get all platforms', error as Error);
      return {
        status: 500,
        body: {
          success: false,
          error: 'Failed to get platforms'
        }
      };
    }
  }

  /**
   * Gets a platform by ID
   * @param id The platform ID
   * @returns The platform if found
   */
  async getPlatformById(id: Shared.IRI): Promise<{ status: number; body: ApiResponse<{ platform: Record<string, unknown> }> }> {
    try {
      const platform = await this.backpackService.getPlatformById(id);
      if (!platform) {
        return {
          status: 404,
          body: {
            success: false,
            error: 'Platform not found'
          }
        };
      }
      return {
        status: 200,
        body: {
          success: true,
          platform: platform.toObject()
        }
      };
    } catch (error) {
      logger.logError('Failed to get platform by ID', error as Error);
      return {
        status: 500,
        body: {
          success: false,
          error: 'Failed to get platform'
        }
      };
    }
  }

  /**
   * Updates a platform
   * @param id The platform ID
   * @param data The updated platform data
   * @returns The updated platform if found
   */
  async updatePlatform(id: Shared.IRI, data: Partial<Platform>): Promise<{ status: number; body: ApiResponse<{ platform: Record<string, unknown> }> }> {
    try {
      const platform = await this.backpackService.updatePlatform(id, data);
      if (!platform) {
        return {
          status: 404,
          body: {
            success: false,
            error: 'Platform not found'
          }
        };
      }
      return {
        status: 200,
        body: {
          success: true,
          platform: platform.toObject()
        }
      };
    } catch (error) {
      logger.logError('Failed to update platform', error as Error);
      return {
        status: 500,
        body: {
          success: false,
          error: 'Failed to update platform'
        }
      };
    }
  }

  /**
   * Deletes a platform
   * @param id The platform ID
   * @returns Success status
   */
  async deletePlatform(id: Shared.IRI): Promise<{ status: number; body: ApiResponse<null> }> {
    try {
      const success = await this.backpackService.deletePlatform(id);
      if (!success) {
        return {
          status: 404,
          body: {
            success: false,
            error: 'Platform not found'
          }
        };
      }
      return {
        status: 200,
        body: {
          success: true
        }
      };
    } catch (error) {
      logger.logError('Failed to delete platform', error as Error);
      return {
        status: 500,
        body: {
          success: false,
          error: 'Failed to delete platform'
        }
      };
    }
  }

  /**
   * Adds an assertion to a user's backpack
   * @param platformUser The authenticated platform user
   * @param assertionId The assertion ID
   * @param metadata Optional metadata
   * @returns Success status
   */
  async addAssertion(
    platformUser: Pick<PlatformUser, 'platformId' | 'externalUserId' | 'displayName' | 'email'>,
    assertionId: Shared.IRI,
    metadata?: UserAssertionMetadata
  ): Promise<{ status: number; body: ApiResponse<null> }> {
    try {
      // Get or create the user
      const user = await this.backpackService.getOrCreateUser(
        platformUser.platformId,
        platformUser.externalUserId,
        platformUser.displayName,
        platformUser.email
      );

      // Add the assertion to the user's backpack
      await this.backpackService.addAssertion(user.id as Shared.IRI, assertionId, metadata);

      return {
        status: 200,
        body: {
          success: true
        }
      };
    } catch (error) {
      logger.logError('Failed to add assertion to backpack', error as Error);
      return {
        status: 500,
        body: {
          success: false,
          error: 'Failed to add assertion to backpack'
        }
      };
    }
  }

  /**
   * Gets all assertions in a user's backpack
   * @param platformUser The authenticated platform user
   * @param version The badge version
   * @returns The assertions in the user's backpack
   */
  async getUserAssertions(
    platformUser: Pick<PlatformUser, 'platformId' | 'externalUserId' | 'displayName' | 'email'>,
    _version: BadgeVersion = BadgeVersion.V3
  ): Promise<{ status: number; body: ApiResponse<{ assertions: Record<string, unknown>[] }> }> {
    try {
      // Get or create the user
      const user = await this.backpackService.getOrCreateUser(
        platformUser.platformId,
        platformUser.externalUserId,
        platformUser.displayName,
        platformUser.email
      );

      // Get the user's assertions
      const assertions = await this.backpackService.getUserAssertions(user.id as Shared.IRI);

      return {
        status: 200,
        body: {
          success: true,
          assertions: assertions.map(a => a.toObject())
        }
      };
    } catch (error) {
      logger.logError('Failed to get user assertions', error as Error);
      return {
        status: 500,
        body: {
          success: false,
          error: 'Failed to get assertions from backpack'
        }
      };
    }
  }

  /**
   * Removes an assertion from a user's backpack
   * @param platformUser The authenticated platform user
   * @param assertionId The assertion ID
   * @returns Success status
   */
  async removeAssertion(
    platformUser: Pick<PlatformUser, 'platformId' | 'externalUserId' | 'displayName' | 'email'>,
    assertionId: Shared.IRI
  ): Promise<{ status: number; body: ApiResponse<null> }> {
    try {
      // Get or create the user
      const user = await this.backpackService.getOrCreateUser(
        platformUser.platformId,
        platformUser.externalUserId,
        platformUser.displayName,
        platformUser.email
      );

      // Remove the assertion from the user's backpack
      const success = await this.backpackService.removeAssertion(user.id as Shared.IRI, assertionId);

      if (!success) {
        return {
          status: 404,
          body: {
            success: false,
            error: 'Assertion not found in backpack'
          }
        };
      }

      return {
        status: 200,
        body: {
          success: true
        }
      };
    } catch (error) {
      logger.logError('Failed to remove assertion from backpack', error as Error);
      return {
        status: 500,
        body: {
          success: false,
          error: 'Failed to remove assertion from backpack'
        }
      };
    }
  }

  /**
   * Updates the status of an assertion in a user's backpack
   * @param platformUser The authenticated platform user
   * @param assertionId The assertion ID
   * @param status The new status
   * @returns Success status
   */
  async updateAssertionStatus(
    platformUser: Pick<PlatformUser, 'platformId' | 'externalUserId' | 'displayName' | 'email'>,
    assertionId: Shared.IRI,
    status: UserAssertionStatus
  ): Promise<{ status: number; body: ApiResponse<null> }> {
    try {
      // Get or create the user
      const user = await this.backpackService.getOrCreateUser(
        platformUser.platformId,
        platformUser.externalUserId,
        platformUser.displayName,
        platformUser.email
      );

      // Update the assertion status
      const success = await this.backpackService.updateAssertionStatus(user.id as Shared.IRI, assertionId, status);

      if (!success) {
        return {
          status: 404,
          body: {
            success: false,
            error: 'Assertion not found in backpack'
          }
        };
      }

      return {
        status: 200,
        body: {
          success: true
        }
      };
    } catch (error) {
      logger.logError('Failed to update assertion status', error as Error);
      return {
        status: 500,
        body: {
          success: false,
          error: 'Failed to update assertion status'
        }
      };
    }
  }
}
