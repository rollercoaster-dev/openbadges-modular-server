/**
 * User API Router
 *
 * This router handles user management endpoints.
 */

import { Hono } from 'hono';
import { UserController } from '../domains/user/user.controller';
import { UserRole } from '../domains/user/user.entity';
import { requireAdmin } from '../auth/middleware/rbac.middleware';

/**
 * Create a router for user management endpoints
 * @param userController The user controller
 * @param authController The auth controller
 * @returns A Hono router
 */
export function createUserRouter(userController: UserController): Hono {
  const router = new Hono();

  // User management endpoints
  router.get('/users', requireAdmin(), async (c) => {
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

  router.post('/users', requireAdmin(), async (c) => {
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

  // TODO: Migrate user-specific endpoints (/users/:id, roles, permissions, etc.)
  // TODO: Migrate authentication endpoints (/auth/login, /auth/register, etc.)

  return router;
}
