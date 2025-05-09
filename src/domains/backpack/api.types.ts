/**
 * Type definitions for API requests and responses
 */
import { Shared } from 'openbadges-types';
import { PlatformStatus, UserAssertionStatus, ApiResponse } from './backpack.types';
import { z } from 'zod';

// Base IRI schema for reusability
const IRISchema = z.string().url(); // Assuming IRIs should be valid URLs. Adjust if not.

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

export const CreatePlatformRequestSchema = z.object({
  name: z.string().min(1),
  clientId: z.string().min(1),
  publicKey: z.string().min(1),
  description: z.string().optional(),
  webhookUrl: z.string().url().optional()
});

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

export const UpdatePlatformRequestSchema = z.object({
  name: z.string().min(1).optional(),
  clientId: z.string().min(1).optional(),
  publicKey: z.string().min(1).optional(),
  status: z.nativeEnum(PlatformStatus).optional(),
  description: z.string().optional(),
  webhookUrl: z.string().url().optional()
});

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

export const PlatformSchema = z.object({
  id: IRISchema,
  name: z.string(),
  clientId: z.string(),
  publicKey: z.string(),
  status: z.nativeEnum(PlatformStatus),
  description: z.string().optional(),
  webhookUrl: z.string().url().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

/**
 * Platform list response
 */
export interface PlatformListResponse {
  /**
   * List of platforms
   */
  platforms: PlatformResponse[];
}

export const PlatformsArraySchema = z.object({
  success: z.literal(true),
  platforms: z.array(PlatformSchema)
});

export const PlatformIdSchema = z.object({
  id: IRISchema
});

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

export const PlatformUserSchema = z.object({
  id: IRISchema,
  platformId: IRISchema,
  externalUserId: z.string(),
  displayName: z.string().optional(),
  email: z.string().email().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

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

export const AddAssertionRequestSchema = z.object({
  assertionId: IRISchema,
  metadata: z.record(z.unknown()).optional() // More specific schema might be better if metadata structure is known
});

/**
 * User assertion update status request
 */
export interface UpdateAssertionStatusRequest {
  /**
   * Assertion status
   */
  status: UserAssertionStatus;
}

export const UpdateAssertionStatusRequestSchema = z.object({
  status: z.nativeEnum(UserAssertionStatus)
});

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

export const UserAssertionSchema = z.object({
  id: IRISchema,
  userId: IRISchema,
  assertionId: IRISchema,
  addedAt: z.string().datetime(),
  status: z.nativeEnum(UserAssertionStatus),
  metadata: z.record(z.unknown()).optional()
});

/**
 * User assertion list response
 */
export interface UserAssertionListResponse {
  /**
   * List of user assertions
   */
  assertions: UserAssertionResponse[];
}

export const UserAssertionsArraySchema = z.object({
  success: z.literal(true),
  assertions: z.array(UserAssertionSchema)
});

/**
 * Success API response for general success cases like DELETE
 */
export const SuccessResponseSchema = z.object({
  success: z.literal(true)
});

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

export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(), // Assuming code might not always be present
  details: z.record(z.unknown()).optional()
});

// Updated response types for OpenAPI documentation, ensuring they return objects directly
// These wrap the core data schemas with a success flag, which is a common pattern for API responses.

/**
 * Typed API response
 */
export type TypedApiResponse<T> = ApiResponse<T>;

/**
 * Platform API response
 */
export const PlatformApiResponseSchema = z.object({
  success: z.literal(true),
  platform: PlatformSchema
});

/**
 * Platform list API response
 */
export type PlatformListApiResponse = TypedApiResponse<PlatformListResponse>;

/**
 * User assertion API response
 */
export const UserAssertionApiResponseSchema = z.object({
  success: z.literal(true),
  assertion: UserAssertionSchema // Renamed from userAssertion to assertion to match existing interface UserAssertionApiResponse
});

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
