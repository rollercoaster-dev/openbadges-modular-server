/**
 * Interface for PlatformUser repositories
 */
import { PlatformUser } from './platform-user.entity';
import { Shared } from 'openbadges-types';

export interface PlatformUserRepository {
  /**
   * Creates a new platform user
   * @param user The platform user to create
   * @returns The created platform user with its ID
   */
  create(user: Omit<PlatformUser, 'id'>): Promise<PlatformUser>;

  /**
   * Finds a platform user by its ID
   * @param id The ID of the platform user to find
   * @returns The platform user if found, null otherwise
   */
  findById(id: Shared.IRI): Promise<PlatformUser | null>;

  /**
   * Finds a platform user by platform ID and external user ID
   * @param platformId The ID of the platform
   * @param externalUserId The external user ID
   * @returns The platform user if found, null otherwise
   */
  findByPlatformAndExternalId(platformId: Shared.IRI, externalUserId: string): Promise<PlatformUser | null>;

  /**
   * Updates an existing platform user
   * @param id The ID of the platform user to update
   * @param user The updated platform user data
   * @returns The updated platform user if found, null otherwise
   */
  update(id: Shared.IRI, user: Partial<PlatformUser>): Promise<PlatformUser | null>;

  /**
   * Deletes a platform user
   * @param id The ID of the platform user to delete
   * @returns True if the platform user was deleted, false otherwise
   */
  delete(id: Shared.IRI): Promise<boolean>;
}
