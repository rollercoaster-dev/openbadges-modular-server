/**
 * Rate limiting middleware for Open Badges API
 *
 * This middleware applies rate limiting to API endpoints to prevent abuse.
 */

import { MiddlewareHandler } from 'hono';
import { rateLimiter } from 'hono-rate-limiter';
import { logger } from '../../logging/logger.service';

// Get environment-specific configurations
const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Rate limiting configuration
 *
 * In development:
 * - Higher limits (500 requests per minute)
 * - Simple text response
 *
 * In production:
 * - Stricter limits (100 requests per minute)
 * - More detailed error response
 * - IP-based rate limiting with proxy support
 */
export function createRateLimitMiddleware(): MiddlewareHandler {
  return rateLimiter({
    windowMs: 60 * 1000, // 1 minute window
    limit: isDevelopment ? 500 : 100, // requests per window
    standardHeaders: 'draft-6', // RateLimit-* headers
    keyGenerator: (c) => {
      // Get client IP, with support for proxy headers
      const forwardedFor = c.req.header('x-forwarded-for');
      if (forwardedFor && !isDevelopment) {
        // In production, trust the X-Forwarded-For header
        return forwardedFor.split(',')[0]?.trim() || 'unknown-ip';
      }

      // Try to get IP from request
      try {
        // Get IP from request (implementation depends on the environment)
        const ip = c.req.raw.headers.get('cf-connecting-ip') || // Cloudflare
                  c.req.raw.headers.get('x-real-ip') || // Nginx
                  c.req.raw.headers.get('x-forwarded-for')?.split(',')[0] || // Generic proxy
                  'unknown-ip';
        return ip;
      } catch (error) {
        logger.error('Error getting IP address for rate limiting', { error });
        return 'unknown-ip';
      }
    },
    // Custom handler for when rate limit is exceeded
    handler: (c) => {
      const response = {
        error: 'Too Many Requests',
        message: 'You have exceeded the rate limit. Please try again later.',
        status: 429
      };

      return c.json(response, 429, {
        'Retry-After': '60' // Suggest retry after 1 minute
      });
    },
  });
}