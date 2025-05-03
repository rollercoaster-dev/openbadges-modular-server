/**
 * Interface for Platform repositories
 */
import { Platform } from './platform.entity';
import { Shared } from 'openbadges-types';
import { PlatformCreateParams, PlatformUpdateParams, PlatformQueryParams } from './repository.types';

export interface PlatformRepository {
  /**
   * Creates a new platform
   * @param platform The platform to create
   * @returns The created platform with its ID
   */
  create(params: PlatformCreateParams): Promise<Platform>;

  /**
   * Finds all platforms
   * @returns An array of all platforms
   */
  findAll(params?: PlatformQueryParams): Promise<Platform[]>;

  /**
   * Finds a platform by its ID
   * @param id The ID of the platform to find
   * @returns The platform if found, null otherwise
   */
  findById(id: Shared.IRI): Promise<Platform | null>;

  /**
   * Finds a platform by its client ID
   * @param clientId The client ID of the platform to find
   * @returns The platform if found, null otherwise
   */
  findByClientId(clientId: string): Promise<Platform | null>;

  /**
   * Updates an existing platform
   * @param id The ID of the platform to update
   * @param platform The updated platform data
   * @returns The updated platform if found, null otherwise
   */
  update(id: Shared.IRI, params: PlatformUpdateParams): Promise<Platform | null>;

  /**
   * Deletes a platform
   * @param id The ID of the platform to delete
   * @returns True if the platform was deleted, false otherwise
   */
  delete(id: Shared.IRI): Promise<boolean>;
}
