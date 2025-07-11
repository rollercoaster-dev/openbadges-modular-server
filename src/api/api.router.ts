/**
 * API router for Open Badges API
 *
 * This file defines the API routes for the Open Badges API.
 * It supports both Open Badges 2.0 and 3.0 specifications.
 */

import { Hono } from 'hono';
import type { Context } from 'hono';

import {
  CreateIssuerDto,
  UpdateIssuerDto,
  CreateBadgeClassDto,
  UpdateBadgeClassDto,
  CreateAssertionDto,
  UpdateAssertionDto,
  BatchCreateCredentialsDto,
  BatchRetrieveCredentialsDto,
  BatchUpdateCredentialStatusDto,
  CreateStatusListDto,
  UpdateCredentialStatusDto,
  StatusListQueryDto,
} from './dtos';
import {
  RelatedAchievementDto,
  EndorsementCredentialDto,
} from './validation/badgeClass.schemas';
import {
  Related,
  EndorsementCredential,
} from '../domains/badgeClass/badgeClass.entity';
import { toIRI } from '../utils/types/iri-utils';
import { OB3, Shared } from 'openbadges-types';
import { IssuerController } from './controllers/issuer.controller';
import { BadgeClassController } from './controllers/badgeClass.controller';
import { AssertionController } from './controllers/assertion.controller';
import { StatusListController } from './controllers/status-list.controller';
import { VersionController } from './controllers/version.controller';
import { JwksController } from './controllers/jwks.controller';
import { BadgeVersion } from '../utils/version/badge-version';
import { openApiConfig } from './openapi';
import { HealthCheckService } from '../utils/monitoring/health-check.service';
import {
  validateIssuerMiddleware,
  validateBadgeClassMiddleware,
  validateAssertionMiddleware,
  validateBatchCreateCredentialsMiddleware,
  validateBatchRetrieveCredentialsMiddleware,
  validateUpdateCredentialStatusMiddleware,
  validateBatchUpdateCredentialStatusMiddleware,
  validateRelatedAchievementMiddleware,
  validateEndorsementCredentialMiddleware,
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
import { requireAuth } from '../auth/middleware/rbac.middleware';
import {
  sendApiError,
  sendNotFoundError,
} from '../utils/errors/api-error-handler';

/**
 * Type-safe helper to get validated body from Hono context
 */
function getValidatedBody<T = unknown>(c: {
  get: (key: 'validatedBody') => T;
}): T {
  return c.get('validatedBody');
}

/**
 * Convert RelatedAchievementDto to Related domain type
 */
function convertToRelated(dto: RelatedAchievementDto): Related {
  return {
    id: toIRI(dto.id),
    type: ['Related'] as ['Related'],
    inLanguage: dto.inLanguage,
    version: dto.version,
  };
}

/**
 * Convert EndorsementCredentialDto to EndorsementCredential domain type
 */
function convertToEndorsementCredential(
  dto: EndorsementCredentialDto
): EndorsementCredential {
  // Convert issuer to proper format
  let issuer: EndorsementCredential['issuer'];
  if (typeof dto.issuer === 'string') {
    issuer = toIRI(dto.issuer);
  } else if (dto.issuer && typeof dto.issuer === 'object') {
    // For issuer objects, we need to handle the case where we don't have a valid URL
    // Since OB3.Issuer requires a url property, we need to provide one
    let issuerUrl: Shared.IRI;

    if (dto.issuer.id && toIRI(dto.issuer.id)) {
      try {
        // Check if the id is a valid URL (not just a UUID)
        new URL(dto.issuer.id);
        issuerUrl = toIRI(dto.issuer.id)!;
      } catch {
        // If id is not a valid URL (e.g., it's a UUID), use a placeholder URL
        // This ensures we have a valid OB3.Issuer object
        issuerUrl = toIRI(`https://example.org/issuers/${dto.issuer.id}`)!;
      }
    } else {
      // If no id is provided, use a generic placeholder
      issuerUrl = toIRI('https://example.org/issuers/unknown')!;
    }

    // Convert the issuer object to OB3.Issuer format
    const issuerObj: OB3.Issuer = {
      ...dto.issuer, // Preserve additional fields via spread operator
      id: dto.issuer.id ? toIRI(dto.issuer.id) : undefined,
      name: dto.issuer.name,
      type: dto.issuer.type,
      url: issuerUrl,
    };

    issuer = issuerObj;
  } else {
    throw new Error('Invalid issuer format in endorsement credential');
  }

  return {
    '@context': dto['@context'],
    id: toIRI(dto.id),
    type: dto.type as ['VerifiableCredential', 'EndorsementCredential'],
    issuer,
    validFrom: dto.validFrom,
    credentialSubject: {
      id: toIRI(dto.credentialSubject.id),
      type: dto.credentialSubject.type,
      endorsementComment: dto.credentialSubject.endorsementComment,
    },
    // Pass through any additional fields
    ...Object.fromEntries(
      Object.entries(dto).filter(
        ([key]) =>
          ![
            '@context',
            'id',
            'type',
            'issuer',
            'validFrom',
            'credentialSubject',
          ].includes(key)
      )
    ),
  };
}

/**
 * Middleware to add deprecation warnings to legacy endpoints
 */
function addDeprecationWarning(newEndpoint: string) {
  return async (c: Context, next: () => Promise<void>) => {
    // Add deprecation header
    c.header('Deprecation', 'true');
    c.header(
      'Sunset',
      new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString()
    ); // 1 year from now
    c.header('Link', `<${newEndpoint}>; rel="successor-version"`);

    await next();

    // Add deprecation warning to response body if it's JSON
    const response = c.res;
    if (response.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = await response.json();
        if (typeof body === 'object' && body !== null) {
          // Type assertion to allow adding _deprecation property
          (body as Record<string, unknown>)._deprecation = {
            warning:
              'This endpoint is deprecated and will be removed in a future version.',
            successor: newEndpoint,
            sunset: new Date(
              Date.now() + 365 * 24 * 60 * 60 * 1000
            ).toISOString(),
          };

          // Preserve status & headers
          const res = new Response(JSON.stringify(body), {
            status: response.status,
            headers: response.headers,
          });
          // Ensure content-type header persists
          res.headers.set('Content-Type', 'application/json');
          c.res = res;
          return;
        }
      } catch (_error) {
        // If we can't parse the response, just continue
      }
    }
  };
}

/**
 * Creates a versioned router
 * @param version The badge version
 * @param issuerController The issuer controller
 * @param badgeClassController The badge class controller
 * @param assertionController The assertion controller
 * @param statusListController The status list controller
 * @returns The versioned router
 */
export function createVersionedRouter(
  version: BadgeVersion,
  issuerController: IssuerController,
  badgeClassController: BadgeClassController,
  assertionController: AssertionController,
  statusListController: StatusListController
): Hono {
  const router = new Hono();

  // Issuer routes
  // Robust Issuer CRUD routes with error handling and logging
  router.post(
    '/issuers',
    requireAuth(),
    validateIssuerMiddleware(),
    async (c) => {
      try {
        const body = getValidatedBody<CreateIssuerDto>(c);
        const result = await issuerController.createIssuer(body, version);
        return c.json(result, 201);
      } catch (error) {
        return sendApiError(c, error, {
          endpoint: 'POST /issuers',
          body: getValidatedBody(c),
        });
      }
    }
  );

  router.get('/issuers', requireAuth(), async (c) => {
    try {
      const result = await issuerController.getAllIssuers(version);
      return c.json(result);
    } catch (error) {
      return sendApiError(c, error, { endpoint: 'GET /issuers' });
    }
  });

  router.get('/issuers/:id', requireAuth(), async (c) => {
    try {
      const id = c.req.param('id');
      const result = await issuerController.getIssuerById(id, version);
      if (!result) {
        return sendNotFoundError(c, 'Issuer', {
          endpoint: 'GET /issuers/:id',
          id,
        });
      }
      return c.json(result);
    } catch (error) {
      return sendApiError(c, error, {
        endpoint: 'GET /issuers/:id',
        id: c.req.param('id'),
      });
    }
  });

  router.put(
    '/issuers/:id',
    requireAuth(),
    validateIssuerMiddleware(),
    async (c) => {
      const id = c.req.param('id');
      try {
        const body = getValidatedBody<UpdateIssuerDto>(c);
        const result = await issuerController.updateIssuer(id, body, version);
        if (!result) {
          return sendNotFoundError(c, 'Issuer', {
            endpoint: 'PUT /issuers/:id',
            id,
          });
        }
        return c.json(result);
      } catch (error) {
        return sendApiError(c, error, {
          endpoint: 'PUT /issuers/:id',
          id,
          body: getValidatedBody(c),
        });
      }
    }
  );

  router.delete('/issuers/:id', requireAuth(), async (c) => {
    try {
      const id = c.req.param('id');
      const deleted = await issuerController.deleteIssuer(id, version);
      if (!deleted) {
        return sendNotFoundError(c, 'Issuer', {
          endpoint: 'DELETE /issuers/:id',
          id,
        });
      }
      return c.body(null, 204);
    } catch (error) {
      return sendApiError(c, error, {
        endpoint: 'DELETE /issuers/:id',
        id: c.req.param('id'),
      });
    }
  });

  // Achievement routes (v3.0 compliant naming)
  router.post(
    '/achievements',
    requireAuth(),
    validateBadgeClassMiddleware(),
    async (c) => {
      try {
        const body = getValidatedBody<CreateBadgeClassDto>(c);
        const result = await badgeClassController.createBadgeClass(
          body,
          version
        );
        return c.json(result, 201);
      } catch (error) {
        return sendApiError(c, error, {
          endpoint: 'POST /achievements',
          body: getValidatedBody(c),
        });
      }
    }
  );

  // Badge class routes (legacy - for backward compatibility)
  router.post(
    '/badge-classes',
    addDeprecationWarning('/achievements'),
    requireAuth(),
    validateBadgeClassMiddleware(),
    async (c) => {
      try {
        const body = getValidatedBody<CreateBadgeClassDto>(c);
        const result = await badgeClassController.createBadgeClass(
          body,
          version
        );
        return c.json(result, 201);
      } catch (error) {
        return sendApiError(c, error, {
          endpoint: 'POST /badge-classes',
          body: getValidatedBody(c),
        });
      }
    }
  );

  router.get('/achievements', requireAuth(), async (c) => {
    try {
      const result = await badgeClassController.getAllBadgeClasses(version);
      return c.json(result);
    } catch (error) {
      return sendApiError(c, error, { endpoint: 'GET /achievements' });
    }
  });

  router.get(
    '/badge-classes',
    addDeprecationWarning('/achievements'),
    requireAuth(),
    async (c) => {
      try {
        const result = await badgeClassController.getAllBadgeClasses(version);
        return c.json(result);
      } catch (error) {
        return sendApiError(c, error, { endpoint: 'GET /badge-classes' });
      }
    }
  );

  router.get('/achievements/:id', requireAuth(), async (c) => {
    try {
      const id = c.req.param('id');
      const result = await badgeClassController.getBadgeClassById(id, version);
      if (!result) {
        return sendNotFoundError(c, 'Achievement', {
          endpoint: 'GET /achievements/:id',
          id,
        });
      }
      return c.json(result);
    } catch (error) {
      return sendApiError(c, error, {
        endpoint: 'GET /achievements/:id',
        id: c.req.param('id'),
      });
    }
  });

  router.get(
    '/badge-classes/:id',
    addDeprecationWarning('/achievements/:id'),
    requireAuth(),
    async (c) => {
      try {
        const id = c.req.param('id');
        const result = await badgeClassController.getBadgeClassById(
          id,
          version
        );
        if (!result) {
          return sendNotFoundError(c, 'Badge class', {
            endpoint: 'GET /badge-classes/:id',
            id,
          });
        }
        return c.json(result);
      } catch (error) {
        return sendApiError(c, error, {
          endpoint: 'GET /badge-classes/:id',
          id: c.req.param('id'),
        });
      }
    }
  );

  router.get('/issuers/:id/achievements', requireAuth(), async (c) => {
    try {
      const id = c.req.param('id');
      const result = await badgeClassController.getBadgeClassesByIssuer(
        id,
        version
      );
      return c.json(result);
    } catch (error) {
      return sendApiError(c, error, {
        endpoint: 'GET /issuers/:id/achievements',
        id: c.req.param('id'),
      });
    }
  });

  router.get(
    '/issuers/:id/badge-classes',
    addDeprecationWarning('/issuers/:id/achievements'),
    requireAuth(),
    async (c) => {
      try {
        const id = c.req.param('id');
        const result = await badgeClassController.getBadgeClassesByIssuer(
          id,
          version
        );
        return c.json(result);
      } catch (error) {
        return sendApiError(c, error, {
          endpoint: 'GET /issuers/:id/badge-classes',
          id: c.req.param('id'),
        });
      }
    }
  );

  router.put(
    '/achievements/:id',
    requireAuth(),
    validateBadgeClassMiddleware(),
    async (c) => {
      const id = c.req.param('id');
      let body: UpdateBadgeClassDto | undefined;
      try {
        // Get the validated body from context (set by validation middleware)
        body = getValidatedBody<UpdateBadgeClassDto>(c);
        const result = await badgeClassController.updateBadgeClass(
          id,
          body,
          version
        );
        if (!result) {
          return sendNotFoundError(c, 'Achievement', {
            endpoint: 'PUT /achievements/:id',
            id,
          });
        }
        return c.json(result);
      } catch (error) {
        return sendApiError(c, error, {
          endpoint: 'PUT /achievements/:id',
          id,
          body,
        });
      }
    }
  );

  router.put(
    '/badge-classes/:id',
    addDeprecationWarning('/achievements/:id'),
    requireAuth(),
    validateBadgeClassMiddleware(),
    async (c) => {
      const id = c.req.param('id');
      let body: UpdateBadgeClassDto | undefined;
      try {
        // Get the validated body from context (set by validation middleware)
        body = getValidatedBody<UpdateBadgeClassDto>(c);
        const result = await badgeClassController.updateBadgeClass(
          id,
          body,
          version
        );
        if (!result) {
          return sendNotFoundError(c, 'Badge class', {
            endpoint: 'PUT /badge-classes/:id',
            id,
          });
        }
        return c.json(result);
      } catch (error) {
        return sendApiError(c, error, {
          endpoint: 'PUT /badge-classes/:id',
          id,
          body,
        });
      }
    }
  );

  router.delete('/achievements/:id', requireAuth(), async (c) => {
    try {
      const id = c.req.param('id');
      const deleted = await badgeClassController.deleteBadgeClass(id, version);
      if (!deleted) {
        return sendNotFoundError(c, 'Achievement', {
          endpoint: 'DELETE /achievements/:id',
          id,
        });
      }
      return c.body(null, 204);
    } catch (error) {
      return sendApiError(c, error, {
        endpoint: 'DELETE /achievements/:id',
        id: c.req.param('id'),
      });
    }
  });

  router.delete(
    '/badge-classes/:id',
    addDeprecationWarning('/achievements/:id'),
    requireAuth(),
    async (c) => {
      try {
        const id = c.req.param('id');
        const deleted = await badgeClassController.deleteBadgeClass(
          id,
          version
        );
        if (!deleted) {
          return sendNotFoundError(c, 'Badge class', {
            endpoint: 'DELETE /badge-classes/:id',
            id,
          });
        }
        return c.body(null, 204);
      } catch (error) {
        return sendApiError(c, error, {
          endpoint: 'DELETE /badge-classes/:id',
          id: c.req.param('id'),
        });
      }
    }
  );

  // Credential routes (v3.0 compliant naming)
  router.post(
    '/credentials',
    requireAuth(),
    validateAssertionMiddleware(),
    async (c) => {
      try {
        const body = getValidatedBody<CreateAssertionDto>(c);
        const sign = c.req.query('sign') !== 'false'; // Default to true if not specified
        const result = await assertionController.createAssertion(
          body,
          version,
          sign
        );
        return c.json(result, 201);
      } catch (error) {
        return sendApiError(c, error, {
          endpoint: 'POST /credentials',
          body: getValidatedBody(c),
        });
      }
    }
  );

  // Assertion routes (legacy - for backward compatibility)
  router.post(
    '/assertions',
    addDeprecationWarning('/credentials'),
    requireAuth(),
    validateAssertionMiddleware(),
    async (c) => {
      try {
        const body = getValidatedBody<CreateAssertionDto>(c);
        const sign = c.req.query('sign') !== 'false'; // Default to true if not specified
        const result = await assertionController.createAssertion(
          body,
          version,
          sign
        );
        return c.json(result, 201);
      } catch (error) {
        return sendApiError(c, error, {
          endpoint: 'POST /assertions',
          body: getValidatedBody(c),
        });
      }
    }
  );

  router.get('/credentials', requireAuth(), async (c) => {
    try {
      const result = await assertionController.getAllAssertions(version);
      return c.json(result);
    } catch (error) {
      return sendApiError(c, error, { endpoint: 'GET /credentials' });
    }
  });

  router.get(
    '/assertions',
    addDeprecationWarning('/credentials'),
    requireAuth(),
    async (c) => {
      try {
        const result = await assertionController.getAllAssertions(version);
        return c.json(result);
      } catch (error) {
        return sendApiError(c, error, { endpoint: 'GET /assertions' });
      }
    }
  );

  router.get('/credentials/:id', requireAuth(), async (c) => {
    try {
      const id = c.req.param('id');
      const result = await assertionController.getAssertionById(id, version);
      if (!result) {
        // Check if the credential exists but is revoked
        const revocationStatus =
          await assertionController.checkAssertionRevocationStatus(id);
        if (revocationStatus.exists && revocationStatus.revoked) {
          // Return 410 Gone for revoked credentials (Open Badges compliance)
          return c.json(
            {
              error: 'Credential has been revoked',
              code: 'CREDENTIAL_REVOKED',
              details: {
                id,
                revocationReason:
                  revocationStatus.revocationReason || 'No reason provided',
              },
            },
            410
          );
        }
        return sendNotFoundError(c, 'Credential', {
          endpoint: 'GET /credentials/:id',
          id,
        });
      }
      return c.json(result);
    } catch (error) {
      return sendApiError(c, error, {
        endpoint: 'GET /credentials/:id',
        id: c.req.param('id'),
      });
    }
  });

  router.get(
    '/assertions/:id',
    addDeprecationWarning('/credentials/:id'),
    requireAuth(),
    async (c) => {
      try {
        const id = c.req.param('id');
        const result = await assertionController.getAssertionById(id, version);
        if (!result) {
          // Check if the assertion exists but is revoked
          const revocationStatus =
            await assertionController.checkAssertionRevocationStatus(id);
          if (revocationStatus.exists && revocationStatus.revoked) {
            // Return 410 Gone for revoked assertions (Open Badges compliance)
            return c.json(
              {
                error: 'Assertion has been revoked',
                code: 'ASSERTION_REVOKED',
                details: {
                  id,
                  revocationReason:
                    revocationStatus.revocationReason || 'No reason provided',
                },
              },
              410
            );
          }
          return sendNotFoundError(c, 'Assertion', {
            endpoint: 'GET /assertions/:id',
            id,
          });
        }
        return c.json(result);
      } catch (error) {
        return sendApiError(c, error, {
          endpoint: 'GET /assertions/:id',
          id: c.req.param('id'),
        });
      }
    }
  );

  router.get('/achievements/:id/credentials', requireAuth(), async (c) => {
    try {
      const id = c.req.param('id');
      const result = await assertionController.getAssertionsByBadgeClass(
        id,
        version
      );
      return c.json(result);
    } catch (error) {
      return sendApiError(c, error, {
        endpoint: 'GET /achievements/:id/credentials',
        id: c.req.param('id'),
      });
    }
  });

  // Achievement relationship endpoints (OB 3.0)
  router.get('/achievements/:id/related', requireAuth(), async (c) => {
    try {
      const id = c.req.param('id');
      const result = await badgeClassController.getRelatedAchievements(
        id,
        version
      );
      return c.json(result);
    } catch (error) {
      return sendApiError(c, error, {
        endpoint: 'GET /achievements/:id/related',
        id: c.req.param('id'),
      });
    }
  });

  router.post(
    '/achievements/:id/related',
    requireAuth(),
    validateRelatedAchievementMiddleware(),
    async (c) => {
      try {
        const id = c.req.param('id');
        const body = getValidatedBody<RelatedAchievementDto>(c);
        const user = c.get('user');
        const result = await badgeClassController.addRelatedAchievement(
          id,
          convertToRelated(body),
          version,
          user
        );
        if (!result) {
          return sendNotFoundError(c, 'Achievement', {
            endpoint: 'POST /achievements/:id/related',
            id,
          });
        }
        return c.json(result);
      } catch (error) {
        return sendApiError(c, error, {
          endpoint: 'POST /achievements/:id/related',
          id: c.req.param('id'),
          body: getValidatedBody<RelatedAchievementDto>(c),
        });
      }
    }
  );

  router.delete(
    '/achievements/:id/related/:relatedId',
    requireAuth(),
    async (c) => {
      try {
        const id = c.req.param('id');
        const relatedId = c.req.param('relatedId');
        const user = c.get('user');
        const result = await badgeClassController.removeRelatedAchievement(
          id,
          relatedId,
          version,
          user
        );
        if (!result) {
          return sendNotFoundError(c, 'Achievement', {
            endpoint: 'DELETE /achievements/:id/related/:relatedId',
            id,
            relatedId,
          });
        }
        return c.json(result);
      } catch (error) {
        return sendApiError(c, error, {
          endpoint: 'DELETE /achievements/:id/related/:relatedId',
          id: c.req.param('id'),
          relatedId: c.req.param('relatedId'),
        });
      }
    }
  );

  router.get('/achievements/:id/endorsements', requireAuth(), async (c) => {
    try {
      const id = c.req.param('id');
      const result = await badgeClassController.getEndorsements(id);
      return c.json(result);
    } catch (error) {
      return sendApiError(c, error, {
        endpoint: 'GET /achievements/:id/endorsements',
        id: c.req.param('id'),
      });
    }
  });

  router.post(
    '/achievements/:id/endorsements',
    requireAuth(),
    validateEndorsementCredentialMiddleware(),
    async (c) => {
      try {
        const id = c.req.param('id');
        const body = getValidatedBody<EndorsementCredentialDto>(c);
        const user = c.get('user');
        const result = await badgeClassController.addEndorsement(
          id,
          convertToEndorsementCredential(body),
          user
        );
        if (!result) {
          return sendNotFoundError(c, 'Achievement', {
            endpoint: 'POST /achievements/:id/endorsements',
            id,
          });
        }
        return c.json({
          message: 'Endorsement added successfully',
          achievement: result.toJsonLd(version),
        });
      } catch (error) {
        return sendApiError(c, error, {
          endpoint: 'POST /achievements/:id/endorsements',
          id: c.req.param('id'),
          body: getValidatedBody<EndorsementCredentialDto>(c),
        });
      }
    }
  );

  router.get(
    '/badge-classes/:id/assertions',
    addDeprecationWarning('/achievements/:id/credentials'),
    requireAuth(),
    async (c) => {
      try {
        const id = c.req.param('id');
        const result = await assertionController.getAssertionsByBadgeClass(
          id,
          version
        );
        return c.json(result);
      } catch (error) {
        return sendApiError(c, error, {
          endpoint: 'GET /badge-classes/:id/assertions',
          id: c.req.param('id'),
        });
      }
    }
  );

  // Badge class relationship endpoints (legacy - for backward compatibility)
  router.get(
    '/badge-classes/:id/related',
    addDeprecationWarning('/achievements/:id/related'),
    requireAuth(),
    async (c) => {
      try {
        const id = c.req.param('id');
        const result = await badgeClassController.getRelatedAchievements(
          id,
          version
        );
        return c.json(result);
      } catch (error) {
        return sendApiError(c, error, {
          endpoint: 'GET /badge-classes/:id/related',
          id: c.req.param('id'),
        });
      }
    }
  );

  router.post(
    '/badge-classes/:id/related',
    addDeprecationWarning('/achievements/:id/related'),
    requireAuth(),
    validateRelatedAchievementMiddleware(),
    async (c) => {
      try {
        const id = c.req.param('id');
        const body = getValidatedBody<RelatedAchievementDto>(c);
        const user = c.get('user');
        const result = await badgeClassController.addRelatedAchievement(
          id,
          convertToRelated(body),
          version,
          user
        );
        if (!result) {
          return sendNotFoundError(c, 'Badge class', {
            endpoint: 'POST /badge-classes/:id/related',
            id,
          });
        }
        return c.json(result);
      } catch (error) {
        return sendApiError(c, error, {
          endpoint: 'POST /badge-classes/:id/related',
          id: c.req.param('id'),
          body: getValidatedBody<RelatedAchievementDto>(c),
        });
      }
    }
  );

  router.delete(
    '/badge-classes/:id/related/:relatedId',
    addDeprecationWarning('/achievements/:id/related/:relatedId'),
    requireAuth(),
    async (c) => {
      try {
        const id = c.req.param('id');
        const relatedId = c.req.param('relatedId');
        const user = c.get('user');
        const result = await badgeClassController.removeRelatedAchievement(
          id,
          relatedId,
          version,
          user
        );
        if (!result) {
          return sendNotFoundError(c, 'Badge class', {
            endpoint: 'DELETE /badge-classes/:id/related/:relatedId',
            id,
            relatedId,
          });
        }
        return c.json(result);
      } catch (error) {
        return sendApiError(c, error, {
          endpoint: 'DELETE /badge-classes/:id/related/:relatedId',
          id: c.req.param('id'),
          relatedId: c.req.param('relatedId'),
        });
      }
    }
  );

  router.put(
    '/credentials/:id',
    requireAuth(),
    validateAssertionMiddleware(),
    async (c) => {
      const id = c.req.param('id');
      try {
        const body = getValidatedBody<UpdateAssertionDto>(c);
        const result = await assertionController.updateAssertion(
          id,
          body,
          version
        );
        if (!result) {
          return sendNotFoundError(c, 'Credential', {
            endpoint: 'PUT /credentials/:id',
            id,
          });
        }
        return c.json(result);
      } catch (error) {
        return sendApiError(c, error, {
          endpoint: 'PUT /credentials/:id',
          id,
          body: getValidatedBody(c),
        });
      }
    }
  );

  router.put(
    '/assertions/:id',
    addDeprecationWarning('/credentials/:id'),
    requireAuth(),
    validateAssertionMiddleware(),
    async (c) => {
      const id = c.req.param('id');
      try {
        const body = getValidatedBody<UpdateAssertionDto>(c);
        const result = await assertionController.updateAssertion(
          id,
          body,
          version
        );
        if (!result) {
          return sendNotFoundError(c, 'Assertion', {
            endpoint: 'PUT /assertions/:id',
            id,
          });
        }
        return c.json(result);
      } catch (error) {
        return sendApiError(c, error, {
          endpoint: 'PUT /assertions/:id',
          id,
          body: getValidatedBody(c),
        });
      }
    }
  );

  router.post('/credentials/:id/revoke', requireAuth(), async (c) => {
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
      return sendApiError(c, error, {
        endpoint: 'POST /credentials/:id/revoke',
        id,
      });
    }
  });

  router.post(
    '/assertions/:id/revoke',
    addDeprecationWarning('/credentials/:id/revoke'),
    requireAuth(),
    async (c) => {
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
        return sendApiError(c, error, {
          endpoint: 'POST /assertions/:id/revoke',
          id,
        });
      }
    }
  );

  // Verification routes
  router.get('/credentials/:id/verify', async (c) => {
    try {
      const id = c.req.param('id');
      const result = await assertionController.verifyAssertion(id);
      // If credential not found, return 404
      if (
        result.isValid === false &&
        result.hasValidSignature === false &&
        typeof result.details === 'string' &&
        result.details.toLowerCase().includes('not found')
      ) {
        return sendNotFoundError(c, 'Credential', {
          endpoint: 'GET /credentials/:id/verify',
          id,
          details: result.details,
        });
      }
      return c.json(result);
    } catch (error) {
      return sendApiError(c, error, {
        endpoint: 'GET /credentials/:id/verify',
        id: c.req.param('id'),
      });
    }
  });

  router.get(
    '/assertions/:id/verify',
    addDeprecationWarning('/credentials/:id/verify'),
    async (c) => {
      try {
        const id = c.req.param('id');
        const result = await assertionController.verifyAssertion(id);
        // If assertion not found, return 404
        if (
          result.isValid === false &&
          result.hasValidSignature === false &&
          typeof result.details === 'string' &&
          result.details.toLowerCase().includes('not found')
        ) {
          return sendNotFoundError(c, 'Assertion', {
            endpoint: 'GET /assertions/:id/verify',
            id,
            details: result.details,
          });
        }
        return c.json(result);
      } catch (error) {
        return sendApiError(c, error, {
          endpoint: 'GET /assertions/:id/verify',
          id: c.req.param('id'),
        });
      }
    }
  );

  router.post('/credentials/:id/sign', requireAuth(), async (c) => {
    const id = c.req.param('id');
    try {
      const keyId = c.req.query('keyId') || 'default';
      const result = await assertionController.signAssertion(
        id,
        keyId as string,
        version
      );
      if (!result) {
        return sendNotFoundError(c, 'Credential', {
          endpoint: 'POST /credentials/:id/sign',
          id,
        });
      }
      return c.json(result);
    } catch (error) {
      return sendApiError(c, error, {
        endpoint: 'POST /credentials/:id/sign',
        id,
      });
    }
  });

  router.post(
    '/assertions/:id/sign',
    addDeprecationWarning('/credentials/:id/sign'),
    requireAuth(),
    async (c) => {
      const id = c.req.param('id');
      try {
        const keyId = c.req.query('keyId') || 'default';
        const result = await assertionController.signAssertion(
          id,
          keyId as string,
          version
        );
        if (!result) {
          return sendNotFoundError(c, 'Assertion', {
            endpoint: 'POST /assertions/:id/sign',
            id,
          });
        }
        return c.json(result);
      } catch (error) {
        return sendApiError(c, error, {
          endpoint: 'POST /assertions/:id/sign',
          id,
        });
      }
    }
  );

  // Batch credential operations
  router.post(
    '/credentials/batch',
    requireAuth(),
    validateBatchCreateCredentialsMiddleware(),
    async (c) => {
      try {
        const body = getValidatedBody<BatchCreateCredentialsDto>(c);
        const sign = c.req.query('sign') !== 'false'; // Default to true if not specified
        const result = await assertionController.createAssertionsBatch(
          body,
          version,
          sign
        );
        return c.json(result, 201);
      } catch (error) {
        return sendApiError(c, error, {
          endpoint: 'POST /credentials/batch',
          body: getValidatedBody(c),
        });
      }
    }
  );

  router.get(
    '/credentials/batch',
    requireAuth(),
    validateBatchRetrieveCredentialsMiddleware(),
    async (c) => {
      try {
        // Get validated data from middleware (query params converted to body format)
        const body = getValidatedBody<BatchRetrieveCredentialsDto>(c);
        const result = await assertionController.getAssertionsBatch(
          body,
          version
        );
        return c.json(result);
      } catch (error) {
        return sendApiError(c, error, {
          endpoint: 'GET /credentials/batch',
          query: c.req.query(),
        });
      }
    }
  );

  router.put(
    '/credentials/batch/status',
    requireAuth(),
    validateBatchUpdateCredentialStatusMiddleware(),
    async (c) => {
      try {
        const body = getValidatedBody<BatchUpdateCredentialStatusDto>(c);
        const result = await assertionController.updateAssertionStatusBatch(
          body,
          version
        );
        return c.json(result);
      } catch (error) {
        return sendApiError(c, error, {
          endpoint: 'PUT /credentials/batch/status',
          body: getValidatedBody(c),
        });
      }
    }
  );

  // Public key routes - handled by assertion controller
  router.get('/public-keys', async (c) => {
    try {
      const result = await assertionController.getPublicKeys();
      return c.json(result);
    } catch (error) {
      return sendApiError(c, error, { endpoint: 'GET /public-keys' });
    }
  });

  router.get('/public-keys/:id', async (c) => {
    const id = c.req.param('id');
    try {
      const result = await assertionController.getPublicKey(id);
      return c.json(result);
    } catch (error) {
      return sendApiError(c, error, {
        endpoint: 'GET /public-keys/:id',
        id,
      });
    }
  });

  // Status List routes (Bitstring Status List v1.0 / StatusList2021)
  // Only available in v3.0 and later
  if (version === BadgeVersion.V3) {
    // GET /v3/status-lists/:id - Retrieve a specific status list credential
    router.get('/status-lists/:id', async (c) => {
      const id = c.req.param('id');
      try {
        const statusList = await statusListController.getStatusListById(id);
        if (!statusList) {
          return sendNotFoundError(c, 'Status list', {
            endpoint: 'GET /status-lists/:id',
            id,
          });
        }

        // Fetch the actual issuer data from the database
        const issuer = await issuerController.getIssuerById(
          statusList.issuerId,
          BadgeVersion.V3
        );
        if (!issuer) {
          throw new Error('Issuer not found for status list');
        }

        const issuerData = {
          id: issuer.id,
          name:
            typeof issuer.name === 'string'
              ? issuer.name
              : issuer.name?.en ||
                (issuer.name ? Object.values(issuer.name)[0] : '') ||
                '',
          url: issuer.url,
        };

        const credential = await statusListController.getStatusListCredential(
          id,
          issuerData
        );
        if (!credential) {
          return sendNotFoundError(c, 'Status list credential', {
            endpoint: 'GET /status-lists/:id',
            id,
          });
        }

        // Set appropriate headers for status list credentials
        c.header('Content-Type', 'application/vc+ld+json');
        if (statusList.ttl) {
          const maxAge = Math.floor(statusList.ttl / 1000);
          c.header('Cache-Control', `public, max-age=${maxAge}`);
        }

        return c.json(credential);
      } catch (error) {
        return sendApiError(c, error, {
          endpoint: 'GET /status-lists/:id',
          id,
        });
      }
    });

    // POST /v3/status-lists - Create a new status list
    router.post('/status-lists', requireAuth(), async (c) => {
      try {
        const body = (await c.req.json()) as CreateStatusListDto;

        // Get issuer ID from authentication context
        const user = c.get('user');
        const issuerId = (user?.claims?.sub as string) || user?.id;

        if (!issuerId) {
          return c.json(
            {
              success: false,
              error: 'Authentication required - unable to determine issuer ID',
            },
            401
          );
        }

        const result = await statusListController.createStatusList(
          body,
          issuerId
        );
        return c.json(result, 201);
      } catch (error) {
        return sendApiError(c, error, {
          endpoint: 'POST /status-lists',
          body: await c.req
            .json()
            .catch((e) => ({ error: 'Invalid JSON', details: e.message })),
        });
      }
    });

    // GET /v3/status-lists - Query status lists
    router.get('/status-lists', requireAuth(), async (c) => {
      try {
        const query = c.req.query() as StatusListQueryDto;
        const result = await statusListController.findStatusLists(query);
        return c.json(result);
      } catch (error) {
        return sendApiError(c, error, {
          endpoint: 'GET /status-lists',
          query: c.req.query(),
        });
      }
    });

    // GET /v3/status-lists/:id/stats - Get status list statistics
    router.get('/status-lists/:id/stats', requireAuth(), async (c) => {
      const id = c.req.param('id');
      try {
        const result = await statusListController.getStatusListStats(id);
        return c.json(result);
      } catch (error) {
        return sendApiError(c, error, {
          endpoint: 'GET /status-lists/:id/stats',
          id,
        });
      }
    });

    // POST /v3/credentials/:id/status - Update credential status (for Task 1.2.8)
    router.post(
      '/credentials/:id/status',
      requireAuth(),
      validateUpdateCredentialStatusMiddleware(),
      async (c) => {
        const credentialId = c.req.param('id');
        try {
          const body = getValidatedBody<UpdateCredentialStatusDto>(c);
          const result = await statusListController.updateCredentialStatus(
            credentialId,
            body
          );
          return c.json(result);
        } catch (error) {
          return sendApiError(c, error, {
            endpoint: 'POST /credentials/:id/status',
            id: credentialId,
            body: await c.req.json().catch(() => ({})),
          });
        }
      }
    );
  }

  return router;
}

/**
 * Creates the API router
 * @param issuerController The issuer controller
 * @param badgeClassController The badge class controller
 * @param assertionController The assertion controller
 * @param jwksController The JWKS controller
 * @param backpackController The backpack controller
 * @param userController The user controller
 * @param authController The auth controller
 * @returns The API router
 */
export async function createApiRouter(
  issuerController: IssuerController,
  badgeClassController: BadgeClassController,
  assertionController: AssertionController,
  jwksController: JwksController,
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

  // Add JWKS endpoint (JSON Web Key Set) - RFC 7517
  router.get('/.well-known/jwks.json', async (c) => {
    try {
      const result = await jwksController.getJwks();

      // Set appropriate headers for JWKS
      c.header('Content-Type', 'application/json');
      c.header('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

      return c.json(result.body, result.status as 200 | 500);
    } catch (error) {
      return sendApiError(c, error, { endpoint: 'GET /.well-known/jwks.json' });
    }
  });

  // Validation middleware is applied per route

  // Create status list controller for v3.0 features
  const statusListRepository =
    await RepositoryFactory.createStatusListRepository();
  const statusListController = new StatusListController(statusListRepository);

  // Version-specific routes
  const v2Router = createVersionedRouter(
    BadgeVersion.V2,
    issuerController,
    badgeClassController,
    assertionController,
    statusListController
  );
  const v3Router = createVersionedRouter(
    BadgeVersion.V3,
    issuerController,
    badgeClassController,
    assertionController,
    statusListController
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
