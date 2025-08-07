/**
 * Security middleware for Open Badges API
 *
 * This file centralizes all security-related middleware for the API.
 */

import { MiddlewareHandler } from 'hono';
// Implement a simple compose function since Hono doesn't export one
function compose(middlewares: MiddlewareHandler[]): MiddlewareHandler {
  return async (c, next) => {
    const dispatch = async (index: number): Promise<void> => {
      if (index >= middlewares.length) {
        await next();
        return;
      }
      await middlewares[index](c, () => dispatch(index + 1));
    };
    await dispatch(0);
  };
}
import { createRateLimitMiddleware } from './middleware/rate-limit.middleware';
import { createSecurityHeadersMiddleware } from './middleware/security-headers.middleware';
import { createCorsMiddleware } from './middleware/cors.middleware';

/**
 * Configures and exports security middleware for the Open Badges API
 * Includes:
 * - Rate limiting to prevent abuse
 * - Security headers to mitigate common web vulnerabilities
 */
export function createSecurityMiddleware(): MiddlewareHandler {
  // Create individual middleware functions
  const corsMiddleware = createCorsMiddleware();
  const rateLimitMiddleware = createRateLimitMiddleware();
  const securityHeadersMiddleware = createSecurityHeadersMiddleware();

  // Compose middleware functions into a single middleware
  return compose([corsMiddleware, rateLimitMiddleware, securityHeadersMiddleware]);
}