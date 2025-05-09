/**
 * Role-Based Access Control (RBAC) Middleware
 *
 * This middleware provides role and permission-based access control for API routes.
 * It works with the authentication middleware to enforce authorization rules.
 */

import { UserRole, UserPermission } from '../../domains/user/user.entity';
import { logger } from '../../utils/logging/logger.service';
import { MiddlewareHandler } from 'hono';
import { createMiddleware } from 'hono/factory';
import { config } from '../../config/config';

// Define the variables that will be set in the context
type AuthVariables = {
  isAuthenticated: boolean;
  user: {
    id: string;
    provider: string;
    claims: Record<string, unknown>;
  } | null;
};

/**
 * Create middleware that requires authentication
 * @returns Middleware function
 */
export function requireAuth(): MiddlewareHandler<{
  Variables: AuthVariables;
}> {
  return createMiddleware<{
    Variables: AuthVariables;
  }>(async (c, next) => {
    // Check if RBAC is disabled for testing
    if (process.env['AUTH_DISABLE_RBAC'] === 'true' || config.auth.disableRbac) {
      logger.debug('RBAC is disabled for testing, skipping authentication check');
      await next();
      return;
    }

    const isAuthenticated = c.get('isAuthenticated');
    const user = c.get('user');

    if (!isAuthenticated || !user) {
      return c.json({
        success: false,
        error: 'Authentication required'
      }, 401);
    }

    logger.debug(`User authenticated: ${user.id}`);
    await next();
  });
}

/**
 * Create middleware that requires specific roles
 * @param roles Required roles (any of these roles is sufficient)
 * @returns Middleware function
 */
export function requireRoles(roles: UserRole[]): MiddlewareHandler<{
  Variables: AuthVariables;
}> {
  return createMiddleware<{
    Variables: AuthVariables;
  }>(async (c, next) => {
    // Check if RBAC is disabled for testing
    if (process.env['AUTH_DISABLE_RBAC'] === 'true' || config.auth.disableRbac) {
      logger.debug('RBAC is disabled for testing, skipping roles check', { roles });
      await next();
      return;
    }

    const isAuthenticated = c.get('isAuthenticated');
    const user = c.get('user');

    if (!isAuthenticated || !user) {
      return c.json({
        success: false,
        error: 'Authentication required'
      }, 401);
    }

    // Check if user has any of the required roles
    const userRoles = user.claims.roles as UserRole[] || [];
    const hasRequiredRole = roles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      logger.warn(`Access denied: User ${user.id} does not have required roles`, {
        userId: user.id,
        requiredRoles: roles,
        userRoles
      });

      return c.json({
        success: false,
        error: 'Insufficient permissions'
      }, 403);
    }

    await next();
  });
}

/**
 * Create middleware that requires specific permissions
 * @param permissions Required permissions (any of these permissions is sufficient)
 * @param requireAll If true, all permissions are required instead of any
 * @returns Middleware function
 */
export function requirePermissions(permissions: UserPermission[], requireAll = false): MiddlewareHandler<{
  Variables: AuthVariables;
}> {
  return createMiddleware<{
    Variables: AuthVariables;
  }>(async (c, next) => {
    // Check if RBAC is disabled for testing
    if (process.env['AUTH_DISABLE_RBAC'] === 'true' || config.auth.disableRbac) {
      logger.debug('RBAC is disabled for testing, skipping permissions check', { permissions });
      await next();
      return;
    }

    const isAuthenticated = c.get('isAuthenticated');
    const user = c.get('user');

    if (!isAuthenticated || !user) {
      return c.json({
        success: false,
        error: 'Authentication required'
      }, 401);
    }

    // Check if user has required permissions
    const userPermissions = user.claims.permissions as UserPermission[] || [];

    let hasRequiredPermissions: boolean;
    if (requireAll) {
      // User must have all specified permissions
      hasRequiredPermissions = permissions.every(permission =>
        userPermissions.includes(permission)
      );
    } else {
      // User must have at least one of the specified permissions
      hasRequiredPermissions = permissions.some(permission =>
        userPermissions.includes(permission)
      );
    }

    if (!hasRequiredPermissions) {
      logger.warn(`Access denied: User ${user.id} does not have required permissions`, {
        userId: user.id,
        requiredPermissions: permissions,
        userPermissions,
        requireAll
      });

      return c.json({
        success: false,
        error: 'Insufficient permissions'
      }, 403);
    }

    await next();
  });
}

/**
 * Create middleware that requires admin role
 * @returns Middleware function
 */
export function requireAdmin(): MiddlewareHandler<{
  Variables: AuthVariables;
}> {
  return requireRoles([UserRole.ADMIN]);
}

/**
 * Create middleware that requires issuer role
 * @returns Middleware function
 */
export function requireIssuer(): MiddlewareHandler<{
  Variables: AuthVariables;
}> {
  return requireRoles([UserRole.ADMIN, UserRole.ISSUER]);
}

/**
 * Create middleware that checks if the authenticated user is the requested user
 * or has admin privileges
 * @returns Middleware function
 */
export function requireSelfOrAdmin(): MiddlewareHandler<{
  Variables: AuthVariables;
}> {
  return createMiddleware<{
    Variables: AuthVariables;
  }>(async (c, next) => {
    // Check if RBAC is disabled for testing
    if (process.env['AUTH_DISABLE_RBAC'] === 'true' || config.auth.disableRbac) {
      logger.debug('RBAC is disabled for testing, skipping self/admin check');
      await next();
      return;
    }

    const isAuthenticated = c.get('isAuthenticated');
    const user = c.get('user');
    const id = c.req.param('id');

    if (!isAuthenticated || !user) {
      return c.json({
        success: false,
        error: 'Authentication required'
      }, 401);
    }

    // Check if user is admin
    const userRoles = user.claims.roles as UserRole[] || [];
    const isAdmin = userRoles.includes(UserRole.ADMIN);

    // Check if user is accessing their own resource
    const isSelf = id === user.id;

    if (!isAdmin && !isSelf) {
      logger.warn(`Access denied: User ${user.id} attempted to access resource for user ${id}`, {
        userId: user.id,
        resourceUserId: id
      });

      return c.json({
        success: false,
        error: 'Insufficient permissions'
      }, 403);
    }

    await next();
  });
}
