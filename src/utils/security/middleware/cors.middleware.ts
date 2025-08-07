/**
 * CORS middleware for Open Badges API
 *
 * Provides Cross-Origin Resource Sharing configuration using Hono's cors helper.
 */

import type { MiddlewareHandler } from 'hono';
import { cors } from 'hono/cors';
import { config } from '@/config/config';

/**
 * Creates a CORS middleware with sensible defaults.
 * - In development, allows all origins
 * - In production, allows only configured origins (comma-separated in CORS_ORIGINS)
 */
export function createCorsMiddleware(): MiddlewareHandler {
  const isDevelopment = config.env.isDevelopment;

  // Resolve allowed origins
  const envOrigins = process.env.CORS_ORIGINS?.trim();
  const allowedOrigins = envOrigins
    ? envOrigins.split(',').map((o) => o.trim()).filter(Boolean)
    : [];

  // In dev allow all; in prod require explicit list (fallback to same-origin only by omitting origin option)
  const baseOptions = {
    allowHeaders: ['Content-Type', 'Authorization'] as string[],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] as string[],
    exposeHeaders: ['Content-Length'] as string[],
    maxAge: 600,
    credentials: false,
  };

  if (isDevelopment) {
    return cors({ origin: '*', ...baseOptions });
  }

  if (allowedOrigins.length > 0) {
    return cors({ origin: allowedOrigins, ...baseOptions });
  }

  // Default (no CORS for cross-origin) – same-origin only
  // Provide an empty allow-list to avoid setting CORS headers for cross-origin requests
  return cors({ origin: [] as string[], ...baseOptions });
}


