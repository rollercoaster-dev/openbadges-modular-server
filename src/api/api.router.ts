/**
 * API router for Open Badges API
 *
 * This file defines the API routes for the Open Badges API.
 * It supports both Open Badges 2.0 and 3.0 specifications.
 */

import { Hono } from 'hono';

import { logger } from '../utils/logging/logger.service';
import {
  CreateIssuerDto,
  UpdateIssuerDto,
  CreateBadgeClassDto,
  UpdateBadgeClassDto,
  CreateAssertionDto,
  UpdateAssertionDto,
} from './dtos';
import { IssuerController } from './controllers/issuer.controller';
import { BadgeClassController } from './controllers/badgeClass.controller';
import { AssertionController } from './controllers/assertion.controller';
import { VersionController } from './controllers/version.controller';
import { BadgeVersion } from '../utils/version/badge-version';
import { openApiConfig } from './openapi';
import { HealthCheckService } from '../utils/monitoring/health-check.service';
import {
  validateIssuerMiddleware,
  validateBadgeClassMiddleware,
  validateAssertionMiddleware,
} from '../utils/validation/validation-middleware';
import { BackpackController } from '../domains/backpack/backpack.controller';
import { UserController } from '../domains/user/user.controller';
import { AuthController } from '../auth/auth.controller';
import { createBackpackRouter } from './backpack.router';
import { createUserRouter } from './user.router';
import { createAuthRouter } from './auth.router';
import { RepositoryFactory } from '../infrastructure/repository.factory';
import { createSecurityMiddleware } from '../utils/security/security.middleware';
import { createStaticAssetsRouter } from './static-assets.middleware';

/**
 * Creates the API router
 * @param issuerController The issuer controller
 * @param badgeClassController The badge class controller
 * @param assertionController The assertion controller
 * @param backpackController The backpack controller
 * @param userController The user controller
 * @param authController The auth controller
 * @returns The API router
 */
export async function createApiRouter(
  issuerController: IssuerController,
  badgeClassController: BadgeClassController,
  assertionController: AssertionController,
  backpackController?: BackpackController,
  userController?: UserController,
  authController?: AuthController
): Promise<Hono> {
  // Create the router
  const router = new Hono();

  // Apply security middleware (rate limiting and security headers)
  router.use('*', createSecurityMiddleware());

  // Add static assets router for uploads
  const staticAssetsRouter = createStaticAssetsRouter();
  router.route('/assets', staticAssetsRouter);

  // Add OpenAPI documentation
  router.get('/swagger', (c) => c.json(openApiConfig));

  // Add Swagger UI documentation
  router.get('/docs', (c) => {
    // Set custom headers for Swagger UI to work properly
    c.header('Content-Type', 'text/html');
    c.header(
      'Content-Security-Policy',
      "default-src 'self'; \
  script-src 'self' https://unpkg.com; \
  style-src  'self' https://unpkg.com 'unsafe-inline'; \
  img-src    'self' data: https://unpkg.com; \
  connect-src 'self'"
    );

    // Return the Swagger UI HTML
    return c.html(`
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
`);
  });

  // Add health check endpoints
  router.get('/health', async (c) => {
    const result = await HealthCheckService.check();
    return c.json(result);
  });

  // Add deep health check endpoint (more comprehensive)
  router.get('/health/deep', async (c) => {
    const result = await HealthCheckService.deepCheck();
    return c.json(result);
  });

  // Add version endpoint
  router.get('/version', (c) => {
    const versionController = new VersionController();
    const versionInfo = versionController.getVersion();
    return c.json(versionInfo);
  });

  // Validation middleware is applied per route

  // Version-specific routes
  const v2Router = createVersionedRouter(
    BadgeVersion.V2,
    issuerController,
    badgeClassController,
    assertionController
  );
  const v3Router = createVersionedRouter(
    BadgeVersion.V3,
    issuerController,
    badgeClassController,
    assertionController
  );

  // Mount version-specific routers
  router.route('/v2', v2Router);
  router.route('/v3', v3Router);
  // Default route (use v3)
  router.route('/', v3Router);

  // Compose versioned, user, backpack, auth routers
  if (backpackController) {
    // Get the platform repository from the repository factory
    const platformRepository =
      await RepositoryFactory.createPlatformRepository();
    router.route(
      '/api/v1',
      createBackpackRouter(backpackController, platformRepository)
    );
  }
  if (userController) {
    router.route('/users', createUserRouter(userController));
  }
  if (authController) {
    router.route('/auth', createAuthRouter(authController));
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
): Hono {
  const router = new Hono();

  // Issuer routes
  // Robust Issuer CRUD routes with error handling and logging
  router.post('/issuers', validateIssuerMiddleware(), async (c) => {
    let body: CreateIssuerDto | undefined;
    try {
      body = await c.req.json<CreateIssuerDto>();
      const result = await issuerController.createIssuer(body, version);
      return c.json(result, 201);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error('POST /issuers failed', { error: errorMessage, body });
      if (error instanceof Error && error.message.includes('permission')) {
        return c.json({ error: 'Forbidden', message: errorMessage }, 403);
      }
      logger.error('Unhandled issuer creation error', { error: errorMessage });
      return c.json(
        { error: 'Internal Server Error', message: 'Unexpected server error' },
        500
      );
    }
  });

  router.get('/issuers', async (c) => {
    try {
      const result = await issuerController.getAllIssuers(version);
      return c.json(result);
    } catch (error) {
      logger.error('GET /issuers failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return c.json({ error: 'Internal Server Error' }, 500);
    }
  });

  router.get('/issuers/:id', async (c) => {
    try {
      const id = c.req.param('id');
      const result = await issuerController.getIssuerById(id, version);
      if (!result) {
        return c.json({ error: 'Not Found', message: 'Issuer not found' }, 404);
      }
      return c.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('Invalid IRI')) {
        logger.error('GET /issuers/:id invalid IRI', {
          error: message,
          id: c.req.param('id'),
        });
        return c.json(
          { error: 'Bad Request', message: 'Invalid issuer ID' },
          400
        );
      }
      logger.error('GET /issuers/:id failed', {
        error: message,
        id: c.req.param('id'),
      });
      return c.json({ error: 'Internal Server Error' }, 500);
    }
  });

  router.put('/issuers/:id', validateIssuerMiddleware(), async (c) => {
    const id = c.req.param('id');
    let body: UpdateIssuerDto | undefined;
    try {
      // Read the body once at the beginning
      body = await c.req.json<UpdateIssuerDto>();
      const result = await issuerController.updateIssuer(id, body, version);
      if (!result) {
        return c.json({ error: 'Not Found', message: 'Issuer not found' }, 404);
      }
      return c.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Use the already parsed body for logging
      if (message.includes('Invalid IRI')) {
        logger.error('PUT /issuers/:id invalid IRI', {
          error: message,
          id,
          body,
        });
        return c.json(
          { error: 'Bad Request', message: 'Invalid issuer ID' },
          400
        );
      }
      if (message.includes('permission')) {
        logger.error('PUT /issuers/:id forbidden', {
          error: message,
          id,
          body,
        });
        return c.json({ error: 'Forbidden', message }, 403);
      }
      logger.error('PUT /issuers/:id failed', { error: message, id, body });
      return c.json({ error: 'Internal Server Error' }, 500);
    }
  });

  router.delete('/issuers/:id', async (c) => {
    try {
      const id = c.req.param('id');
      const deleted = await issuerController.deleteIssuer(id);
      if (!deleted) {
        return c.json({ error: 'Not Found', message: 'Issuer not found' }, 404);
      }
      return c.body(null, 204);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('Invalid IRI')) {
        logger.error('DELETE /issuers/:id invalid IRI', {
          error: message,
          id: c.req.param('id'),
        });
        return c.json(
          { error: 'Bad Request', message: 'Invalid issuer ID' },
          400
        );
      }
      if (message.includes('permission')) {
        logger.error('DELETE /issuers/:id forbidden', {
          error: message,
          id: c.req.param('id'),
        });
        return c.json({ error: 'Forbidden', message }, 403);
      }
      logger.error('DELETE /issuers/:id failed', {
        error: message,
        id: c.req.param('id'),
      });
      return c.json({ error: 'Internal Server Error' }, 500);
    }
  });

  // Badge class routes
  router.post('/badge-classes', validateBadgeClassMiddleware(), async (c) => {
    try {
      const body = await c.req.json();
      const result = await badgeClassController.createBadgeClass(
        body as CreateBadgeClassDto,
        version
      );
      return c.json(result, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('POST /badge-classes failed', { error: message });
      return c.json({ error: 'Bad Request', message }, 400);
    }
  });

  router.get('/badge-classes', async (c) => {
    const result = await badgeClassController.getAllBadgeClasses(version);
    return c.json(result);
  });

  router.get('/badge-classes/:id', async (c) => {
    try {
      const id = c.req.param('id');
      const result = await badgeClassController.getBadgeClassById(id, version);
      if (!result) {
        return c.json(
          { error: 'Not Found', message: 'Badge class not found' },
          404
        );
      }
      return c.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('Invalid IRI')) {
        logger.error('GET /badge-classes/:id invalid IRI', {
          error: message,
          id: c.req.param('id'),
        });
        return c.json(
          { error: 'Bad Request', message: 'Invalid badge class ID' },
          400
        );
      }
      logger.error('GET /badge-classes/:id failed', {
        error: message,
        id: c.req.param('id'),
      });
      return c.json({ error: 'Internal Server Error' }, 500);
    }
  });

  router.get('/issuers/:id/badge-classes', async (c) => {
    const id = c.req.param('id');
    const result = await badgeClassController.getBadgeClassesByIssuer(
      id,
      version
    );
    return c.json(result);
  });

  router.put(
    '/badge-classes/:id',
    validateBadgeClassMiddleware(),
    async (c) => {
      const id = c.req.param('id');
      try {
        const body = await c.req.json();
        const result = await badgeClassController.updateBadgeClass(
          id,
          body as UpdateBadgeClassDto,
          version
        );
        if (!result) {
          return c.json(
            { error: 'Not Found', message: 'Badge class not found' },
            404
          );
        }
        return c.json(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('PUT /badge-classes/:id failed', { error: message, id });
        return c.json({ error: 'Bad Request', message }, 400);
      }
    }
  );

  router.delete('/badge-classes/:id', async (c) => {
    try {
      const id = c.req.param('id');
      const deleted = await badgeClassController.deleteBadgeClass(id);
      if (!deleted) {
        return c.json(
          { error: 'Not Found', message: 'Badge class not found' },
          404
        );
      }
      return c.body(null, 204);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('Invalid IRI')) {
        logger.error('DELETE /badge-classes/:id invalid IRI', {
          error: message,
          id: c.req.param('id'),
        });
        return c.json(
          { error: 'Bad Request', message: 'Invalid badge class ID' },
          400
        );
      }
      if (message.includes('permission')) {
        logger.error('DELETE /badge-classes/:id forbidden', {
          error: message,
          id: c.req.param('id'),
        });
        return c.json({ error: 'Forbidden', message }, 403);
      }
      logger.error('DELETE /badge-classes/:id failed', {
        error: message,
        id: c.req.param('id'),
      });
      return c.json({ error: 'Internal Server Error' }, 500);
    }
  });

  // Assertion routes
  router.post('/assertions', validateAssertionMiddleware(), async (c) => {
    try {
      const body = await c.req.json();
      const sign = c.req.query('sign') !== 'false'; // Default to true if not specified
      const result = await assertionController.createAssertion(
        body as CreateAssertionDto,
        version,
        sign
      );
      return c.json(result, 201);
    } catch (error) {
      logger.error('POST /assertions failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      // Handle BadRequestError specifically
      if (
        error instanceof Error &&
        (error.name === 'BadRequestError' ||
          error.message.includes('does not exist'))
      ) {
        return c.json({ error: 'Bad Request', message: error.message }, 400);
      }

      // Handle permission errors
      if (error instanceof Error && error.message.includes('permission')) {
        return c.json({ error: 'Forbidden', message: error.message }, 403);
      }

      // Default error handling
      return c.json(
        {
          error: 'Internal Server Error',
        },
        500
      );
    }
  });

  router.get('/assertions', async (c) => {
    const result = await assertionController.getAllAssertions(version);
    return c.json(result);
  });

  router.get('/assertions/:id', async (c) => {
    try {
      const id = c.req.param('id');
      const result = await assertionController.getAssertionById(id, version);
      if (!result) {
        return c.json(
          { error: 'Not Found', message: 'Assertion not found' },
          404
        );
      }
      return c.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('Invalid IRI')) {
        logger.error('GET /assertions/:id invalid IRI', {
          error: message,
          id: c.req.param('id'),
        });
        return c.json(
          { error: 'Bad Request', message: 'Invalid assertion ID' },
          400
        );
      }
      logger.error('GET /assertions/:id failed', {
        error: message,
        id: c.req.param('id'),
      });
      return c.json({ error: 'Internal Server Error' }, 500);
    }
  });

  router.get('/badge-classes/:id/assertions', async (c) => {
    const id = c.req.param('id');
    const result = await assertionController.getAssertionsByBadgeClass(
      id,
      version
    );
    return c.json(result);
  });

  router.put('/assertions/:id', validateAssertionMiddleware(), async (c) => {
    const id = c.req.param('id');
    try {
      const body = await c.req.json();
      const result = await assertionController.updateAssertion(
        id,
        body as UpdateAssertionDto,
        version
      );
      if (!result) {
        return c.json(
          { error: 'Not Found', message: 'Assertion not found' },
          404
        );
      }
      return c.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('PUT /assertions/:id failed', { error: message, id });
      if (message.includes('permission')) {
        return c.json({ error: 'Forbidden', message }, 403);
      }
      return c.json({ error: 'Bad Request', message }, 400);
    }
  });

  router.post('/assertions/:id/revoke', async (c) => {
    const id = c.req.param('id');
    try {
      const body = await c.req.json();
      const reason =
        typeof body === 'object' && body !== null && 'reason' in body
          ? String(body.reason)
          : 'No reason provided';
      const result = await assertionController.revokeAssertion(id, reason);
      return c.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('POST /assertions/:id/revoke failed', {
        error: message,
        id,
      });
      if (message.includes('permission')) {
        return c.json({ error: 'Forbidden', message }, 403);
      }
      return c.json({ error: 'Bad Request', message }, 400);
    }
  });

  // Verification routes
  router.get('/assertions/:id/verify', async (c) => {
    const id = c.req.param('id');
    const result = await assertionController.verifyAssertion(id);
    // If assertion not found, return 404
    if (
      result.isValid === false &&
      result.hasValidSignature === false &&
      typeof result.details === 'string' &&
      result.details.toLowerCase().includes('not found')
    ) {
      return c.json(
        { error: 'Assertion not found', details: result.details },
        404
      );
    }
    return c.json(result);
  });

  router.post('/assertions/:id/sign', async (c) => {
    const id = c.req.param('id');
    try {
      const keyId = c.req.query('keyId') || 'default';
      const result = await assertionController.signAssertion(
        id,
        keyId as string,
        version
      );
      if (!result) {
        return c.json(
          { error: 'Not Found', message: 'Assertion not found' },
          404
        );
      }
      return c.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('POST /assertions/:id/sign failed', { error: message, id });
      if (message.includes('permission')) {
        return c.json({ error: 'Forbidden', message }, 403);
      }
      return c.json({ error: 'Bad Request', message }, 400);
    }
  });

  // Public key routes
  router.get('/public-keys', async (c) => {
    const result = await assertionController.getPublicKeys();
    return c.json(result);
  });

  router.get('/public-keys/:id', async (c) => {
    const id = c.req.param('id');
    const result = await assertionController.getPublicKey(id);
    return c.json(result);
  });

  return router;
}
