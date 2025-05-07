/**
 * API router for Open Badges API
 *
 * This file defines the API routes for the Open Badges API.
 * It supports both Open Badges 2.0 and 3.0 specifications.
 */

import { Elysia } from 'elysia';
import { logger } from '../utils/logging/logger.service';
import { CreateIssuerDto, UpdateIssuerDto, CreateBadgeClassDto, UpdateBadgeClassDto, CreateAssertionDto, UpdateAssertionDto } from './dtos';
import { IssuerController } from './controllers/issuer.controller';
import { BadgeClassController } from './controllers/badgeClass.controller';
import { AssertionController } from './controllers/assertion.controller';
import { BadgeVersion } from '../utils/version/badge-version';
import {
  validateIssuerMiddleware,
  validateBadgeClassMiddleware,
  validateAssertionMiddleware
} from '../utils/validation/validation-middleware';
import { openApiConfig } from './openapi';
import { rateLimitMiddleware, securityHeadersMiddleware } from '../utils/security/middleware';
import { HealthCheckService } from '../utils/monitoring/health-check.service';
import { AssetsController } from './controllers/assets.controller';
import { createBackpackRouter } from './backpack.router';
import { createUserRouter } from './user.router';
import type { PlatformRepository } from '@domains/backpack/platform.repository';
import { BackpackController } from '../domains/backpack/backpack.controller';
import { UserController } from '../domains/user/user.controller';
import { AuthController } from '../auth/auth.controller';
import { staticAssetsMiddleware } from './static-assets.middleware';
import { requireAuth, requirePermissions } from '../auth/middleware/rbac.middleware';
import { UserPermission } from '../domains/user/user.entity';

/**
 * Creates the API router
 * @param issuerController The issuer controller
 * @param badgeClassController The badge class controller
 * @param assertionController The assertion controller
 * @returns The API router
 */
export function createApiRouter(
  issuerController: IssuerController,
  badgeClassController: BadgeClassController,
  assertionController: AssertionController,
  backpackController?: BackpackController,
  platformRepository?: PlatformRepository,
  userController?: UserController,
  authController?: AuthController
): Elysia {
  // Create the router
  const router = new Elysia();

  // Add security middleware
  router.use(securityHeadersMiddleware);
  router.use(rateLimitMiddleware);

  // Add static file middleware for uploads
  staticAssetsMiddleware(router);

  // Register assets upload endpoint
  const assetsController = new AssetsController();
  router.use(assetsController.router);

  // Add OpenAPI documentation
  router.get('/swagger', () => openApiConfig);

  // Add Swagger UI documentation
  router.get('/docs', ({ set }) => {
    // Set custom headers for Swagger UI to work properly
    set.headers['Content-Type'] = 'text/html';
    set.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: https://unpkg.com; connect-src 'self'";

    // Return the Swagger UI HTML
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="Open Badges API Documentation" />
  <title>Open Badges API - Swagger UI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js" crossorigin></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js" crossorigin></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '/swagger',
        dom_id: '#swagger-ui',
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "StandaloneLayout",
        deepLinking: true,
        showExtensions: true,
        showCommonExtensions: true
      });
    };
  </script>
</body>
</html>
`;
  });



  // Add health check endpoints
  router.get('/health', async () => {
    return await HealthCheckService.check();
  });

  // Add deep health check endpoint (more comprehensive)
  router.get('/health/deep', async () => {
    return await HealthCheckService.deepCheck();
  });

  // Validation middleware is applied per route

  // Version-specific routes
  const v2Router = createVersionedRouter(BadgeVersion.V2, issuerController, badgeClassController, assertionController);
  const v3Router = createVersionedRouter(BadgeVersion.V3, issuerController, badgeClassController, assertionController);

  // Mount version-specific routers
  router.group('/v2', app => app.use(v2Router));
  router.group('/v3', app => app.use(v3Router));

  // Default routes (use v3)
  router.group('', app => app.use(v3Router));

  // Backpack routes (if controller is provided)
  if (backpackController && platformRepository) {
    const backpackRouter = createBackpackRouter(backpackController, platformRepository);
    router.group('/api/v1', app => app.use(backpackRouter));
  }

  // User management routes (if controller is provided)
  if (userController && authController) {
    const userRouter = createUserRouter(userController, authController);
    router.group('/api/v1', app => app.use(userRouter));
  }

  return router;
}

/**
 * Creates a versioned router
 * @param version The badge version
 * @param issuerController The issuer controller
 * @param badgeClassController The badge class controller
 * @param assertionController The assertion controller
 * @returns The versioned router
 */
function createVersionedRouter(
  version: BadgeVersion,
  issuerController: IssuerController,
  badgeClassController: BadgeClassController,
  assertionController: AssertionController
): Elysia {
  const router = new Elysia();

  // Issuer routes
  // Robust Issuer CRUD routes with error handling and logging
  router.post('/issuers', async ({ body, set }) => {
    try {
      const result = await issuerController.createIssuer(body as CreateIssuerDto, version);
      set.status = 201;
      return result;
    } catch (error) {
      logger.error('POST /issuers failed', { error: error instanceof Error ? error.message : String(error), body });
      if (error instanceof Error && error.message.includes('permission')) {
        set.status = 403;
        return { error: 'Forbidden', message: error.message };
      }
      set.status = 400;
      return { error: 'Bad Request', message: error instanceof Error ? error.message : String(error) };
    }
  }, { beforeHandle: [requirePermissions([UserPermission.CREATE_ISSUER]), validateIssuerMiddleware] });

  router.get('/issuers', async ({ set }) => {
    try {
      return await issuerController.getAllIssuers(version);
    } catch (error) {
      logger.error('GET /issuers failed', { error: error instanceof Error ? error.message : String(error) });
      set.status = 500;
      return { error: 'Internal Server Error' };
    }
  }, { beforeHandle: [requireAuth()] });

  router.get('/issuers/:id', async ({ params, set }) => {
    try {
      const result = await issuerController.getIssuerById(params['id'], version);
      if (!result) {
        set.status = 404;
        return { error: 'Not Found', message: 'Issuer not found' };
      }
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('Invalid IRI')) {
        set.status = 400;
        logger.error('GET /issuers/:id invalid IRI', { error: message, id: params['id'] });
        return { error: 'Bad Request', message: 'Invalid issuer ID' };
      }
      logger.error('GET /issuers/:id failed', { error: message, id: params['id'] });
      set.status = 500;
      return { error: 'Internal Server Error', message };
    }
  }, { beforeHandle: [requireAuth()] });

  router.put('/issuers/:id', async ({ params, body, set }) => {
    try {
      const result = await issuerController.updateIssuer(params['id'], body as UpdateIssuerDto, version);
      if (!result) {
        set.status = 404;
        return { error: 'Not Found', message: 'Issuer not found' };
      }
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('Invalid IRI')) {
        set.status = 400;
        logger.error('PUT /issuers/:id invalid IRI', { error: message, id: params['id'], body });
        return { error: 'Bad Request', message: 'Invalid issuer ID' };
      }
      if (message.includes('permission')) {
        set.status = 403;
        logger.error('PUT /issuers/:id forbidden', { error: message, id: params['id'], body });
        return { error: 'Forbidden', message };
      }
      logger.error('PUT /issuers/:id failed', { error: message, id: params['id'], body });
      set.status = 500;
      return { error: 'Internal Server Error', message };
    }
  }, { beforeHandle: [requirePermissions([UserPermission.UPDATE_ISSUER]), validateIssuerMiddleware] });

  router.delete('/issuers/:id', async ({ params, set }) => {
    try {
      const deleted = await issuerController.deleteIssuer(params['id']);
      if (!deleted) {
        set.status = 404;
        return { error: 'Not Found', message: 'Issuer not found' };
      }
      set.status = 204;
      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('Invalid IRI')) {
        set.status = 400;
        logger.error('DELETE /issuers/:id invalid IRI', { error: message, id: params['id'] });
        return { error: 'Bad Request', message: 'Invalid issuer ID' };
      }
      if (message.includes('permission')) {
        set.status = 403;
        logger.error('DELETE /issuers/:id forbidden', { error: message, id: params['id'] });
        return { error: 'Forbidden', message };
      }
      logger.error('DELETE /issuers/:id failed', { error: message, id: params['id'] });
      set.status = 500;
      return { error: 'Internal Server Error', message };
    }
  }, { beforeHandle: [requirePermissions([UserPermission.DELETE_ISSUER])] });

  // Badge class routes
  router.post('/badge-classes',
    ({ body }) => badgeClassController.createBadgeClass(body as CreateBadgeClassDto, version),
    { beforeHandle: [requirePermissions([UserPermission.CREATE_BADGE_CLASS]), validateBadgeClassMiddleware] }
  );
  router.get('/badge-classes',
    () => badgeClassController.getAllBadgeClasses(version),
    { beforeHandle: [requireAuth()] }
  );
  router.get('/badge-classes/:id',
    ({ params }) => badgeClassController.getBadgeClassById(params['id'], version),
    { beforeHandle: [requireAuth()] }
  );
  router.get('/issuers/:id/badge-classes',
    ({ params }) => badgeClassController.getBadgeClassesByIssuer(params['id'], version),
    { beforeHandle: [requireAuth()] }
  );
  router.put('/badge-classes/:id',
    ({ params, body }) => badgeClassController.updateBadgeClass(params['id'], body as UpdateBadgeClassDto, version),
    { beforeHandle: [requirePermissions([UserPermission.UPDATE_BADGE_CLASS]), validateBadgeClassMiddleware] }
  );
  router.delete('/badge-classes/:id',
    ({ params }) => badgeClassController.deleteBadgeClass(params['id']),
    { beforeHandle: [requirePermissions([UserPermission.DELETE_BADGE_CLASS])] }
  );

  // Assertion routes
  router.post('/assertions',
    ({ body, query }) => {
      const sign = query['sign'] !== 'false'; // Default to true if not specified
      return assertionController.createAssertion(body as CreateAssertionDto, version, sign);
    },
    { beforeHandle: [requirePermissions([UserPermission.CREATE_ASSERTION]), validateAssertionMiddleware] }
  );
  router.get('/assertions',
    () => assertionController.getAllAssertions(version),
    { beforeHandle: [requireAuth()] }
  );
  router.get('/assertions/:id',
    ({ params }) => assertionController.getAssertionById(params['id'], version),
    { beforeHandle: [requireAuth()] }
  );
  router.get('/badge-classes/:id/assertions',
    ({ params }) => assertionController.getAssertionsByBadgeClass(params['id'], version),
    { beforeHandle: [requireAuth()] }
  );
  router.put('/assertions/:id',
    ({ params, body }) => assertionController.updateAssertion(params['id'], body as UpdateAssertionDto, version),
    { beforeHandle: [requirePermissions([UserPermission.UPDATE_ASSERTION]), validateAssertionMiddleware] }
  );
  router.post('/assertions/:id/revoke',
    ({ params, body }) => {
      const reason = typeof body === 'object' && body !== null && 'reason' in body ? String(body.reason) : 'No reason provided';
      return assertionController.revokeAssertion(params['id'], reason);
    },
    { beforeHandle: [requirePermissions([UserPermission.REVOKE_ASSERTION])] }
  );

  // Verification routes
  router.get('/assertions/:id/verify', async ({ params, set }) => {
    const result = await assertionController.verifyAssertion(params['id']);
    // If assertion not found, return 404
    if (
      result.isValid === false &&
      result.hasValidSignature === false &&
      typeof result.details === 'string' &&
      result.details.toLowerCase().includes('not found')
    ) {
      set.status = 404;
      return { error: 'Assertion not found', details: result.details };
    }
    return result;
  }, { beforeHandle: [requireAuth()] });
  router.post('/assertions/:id/sign',
    ({ params, query }) => {
      const keyId = query['keyId'] || 'default';
      return assertionController.signAssertion(params['id'], keyId as string, version);
    },
    { beforeHandle: [requirePermissions([UserPermission.SIGN_ASSERTION])] }
  );

  // Public key routes
  router.get('/public-keys',
    () => assertionController.getPublicKeys(),
    { beforeHandle: [requireAuth()] }
  );
  router.get('/public-keys/:id',
    ({ params }) => assertionController.getPublicKey(params['id']),
    { beforeHandle: [requireAuth()] }
  );

  return router;
}
