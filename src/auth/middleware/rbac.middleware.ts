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
    // Extract request information for logging
    const path = c.req.path;
    const method = c.req.method;
    const requestId = c.req.header('x-request-id') || Math.random().toString(36).substring(2, 15);
    const clientIp = c.req.header('x-forwarded-for') || 'unknown';

    // Create context for structured logging
    const logContext = {
      requestId,
      path,
      method,
      clientIp,
      middleware: 'requireAuth'
    };

    // Check if RBAC is disabled for testing
    if (process.env['AUTH_DISABLE_RBAC'] === 'true' || config.auth.disableRbac) {
      logger.debug('RBAC is disabled for testing, skipping authentication check', logContext);
      await next();
      return;
    }

    const isAuthenticated = c.get('isAuthenticated');
    const user = c.get('user');

    if (!isAuthenticated || !user) {
      logger.warn('Authentication required but user not authenticated', {
        ...logContext,
        isAuthenticated,
        hasUser: !!user
      });

      return c.json({
        success: false,
        error: 'Authentication required'
      }, 401);
    }

    // Add user info to log context
    const authLogContext = {
      ...logContext,
      userId: user.id,
      provider: user.provider,
      roles: user.claims.roles || []
    };

    logger.info('User authenticated successfully', authLogContext);
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
    // Extract request information for logging
    const path = c.req.path;
    const method = c.req.method;
    const requestId = c.req.header('x-request-id') || Math.random().toString(36).substring(2, 15);
    const clientIp = c.req.header('x-forwarded-for') || 'unknown';

    // Create context for structured logging
    const logContext = {
      requestId,
      path,
      method,
      clientIp,
      middleware: 'requireRoles',
      requiredRoles: roles
    };

    // Check if RBAC is disabled for testing
    if (process.env['AUTH_DISABLE_RBAC'] === 'true' || config.auth.disableRbac) {
      logger.debug('RBAC is disabled for testing, skipping roles check', logContext);
      await next();
      return;
    }

    const isAuthenticated = c.get('isAuthenticated');
    const user = c.get('user');

    if (!isAuthenticated || !user) {
      logger.warn('Role check failed: User not authenticated', {
        ...logContext,
        isAuthenticated,
        hasUser: !!user
      });

      return c.json({
        success: false,
        error: 'Authentication required'
      }, 401);
    }

    // Check if user has any of the required roles
    const userRoles = user.claims.roles as UserRole[] || [];
    const hasRequiredRole = roles.some(role => userRoles.includes(role));

    // Add user info to log context
    const authLogContext = {
      ...logContext,
      userId: user.id,
      provider: user.provider,
      userRoles,
      hasRequiredRole
    };

    if (!hasRequiredRole) {
      logger.warn('Access denied: Insufficient roles', authLogContext);

      return c.json({
        success: false,
        error: 'Insufficient permissions'
      }, 403);
    }

    logger.info('Role check passed', authLogContext);
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
    // Extract request information for logging
    const path = c.req.path;
    const method = c.req.method;
    const requestId = c.req.header('x-request-id') || Math.random().toString(36).substring(2, 15);
    const clientIp = c.req.header('x-forwarded-for') || 'unknown';

    // Create context for structured logging
    const logContext = {
      requestId,
      path,
      method,
      clientIp,
      middleware: 'requirePermissions',
      requiredPermissions: permissions,
      requireAll
    };

    // Check if RBAC is disabled for testing
    if (process.env['AUTH_DISABLE_RBAC'] === 'true' || config.auth.disableRbac) {
      logger.debug('RBAC is disabled for testing, skipping permissions check', logContext);
      await next();
      return;
    }

    const isAuthenticated = c.get('isAuthenticated');
    const user = c.get('user');

    if (!isAuthenticated || !user) {
      logger.warn('Permission check failed: User not authenticated', {
        ...logContext,
        isAuthenticated,
        hasUser: !!user
      });

      return c.json({
        success: false,
        error: 'Authentication required'
      }, 401);
    }

    // Check if user has required permissions
    const userPermissions = user.claims.permissions as UserPermission[] || [];

    // Add user info to log context
    const authLogContext = {
      ...logContext,
      userId: user.id,
      provider: user.provider,
      userPermissions,
      userRoles: user.claims.roles || []
    };

    let hasRequiredPermissions: boolean;
    if (requireAll) {
      // User must have all specified permissions
      hasRequiredPermissions = permissions.every(permission =>
        userPermissions.includes(permission)
      );
      logger.debug(`Checking if user has ALL required permissions: ${hasRequiredPermissions}`, authLogContext);
    } else {
      // User must have at least one of the specified permissions
      hasRequiredPermissions = permissions.some(permission =>
        userPermissions.includes(permission)
      );
      logger.debug(`Checking if user has ANY required permission: ${hasRequiredPermissions}`, authLogContext);
    }

    if (!hasRequiredPermissions) {
      // Log which specific permissions are missing
      const missingPermissions = requireAll
        ? permissions.filter(p => !userPermissions.includes(p))
        : permissions;

      logger.warn('Access denied: Insufficient permissions', {
        ...authLogContext,
        hasRequiredPermissions,
        missingPermissions
      });

      return c.json({
        success: false,
        error: 'Insufficient permissions'
      }, 403);
    }

    logger.info('Permission check passed', {
      ...authLogContext,
      hasRequiredPermissions
    });

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
    // Extract request information for logging
    const path = c.req.path;
    const method = c.req.method;
    const requestId = c.req.header('x-request-id') || Math.random().toString(36).substring(2, 15);
    const clientIp = c.req.header('x-forwarded-for') || 'unknown';
    const id = c.req.param('id');

    // Create context for structured logging
    const logContext = {
      requestId,
      path,
      method,
      clientIp,
      middleware: 'requireSelfOrAdmin',
      resourceId: id
    };

    // Check if RBAC is disabled for testing
    if (process.env['AUTH_DISABLE_RBAC'] === 'true' || config.auth.disableRbac) {
      logger.debug('RBAC is disabled for testing, skipping self/admin check', logContext);
      await next();
      return;
    }

    const isAuthenticated = c.get('isAuthenticated');
    const user = c.get('user');

    if (!isAuthenticated || !user) {
      logger.warn('Self/Admin check failed: User not authenticated', {
        ...logContext,
        isAuthenticated,
        hasUser: !!user
      });

      return c.json({
        success: false,
        error: 'Authentication required'
      }, 401);
    }

    // Add user info to log context
    const authLogContext = {
      ...logContext,
      userId: user.id,
      provider: user.provider,
      userRoles: user.claims.roles || []
    };

    // Check if user is admin
    const userRoles = user.claims.roles as UserRole[] || [];
    const isAdmin = userRoles.includes(UserRole.ADMIN);

    // Check if user is accessing their own resource
    const isSelf = id === user.id;

    // Add check results to log context
    const checkLogContext = {
      ...authLogContext,
      isAdmin,
      isSelf,
      accessAllowed: isAdmin || isSelf
    };

    if (!isAdmin && !isSelf) {
      logger.warn('Access denied: User attempted to access resource belonging to another user', checkLogContext);

      return c.json({
        success: false,
        error: 'Insufficient permissions'
      }, 403);
    }

    // Log the access reason
    const accessReason = isAdmin ? 'admin role' : 'resource owner';
    logger.info(`Self/Admin check passed: Access granted due to ${accessReason}`, checkLogContext);

    await next();
  });
}
