/**
 * DTOs for BadgeClass-related API endpoints
 * 
 * These DTOs define the expected request and response structures for badge class operations.
 * They provide type safety and validation for the API.
 */

import { OB2, OB3 } from 'openbadges-types';

/**
 * Base DTO for badge class creation and update operations
 * Contains common properties across OB2 and OB3
 */
export interface BadgeClassBaseDto {
  name: string;
  description: string;
  image: string | {
    id?: string;
    type?: string;
    url?: string;
    caption?: string;
  };
  criteria?: string | {
    id?: string;
    narrative?: string;
  };
  issuer: string; // IRI of the issuer
  tags?: string[];
  alignment?: Array<{
    targetName?: string;
    targetUrl?: string;
    targetDescription?: string;
    targetFramework?: string;
    targetCode?: string;
  }>;
  [key: string]: unknown;
}

/**
 * DTO for creating a new badge class (OB2)
 */
export interface CreateBadgeClassOB2Dto extends BadgeClassBaseDto {
  type?: string | string[]; // In OB2, type can be string or array of strings
}

/**
 * DTO for creating a new badge class (OB3)
 */
export interface CreateBadgeClassOB3Dto extends BadgeClassBaseDto {
  type?: string; // In OB3, type is typically a string
  id?: string;   // Allow client to suggest an ID (optional)
  achievementType?: string;
}

/**
 * Union type for create badge class operations
 */
export type CreateBadgeClassDto = CreateBadgeClassOB2Dto | CreateBadgeClassOB3Dto;

/**
 * DTO for updating an existing badge class
 * Similar to create but all fields are optional
 */
export type UpdateBadgeClassDto = Partial<CreateBadgeClassDto>;

/**
 * Response DTO for badge class operations
 * This is a union type of OB2.BadgeClass and OB3.Achievement
 */
export type BadgeClassResponseDto = OB2.BadgeClass | OB3.Achievement;
