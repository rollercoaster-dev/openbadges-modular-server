/**
 * Type definitions for authentication
 */
import { Shared } from 'openbadges-types';
import { AuthResponse, AuthSuccess, AuthFailure } from './backpack.types';

/**
 * Platform JWT payload
 */
export interface PlatformJwtPayload {
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

  /**
   * JWT issued at timestamp
   */
  iat?: number;

  /**
   * JWT expiration timestamp
   */
  exp?: number;

  /**
   * JWT issuer
   */
  iss?: string;

  /**
   * JWT subject
   */
  sub?: string;

  /**
   * JWT audience
   */
  aud?: string;
}

/**
 * Platform authentication request
 */
export interface PlatformAuthRequest {
  /**
   * Platform client ID
   */
  clientId: string;

  /**
   * JWT token
   */
  token: string;
}

/**
 * Platform authentication response
 */
export type PlatformAuthResponse = AuthResponse;

/**
 * Successful platform authentication
 */
export type PlatformAuthSuccess = AuthSuccess;

/**
 * Failed platform authentication
 */
export type PlatformAuthFailure = AuthFailure;
