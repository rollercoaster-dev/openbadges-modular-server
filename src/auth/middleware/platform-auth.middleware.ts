/**
 * Platform authentication middleware
 */
import { MiddlewareHandler } from 'hono';
import { PlatformRepository } from '../../domains/backpack/platform.repository';
import { PlatformJwtService } from '../services/platform-jwt.service';
import { PlatformUser } from '../../domains/backpack/platform-user.entity';
import { Shared } from 'openbadges-types';
import { decodeJwt } from 'jose';
import { createMiddleware } from 'hono/factory';

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

/**
 * Create a middleware for platform authentication
 * @param platformRepository The platform repository
 * @returns A Hono middleware
 */
export function createPlatformAuthMiddleware(platformRepository: PlatformRepository): MiddlewareHandler {
  return createMiddleware<{
    Variables: PlatformAuthVariables;
  }>(async (c, next) => {
    // Default response

    // Get authorization header
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      c.set('isAuthenticated', false);
      c.set('platformUser', null);
      return c.json({ error: 'Authentication required' }, 401);
    }

    // Extract token
    const token = PlatformJwtService.extractTokenFromHeader(authHeader);
    if (!token) {
      c.set('isAuthenticated', false);
      c.set('platformUser', null);
      return c.json({ error: 'Authentication required' }, 401);
    }

    try {
      // Decode token to get issuer (client ID)
      const payload = decodeJwt(token);
      const clientId = payload.iss;

      // Get platform by client ID
      const platform = await platformRepository.findByClientId(clientId);
      if (!platform) {
        c.set('isAuthenticated', false);
        c.set('platformUser', null);
        return c.json({ error: 'Unknown platform' }, 401);
      }

      // Verify token
      const decodedToken = await PlatformJwtService.verifyToken(token, platform.publicKey);

      // Create platform user
      const platformUserEntity = PlatformUser.create({
        platformId: platform.id as Shared.IRI,
        externalUserId: decodedToken.sub,
        displayName: decodedToken.displayName,
        email: decodedToken.email
      });

      // Set platform user in context
      const platformUserData = {
        id: platformUserEntity.id as Shared.IRI,
        platformId: platformUserEntity.platformId,
        externalUserId: platformUserEntity.externalUserId,
        displayName: platformUserEntity.displayName,
        email: platformUserEntity.email
      };

      c.set('isAuthenticated', true);
      c.set('platformUser', platformUserData);

      // Continue to the next middleware/handler
      await next();
    } catch (_error) {
      c.set('isAuthenticated', false);
      c.set('platformUser', null);
      return c.json({ error: 'Authentication failed' }, 401);
    }
  });
}
