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
import { v4 as uuidv4 } from 'uuid';

// Store registered auth adapters
const authAdapters: AuthAdapter[] = [];

// Define the structure for the user context derived during authentication
interface AuthenticatedUserContext {
  id: string;
  provider: string;
  claims: Record<string, unknown>;
}

// Define the variables that will be set in the context
export type AuthVariables = {
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
  return publicPaths.some((publicPath) => {
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
  logger.info(
    `Registered authentication adapter: ${adapter.getProviderName()}`
  );
}

/**
 * Authentication handler for middleware
 */
async function authenticateRequest(
  request: Request
): Promise<{
  isAuthenticated: boolean;
  user: AuthenticatedUserContext | null;
  token?: string;
}> {
  try {
    // Extract request information for logging
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const requestId = request.headers.get('x-request-id') || uuidv4();
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Create context for structured logging
    const logContext = {
      requestId,
      path,
      method,
      clientIp,
      userAgent: userAgent.substring(0, 100), // Truncate long user agents
    };

    logger.debug('Processing authentication request', logContext);

    // Skip authentication for certain paths (e.g., public endpoints)
    if (isPublicPath(path)) {
      logger.debug(
        `Skipping authentication for public path: ${path}`,
        logContext
      );
      return { isAuthenticated: false, user: null };
    }

    // If authentication is disabled globally, skip authentication
    if (config.auth?.enabled === false) {
      logger.debug('Authentication is disabled globally', logContext);
      return { isAuthenticated: false, user: null };
    }

    // Check for JWT token in Authorization header
    const authHeader = request.headers.get('authorization');

    // Don't log the full auth header for security reasons
    if (authHeader) {
      logContext['authType'] = authHeader.split(' ')[0];
      logger.debug('Processing authentication with auth header', logContext);
    } else {
      logger.debug('No authorization header present', logContext);
    }

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // Only log a truncated token for debugging
      const truncatedToken =
        token.length > 20 ? `${token.substring(0, 20)}...` : token;
      logger.debug(`Found Bearer token: ${truncatedToken}`, logContext);

      try {
        // Verify JWT token
        const payload = await JwtService.verifyToken(token);

        // Add user info to log context
        const authLogContext = {
          ...logContext,
          userId: payload.sub,
          provider: payload.provider,
          roles: payload.claims?.roles || [],
        };

        logger.info('JWT authentication successful', authLogContext);

        return {
          isAuthenticated: true,
          user: {
            id: payload.sub,
            provider: payload.provider || 'jwt',
            claims: payload.claims || {},
          },
        };
      } catch (error) {
        // Log failed JWT authentication with detailed error
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.warn('JWT authentication failed', {
          ...logContext,
          error: errorMessage,
          errorType: error instanceof Error ? error.name : 'Unknown',
        });
      }
    }

    // Legacy token extraction - can be removed once all clients use Bearer format
    const legacyAuthHeader = request.headers.get('Authorization');
    const legacyToken = JwtService.extractTokenFromHeader(legacyAuthHeader);
    if (legacyToken) {
      logger.debug('Processing legacy token format', logContext);
      try {
        const payload = await JwtService.verifyToken(legacyToken);

        // Add user info to log context
        const authLogContext = {
          ...logContext,
          userId: payload.sub,
          provider: payload.provider,
          authMethod: 'legacy-jwt',
        };

        logger.info('Legacy JWT authentication successful', authLogContext);

        return {
          isAuthenticated: true,
          user: {
            id: payload.sub,
            provider: payload.provider || 'jwt',
            claims: payload.claims || {},
          },
        };
      } catch (error) {
        // Log failed legacy JWT authentication
        logger.debug(
          'Legacy JWT token invalid, trying adapter authentication',
          {
            ...logContext,
            error: error instanceof Error ? error.message : String(error),
          }
        );
      }
    }

    // Try each registered adapter until one succeeds
    for (const adapter of authAdapters) {
      const adapterName = adapter.getProviderName();
      const adapterLogContext = { ...logContext, authAdapter: adapterName };

      if (adapter.canHandle(request)) {
        logger.debug(
          `Attempting authentication with ${adapterName} adapter`,
          adapterLogContext
        );

        const result = await adapter.authenticate(request);

        if (result.isAuthenticated && result.userId) {
          // Generate JWT token for future requests
          const token = await JwtService.generateToken({
            sub: result.userId,
            provider: result.provider,
            claims: result.claims,
          });

          // Log successful adapter authentication
          logger.info(`Authentication successful with ${adapterName} adapter`, {
            ...adapterLogContext,
            userId: result.userId,
            provider: result.provider,
          });

          return {
            isAuthenticated: true,
            user: {
              id: result.userId,
              provider: result.provider,
              claims: result.claims || {},
            },
            token,
          };
        } else {
          // Log failed adapter authentication
          logger.debug(`Authentication failed with ${adapterName} adapter`, {
            ...adapterLogContext,
            error: result.error || 'Unknown error',
          });
        }
      }
    }

    // No adapter could authenticate the request
    logger.warn(
      'Authentication failed - no adapter could handle the request',
      logContext
    );
    return { isAuthenticated: false, user: null };
  } catch (error) {
    // Log unexpected authentication errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Unexpected authentication error', {
      path: new URL(request.url).pathname,
      method: request.method,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
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
    logger.debug(
      `Auth status: ${
        isAuthenticated ? 'authenticated' : 'not authenticated'
      }, User: ${user ? user.id : 'none'}, Auth header: ${authHeader || 'none'}`
    );

    await next();
  });
}
