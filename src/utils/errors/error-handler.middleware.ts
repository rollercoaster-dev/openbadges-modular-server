import { MiddlewareHandler } from 'hono';
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
export function createErrorHandlerMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    try {
      await next();
    } catch (error) {
      const path = new URL(c.req.url).pathname;
      const requestId = getRequestId(c);
      const isProd = process.env.NODE_ENV === 'production';

      // Log the error with full details
      if (error instanceof Error) {
        logger.logError('Unhandled Exception', error, {
          path,
          requestId,
          method: c.req.method
        });
      } else {
        logger.error('Unhandled Exception', {
          message: String(error),
          path,
          requestId,
          method: c.req.method
        });
      }

      // In production, return a generic error message
      // In development, include more details for debugging
      return c.json({
        error: {
          message: isProd ? 'Internal Server Error' : (error instanceof Error ? error.message : String(error)),
          code: 'INTERNAL_SERVER_ERROR',
          status: 500,
          // Include request ID for correlation with logs
          requestId
        }
      }, 500);
    }
  };
}

/**
 * Not found handler for Hono's app.notFound()
 *
 * This function is specifically designed to work with Hono's notFound handler
 */
export function handleNotFound(c: import('hono').Context): Response {
  const path = new URL(c.req.url).pathname;
  const requestId = getRequestId(c);

  // Skip logging for common missing resources to reduce noise
  const skipLogging = [
    '/favicon.ico',
    '/robots.txt'
  ].includes(path);

  if (!skipLogging) {
    logger.warn('Route Not Found', {
      method: c.req.method,
      path,
      requestId
    });
  }

  return c.json({
    error: {
      message: `Route not found: ${c.req.method} ${path}`,
      code: 'ROUTE_NOT_FOUND',
      status: 404,
      requestId
    }
  }, 404);
}