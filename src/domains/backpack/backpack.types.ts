/**
 * Type definitions for the backpack feature
 */
import { Shared } from 'openbadges-types';

/**
 * Platform status enum
 */
export enum PlatformStatus {
  /**
   * Platform is active and can authenticate users
   */
  ACTIVE = 'active',
  
  /**
   * Platform is inactive and cannot authenticate users
   */
  INACTIVE = 'inactive',
  
  /**
   * Platform is suspended due to policy violations or other issues
   */
  SUSPENDED = 'suspended'
}

/**
 * User assertion status enum
 */
export enum UserAssertionStatus {
  /**
   * Assertion is active and visible in the user's backpack
   */
  ACTIVE = 'active',
  
  /**
   * Assertion is hidden from the user's backpack but still exists
   */
  HIDDEN = 'hidden',
  
  /**
   * Assertion is marked as deleted but retained in the database
   */
  DELETED = 'deleted'
}

/**
 * Platform user metadata interface
 */
export interface PlatformUserMetadata {
  /**
   * User roles within the platform
   */
  roles?: string[];
  
  /**
   * User preferences
   */
  preferences?: {
    /**
     * Notification settings
     */
    notifications?: boolean;
    
    /**
     * Display settings
     */
    display?: {
      /**
       * Theme preference
       */
      theme?: 'light' | 'dark' | 'system';
    };
  };
  
  /**
   * Custom properties defined by the platform
   */
  [key: string]: unknown;
}

/**
 * User assertion metadata interface
 */
export interface UserAssertionMetadata {
  /**
   * Date when the assertion was issued
   */
  issuedOn?: string | Date;
  
  /**
   * Date when the assertion expires
   */
  expiresOn?: string | Date;
  
  /**
   * User-defined tags for the assertion
   */
  tags?: string[];
  
  /**
   * User-defined notes about the assertion
   */
  notes?: string;
  
  /**
   * Visibility settings
   */
  visibility?: 'public' | 'private' | 'restricted';
  
  /**
   * Custom properties defined by the platform
   */
  [key: string]: unknown;
}

/**
 * Platform metadata interface
 */
export interface PlatformMetadata {
  /**
   * Contact information for the platform
   */
  contact?: {
    /**
     * Name of the contact person
     */
    name?: string;
    
    /**
     * Email of the contact person
     */
    email?: string;
    
    /**
     * Phone number of the contact person
     */
    phone?: string;
  };
  
  /**
   * Integration settings
   */
  integration?: {
    /**
     * API version used by the platform
     */
    apiVersion?: string;
    
    /**
     * Features enabled for this platform
     */
    features?: string[];
  };
  
  /**
   * Custom properties defined by the platform
   */
  [key: string]: unknown;
}

/**
 * API response wrapper type
 */
export type ApiResponse<T> = {
  /**
   * Success status
   */
  success: boolean;
  
  /**
   * Response data (only present if success is true)
   */
  data?: T;
  
  /**
   * Error message (only present if success is false)
   */
  error?: string;
  
  /**
   * Error code (only present if success is false)
   */
  code?: string;
  
  /**
   * Allow additional properties for backward compatibility
   */
  [key: string]: unknown;
};

/**
 * Authentication response type
 */
export type AuthResponse = AuthSuccess | AuthFailure;

/**
 * Successful authentication response
 */
export interface AuthSuccess {
  /**
   * Authentication status
   */
  isAuthenticated: true;
  
  /**
   * Authenticated platform user
   */
  platformUser: {
    id: Shared.IRI;
    platformId: Shared.IRI;
    externalUserId: string;
    displayName?: string;
    email?: string;
  };
  
  /**
   * Error message (always null for success)
   */
  error: null;
}

/**
 * Failed authentication response
 */
export interface AuthFailure {
  /**
   * Authentication status
   */
  isAuthenticated: false;
  
  /**
   * Platform user (always null for failure)
   */
  platformUser: null;
  
  /**
   * Error message
   */
  error: string;
}
