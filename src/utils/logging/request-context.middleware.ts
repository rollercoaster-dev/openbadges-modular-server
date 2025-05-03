/**
 * Request Context Middleware
 *
 * This middleware adds a unique request ID to each request and makes it available
 * throughout the request lifecycle. It also adds the request ID to response headers.
 */

import Elysia, { type Context } from 'elysia';
import { randomUUID } from 'crypto';
import { logger } from './logger.service';
import { config } from '../../config/config';

// Define a type for our extended context
interface RequestContext {
  store: { requestId?: string; requestStartTime?: number };
}

/**
 * Minimal context shape required by getRequestId.
 */
interface MinimalContext {
  store: Context['store'];
}

/**
 * Middleware that adds a unique request ID to each request
 * and logs basic request information
 */
export const requestContextMiddleware = new Elysia()
  .onRequest((context) => {
    // Generate or use existing request ID
    const requestId = context.request.headers.get('x-request-id') || randomUUID();

    // Store in context for other middleware and handlers
    (context.store as RequestContext['store']).requestId = requestId;

    // Add to response headers
    context.set.headers['x-request-id'] = requestId;

    // Store request start time for duration calculation
    (context.store as RequestContext['store']).requestStartTime = Date.now();

    // Log incoming request if debug logging is enabled
    if (config.logging.level === 'debug') {
      const method = context.request.method;
      const url = new URL(context.request.url);
      const path = url.pathname;

      logger.debug(`Incoming request`, {
        method,
        path,
        requestId
      });
    }
  })
  .on('afterHandle', (context) => {
    // Skip logging for certain paths (like health checks) to reduce noise
    const path = new URL(context.request.url).pathname;
    if (path === '/health' || path === '/favicon.ico') {
      return;
    }

    // Calculate request duration
    const duration = Date.now() - ((context.store as RequestContext['store']).requestStartTime || Date.now());
    const { request, set } = context;
    const requestId = (context.store as RequestContext['store']).requestId;

    // Log completed request
    logger.info(`Request completed`, {
      method: request.method,
      path,
      status: set.status,
      duration: `${duration}ms`,
      requestId
    });
  });

/**
 * Helper function to get the request ID from the current context
 * @param context Minimal context with store
 * @returns Request ID or 'unknown' if not available
 */
export function getRequestId(context: MinimalContext): string {
  const store = context.store as RequestContext['store'];
  return store?.requestId ?? 'unknown';
}
