/**
 * Type definitions for API requests and responses
 */
import { Shared } from 'openbadges-types';
import { PlatformStatus, UserAssertionStatus, ApiResponse } from './backpack.types';

/**
 * Platform creation request
 */
export interface CreatePlatformRequest {
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
   * Platform description (optional)
   */
  description?: string;

  /**
   * Webhook URL for notifications (optional)
   */
  webhookUrl?: string;
}

/**
 * Platform update request
 */
export interface UpdatePlatformRequest {
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
 * Platform response
 */
export interface PlatformResponse {
  /**
   * Platform ID
   */
  id: Shared.IRI;

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
   * Platform status
   */
  status: PlatformStatus;

  /**
   * Platform description
   */
  description?: string;

  /**
   * Webhook URL for notifications
   */
  webhookUrl?: string;

  /**
   * Creation date
   */
  createdAt: string;

  /**
   * Last update date
   */
  updatedAt: string;
}

/**
 * Platform list response
 */
export interface PlatformListResponse {
  /**
   * List of platforms
   */
  platforms: PlatformResponse[];
}

/**
 * Platform user response
 */
export interface PlatformUserResponse {
  /**
   * Platform user ID
   */
  id: Shared.IRI;

  /**
   * Platform ID
   */
  platformId: Shared.IRI;

  /**
   * External user ID from the platform
   */
  externalUserId: string;

  /**
   * User display name
   */
  displayName?: string;

  /**
   * User email
   */
  email?: string;

  /**
   * Creation date
   */
  createdAt: string;

  /**
   * Last update date
   */
  updatedAt: string;
}

/**
 * User assertion creation request
 */
export interface AddAssertionRequest {
  /**
   * Assertion ID
   */
  assertionId: Shared.IRI;

  /**
   * Assertion metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * User assertion update status request
 */
export interface UpdateAssertionStatusRequest {
  /**
   * Assertion status
   */
  status: UserAssertionStatus;
}

/**
 * User assertion response
 */
export interface UserAssertionResponse {
  /**
   * User assertion ID
   */
  id: Shared.IRI;

  /**
   * User ID
   */
  userId: Shared.IRI;

  /**
   * Assertion ID
   */
  assertionId: Shared.IRI;

  /**
   * Date when the assertion was added to the user's backpack
   */
  addedAt: string;

  /**
   * Assertion status
   */
  status: UserAssertionStatus;

  /**
   * Assertion metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * User assertion list response
 */
export interface UserAssertionListResponse {
  /**
   * List of user assertions
   */
  assertions: UserAssertionResponse[];
}

/**
 * API error response
 */
export interface ApiErrorResponse {
  /**
   * Error message
   */
  error: string;

  /**
   * Error code
   */
  code: string;

  /**
   * Error details
   */
  details?: Record<string, unknown>;
}

/**
 * Typed API response
 */
export type TypedApiResponse<T> = ApiResponse<T>;

/**
 * Platform API response
 */
export type PlatformApiResponse = TypedApiResponse<{ platform: PlatformResponse }>;

/**
 * Platform list API response
 */
export type PlatformListApiResponse = TypedApiResponse<PlatformListResponse>;

/**
 * User assertion API response
 */
export type UserAssertionApiResponse = TypedApiResponse<{ assertion: UserAssertionResponse }>;

/**
 * User assertion list API response
 */
export type UserAssertionListApiResponse = TypedApiResponse<UserAssertionListResponse>;

/**
 * Success API response
 */
export type SuccessApiResponse = TypedApiResponse<{ success: true }>;

/**
 * Error API response
 */
export type ErrorApiResponse = TypedApiResponse<ApiErrorResponse>;
