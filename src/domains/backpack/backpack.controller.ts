/**
 * Backpack Controller
 *
 * This controller handles HTTP requests related to the backpack functionality,
 * including platform management and user assertions.
 */

import { BackpackService } from './backpack.service';
import { PlatformUser } from './platform-user.entity';
import { logger } from '../../utils/logging/logger.service';
import { BadgeVersion } from '../../utils/version/badge-version';
import { Shared } from 'openbadges-types';
import { UserAssertionStatus, UserAssertionMetadata, PlatformStatus } from './backpack.types';
import { UserPermission } from '../user/user.entity';
import {
  CreatePlatformRequest,
  UpdatePlatformRequest,
  PlatformApiResponse,
  PlatformListApiResponse,
  UserAssertionListApiResponse,
  SuccessApiResponse,
  ErrorApiResponse
} from './api.types';
import { PlatformCreateParams, PlatformUpdateParams } from './repository.types';

export class BackpackController {
  constructor(private backpackService: BackpackService) {}

  /**
   * Check if the user has the required permission
   * @param user The authenticated user
   * @param permission The required permission
   * @returns True if the user has the permission, false otherwise
   */
  private hasPermission(user: { claims?: Record<string, unknown> } | null, permission: UserPermission): boolean {
    if (!user || !user.claims) {
      return false;
    }

    const permissions = user.claims['permissions'] as UserPermission[] || [];
    return permissions.includes(permission);
  }

  /**
   * Creates a new platform
   * @param data The platform data
   * @param user The authenticated user
   * @returns The created platform
   */
  async createPlatform(data: CreatePlatformRequest, user?: { claims?: Record<string, unknown> } | null): Promise<{ status: number; body: PlatformApiResponse }> {
    // Check if user has permission to manage platforms
    if (user && !this.hasPermission(user, UserPermission.MANAGE_PLATFORMS)) {
      logger.warn(`User ${user.claims?.['sub'] || 'unknown'} attempted to create a platform without permission`);
      return {
        status: 403,
        body: {
          success: false,
          error: 'Insufficient permissions to create platform'
        }
      };
    }
    try {
      const platformParams: PlatformCreateParams = {
        name: data.name,
        clientId: data.clientId,
        publicKey: data.publicKey,
        status: PlatformStatus.ACTIVE,
        description: data.description,
        webhookUrl: data.webhookUrl
      };
      const platform = await this.backpackService.createPlatform(platformParams);
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
   * @param user The authenticated user
   * @returns All platforms
   */
  async getAllPlatforms(user?: { claims?: Record<string, unknown> } | null): Promise<{ status: number; body: PlatformListApiResponse }> {
    // Check if user has permission to manage platforms
    if (user && !this.hasPermission(user, UserPermission.MANAGE_PLATFORMS)) {
      logger.warn(`User ${user.claims?.['sub'] || 'unknown'} attempted to get all platforms without permission`);
      return {
        status: 403,
        body: {
          success: false,
          error: 'Insufficient permissions to view platforms',
          platforms: []
        }
      };
    }
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
   * @param user The authenticated user
   * @returns The platform if found
   */
  async getPlatformById(id: Shared.IRI, user?: { claims?: Record<string, unknown> } | null): Promise<{ status: number; body: PlatformApiResponse | ErrorApiResponse }> {
    // Check if user has permission to manage platforms
    if (user && !this.hasPermission(user, UserPermission.MANAGE_PLATFORMS)) {
      logger.warn(`User ${user.claims?.['sub'] || 'unknown'} attempted to get platform ${id} without permission`);
      return {
        status: 403,
        body: {
          success: false,
          error: 'Insufficient permissions to view platform'
        }
      };
    }
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
   * @param user The authenticated user
   * @returns The updated platform if found
   */
  async updatePlatform(id: Shared.IRI, data: UpdatePlatformRequest, user?: { claims?: Record<string, unknown> } | null): Promise<{ status: number; body: PlatformApiResponse | ErrorApiResponse }> {
    // Check if user has permission to manage platforms
    if (user && !this.hasPermission(user, UserPermission.MANAGE_PLATFORMS)) {
      logger.warn(`User ${user.claims?.['sub'] || 'unknown'} attempted to update platform ${id} without permission`);
      return {
        status: 403,
        body: {
          success: false,
          error: 'Insufficient permissions to update platform'
        }
      };
    }
    try {
      const platformParams: PlatformUpdateParams = {
        name: data.name,
        clientId: data.clientId,
        publicKey: data.publicKey,
        status: data.status,
        description: data.description,
        webhookUrl: data.webhookUrl
      };
      const platform = await this.backpackService.updatePlatform(id, platformParams);
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
   * @param user The authenticated user
   * @returns Success status
   */
  async deletePlatform(id: Shared.IRI, user?: { claims?: Record<string, unknown> } | null): Promise<{ status: number; body: SuccessApiResponse | ErrorApiResponse }> {
    // Check if user has permission to manage platforms
    if (user && !this.hasPermission(user, UserPermission.MANAGE_PLATFORMS)) {
      logger.warn(`User ${user.claims?.['sub'] || 'unknown'} attempted to delete platform ${id} without permission`);
      return {
        status: 403,
        body: {
          success: false,
          error: 'Insufficient permissions to delete platform'
        }
      };
    }
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
  ): Promise<{ status: number; body: SuccessApiResponse | ErrorApiResponse }> {
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
  ): Promise<{ status: number; body: UserAssertionListApiResponse | ErrorApiResponse }> {
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
  ): Promise<{ status: number; body: SuccessApiResponse | ErrorApiResponse }> {
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
  ): Promise<{ status: number; body: SuccessApiResponse | ErrorApiResponse }> {
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
