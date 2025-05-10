/**
 * Utility functions for logging
 */
import { Context } from 'hono';

/**
 * Extract common logging context from a request
 * @param c Hono context
 * @returns Logging context with requestId, clientIp, and userAgent
 */
export function extractLoggingContext(c: Context): {
  requestId: string;
  clientIp: string;
  userAgent: string;
  path: string;
  method: string;
} {
  return {
    requestId: c.req.header('x-request-id') || Math.random().toString(36).substring(2, 15),
    clientIp: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
    userAgent: c.req.header('user-agent') || 'unknown',
    path: c.req.path,
    method: c.req.method
  };
}
