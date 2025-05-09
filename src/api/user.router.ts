/**
 * User API Router
 *
 * This router handles user management endpoints.
 */

import { Hono } from 'hono';
import { UserController } from '../domains/user/user.controller';
import { UserRole, UserPermission } from '../domains/user/user.entity';
import { requireAdmin, requirePermissions, requireAuth } from '../auth/middleware/rbac.middleware';
import { Shared } from 'openbadges-types';

/**
 * Create a router for user management endpoints
 * @param userController The user controller
 * @returns A Hono router
 */
export function createUserRouter(userController: UserController): Hono {
  const router = new Hono();

  // User management endpoints (admin only)
  router.get('/', requireAdmin(), async (c) => {
    const { username, email, role, isActive, page, limit } = c.req.query();
    const parsedQuery: Record<string, unknown> = {};
    if (username) parsedQuery['username'] = username;
    if (email) parsedQuery['email'] = email;
    if (role && Object.values(UserRole).includes(role as UserRole)) {
      parsedQuery['role'] = role as UserRole;
    }
    if (isActive !== undefined) parsedQuery['isActive'] = isActive === 'true';
    if (page) parsedQuery['page'] = parseInt(page as string, 10);
    if (limit) parsedQuery['limit'] = parseInt(limit as string, 10);
    const users = await userController.getUsers(parsedQuery);
    return c.json(users);
  });

  router.post('/', requireAdmin(), async (c) => {
    const body = await c.req.json();
    const { username, email, password, firstName, lastName, roles, isActive, metadata } = body;
    const user = await userController.createUser({
      username,
      email,
      password,
      firstName,
      lastName,
      roles,
      isActive,
      metadata
    });
    return c.json(user, 201);
  });

  // Get user by ID
  router.get('/:id', requirePermissions([UserPermission.MANAGE_USERS]), async (c) => {
    const id = c.req.param('id');
    const result = await userController.getUserById(id as Shared.IRI);
    return c.json(result.body, result.status as 200 | 404 | 500);
  });

  // Update user
  router.put('/:id', requirePermissions([UserPermission.MANAGE_USERS]), async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { username, email, firstName, lastName, roles, isActive, metadata } = body;
    const result = await userController.updateUser(id as Shared.IRI, {
      username,
      email,
      firstName,
      lastName,
      roles,
      isActive,
      metadata
    });
    return c.json(result.body, result.status as 200 | 404 | 500);
  });

  // Delete user
  router.delete('/:id', requirePermissions([UserPermission.MANAGE_USERS]), async (c) => {
    const id = c.req.param('id');
    const result = await userController.deleteUser(id as Shared.IRI);
    return c.json(result.body, result.status as 200 | 404 | 500);
  });

  // Change user password (admin or self)
  router.post('/:id/change-password', requireAuth(), async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { currentPassword, newPassword } = body;

    // Get the current user from the context
    const currentUser = c.get('user');
    const currentUserId = currentUser?.claims?.sub as string;

    // Check if the user is changing their own password or is an admin
    const isOwnAccount = currentUserId === id;
    const isAdmin = Array.isArray(currentUser?.claims?.roles) &&
      (currentUser?.claims?.roles as string[]).includes(UserRole.ADMIN);

    if (!isOwnAccount && !isAdmin) {
      return c.json({
        success: false,
        error: 'You do not have permission to change this user\'s password'
      }, 403);
    }

    // If it's the user's own account, require the current password
    if (isOwnAccount && !currentPassword) {
      return c.json({
        success: false,
        error: 'Current password is required'
      }, 400);
    }

    try {
      const result = await userController.changePassword(id as Shared.IRI, {
        currentPassword: isOwnAccount ? currentPassword : undefined,
        newPassword
      });

      return c.json(result.body, result.status as 200 | 400 | 401 | 404 | 500);
    } catch (error) {
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to change password'
      }, 400);
    }
  });

  return router;
}
