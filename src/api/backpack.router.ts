/**
 * Backpack API router
 */
import { Elysia } from 'elysia';
import { BackpackController } from '../domains/backpack/backpack.controller';
import { createPlatformAuthMiddleware } from '../auth/middleware/platform-auth.middleware';
import { PlatformRepository } from '../domains/backpack/platform.repository';
import { PlatformUser } from '../domains/backpack/platform-user.entity';
import { Shared } from 'openbadges-types';
import { BadgeVersion } from '../utils/version/badge-version';
import {
  CreatePlatformRequest,
  UpdatePlatformRequest,
  AddAssertionRequest,
  UpdateAssertionStatusRequest
} from '../domains/backpack/api.types';

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
        const { name, clientId, publicKey, description, webhookUrl } = body as CreatePlatformRequest;

        // Create platform data
        const platformData: CreatePlatformRequest = {
          name,
          clientId,
          publicKey,
          description,
          webhookUrl
        };

        const result = await backpackController.createPlatform(platformData);
        const platform = result.body;

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
        const { name, clientId, publicKey, status, description, webhookUrl } = body as UpdatePlatformRequest;

        const platformData: UpdatePlatformRequest = {
          name,
          clientId,
          publicKey,
          status,
          description,
          webhookUrl
        };

        const result = await backpackController.updatePlatform(id as Shared.IRI, platformData);
        const platform = result.body;

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
      .post('/', async ({ body, platformUser }: { body: AddAssertionRequest, platformUser: Pick<PlatformUser, 'platformId' | 'externalUserId' | 'displayName' | 'email'> }) => {
        if (!platformUser) {
          return {
            status: 401,
            body: {
              success: false,
              error: 'Authentication required'
            }
          };
        }

        const { assertionId, metadata } = body;

        const result = await backpackController.addAssertion(
          platformUser,
          assertionId as Shared.IRI,
          metadata
        );
        const userAssertion = result.body;

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

        const result = await backpackController.getUserAssertions(
          platformUser,
          version === 'v2' ? BadgeVersion.V2 : BadgeVersion.V3
        );
        const assertions = result.body;

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

        const result = await backpackController.removeAssertion(
          platformUser,
          assertionId as Shared.IRI
        );
        const success = result.body.success;

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
      .patch('/:assertionId/status', async ({ params: { assertionId }, body, platformUser }: { params: { assertionId: string }, body: UpdateAssertionStatusRequest, platformUser: Pick<PlatformUser, 'platformId' | 'externalUserId' | 'displayName' | 'email'> }) => {
        if (!platformUser) {
          return {
            status: 401,
            body: {
              success: false,
              error: 'Authentication required'
            }
          };
        }

        const { status } = body;

        const result = await backpackController.updateAssertionStatus(
          platformUser,
          assertionId as Shared.IRI,
          status
        );
        const success = result.body.success;

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

  return router;
}
