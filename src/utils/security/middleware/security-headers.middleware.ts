/**
 * Security headers middleware for Open Badges API
 * 
 * This middleware adds security headers using elysia-helmet to help protect against
 * common web vulnerabilities like XSS, clickjacking, and other security issues.
 */

import { Elysia } from 'elysia';
import { helmet } from 'elysia-helmet';
import { config } from '../../../config/config';

// Get environment-specific configurations
const isDevelopment = process.env.NODE_ENV !== 'production';
const baseUrl = config.openBadges.baseUrl;

/**
 * Security headers middleware using helmet
 * 
 * Applies various security headers to protect against common web vulnerabilities:
 * - Content-Security-Policy: Prevents XSS and data injection attacks
 * - X-Frame-Options: Prevents clickjacking
 * - X-Content-Type-Options: Prevents MIME-sniffing
 * - Strict-Transport-Security: Enforces HTTPS
 * - Referrer-Policy: Controls information in the Referer header
 * - X-XSS-Protection: Additional XSS protection (mostly for older browsers)
 */
export const securityHeadersMiddleware = new Elysia().use(
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