/**
 * DTOs for Issuer-related API endpoints
 * 
 * These DTOs define the expected request and response structures for issuer operations.
 * They provide type safety and validation for the API.
 */

import { OB2, OB3 } from 'openbadges-types';

/**
 * Base DTO for issuer creation and update operations
 * Contains common properties across OB2 and OB3
 */
export interface IssuerBaseDto {
  name: string;
  url: string;
  email?: string;
  description?: string;
  image?: string | {
    id?: string;
    type?: string;
    url?: string;
    caption?: string;
  };
  publicKey?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * DTO for creating a new issuer (OB2)
 */
export interface CreateIssuerOB2Dto extends IssuerBaseDto {
  type?: string | string[]; // In OB2, type can be string or array of strings
}

/**
 * DTO for creating a new issuer (OB3)
 */
export interface CreateIssuerOB3Dto extends IssuerBaseDto {
  type?: string; // In OB3, type is typically a string
  id?: string;   // Allow client to suggest an ID (optional)
}

/**
 * Union type for create issuer operations
 */
export type CreateIssuerDto = CreateIssuerOB2Dto | CreateIssuerOB3Dto;

/**
 * DTO for updating an existing issuer
 * Similar to create but all fields are optional
 */
export type UpdateIssuerDto = Partial<CreateIssuerDto>;

/**
 * Response DTO for issuer operations
 * This is a union type of OB2.Profile and OB3.Issuer
 */
export type IssuerResponseDto = OB2.Profile | OB3.Issuer;
