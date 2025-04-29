/**
 * API Key Repository Interface
 * 
 * This file defines the interface for API Key repositories.
 * It provides methods for creating, retrieving, updating, and deleting API Keys.
 */

import { Shared } from 'openbadges-types';
import { ApiKey } from './apiKey.entity';

/**
 * Interface for API Key repositories
 */
export interface ApiKeyRepository {
  /**
   * Create a new API Key
   * @param apiKey The API Key to create
   * @returns The created API Key
   */
  create(apiKey: ApiKey): Promise<ApiKey>;
  
  /**
   * Find an API Key by its ID
   * @param id The ID of the API Key to find
   * @returns The API Key if found, null otherwise
   */
  findById(id: Shared.IRI): Promise<ApiKey | null>;
  
  /**
   * Find an API Key by its key value
   * @param key The key value to find
   * @returns The API Key if found, null otherwise
   */
  findByKey(key: string): Promise<ApiKey | null>;
  
  /**
   * Find all API Keys for a user
   * @param userId The user ID to find API Keys for
   * @returns An array of API Keys
   */
  findByUserId(userId: string): Promise<ApiKey[]>;
  
  /**
   * Find all API Keys
   * @returns An array of all API Keys
   */
  findAll(): Promise<ApiKey[]>;
  
  /**
   * Update an API Key
   * @param id The ID of the API Key to update
   * @param data The data to update
   * @returns The updated API Key if found, null otherwise
   */
  update(id: Shared.IRI, data: Partial<ApiKey>): Promise<ApiKey | null>;
  
  /**
   * Delete an API Key
   * @param id The ID of the API Key to delete
   * @returns True if the API Key was deleted, false otherwise
   */
  delete(id: Shared.IRI): Promise<boolean>;
  
  /**
   * Revoke an API Key
   * @param id The ID of the API Key to revoke
   * @returns The revoked API Key if found, null otherwise
   */
  revoke(id: Shared.IRI): Promise<ApiKey | null>;
  
  /**
   * Update the last used timestamp for an API Key
   * @param id The ID of the API Key to update
   * @returns The updated API Key if found, null otherwise
   */
  updateLastUsed(id: Shared.IRI): Promise<ApiKey | null>;
}
