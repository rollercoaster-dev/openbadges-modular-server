/**
 * Centralized API error handling utility
 *
 * This utility provides consistent error handling across all API endpoints,
 * eliminating duplicate error-handling logic and ensuring consistent responses.
 */

import { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { logger } from '../logging/logger.service';
import { BadRequestError } from '../../infrastructure/errors/bad-request.error';
import { ValidationError } from './validation.errors';

/**
 * Standard API error response structure
 */
export interface ApiErrorResponse {
  error: string;
  message?: string;
}

/**
 * Context information for error logging
 */
export interface ErrorContext {
  endpoint?: string;
  id?: string;
  body?: unknown;
  [key: string]: unknown;
}

/**
 * Error classification result
 */
interface ErrorClassification {
  statusCode: number;
  errorType: string;
  message: string;
}

/**
 * Classifies an error and determines the appropriate HTTP status code and response
 */
function classifyError(error: unknown): ErrorClassification {
  const message = error instanceof Error ? error.message : String(error);

  // Permission errors
  if (message.includes('permission')) {
    return {
      statusCode: 403,
      errorType: 'Forbidden',
      message,
    };
  }

  // BadRequestError and validation errors (check these BEFORE generic message checks)
  // But exclude "Invalid IRI" errors which need special handling
  if (
    (error instanceof BadRequestError ||
      error instanceof ValidationError ||
      (error instanceof Error && error.name === 'BadRequestError') ||
      message.toLowerCase().includes('invalid') ||
      message.toLowerCase().includes('validation')) &&
    !message.includes('Invalid IRI')
  ) {
    return {
      statusCode: 400,
      errorType: 'Bad Request',
      message,
    };
  }

  // Invalid IRI errors (handle these specifically)
  if (message.includes('Invalid IRI')) {
    return {
      statusCode: 400,
      errorType: 'Bad Request',
      message: message.includes('issuer')
        ? 'Invalid issuer ID'
        : message.includes('badge')
        ? 'Invalid badge class ID'
        : message.includes('assertion')
        ? 'Invalid assertion ID'
        : 'Invalid ID format',
    };
  }

  // Resource not found errors (only for generic "not found" cases, not BadRequestErrors)
  if (message.toLowerCase().includes('does not exist')) {
    return {
      statusCode: 404,
      errorType: 'Not Found',
      message,
    };
  }

  // Default to internal server error
  return {
    statusCode: 500,
    errorType: 'Internal Server Error',
    message:
      process.env.NODE_ENV === 'production'
        ? 'Unexpected server error'
        : message,
  };
}

/**
 * Sends a standardized API error response
 *
 * @param c - Hono context
 * @param error - The error that occurred
 * @param context - Additional context for logging (endpoint, id, body, etc.)
 * @returns Hono response
 */
export function sendApiError(
  c: Context,
  error: unknown,
  context: ErrorContext = {}
): Response {
  const classification = classifyError(error);
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Build log context
  const logContext = {
    error: errorMessage,
    statusCode: classification.statusCode,
    ...context,
  };

  // Log the error with appropriate level
  const logMessage = context.endpoint
    ? `${context.endpoint} failed`
    : 'API request failed';

  if (classification.statusCode >= 500) {
    logger.error(logMessage, logContext);
  } else if (classification.statusCode >= 400) {
    logger.warn(logMessage, logContext);
  }

  // Build response
  const response: ApiErrorResponse = {
    error: classification.errorType,
  };

  // Include message if it's not the same as the error type
  if (classification.message !== classification.errorType) {
    response.message = classification.message;
  }

  return c.json(response, classification.statusCode as ContentfulStatusCode);
}

/**
 * Handles "not found" scenarios with consistent logging and response
 *
 * @param c - Hono context
 * @param resourceType - Type of resource that wasn't found (e.g., 'Issuer', 'Badge class')
 * @param context - Additional context for logging
 * @returns Hono response
 */
export function sendNotFoundError(
  c: Context,
  resourceType: string,
  context: ErrorContext = {}
): Response {
  const logContext = {
    statusCode: 404,
    resourceType,
    ...context,
  };

  const logMessage = context.endpoint
    ? `${context.endpoint} - ${resourceType} not found`
    : `${resourceType} not found`;

  logger.warn(logMessage, logContext);

  return c.json(
    {
      error: 'Not Found',
      message: `${resourceType} not found`,
    },
    404
  );
}

/**
 * Wrapper for handling async operations with consistent error handling
 *
 * @param c - Hono context
 * @param operation - Async operation to execute
 * @param context - Error context for logging
 * @returns Promise that resolves to the operation result or an error response
 */
export async function handleApiOperation<T>(
  c: Context,
  operation: () => Promise<T>,
  context: ErrorContext = {}
): Promise<T | Response> {
  try {
    return await operation();
  } catch (error) {
    return sendApiError(c, error, context);
  }
}
