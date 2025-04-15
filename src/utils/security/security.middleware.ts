/**
 * Security middleware for Open Badges API
 * 
 * This file centralizes all security-related middleware for the API.
 */

import { Elysia } from 'elysia';
import { rateLimit } from 'elysia-rate-limit';
import { helmet } from 'elysia-helmet';
import { config } from '../../config/config';

// Get environment-specific configurations
const isDevelopment = process.env.NODE_ENV !== 'production';
const baseUrl = config.openBadges.baseUrl;

/**
 * Configures and exports security middleware for the Open Badges API
 * Includes:
 * - Rate limiting to prevent abuse
 * - Security headers via Helmet to mitigate common web vulnerabilities
 */
export const securityMiddleware = new Elysia()
  // Add rate limiting
  .use(
    rateLimit({
      max: isDevelopment ? 500 : 100, // requests per window
      duration: 60 * 1000, // 1 minute window
      generator: (req, server) => {
        // Get client IP, with support for proxy headers
        const forwardedFor = req.headers.get('x-forwarded-for');
        if (forwardedFor && !isDevelopment) {
          // In production, trust the X-Forwarded-For header
          return forwardedFor.split(',')[0].trim();
        }
        
        // Fall back to direct IP or use placeholder
        if (server && typeof server.requestIP === 'function') {
          try {
            const ipInfo = server.requestIP(req);
            if (ipInfo && typeof ipInfo === 'object' && 'address' in ipInfo) {
              return String(ipInfo.address);
            }
          } catch (error) {
            console.error('Error getting IP address:', error);
          }
        }
        
        return 'unknown-ip';
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
  )
  // Add security headers
  .use(
    helmet({
      // Content Security Policy
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: isDevelopment ? ["'self'", "'unsafe-inline'"] : ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles
          imgSrc: ["'self'", "data:"], // Allow images from self and data URIs
          connectSrc: ["'self'", baseUrl],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameSrc: ["'none'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: !isDevelopment ? [] : null, // Force HTTPS in production
        },
      },
      // Strict Transport Security (only in production)
      hsts: !isDevelopment ? {
        maxAge: 63072000, // 2 years
        includeSubDomains: true,
        preload: true,
      } : false,
      // Frame options (prevent clickjacking)
      frameguard: {
        action: 'deny', // Prevent framing entirely
      },
      // Content type options (prevent MIME-sniffing)
      xContentTypeOptions: true,
      // Referrer policy
      referrerPolicy: {
        policy: 'same-origin',
      },
      // XSS protection (mostly for older browsers)
      xssFilter: true,
      // Disable X-Powered-By header
      hidePoweredBy: true,
    })
  ); 