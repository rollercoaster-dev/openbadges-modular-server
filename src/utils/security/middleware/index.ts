/**
 * Security middleware index file
 *
 * This file exports all security-related middleware for easier importing.
 */

export { createRateLimitMiddleware } from './rate-limit.middleware';
export { createSecurityHeadersMiddleware } from './security-headers.middleware';