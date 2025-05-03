/**
 * API router for Open Badges API
 *
 * This file defines the API routes for the Open Badges API.
 * It supports both Open Badges 2.0 and 3.0 specifications.
 */

import { Elysia } from 'elysia';
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
import type { PlatformRepository } from '@domains/backpack/platform.repository';
import { BackpackController } from '../domains/backpack/backpack.controller';
import { staticAssetsMiddleware } from './static-assets.middleware';

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
  platformRepository?: PlatformRepository
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
  router.post('/issuers',
    ({ body }) => issuerController.createIssuer(body as Record<string, unknown>, version),
    { beforeHandle: [validateIssuerMiddleware] }
  );
  router.get('/issuers', () => issuerController.getAllIssuers(version));
  router.get('/issuers/:id', ({ params }) => issuerController.getIssuerById(params.id, version));
  router.put('/issuers/:id',
    ({ params, body }) => issuerController.updateIssuer(params.id, body as Record<string, unknown>, version),
    { beforeHandle: [validateIssuerMiddleware] }
  );
  router.delete('/issuers/:id', ({ params }) => issuerController.deleteIssuer(params.id));

  // Badge class routes
  router.post('/badge-classes',
    ({ body }) => badgeClassController.createBadgeClass(body as Record<string, unknown>, version),
    { beforeHandle: [validateBadgeClassMiddleware] }
  );
  router.get('/badge-classes', () => badgeClassController.getAllBadgeClasses(version));
  router.get('/badge-classes/:id', ({ params }) => badgeClassController.getBadgeClassById(params.id, version));
  router.get('/issuers/:id/badge-classes', ({ params }) => badgeClassController.getBadgeClassesByIssuer(params.id, version));
  router.put('/badge-classes/:id',
    ({ params, body }) => badgeClassController.updateBadgeClass(params.id, body as Record<string, unknown>, version),
    { beforeHandle: [validateBadgeClassMiddleware] }
  );
  router.delete('/badge-classes/:id', ({ params }) => badgeClassController.deleteBadgeClass(params.id));

  // Assertion routes
  router.post('/assertions',
    ({ body, query }) => {
      const sign = query.sign !== 'false'; // Default to true if not specified
      return assertionController.createAssertion(body as Record<string, unknown>, version, sign);
    },
    { beforeHandle: [validateAssertionMiddleware] }
  );
  router.get('/assertions', () => assertionController.getAllAssertions(version));
  router.get('/assertions/:id', ({ params }) => assertionController.getAssertionById(params.id, version));
  router.get('/badge-classes/:id/assertions', ({ params }) => assertionController.getAssertionsByBadgeClass(params.id, version));
  router.put('/assertions/:id',
    ({ params, body }) => assertionController.updateAssertion(params.id, body as Record<string, unknown>, version),
    { beforeHandle: [validateAssertionMiddleware] }
  );
  router.post('/assertions/:id/revoke', ({ params, body }) => {
    const reason = typeof body === 'object' && body !== null && 'reason' in body ? String(body.reason) : 'No reason provided';
    return assertionController.revokeAssertion(params.id, reason);
  });

  // Verification routes
  router.get('/assertions/:id/verify', ({ params }) => assertionController.verifyAssertion(params.id));
  router.post('/assertions/:id/sign', ({ params, query }) => {
    const keyId = query.keyId || 'default';
    return assertionController.signAssertion(params.id, keyId as string, version);
  });

  // Public key routes
  router.get('/public-keys', () => assertionController.getPublicKeys());
  router.get('/public-keys/:id', ({ params }) => assertionController.getPublicKey(params.id));

  return router;
}
