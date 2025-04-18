import { Elysia } from 'elysia';
import { logger } from '../logging/logger.service';
import { getRequestId } from '../logging/request-context.middleware';

/**
 * Global error handler middleware
 *
 * This middleware catches all unhandled exceptions in the application and:
 * 1. Logs the error with context information
 * 2. Returns a consistent error response
 * 3. Masks sensitive details in production
 */
export const errorHandlerMiddleware = new Elysia().onError((context) => {
  const { error, request, set } = context;
  const path = new URL(request.url).pathname;
  const requestId = getRequestId(context);
  const isProd = process.env.NODE_ENV === 'production';

  // Log the error with full details
  if (error instanceof Error) {
    logger.logError('Unhandled Exception', error, {
      path,
      requestId,
      method: request.method
    });
  } else {
    logger.error('Unhandled Exception', {
      message: String(error),
      path,
      requestId,
      method: request.method
    });
  }

  set.status = 500;

  // In production, return a generic error message
  // In development, include more details for debugging
  return {
    error: {
      message: isProd ? 'Internal Server Error' : (error instanceof Error ? error.message : String(error)),
      code: 'INTERNAL_SERVER_ERROR',
      status: 500,
      // Include request ID for correlation with logs
      requestId
    }
  };
});

/**
 * Not found handler middleware
 *
 * This middleware handles requests to undefined routes and:
 * 1. Logs the 404 error with context information
 * 2. Returns a consistent error response
 */
export const notFoundHandlerMiddleware = new Elysia().all('*', (context) => {
  const { request, set } = context;
  const path = new URL(request.url).pathname;
  const requestId = getRequestId(context);

  // Skip logging for common missing resources to reduce noise
  const skipLogging = [
    '/favicon.ico',
    '/robots.txt'
  ].includes(path);

  if (!skipLogging) {
    logger.warn('Route Not Found', {
      method: request.method,
      path,
      requestId
    });
  }

  set.status = 404;
  return {
    error: {
      message: `Route not found: ${request.method} ${path}`,
      code: 'ROUTE_NOT_FOUND',
      status: 404,
      requestId
    }
  };
});