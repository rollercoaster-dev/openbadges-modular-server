/**
 * Authentication Middleware
 * 
 * This middleware integrates with Elysia.js and handles authentication for API routes.
 * It uses the registered authentication adapters to authenticate requests and
 * establishes a JWT-based session if authentication is successful.
 */

import { Elysia } from 'elysia';
import { AuthAdapter } from '../adapters/auth-adapter.interface';
import { JwtService } from '../services/jwt.service';
import { logger } from '../../utils/logging/logger.service';

// Store registered auth adapters
const authAdapters: AuthAdapter[] = [];

/**
 * Register an authentication adapter
 * @param adapter The adapter to register
 */
export function registerAuthAdapter(adapter: AuthAdapter): void {
  authAdapters.push(adapter);
  logger.info(`Registered authentication adapter: ${adapter.getProviderName()}`);
}

/**
 * Authentication middleware for Elysia.js
 */
export const authMiddleware = new Elysia({ name: 'auth-middleware' })
  .derive(async ({ request, set }) => {
    try {
      // Skip authentication for certain paths (e.g., public endpoints)
      const url = new URL(request.url);
      if (isPublicPath(url.pathname)) {
        return { isAuthenticated: false, user: null };
      }

      // Check for JWT token first (for already authenticated sessions)
      const authHeader = request.headers.get('Authorization');
      const token = JwtService.extractTokenFromHeader(authHeader);
      
      if (token) {
        try {
          const payload = await JwtService.verifyToken(token);
          return { 
            isAuthenticated: true,
            user: {
              id: payload.sub,
              provider: payload.provider,
              claims: payload.claims || {}
            }
          };
        } catch (_error) {
          // Token invalid or expired - continue with adapter auth
          logger.debug('JWT token invalid, trying adapter authentication');
        }
      }

      // Try each registered adapter until one succeeds
      for (const adapter of authAdapters) {
        if (adapter.canHandle(request)) {
          const result = await adapter.authenticate(request);
          if (result.isAuthenticated && result.userId) {
            // Generate JWT token for future requests
            const token = await JwtService.generateToken({
              sub: result.userId,
              provider: result.provider,
              claims: result.claims
            });
            
            // Set token in response header
            set.headers['X-Auth-Token'] = token;
            
            return { 
              isAuthenticated: true,
              user: {
                id: result.userId,
                provider: result.provider,
                claims: result.claims || {}
              }
            };
          }
        }
      }

      // No adapter could authenticate the request
      logger.debug('Authentication failed - no adapter could handle the request');
      return { isAuthenticated: false, user: null };
    } catch (_error) {
      logger.logError('Authentication error', _error as Error);
      return { isAuthenticated: false, user: null };
    }
  });

/**
 * Determines whether a path is public (no authentication required)
 * @param path The request path
 */
function isPublicPath(path: string): boolean {
  const publicPaths = [
    '/docs',
    '/swagger',
    '/health',
    '/public',
    '/v1/public',
    // Add other public paths as needed
  ];
  
  return publicPaths.some(publicPath => path.startsWith(publicPath));
}