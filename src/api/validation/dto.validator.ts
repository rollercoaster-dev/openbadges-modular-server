/**
 * Centralized DTO validation utilities
 * 
 * This module provides validation functions for DTOs to ensure consistent
 * validation across all routes and reduce potential casting errors.
 */

import { logger } from '../../utils/logging/logger.service';
import { MissingRequiredFieldsError } from '../../utils/errors/validation.errors';
import { 
  CreateIssuerDto, 
  UpdateIssuerDto,
  CreateBadgeClassDto,
  UpdateBadgeClassDto,
  CreateAssertionDto,
  UpdateAssertionDto
} from '../dtos';

/**
 * Validates a CreateIssuerDto
 * @param data The data to validate
 * @throws MissingRequiredFieldsError if required fields are missing
 */
export function validateCreateIssuerDto(data: unknown): asserts data is CreateIssuerDto {
  const dto = data as Partial<CreateIssuerDto>;
  const missingFields: string[] = [];
  
  if (!dto.name) missingFields.push('name');
  if (!dto.url) missingFields.push('url');
  
  if (missingFields.length > 0) {
    logger.error('Missing required fields in CreateIssuerDto', { missingFields });
    throw new MissingRequiredFieldsError(missingFields);
  }
}

/**
 * Validates a CreateBadgeClassDto
 * @param data The data to validate
 * @throws MissingRequiredFieldsError if required fields are missing
 */
export function validateCreateBadgeClassDto(data: unknown): asserts data is CreateBadgeClassDto {
  const dto = data as Partial<CreateBadgeClassDto>;
  const missingFields: string[] = [];
  
  if (!dto.name) missingFields.push('name');
  if (!dto.description) missingFields.push('description');
  if (!dto.image) missingFields.push('image');
  if (!dto.issuer) missingFields.push('issuer');
  
  if (missingFields.length > 0) {
    logger.error('Missing required fields in CreateBadgeClassDto', { missingFields });
    throw new MissingRequiredFieldsError(missingFields);
  }
}

/**
 * Validates a CreateAssertionDto
 * @param data The data to validate
 * @throws MissingRequiredFieldsError if required fields are missing
 */
export function validateCreateAssertionDto(data: unknown): asserts data is CreateAssertionDto {
  const dto = data as Partial<CreateAssertionDto>;
  const missingFields: string[] = [];
  
  if (!dto.badge) missingFields.push('badge');
  if (!dto.recipient) missingFields.push('recipient');
  if (!dto.issuedOn) missingFields.push('issuedOn');
  
  // Additional validation for recipient if it exists
  if (dto.recipient) {
    if (!dto.recipient.identity) missingFields.push('recipient.identity');
    if (dto.recipient.type === undefined) missingFields.push('recipient.type');
    if (dto.recipient.hashed === undefined) missingFields.push('recipient.hashed');
  }
  
  if (missingFields.length > 0) {
    logger.error('Missing required fields in CreateAssertionDto', { missingFields });
    throw new MissingRequiredFieldsError(missingFields);
  }
}

/**
 * Type guard for UpdateIssuerDto
 * @param data The data to check
 * @returns True if data is a valid UpdateIssuerDto
 */
export function isUpdateIssuerDto(data: unknown): data is UpdateIssuerDto {
  return typeof data === 'object' && data !== null;
}

/**
 * Type guard for UpdateBadgeClassDto
 * @param data The check
 * @returns True if data is a valid UpdateBadgeClassDto
 */
export function isUpdateBadgeClassDto(data: unknown): data is UpdateBadgeClassDto {
  return typeof data === 'object' && data !== null;
}

/**
 * Type guard for UpdateAssertionDto
 * @param data The data to check
 * @returns True if data is a valid UpdateAssertionDto
 */
export function isUpdateAssertionDto(data: unknown): data is UpdateAssertionDto {
  return typeof data === 'object' && data !== null;
}
