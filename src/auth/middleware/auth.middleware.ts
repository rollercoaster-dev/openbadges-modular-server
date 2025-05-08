/**
 * Authentication Middleware
 *
 * This middleware handles authentication for API routes.
 * It uses the registered authentication adapters to authenticate requests and
 * establishes a JWT-based session if authentication is successful.
 *
 * It also provides role-based access control functionality.
 */

import { MiddlewareHandler } from 'hono';
import { createMiddleware } from 'hono/factory';
import { AuthAdapter } from '../adapters/auth-adapter.interface';
import { JwtService } from '../services/jwt.service';
import { logger } from '../../utils/logging/logger.service';
import { config } from '../../config/config';

// Store registered auth adapters
const authAdapters: AuthAdapter[] = [];

// Define the structure for the user context derived during authentication
interface AuthenticatedUserContext {
  id: string;
  provider: string;
  claims: Record<string, unknown>;
}

// Define the variables that will be set in the context
type AuthVariables = {
  isAuthenticated: boolean;
  user: AuthenticatedUserContext | null;
};

/**
 * Check if a path is public (no authentication required)
 * @param path The path to check
 * @returns True if the path is public
 */
function isPublicPath(path: string): boolean {
  // Get public paths from config
  const publicPaths = config.auth?.publicPaths || [];

  // Check if path matches any public path
  return publicPaths.some(publicPath => {
    // Exact match
    if (path === publicPath) {
      return true;
    }

    // Path starts with public path + '/'
    if (publicPath.endsWith('*') && path.startsWith(publicPath.slice(0, -1))) {
      return true;
    }

    return false;
  });
}

/**
 * Register an authentication adapter
 * @param adapter The adapter to register
 */
export function registerAuthAdapter(adapter: AuthAdapter): void {
  authAdapters.push(adapter);
  logger.info(`Registered authentication adapter: ${adapter.getProviderName()}`);
}

/**
 * Authentication handler for middleware
 */
async function authenticateRequest(request: Request): Promise<{ isAuthenticated: boolean; user: AuthenticatedUserContext | null; token?: string }> {
  try {
    // Skip authentication for certain paths (e.g., public endpoints)
    const url = new URL(request.url);
    const path = url.pathname;

    if (isPublicPath(path)) {
      logger.debug(`Skipping authentication for public path: ${path}`);
      return { isAuthenticated: false, user: null };
    }

    // If authentication is disabled globally, skip authentication
    if (config.auth?.enabled === false) {
      logger.debug('Authentication is disabled globally');
      return { isAuthenticated: false, user: null };
    }

    // Check for JWT token in Authorization header
    const authHeader = request.headers.get('authorization');
    logger.debug(`Authorization header: ${authHeader || 'none'}`);

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      logger.debug(`Found Bearer token: ${token.substring(0, 20)}...`);

      try {
        // Verify JWT token
        const payload = await JwtService.verifyToken(token);
        logger.debug(`JWT authentication successful for user ${payload.sub}`);

        return {
          isAuthenticated: true,
          user: {
            id: payload.sub,
            provider: payload.provider || 'jwt',
            claims: payload.claims || {}
          }
        };
      } catch (error) {
        logger.debug(`JWT authentication failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Legacy token extraction - can be removed once all clients use Bearer format
    const legacyAuthHeader = request.headers.get('Authorization');
    const legacyToken = JwtService.extractTokenFromHeader(legacyAuthHeader);
    if (legacyToken) {
      try {
        const payload = await JwtService.verifyToken(legacyToken);
        return {
          isAuthenticated: true,
          user: {
            id: payload.sub,
            provider: payload.provider || 'jwt',
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

          return {
            isAuthenticated: true,
            user: {
              id: result.userId,
              provider: result.provider,
              claims: result.claims || {}
            },
            token
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
}

/**
 * Authentication middleware for Hono
 */
export function createAuthMiddleware(): MiddlewareHandler<{
  Variables: AuthVariables;
}> {
  return createMiddleware<{
    Variables: AuthVariables;
  }>(async (c, next) => {
    const authResult = await authenticateRequest(c.req.raw);

    // Set authentication result in context
    c.set('isAuthenticated', authResult.isAuthenticated);
    c.set('user', authResult.user);

    // If token was generated, set it in response header
    if (authResult.token) {
      c.header('X-Auth-Token', authResult.token);
    }

    // Continue to the next middleware/handler
    await next();
  });
}

/**
 * Debug middleware to log authentication status
 */
export function createAuthDebugMiddleware(): MiddlewareHandler<{
  Variables: AuthVariables;
}> {
  return createMiddleware<{
    Variables: AuthVariables;
  }>(async (c, next) => {
    const isAuthenticated = c.get('isAuthenticated');
    const user = c.get('user');
    const authHeader = c.req.header('authorization');
    logger.debug(`Auth status: ${isAuthenticated ? 'authenticated' : 'not authenticated'}, User: ${user ? user.id : 'none'}, Auth header: ${authHeader || 'none'}`);

    await next();
  });
}

