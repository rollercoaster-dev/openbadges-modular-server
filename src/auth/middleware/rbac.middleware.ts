/**
 * Role-Based Access Control (RBAC) Middleware
 *
 * This middleware provides role and permission-based access control for API routes.
 * It works with the authentication middleware to enforce authorization rules.
 */

import { Elysia } from 'elysia';
import { UserRole, UserPermission } from '../../domains/user/user.entity';
import { logger } from '../../utils/logging/logger.service';

/**
 * Context for RBAC middleware
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface RBACContext {
  user?: {
    id: string;
    provider: string;
    claims: Record<string, unknown>;
  };
  isAuthenticated: boolean;
  set: { status?: number | string };
  request: Request;
  params: Record<string, string>;
}

/**
 * Create middleware that requires authentication
 * @returns Elysia middleware
 */
export function requireAuth(): Elysia {
  return new Elysia()
    .derive((context) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { isAuthenticated, set, user } = context as any;

      if (!isAuthenticated || !user) {
        set.status = 401;
        return {
          success: false,
          error: 'Authentication required'
        };
      }

      logger.debug(`User authenticated: ${user.id}`);
      return {};
    });
}

/**
 * Create middleware that requires specific roles
 * @param roles Required roles (any of these roles is sufficient)
 * @returns Elysia middleware
 */
export function requireRoles(roles: UserRole[]): Elysia {
  return new Elysia()
    .derive((context) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { isAuthenticated, user, set } = context as any;

      if (!isAuthenticated || !user) {
        set.status = 401;
        return {
          success: false,
          error: 'Authentication required'
        };
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

        set.status = 403;
        return {
          success: false,
          error: 'Insufficient permissions'
        };
      }

      return {};
    });
}

/**
 * Create middleware that requires specific permissions
 * @param permissions Required permissions (any of these permissions is sufficient)
 * @param requireAll If true, all permissions are required instead of any
 * @returns Elysia middleware
 */
export function requirePermissions(permissions: UserPermission[], requireAll = false): Elysia {
  return new Elysia()
    .derive((context) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { isAuthenticated, user, set } = context as any;

      if (!isAuthenticated || !user) {
        set.status = 401;
        return {
          success: false,
          error: 'Authentication required'
        };
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

        set.status = 403;
        return {
          success: false,
          error: 'Insufficient permissions'
        };
      }

      return {};
    });
}

/**
 * Create middleware that requires admin role
 * @returns Elysia middleware
 */
export function requireAdmin(): Elysia {
  return requireRoles([UserRole.ADMIN]);
}

/**
 * Create middleware that requires issuer role
 * @returns Elysia middleware
 */
export function requireIssuer(): Elysia {
  return requireRoles([UserRole.ADMIN, UserRole.ISSUER]);
}

/**
 * Create middleware that checks if the authenticated user is the requested user
 * or has admin privileges
 * @returns Elysia middleware
 */
export function requireSelfOrAdmin(): Elysia {
  return new Elysia()
    .derive((context) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { isAuthenticated, user, set, params } = context as any;

      if (!isAuthenticated || !user) {
        set.status = 401;
        return {
          success: false,
          error: 'Authentication required'
        };
      }

      // Check if user is admin
      const userRoles = user.claims.roles as UserRole[] || [];
      const isAdmin = userRoles.includes(UserRole.ADMIN);

      // Check if user is accessing their own resource
      const isSelf = params.id === user.id;

      if (!isAdmin && !isSelf) {
        logger.warn(`Access denied: User ${user.id} attempted to access resource for user ${params.id}`, {
          userId: user.id,
          resourceUserId: params.id
        });

        set.status = 403;
        return {
          success: false,
          error: 'Insufficient permissions'
        };
      }

      return {};
    });
}
