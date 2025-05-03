/**
 * Backpack API router
 */
import { Elysia } from 'elysia';
import { BackpackController } from '../domains/backpack/backpack.controller';
import { createPlatformAuthMiddleware } from '../auth/middleware/platform-auth.middleware';
import { PlatformRepository } from '../domains/backpack/platform.repository';
import { Shared } from 'openbadges-types';
import { BadgeVersion } from '../utils/version/badge-version';

/**
 * Create a router for backpack endpoints
 * @param backpackController The backpack controller
 * @param platformRepository The platform repository
 * @returns An Elysia router
 */
export function createBackpackRouter(
  backpackController: BackpackController,
  platformRepository: PlatformRepository
): Elysia {
  // Create platform auth middleware
  const platformAuth = createPlatformAuthMiddleware(platformRepository);

  // Create router
  const router = new Elysia({ prefix: '/backpack' });

  // Platform management endpoints (admin only)
  router.group('/platforms', (app) => {
    return app
      .get('/', async () => {
        return {
          status: 200,
          body: {
            success: true,
            platforms: await backpackController.getAllPlatforms()
          }
        };
      })
      .post('/', async ({ body }) => {
        const { id, name, clientId, publicKey } = body as {
          id?: Shared.IRI;
          name: string;
          clientId: string;
          publicKey: string;
        };

        const platform = await backpackController.createPlatform({
          id,
          name,
          clientId,
          publicKey
        });

        return {
          status: 201,
          body: {
            success: true,
            platform
          }
        };
      })
      .get('/:id', async ({ params: { id } }) => {
        const platform = await backpackController.getPlatformById(id as Shared.IRI);

        if (!platform) {
          return {
            status: 404,
            body: {
              success: false,
              error: 'Platform not found'
            }
          };
        }

        return {
          status: 200,
          body: {
            success: true,
            platform
          }
        };
      })
      .put('/:id', async ({ params: { id }, body }) => {
        const { name, clientId, publicKey, status } = body as {
          name?: string;
          clientId?: string;
          publicKey?: string;
          status?: string;
        };

        const platform = await backpackController.updatePlatform(id as Shared.IRI, {
          name,
          clientId,
          publicKey,
          status
        });

        if (!platform) {
          return {
            status: 404,
            body: {
              success: false,
              error: 'Platform not found'
            }
          };
        }

        return {
          status: 200,
          body: {
            success: true,
            platform
          }
        };
      })
      .delete('/:id', async ({ params: { id } }) => {
        const success = await backpackController.deletePlatform(id as Shared.IRI);

        if (!success) {
          return {
            status: 404,
            body: {
              success: false,
              error: 'Platform not found'
            }
          };
        }

        return {
          status: 200,
          body: {
            success: true
          }
        };
      });
  });

  // User assertion endpoints (platform authenticated)
  router.group('/assertions', (app) => {
    return app
      .use(platformAuth)
      .post('/', async ({ body, platformUser }: { body: any, platformUser: { platformId: Shared.IRI; externalUserId: string; displayName?: string; email?: string } }) => {
        if (!platformUser) {
          return {
            status: 401,
            body: {
              success: false,
              error: 'Authentication required'
            }
          };
        }

        const { assertionId, metadata } = body as {
          assertionId: Shared.IRI;
          metadata?: Record<string, unknown>;
        };

        const userAssertion = await backpackController.addAssertion(
          platformUser,
          assertionId,
          metadata
        );

        return {
          status: 201,
          body: {
            success: true,
            userAssertion
          }
        };
      })
      .get('/', async ({ platformUser, query }: { platformUser: { platformId: Shared.IRI; externalUserId: string; displayName?: string; email?: string }, query: Record<string, string> }) => {
        if (!platformUser) {
          return {
            status: 401,
            body: {
              success: false,
              error: 'Authentication required'
            }
          };
        }

        const version = query.version || 'v3';

        const assertions = await backpackController.getUserAssertions(
          platformUser,
          version === 'v2' ? BadgeVersion.V2 : BadgeVersion.V3
        );

        return {
          status: 200,
          body: {
            success: true,
            assertions
          }
        };
      })
      .delete('/:assertionId', async ({ params: { assertionId }, platformUser }: { params: { assertionId: string }, platformUser: { platformId: Shared.IRI; externalUserId: string; displayName?: string; email?: string } }) => {
        if (!platformUser) {
          return {
            status: 401,
            body: {
              success: false,
              error: 'Authentication required'
            }
          };
        }

        const success = await backpackController.removeAssertion(
          platformUser,
          assertionId as Shared.IRI
        );

        if (!success) {
          return {
            status: 404,
            body: {
              success: false,
              error: 'Assertion not found'
            }
          };
        }

        return {
          status: 200,
          body: {
            success: true
          }
        };
      })
      .patch('/:assertionId/status', async ({ params: { assertionId }, body, platformUser }: { params: { assertionId: string }, body: any, platformUser: { platformId: Shared.IRI; externalUserId: string; displayName?: string; email?: string } }) => {
        if (!platformUser) {
          return {
            status: 401,
            body: {
              success: false,
              error: 'Authentication required'
            }
          };
        }

        const { status } = body as { status: string };

        const success = await backpackController.updateAssertionStatus(
          platformUser,
          assertionId as Shared.IRI,
          status
        );

        if (!success) {
          return {
            status: 404,
            body: {
              success: false,
              error: 'Assertion not found'
            }
          };
        }

        return {
          status: 200,
          body: {
            success: true
          }
        };
      });
  });

  return router as any;
}
