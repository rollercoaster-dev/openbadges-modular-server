/**
 * User API Router
 *
 * This router handles user management endpoints.
 */

import { Elysia } from 'elysia';
import { UserController } from '../domains/user/user.controller';
import { AuthController } from '../auth/auth.controller';
import { requireAuth, requireAdmin, requireSelfOrAdmin } from '../auth/middleware/rbac.middleware';
import { UserRole, UserPermission } from '../domains/user/user.entity';
import { Shared } from 'openbadges-types';

/**
 * Create a router for user management endpoints
 * @param userController The user controller
 * @param authController The auth controller
 * @returns An Elysia router
 */
export function createUserRouter(userController: UserController, authController: AuthController): Elysia {
  const router = new Elysia();

  // User management endpoints
  router.group('/users', app => {
    return app
      // Get users (admin only)
      .use({ beforeHandle: [requireAdmin()] })
      .get('/', async ({ query }) => {
        const { username, email, role, isActive, page, limit } = query;

        // Parse query parameters
        const parsedQuery: Record<string, unknown> = {};
        if (username) parsedQuery.username = username;
        if (email) parsedQuery.email = email;
        if (role && Object.values(UserRole).includes(role as UserRole)) {
          parsedQuery.role = role as UserRole;
        }
        if (isActive !== undefined) parsedQuery.isActive = isActive === 'true';
        if (page) parsedQuery.page = parseInt(page as string, 10);
        if (limit) parsedQuery.limit = parseInt(limit as string, 10);

        return userController.getUsers(parsedQuery);
      })

      // Create user (admin only)
      .post('/', async ({ body }) => {
        const { username, email, password, firstName, lastName, roles, isActive, metadata } = body as {
          username: string;
          email: string;
          password?: string;
          firstName?: string;
          lastName?: string;
          roles?: UserRole[];
          isActive?: boolean;
          metadata?: Record<string, unknown>;
        };

        return userController.createUser({
          username,
          email,
          password,
          firstName,
          lastName,
          roles,
          isActive,
          metadata
        });
      });
  });

  // User-specific endpoints
  router.group('/users/:id', app => {
    return app
      // Get user by ID (self or admin)
      .use({ beforeHandle: [requireSelfOrAdmin()] })
      .get('/', async ({ params }) => {
        return userController.getUserById(params.id as Shared.IRI);
      })

      // Update user (self or admin)
      .put('/', async ({ params, body }) => {
        const { username, email, firstName, lastName, roles, isActive, metadata } = body as {
          username?: string;
          email?: string;
          firstName?: string;
          lastName?: string;
          roles?: UserRole[];
          isActive?: boolean;
          metadata?: Record<string, unknown>;
        };

        return userController.updateUser(params.id as Shared.IRI, {
          username,
          email,
          firstName,
          lastName,
          roles,
          isActive,
          metadata
        });
      })

      // Delete user (admin only)
      .delete('/', async ({ params }) => {
        // This endpoint requires admin, so we need to add the middleware
        app.use({ beforeHandle: [requireAdmin()] });
        return userController.deleteUser(params.id as Shared.IRI);
      })

      // Change password (self or admin)
      .post('/password', async ({ params, body }) => {
        const { currentPassword, newPassword } = body as {
          currentPassword?: string;
          newPassword: string;
        };

        return userController.changePassword(params.id as Shared.IRI, {
          currentPassword,
          newPassword
        });
      })

      // Add roles (admin only)
      .post('/roles', async ({ params, body }) => {
        // This endpoint requires admin, so we need to add the middleware
        app.use({ beforeHandle: [requireAdmin()] });

        const { roles } = body as { roles: UserRole[] };
        return userController.addRoles(params.id as Shared.IRI, roles);
      })

      // Remove roles (admin only)
      .delete('/roles', async ({ params, body }) => {
        // This endpoint requires admin, so we need to add the middleware
        app.use({ beforeHandle: [requireAdmin()] });

        const { roles } = body as { roles: UserRole[] };
        return userController.removeRoles(params.id as Shared.IRI, roles);
      })

      // Add permissions (admin only)
      .post('/permissions', async ({ params, body }) => {
        // This endpoint requires admin, so we need to add the middleware
        app.use({ beforeHandle: [requireAdmin()] });

        const { permissions } = body as { permissions: UserPermission[] };
        return userController.addPermissions(params.id as Shared.IRI, permissions);
      })

      // Remove permissions (admin only)
      .delete('/permissions', async ({ params, body }) => {
        // This endpoint requires admin, so we need to add the middleware
        app.use({ beforeHandle: [requireAdmin()] });

        const { permissions } = body as { permissions: UserPermission[] };
        return userController.removePermissions(params.id as Shared.IRI, permissions);
      });
  });

  // Authentication endpoints
  router.group('/auth', app => {
    return app
      // Login
      .post('/login', async ({ body }) => {
        const { usernameOrEmail, password } = body as {
          usernameOrEmail: string;
          password: string;
        };

        return authController.login({
          usernameOrEmail,
          password
        });
      })

      // Register
      .post('/register', async ({ body }) => {
        const { username, email, password, firstName, lastName } = body as {
          username: string;
          email: string;
          password: string;
          firstName?: string;
          lastName?: string;
        };

        return authController.register({
          username,
          email,
          password,
          firstName,
          lastName
        });
      })

      // Get current user
      .use({ beforeHandle: [requireAuth()] })
      .get('/me', async (ctx) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { user } = ctx as any;
        if (!user || !user.id) {
          return {
            status: 401,
            body: {
              success: false,
              error: 'Authentication required'
            }
          };
        }

        return authController.getProfile(user.id);
      });
  });

  return router;
}
