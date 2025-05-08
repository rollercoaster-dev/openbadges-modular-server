/**
 * Backpack API router
 */
import { Hono } from 'hono';
import { BackpackController } from '../domains/backpack/backpack.controller';
import { createPlatformAuthMiddleware } from '../auth/middleware/platform-auth.middleware';
import { PlatformRepository } from '../domains/backpack/platform.repository';

import { Shared } from 'openbadges-types';
import { BadgeVersion } from '../utils/version/badge-version';
import {
  CreatePlatformRequest,
  UpdatePlatformRequest,
  AddAssertionRequest,
  UpdateAssertionStatusRequest
} from '../domains/backpack/api.types';
// TODO: Migrate RBAC middleware for Hono
// import { requirePermissions } from '../auth/middleware/rbac.middleware';
// import { UserPermission } from '../domains/user/user.entity';

// Define the variables that will be set in the context
type PlatformAuthVariables = {
  platformUser: {
    id: Shared.IRI;
    platformId: Shared.IRI;
    externalUserId: string;
    displayName: string;
    email: string;
  } | null;
  isAuthenticated: boolean;
};

// Define the app type with the variables
type AppType = {
  Variables: PlatformAuthVariables;
};

/**
 * Create a router for backpack endpoints
 * @param backpackController The backpack controller
 * @param platformRepository The platform repository
 * @returns A Hono router
 */
export function createBackpackRouter(
  backpackController: BackpackController,
  platformRepository: PlatformRepository
): Hono<AppType> {
  const router = new Hono<AppType>();

  // Middleware
  const platformAuth = createPlatformAuthMiddleware(platformRepository);

  // TODO: Migrate RBAC middleware for Hono
  // Platform management endpoints (admin only)
  // router.use('/platforms/*', requirePermissions([UserPermission.MANAGE_PLATFORMS]));

  router.get('/platforms', async (c) => {
    const platforms = await backpackController.getAllPlatforms();
    return c.json({ success: true, platforms }, 200);
  });
  router.post('/platforms', async (c) => {
    const body = await c.req.json<CreatePlatformRequest>();
    const { name, clientId, publicKey, description, webhookUrl } = body;
    const platformData: CreatePlatformRequest = { name, clientId, publicKey, description, webhookUrl };
    const result = await backpackController.createPlatform(platformData);
    const platform = result.body;
    return c.json({ success: true, platform }, 201);
  });
  router.get('/platforms/:id', async (c) => {
    const id = c.req.param('id');
    const platform = await backpackController.getPlatformById(id as Shared.IRI);
    if (!platform) {
      return c.json({ success: false, error: 'Platform not found' }, 404);
    }
    return c.json({ success: true, platform }, 200);
  });
  router.put('/platforms/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json<UpdatePlatformRequest>();
    const { name, clientId, publicKey, status, description, webhookUrl } = body;
    const platformData: UpdatePlatformRequest = { name, clientId, publicKey, status, description, webhookUrl };
    const result = await backpackController.updatePlatform(id as Shared.IRI, platformData);
    const platform = result.body;
    if (!platform) {
      return c.json({ success: false, error: 'Platform not found' }, 404);
    }
    return c.json({ success: true, platform }, 200);
  });
  router.delete('/platforms/:id', async (c) => {
    const id = c.req.param('id');
    const success = await backpackController.deletePlatform(id as Shared.IRI);
    if (!success) {
      return c.json({ success: false, error: 'Platform not found' }, 404);
    }
    return c.json({ success: true }, 200);
  });

  // User assertion endpoints (platform authenticated)
  router.use('/assertions/*', platformAuth);

  router.post('/assertions', async (c) => {
    const platformUser = c.var.platformUser;
    if (!platformUser) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }
    const body = await c.req.json<AddAssertionRequest>();
    const { assertionId, metadata } = body;
    const result = await backpackController.addAssertion(
      platformUser,
      assertionId as Shared.IRI,
      metadata
    );
    const userAssertion = result.body;
    return c.json({ success: true, userAssertion }, 201);
  });

  router.get('/assertions', async (c) => {
    const platformUser = c.var.platformUser;
    if (!platformUser) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }
    const version = c.req.query('version') || 'v3';
    const result = await backpackController.getUserAssertions(
      platformUser,
      version === 'v2' ? BadgeVersion.V2 : BadgeVersion.V3
    );
    const assertions = result.body;
    return c.json({ success: true, assertions }, 200);
  });

  router.delete('/assertions/:assertionId', async (c) => {
    const platformUser = c.var.platformUser;
    if (!platformUser) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }
    const assertionId = c.req.param('assertionId');
    const result = await backpackController.removeAssertion(
      platformUser,
      assertionId as Shared.IRI
    );
    const success = result.body.success;
    if (!success) {
      return c.json({ success: false, error: 'Assertion not found' }, 404);
    }
    return c.json({ success: true }, 200);
  });

  router.patch('/assertions/:assertionId/status', async (c) => {
    const platformUser = c.var.platformUser;
    if (!platformUser) {
      return c.json({ success: false, error: 'Authentication required' }, 401);
    }
    const assertionId = c.req.param('assertionId');
    const body = await c.req.json<UpdateAssertionStatusRequest>();
    const { status } = body;
    const result = await backpackController.updateAssertionStatus(
      platformUser,
      assertionId as Shared.IRI,
      status
    );
    const success = result.body.success;
    if (!success) {
      return c.json({ success: false, error: 'Assertion not found' }, 404);
    }
    return c.json({ success: true }, 200);
  });

  return router;
}

