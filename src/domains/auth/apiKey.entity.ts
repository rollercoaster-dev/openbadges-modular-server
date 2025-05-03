/**
 * API Key Entity
 *
 * This file defines the API Key entity for the authentication system.
 * API Keys are used for headless authentication and are associated with a user.
 */

import { Shared } from 'openbadges-types';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';

/**
 * Permissions for an API Key
 */
export interface ApiKeyPermissions {
  /**
   * Roles assigned to the API Key
   */
  roles?: string[];

  /**
   * Specific permissions granted to the API Key
   */
  permissions?: string[];

  /**
   * Scope of the API Key (e.g., 'read', 'write', 'admin')
   */
  scope?: string;

  /**
   * Additional claims for the API Key
   */
  [key: string]: unknown;
}

/**
 * API Key entity
 */
export class ApiKey {
  /**
   * Unique identifier for the API Key
   */
  id: Shared.IRI;

  /**
   * The API Key value (used for authentication)
   */
  key: string;

  /**
   * Name of the API Key (for display purposes)
   */
  name: string;

  /**
   * User ID associated with the API Key
   */
  userId: string;

  /**
   * Description of the API Key
   */
  description?: string;

  /**
   * Permissions granted to the API Key
   */
  permissions: ApiKeyPermissions;

  /**
   * Expiration date of the API Key
   */
  expiresAt?: Date;

  /**
   * Last time the API Key was used
   */
  lastUsedAt?: Date;

  /**
   * Whether the API Key has been revoked
   */
  revoked: boolean;

  /**
   * Creation date of the API Key
   */
  createdAt: Date;

  /**
   * Last update date of the API Key
   */
  updatedAt: Date;

  /**
   * Create a new API Key
   * @param data API Key data
   * @returns A new API Key instance
   */
  static create(data: {
    name: string;
    userId: string;
    description?: string;
    permissions?: ApiKeyPermissions;
    expiresAt?: Date;
  }): ApiKey {
    const apiKey = new ApiKey();

    // Generate a unique ID
    apiKey.id = `urn:uuid:${uuidv4()}` as Shared.IRI;

    // Generate a secure random API key
    apiKey.key = this.generateApiKey();

    // Set properties from data
    apiKey.name = data.name;
    apiKey.userId = data.userId;
    apiKey.description = data.description;
    apiKey.permissions = data.permissions || { roles: [], permissions: [] };
    apiKey.expiresAt = data.expiresAt;

    // Set default values
    apiKey.revoked = false;
    apiKey.createdAt = new Date();
    apiKey.updatedAt = new Date();

    return apiKey;
  }

  /**
   * Generate a secure random API key
   * @returns A secure random API key
   */
  static generateApiKey(): string {
    // Generate 32 random bytes and convert to a hex string
    // This creates a 64-character hex string
    return randomBytes(32).toString('hex');
  }

  /**
   * Check if the API Key is valid (not expired and not revoked)
   * @returns True if the API Key is valid, false otherwise
   */
  isValid(): boolean {
    if (this.revoked) {
      return false;
    }

    if (this.expiresAt && this.expiresAt < new Date()) {
      return false;
    }

    return true;
  }

  /**
   * Update the last used timestamp
   */
  updateLastUsed(): void {
    this.lastUsedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Revoke the API Key
   */
  revoke(): void {
    this.revoked = true;
    this.updatedAt = new Date();
  }
}
