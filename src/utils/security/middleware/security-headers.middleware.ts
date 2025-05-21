/**
 * Security headers middleware for Open Badges API
 *
 * This middleware adds security headers to help protect against
 * common web vulnerabilities like XSS, clickjacking, and other security issues.
 */

import { MiddlewareHandler } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { config } from '@/config/config';

// Get environment-specific configurations
const isDevelopment = process.env.NODE_ENV !== 'production';
const baseUrl = config.openBadges.baseUrl;

/**
 * Security headers middleware using Hono's secure-headers
 *
 * Applies various security headers to protect against common web vulnerabilities:
 * - Content-Security-Policy: Prevents XSS and data injection attacks
 * - X-Frame-Options: Prevents clickjacking
 * - X-Content-Type-Options: Prevents MIME-sniffing
 * - Strict-Transport-Security: Enforces HTTPS
 * - Referrer-Policy: Controls information in the Referer header
 * - X-XSS-Protection: Additional XSS protection (mostly for older browsers)
 */
export function createSecurityHeadersMiddleware(): MiddlewareHandler {
  return secureHeaders({
    // Content Security Policy
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: isDevelopment ? ["'self'", "'unsafe-inline'"] : ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles
      imgSrc: ["'self'", 'data:'], // Allow images from self and data URIs
      connectSrc: ["'self'", baseUrl],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: !isDevelopment ? [] : undefined, // Force HTTPS in production
    },
    // Strict Transport Security (only in production)
    strictTransportSecurity: !isDevelopment
      ? 'max-age=63072000; includeSubDomains; preload' // 2 years
      : false,
    // Frame options (prevent clickjacking)
    xFrameOptions: 'DENY', // Prevent framing entirely
    // Content type options (prevent MIME-sniffing)
    xContentTypeOptions: true,
    // Referrer policy
    referrerPolicy: 'same-origin',
    // XSS protection (mostly for older browsers)
    xXssProtection: '1; mode=block',
  });
}
