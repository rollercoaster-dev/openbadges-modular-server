/**
 * Request Context Middleware
 *
 * This middleware adds a unique request ID to each request and makes it available
 * throughout the request lifecycle. It also adds the request ID to response headers.
 */

import { MiddlewareHandler } from 'hono';
import { createMiddleware } from 'hono/factory';
import { randomUUID } from 'crypto';
import { logger } from './logger.service';
import { config } from '../../config/config';

// Define the variables that will be set in the context
type RequestContextVariables = {
  requestId: string;
  requestStartTime: number;
};

/**
 * Middleware that adds a unique request ID to each request
 * and logs basic request information
 */
export function createRequestContextMiddleware(): MiddlewareHandler<{
  Variables: RequestContextVariables;
}> {
  return createMiddleware<{
    Variables: RequestContextVariables;
  }>(async (c, next) => {
    // Generate or use existing request ID
    const requestId = c.req.header('x-request-id') || randomUUID();

    // Store in context for other middleware and handlers
    c.set('requestId', requestId);

    // Add to response headers
    c.header('x-request-id', requestId);

    // Store request start time for duration calculation
    const requestStartTime = Date.now();
    c.set('requestStartTime', requestStartTime);

    // Log incoming request if debug logging is enabled
    if (config.logging.level === 'debug') {
      const method = c.req.method;
      const url = new URL(c.req.url);
      const path = url.pathname;

      logger.debug(`Incoming request`, {
        method,
        path,
        requestId
      });
    }

    // Continue to the next middleware/handler
    await next();

    // Skip logging for certain paths (like health checks) to reduce noise
    const path = new URL(c.req.url).pathname;
    if (path === '/health' || path === '/favicon.ico') {
      return;
    }

    // Calculate request duration
    const duration = Date.now() - requestStartTime;
    const status = c.res.status;

    // Log completed request
    logger.info(`Request completed`, {
      method: c.req.method,
      path,
      status,
      duration: `${duration}ms`,
      requestId
    });
  });
}

/**
 * Helper function to get the request ID from the current context
 * @param c Hono context with RequestContextVariables or at least c.req.header
 * @returns Request ID or 'unknown' if not available
 */
export function getRequestId(c: { get: (key: string) => unknown; req?: { header: (key: string) => string | undefined } }): string {
  let requestId = c.get('requestId') as string;
  if (!requestId && c.req) {
    requestId = c.req.header('x-request-id');
  }
  return requestId ?? 'unknown';
}
