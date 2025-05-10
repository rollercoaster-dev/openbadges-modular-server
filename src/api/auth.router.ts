/**
 * Authentication API Router
 *
 * This router handles authentication-related endpoints.
 */

import { Hono } from 'hono';
import { AuthController } from '../auth/auth.controller';
import { requireAuth } from '../auth/middleware/rbac.middleware';
import { extractLoggingContext } from '../utils/logging.utils';

/**
 * Create a router for authentication endpoints
 * @param authController The authentication controller
 * @returns A Hono router
 */
export function createAuthRouter(authController: AuthController): Hono {
  const router = new Hono();

  // Login endpoint
  router.post('/login', async (c) => {
    const body = await c.req.json();
    const { usernameOrEmail, password } = body;

    // Extract request information for logging
    const { requestId, clientIp, userAgent } = extractLoggingContext(c);

    const result = await authController.login({
      usernameOrEmail,
      password,
      requestId,
      clientIp,
      userAgent
    });

    return c.json(result.body, result.status as 200 | 400 | 401 | 500);
  });

  // Registration endpoint
  router.post('/register', async (c) => {
    const body = await c.req.json();
    const { username, email, password, firstName, lastName } = body;

    // Extract request information for logging
    const { requestId, clientIp, userAgent } = extractLoggingContext(c);

    const result = await authController.register({
      username,
      email,
      password,
      firstName,
      lastName,
      requestId,
      clientIp,
      userAgent
    });

    return c.json(result.body, result.status as 200 | 201 | 400 | 409 | 500);
  });

  // Profile endpoint (requires authentication)
  router.get('/profile', requireAuth(), async (c) => {
    // The user ID should be available from the JWT token
    const userId = c.get('user')?.claims?.sub;
    if (!userId) {
      return c.json({
        success: false,
        error: 'User not authenticated'
      }, 401);
    }

    // Extract request information for logging
    const { requestId, clientIp, userAgent } = extractLoggingContext(c);

    const result = await authController.getProfile(
      userId as string,
      {
        requestId,
        clientIp,
        userAgent
      }
    );

    return c.json(result.body, result.status as 200 | 404 | 500);
  });

  return router;
}
