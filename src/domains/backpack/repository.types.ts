/**
 * Type definitions for repository parameters and returns
 */
import { Shared } from 'openbadges-types';
import { PlatformStatus, UserAssertionStatus } from './backpack.types';

/**
 * Platform creation parameters
 */
export interface PlatformCreateParams {
  /**
   * Platform name
   */
  name: string;

  /**
   * Client ID for authentication
   */
  clientId: string;

  /**
   * Public key for JWT verification
   */
  publicKey: string;

  /**
   * Platform status (defaults to active)
   */
  status: PlatformStatus;

  /**
   * Platform description (optional)
   */
  description?: string;

  /**
   * Webhook URL for notifications (optional)
   */
  webhookUrl?: string;
}

/**
 * Platform update parameters
 */
export interface PlatformUpdateParams {
  /**
   * Platform name
   */
  name?: string;

  /**
   * Client ID for authentication
   */
  clientId?: string;

  /**
   * Public key for JWT verification
   */
  publicKey?: string;

  /**
   * Platform status
   */
  status?: PlatformStatus;

  /**
   * Platform description
   */
  description?: string;

  /**
   * Webhook URL for notifications
   */
  webhookUrl?: string;
}

/**
 * Platform user creation parameters
 */
export interface PlatformUserCreateParams {
  /**
   * Platform ID
   */
  platformId: Shared.IRI;

  /**
   * External user ID from the platform
   */
  externalUserId: string;

  /**
   * User display name (optional)
   */
  displayName?: string;

  /**
   * User email (optional)
   */
  email?: string;
}

/**
 * Platform user update parameters
 */
export interface PlatformUserUpdateParams {
  /**
   * Platform ID
   */
  platformId?: Shared.IRI;

  /**
   * External user ID from the platform
   */
  externalUserId?: string;

  /**
   * User display name
   */
  displayName?: string;

  /**
   * User email
   */
  email?: string;
}

/**
 * User assertion creation parameters
 */
export interface UserAssertionCreateParams {
  /**
   * User ID
   */
  userId: Shared.IRI;

  /**
   * Assertion ID
   */
  assertionId: Shared.IRI;

  /**
   * Assertion status (defaults to active)
   */
  status?: UserAssertionStatus;

  /**
   * Assertion metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * User assertion update parameters
 */
export interface UserAssertionUpdateParams {
  /**
   * Assertion status
   */
  status?: UserAssertionStatus;

  /**
   * Assertion metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Platform query parameters
 */
export interface PlatformQueryParams {
  /**
   * Filter by platform status
   */
  status?: PlatformStatus;

  /**
   * Search by name
   */
  name?: string;

  /**
   * Limit the number of results
   */
  limit?: number;

  /**
   * Skip the first n results
   */
  offset?: number;
}

/**
 * User assertion query parameters
 */
export interface UserAssertionQueryParams {
  /**
   * Filter by assertion status
   */
  status?: UserAssertionStatus;

  /**
   * Limit the number of results
   */
  limit?: number;

  /**
   * Skip the first n results
   */
  offset?: number;
}
