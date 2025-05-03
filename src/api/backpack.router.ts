/**
 * Backpack API router
 */
import { Elysia } from 'elysia';
import { BackpackController } from '../domains/backpack/backpack.controller';
import { createPlatformAuthMiddleware } from '../auth/middleware/platform-auth.middleware';
import { PlatformRepository } from '../domains/backpack/platform.repository';
import { Platform } from '../domains/backpack/platform.entity';
import { PlatformUser } from '../domains/backpack/platform-user.entity';
import { Shared } from 'openbadges-types';
import { BadgeVersion } from '../utils/version/badge-version';
import { PlatformStatus, UserAssertionStatus } from '../domains/backpack/backpack.types';

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
        const { name, clientId, publicKey, description, webhookUrl } = body as Record<string, string>;

        // Create platform data
        const platformData = {
          name,
          clientId,
          publicKey,
          description,
          webhookUrl,
          status: PlatformStatus.ACTIVE
        };

        const platform = await backpackController.createPlatform(platformData);

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
        const { name, clientId, publicKey, status, description, webhookUrl, metadata } = body as Partial<Platform>;

        const platform = await backpackController.updatePlatform(id as Shared.IRI, {
          name,
          clientId,
          publicKey,
          status: status as PlatformStatus,
          description,
          webhookUrl,
          metadata
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
      .post('/', async ({ body, platformUser }: { body: any, platformUser: Pick<PlatformUser, 'platformId' | 'externalUserId' | 'displayName' | 'email'> }) => {
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
      .get('/', async ({ platformUser, query }: { platformUser: Pick<PlatformUser, 'platformId' | 'externalUserId' | 'displayName' | 'email'>, query: Record<string, string> }) => {
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
      .delete('/:assertionId', async ({ params: { assertionId }, platformUser }: { params: { assertionId: string }, platformUser: Pick<PlatformUser, 'platformId' | 'externalUserId' | 'displayName' | 'email'> }) => {
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
      .patch('/:assertionId/status', async ({ params: { assertionId }, body, platformUser }: { params: { assertionId: string }, body: any, platformUser: Pick<PlatformUser, 'platformId' | 'externalUserId' | 'displayName' | 'email'> }) => {
        if (!platformUser) {
          return {
            status: 401,
            body: {
              success: false,
              error: 'Authentication required'
            }
          };
        }

        const { status } = body as { status: UserAssertionStatus };

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
