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
import { DatabaseFactory } from '../infrastructure/database/database.factory';
import { config } from '../config/config';

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
  assertionController: AssertionController
): Elysia {
  // Create the router
  const router = new Elysia();

  // Add security middleware
  router.use(securityHeadersMiddleware);
  router.use(rateLimitMiddleware);

  // Add OpenAPI documentation
  router.get('/swagger', () => openApiConfig);

  // Add health check endpoint
  router.get('/health', async () => {
    const startTime = Date.now();
    const dbType = config.database.type;

    try {
      // Check database connection
      const db = await DatabaseFactory.createDatabase(dbType);
      const isConnected = db.isConnected();

      if (!isConnected) {
        await db.connect();
      }

      // Run a simple query to verify database is working
      const dbResponseTime = Date.now() - startTime;

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: {
          type: dbType,
          connected: db.isConnected(),
          responseTime: `${dbResponseTime}ms`
        },
        memory: {
          rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
        },
        environment: process.env.NODE_ENV || 'development'
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        database: {
          type: dbType,
          connected: false,
          error: error.message
        },
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
      };
    }
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
    ({ body }) => issuerController.createIssuer(body as Record<string, any>, version),
    { beforeHandle: [validateIssuerMiddleware] }
  );
  router.get('/issuers', () => issuerController.getAllIssuers(version));
  router.get('/issuers/:id', ({ params }) => issuerController.getIssuerById(params.id, version));
  router.put('/issuers/:id',
    ({ params, body }) => issuerController.updateIssuer(params.id, body as Record<string, any>, version),
    { beforeHandle: [validateIssuerMiddleware] }
  );
  router.delete('/issuers/:id', ({ params }) => issuerController.deleteIssuer(params.id));

  // Badge class routes
  router.post('/badge-classes',
    ({ body }) => badgeClassController.createBadgeClass(body as Record<string, any>, version),
    { beforeHandle: [validateBadgeClassMiddleware] }
  );
  router.get('/badge-classes', () => badgeClassController.getAllBadgeClasses(version));
  router.get('/badge-classes/:id', ({ params }) => badgeClassController.getBadgeClassById(params.id, version));
  router.get('/issuers/:id/badge-classes', ({ params }) => badgeClassController.getBadgeClassesByIssuer(params.id, version));
  router.put('/badge-classes/:id',
    ({ params, body }) => badgeClassController.updateBadgeClass(params.id, body as Record<string, any>, version),
    { beforeHandle: [validateBadgeClassMiddleware] }
  );
  router.delete('/badge-classes/:id', ({ params }) => badgeClassController.deleteBadgeClass(params.id));

  // Assertion routes
  router.post('/assertions',
    ({ body }) => assertionController.createAssertion(body as Record<string, any>, version),
    { beforeHandle: [validateAssertionMiddleware] }
  );
  router.get('/assertions', () => assertionController.getAllAssertions(version));
  router.get('/assertions/:id', ({ params }) => assertionController.getAssertionById(params.id, version));
  router.get('/badge-classes/:id/assertions', ({ params }) => assertionController.getAssertionsByBadgeClass(params.id, version));
  router.put('/assertions/:id',
    ({ params, body }) => assertionController.updateAssertion(params.id, body as Record<string, any>, version),
    { beforeHandle: [validateAssertionMiddleware] }
  );
  router.post('/assertions/:id/revoke', ({ params, body }) => {
    const reason = typeof body === 'object' && body !== null && 'reason' in body ? String(body.reason) : 'No reason provided';
    return assertionController.revokeAssertion(params.id, reason);
  });
  router.get('/assertions/:id/verify', ({ params }) => assertionController.verifyAssertion(params.id));

  return router;
}
