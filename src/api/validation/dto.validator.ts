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
  UpdateAssertionDto,
  BatchCreateCredentialsDto,
  BatchRetrieveCredentialsDto,
  BatchUpdateCredentialStatusDto
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

/**
 * Validates a BatchCreateCredentialsDto
 * @param data The data to validate
 * @throws MissingRequiredFieldsError if required fields are missing
 */
export function validateBatchCreateCredentialsDto(data: unknown): asserts data is BatchCreateCredentialsDto {
  const dto = data as Partial<BatchCreateCredentialsDto>;
  const missingFields: string[] = [];

  if (!dto.credentials) {
    missingFields.push('credentials');
  } else if (!Array.isArray(dto.credentials)) {
    missingFields.push('credentials (must be an array)');
  } else if (dto.credentials.length === 0) {
    missingFields.push('credentials (must contain at least one credential)');
  } else if (dto.credentials.length > 100) {
    missingFields.push('credentials (maximum 100 credentials per batch)');
  } else {
    // Validate each credential in the batch
    dto.credentials.forEach((credential, index) => {
      try {
        validateCreateAssertionDto(credential);
      } catch (error) {
        if (error instanceof MissingRequiredFieldsError) {
          error.fields.forEach(field => {
            missingFields.push(`credentials[${index}].${field}`);
          });
        }
      }
    });
  }

  if (missingFields.length > 0) {
    logger.error('Missing required fields in BatchCreateCredentialsDto', { missingFields });
    throw new MissingRequiredFieldsError(missingFields);
  }
}

/**
 * Validates a BatchRetrieveCredentialsDto
 * @param data The data to validate
 * @throws MissingRequiredFieldsError if required fields are missing
 */
export function validateBatchRetrieveCredentialsDto(data: unknown): asserts data is BatchRetrieveCredentialsDto {
  const dto = data as Partial<BatchRetrieveCredentialsDto>;
  const missingFields: string[] = [];

  if (!dto.ids) {
    missingFields.push('ids');
  } else if (!Array.isArray(dto.ids)) {
    missingFields.push('ids (must be an array)');
  } else if (dto.ids.length === 0) {
    missingFields.push('ids (must contain at least one ID)');
  } else if (dto.ids.length > 100) {
    missingFields.push('ids (maximum 100 IDs per batch)');
  } else {
    // Validate each ID
    dto.ids.forEach((id, index) => {
      if (typeof id !== 'string' || id.trim() === '') {
        missingFields.push(`ids[${index}] (must be a non-empty string)`);
      }
    });
  }

  if (missingFields.length > 0) {
    logger.error('Missing required fields in BatchRetrieveCredentialsDto', { missingFields });
    throw new MissingRequiredFieldsError(missingFields);
  }
}

/**
 * Validates a BatchUpdateCredentialStatusDto
 * @param data The data to validate
 * @throws MissingRequiredFieldsError if required fields are missing
 */
export function validateBatchUpdateCredentialStatusDto(data: unknown): asserts data is BatchUpdateCredentialStatusDto {
  const dto = data as Partial<BatchUpdateCredentialStatusDto>;
  const missingFields: string[] = [];

  if (!dto.updates) {
    missingFields.push('updates');
  } else if (!Array.isArray(dto.updates)) {
    missingFields.push('updates (must be an array)');
  } else if (dto.updates.length === 0) {
    missingFields.push('updates (must contain at least one update)');
  } else if (dto.updates.length > 100) {
    missingFields.push('updates (maximum 100 updates per batch)');
  } else {
    // Validate each update
    dto.updates.forEach((update, index) => {
      if (!update.id || typeof update.id !== 'string' || update.id.trim() === '') {
        missingFields.push(`updates[${index}].id`);
      }
      if (!update.status || !['revoked', 'suspended', 'active'].includes(update.status)) {
        missingFields.push(`updates[${index}].status (must be 'revoked', 'suspended', or 'active')`);
      }
    });
  }

  if (missingFields.length > 0) {
    logger.error('Missing required fields in BatchUpdateCredentialStatusDto', { missingFields });
    throw new MissingRequiredFieldsError(missingFields);
  }
}
