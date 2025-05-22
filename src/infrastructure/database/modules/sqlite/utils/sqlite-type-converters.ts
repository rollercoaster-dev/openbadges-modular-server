/**
 * SQLite Type Conversion Utilities
 *
 * This file provides type-safe conversion utilities for SQLite database operations,
 * ensuring proper handling of OpenBadges types and database-specific conversions.
 */

import { Shared } from 'openbadges-types';
// OB2 and OB3 imports available for future use if needed
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@utils/logging/logger.service';
import {
  TypeConversionResult,
  OpenBadgesImageType,
  OpenBadgesRecipientType,
  OpenBadgesVerificationType,
  OpenBadgesEvidenceType,
  OpenBadgesCriteriaType,
  OpenBadgesAlignmentType,
  SqliteTypeConversionError,
  SqliteValidationError,
} from '../types/sqlite-database.types';

/**
 * SQLite-specific type conversion utilities with strict type safety
 */
export namespace SqliteTypeConverters {
  /**
   * Generates a new Shared.IRI with proper validation
   */
  export function generateSharedIRI(): Shared.IRI {
    const uuid = uuidv4();
    return uuid as Shared.IRI;
  }

  /**
   * Validates and converts a string to Shared.IRI
   */
  export function validateAndConvertIRI(
    value: string
  ): TypeConversionResult<Shared.IRI> {
    if (!value || typeof value !== 'string') {
      return {
        success: false,
        data: null,
        error: 'Invalid IRI value: must be a non-empty string',
      };
    }

    // Basic IRI validation - can be enhanced with more sophisticated checks
    if (value.length === 0) {
      return {
        success: false,
        data: null,
        error: 'Invalid IRI value: cannot be empty',
      };
    }

    return {
      success: true,
      data: value as Shared.IRI,
    };
  }

  /**
   * Converts OpenBadges image types to SQLite string format
   */
  export function convertImageToString(
    image: OpenBadgesImageType | undefined
  ): string | null {
    if (!image) return null;

    if (typeof image === 'string') {
      return image;
    }

    try {
      return JSON.stringify(image);
    } catch (error) {
      logger.error('Failed to convert image to string', { image, error });
      throw new SqliteTypeConversionError(
        'Failed to serialize image object',
        image,
        'string'
      );
    }
  }

  /**
   * Converts SQLite string back to OpenBadges image type
   */
  export function convertImageFromString(
    imageStr: string | null
  ): Shared.IRI | Shared.OB3ImageObject | null {
    if (!imageStr) return null;

    // Try to parse as JSON first
    try {
      const parsed = JSON.parse(imageStr);
      // Validate that it's a proper image object
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed as Shared.OB3ImageObject;
      }
      return imageStr as Shared.IRI;
    } catch {
      // If parsing fails, treat as IRI string
      return imageStr as Shared.IRI;
    }
  }

  /**
   * Safely converts JSON string to typed object
   */
  export function safeJsonParse<T>(
    value: string | null,
    fieldName: string
  ): T | null {
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      logger.warn('Failed to parse JSON field', { fieldName, value, error });
      return null;
    }
  }

  /**
   * Safely converts object to JSON string
   */
  export function safeJsonStringify(
    value: unknown,
    fieldName: string
  ): string | null {
    if (value === null || value === undefined) return null;

    try {
      return JSON.stringify(value);
    } catch (error) {
      logger.error('Failed to stringify JSON field', {
        fieldName,
        value,
        error,
      });
      throw new SqliteTypeConversionError(
        `Failed to serialize ${fieldName}`,
        value,
        'string'
      );
    }
  }

  /**
   * Converts recipient object to SQLite string format
   */
  export function convertRecipientToString(
    recipient: OpenBadgesRecipientType
  ): string {
    try {
      return JSON.stringify(recipient);
    } catch (error) {
      logger.error('Failed to convert recipient to string', {
        recipient,
        error,
      });
      throw new SqliteTypeConversionError(
        'Failed to serialize recipient object',
        recipient,
        'string'
      );
    }
  }

  /**
   * Converts SQLite string back to recipient object
   */
  export function convertRecipientFromString(
    recipientStr: string
  ): OpenBadgesRecipientType {
    try {
      const parsed = JSON.parse(recipientStr);
      return parsed as OpenBadgesRecipientType;
    } catch (error) {
      logger.error('Failed to parse recipient from string', {
        recipientStr,
        error,
      });
      throw new SqliteTypeConversionError(
        'Failed to parse recipient object',
        recipientStr,
        'OpenBadgesRecipientType'
      );
    }
  }

  /**
   * Converts verification object to SQLite string format
   */
  export function convertVerificationToString(
    verification: OpenBadgesVerificationType | undefined
  ): string | null {
    if (!verification) return null;

    try {
      return JSON.stringify(verification);
    } catch (error) {
      logger.error('Failed to convert verification to string', {
        verification,
        error,
      });
      throw new SqliteTypeConversionError(
        'Failed to serialize verification object',
        verification,
        'string'
      );
    }
  }

  /**
   * Converts SQLite string back to verification object
   */
  export function convertVerificationFromString(
    verificationStr: string | null
  ): OpenBadgesVerificationType | null {
    if (!verificationStr) return null;

    try {
      const parsed = JSON.parse(verificationStr);
      return parsed as OpenBadgesVerificationType;
    } catch (error) {
      logger.warn('Failed to parse verification from string', {
        verificationStr,
        error,
      });
      return null;
    }
  }

  /**
   * Converts evidence array to SQLite string format
   */
  export function convertEvidenceToString(
    evidence: OpenBadgesEvidenceType | undefined
  ): string | null {
    if (!evidence) return null;

    try {
      return JSON.stringify(evidence);
    } catch (error) {
      logger.error('Failed to convert evidence to string', { evidence, error });
      throw new SqliteTypeConversionError(
        'Failed to serialize evidence array',
        evidence,
        'string'
      );
    }
  }

  /**
   * Converts SQLite string back to evidence array
   */
  export function convertEvidenceFromString(
    evidenceStr: string | null
  ): OpenBadgesEvidenceType | null {
    if (!evidenceStr) return null;

    try {
      const parsed = JSON.parse(evidenceStr);
      return parsed as OpenBadgesEvidenceType;
    } catch (error) {
      logger.warn('Failed to parse evidence from string', {
        evidenceStr,
        error,
      });
      return null;
    }
  }

  /**
   * Converts criteria object to SQLite string format
   */
  export function convertCriteriaToString(
    criteria: OpenBadgesCriteriaType | undefined
  ): string {
    if (!criteria) {
      // Return default empty criteria as string
      return JSON.stringify({});
    }

    try {
      return JSON.stringify(criteria);
    } catch (error) {
      logger.error('Failed to convert criteria to string', { criteria, error });
      throw new SqliteTypeConversionError(
        'Failed to serialize criteria object',
        criteria,
        'string'
      );
    }
  }

  /**
   * Converts SQLite string back to criteria object
   */
  export function convertCriteriaFromString(
    criteriaStr: string
  ): OpenBadgesCriteriaType | undefined {
    if (!criteriaStr) return undefined;

    try {
      const parsed = JSON.parse(criteriaStr);
      return parsed as OpenBadgesCriteriaType;
    } catch (error) {
      logger.warn('Failed to parse criteria from string', {
        criteriaStr,
        error,
      });
      return undefined;
    }
  }

  /**
   * Converts alignment array to SQLite string format
   */
  export function convertAlignmentToString(
    alignment: OpenBadgesAlignmentType | undefined
  ): string | null {
    if (!alignment) return null;

    try {
      return JSON.stringify(alignment);
    } catch (error) {
      logger.error('Failed to convert alignment to string', {
        alignment,
        error,
      });
      throw new SqliteTypeConversionError(
        'Failed to serialize alignment array',
        alignment,
        'string'
      );
    }
  }

  /**
   * Converts SQLite string back to alignment array
   */
  export function convertAlignmentFromString(
    alignmentStr: string | null
  ): OpenBadgesAlignmentType | null {
    if (!alignmentStr) return null;

    try {
      const parsed = JSON.parse(alignmentStr);
      return parsed as OpenBadgesAlignmentType;
    } catch (error) {
      logger.warn('Failed to parse alignment from string', {
        alignmentStr,
        error,
      });
      return null;
    }
  }

  /**
   * Converts boolean to SQLite integer format
   */
  export function convertBooleanToInteger(
    value: boolean | undefined
  ): number | null {
    if (value === undefined) return null;
    return value ? 1 : 0;
  }

  /**
   * Converts SQLite integer back to boolean
   */
  export function convertIntegerToBoolean(
    value: number | null,
    fieldName: string
  ): boolean | undefined {
    if (value === null) return undefined;
    if (value !== 0 && value !== 1) {
      throw new SqliteValidationError(
        'Invalid boolean integer value',
        fieldName,
        value
      );
    }
    return value === 1;
  }

  /**
   * Converts Date to SQLite timestamp (milliseconds)
   */
  export function convertDateToTimestamp(
    date: Date | string | undefined
  ): number {
    if (!date) return Date.now();

    if (date instanceof Date) {
      return date.getTime();
    }

    if (typeof date === 'string') {
      const parsed = new Date(date);
      if (isNaN(parsed.getTime())) {
        logger.warn('Invalid date string provided', { date });
        return Date.now();
      }
      return parsed.getTime();
    }

    return Date.now();
  }

  /**
   * Converts SQLite timestamp back to Date
   */
  export function convertTimestampToDate(timestamp: number): Date {
    return new Date(timestamp);
  }

  /**
   * Converts SQLite timestamp to ISO string
   */
  export function convertTimestampToISOString(
    timestamp: number | null
  ): string | undefined {
    if (timestamp === null) return undefined;
    return new Date(timestamp).toISOString();
  }

  /**
   * Validates additional fields object
   */
  export function validateAdditionalFields(
    fields: Record<string, unknown>
  ): TypeConversionResult<Record<string, unknown>> {
    if (!fields || typeof fields !== 'object') {
      return {
        success: true,
        data: {},
      };
    }

    // Filter out standard fields that shouldn't be in additionalFields
    const standardFields = [
      'id',
      'name',
      'url',
      'email',
      'description',
      'image',
      'publicKey',
      'issuer',
      'badgeClass',
      'recipient',
      'issuedOn',
      'expires',
      'evidence',
      'verification',
      'revoked',
      'revocationReason',
      'criteria',
      'alignment',
      'tags',
    ];

    const filtered = Object.fromEntries(
      Object.entries(fields).filter(([key]) => !standardFields.includes(key))
    );

    return {
      success: true,
      data: filtered,
    };
  }
}
