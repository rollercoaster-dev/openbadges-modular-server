/**
 * Rate limiting middleware for Open Badges API
 *
 * This middleware applies rate limiting to API endpoints to prevent abuse.
 */

import { Elysia } from 'elysia';
import { rateLimit } from 'elysia-rate-limit';

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
export const rateLimitMiddleware = new Elysia().use(
  rateLimit({
    max: isDevelopment ? 500 : 100, // requests per window
    duration: 60 * 1000, // 1 minute window
    generator: (req, server) => {
      // Get client IP, with support for proxy headers
      const forwardedFor = req.headers.get('x-forwarded-for');
      if (forwardedFor && !isDevelopment) {
        // In production, trust the X-Forwarded-For header
        return forwardedFor.split(',')[0]?.trim() || 'unknown-ip';
      }

      // Fall back to direct IP or default value if server or address is undefined
      const ipAddress = server && server.requestIP && server.requestIP(req)
        ? server.requestIP(req)?.address || 'unknown-ip'
        : 'unknown-ip';

      return ipAddress;
    },
    errorResponse: isDevelopment
      ? 'Rate limit exceeded. Please try again later.'
      : new Response(
          JSON.stringify({
            error: 'Too Many Requests',
            message: 'You have exceeded the rate limit. Please try again later.',
            status: 429
          }),
          {
            status: 429,
            headers: new Headers({
              'Content-Type': 'application/json',
              'Retry-After': '60', // Suggest retry after 1 minute
            }),
          }
        ),
  })
);