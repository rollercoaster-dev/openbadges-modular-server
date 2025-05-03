/**
 * Platform authentication middleware
 */
import { Elysia } from 'elysia';
import { PlatformRepository } from '../../domains/backpack/platform.repository';
import { PlatformJwtService } from '../services/platform-jwt.service';
import { PlatformUser } from '../../domains/backpack/platform-user.entity';
import { Shared } from 'openbadges-types';

/**
 * Create a middleware for platform authentication
 * @param platformRepository The platform repository
 * @returns An Elysia middleware
 */
export function createPlatformAuthMiddleware(platformRepository: PlatformRepository): Elysia {
  return new Elysia().derive(async ({ request, set }) => {
    // Default response
    const response = {
      isAuthenticated: false,
      platformUser: null as PlatformUser | null,
      error: ''
    };

    // Get authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      set.status = 401;
      response.error = 'Authentication required';
      return response;
    }

    // Extract token
    const token = PlatformJwtService.extractTokenFromHeader(authHeader);
    if (!token) {
      set.status = 401;
      response.error = 'Authentication required';
      return response;
    }

    try {
      // Decode token to get issuer (client ID)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const clientId = payload.iss;

      // Get platform by client ID
      const platform = await platformRepository.findByClientId(clientId);
      if (!platform) {
        set.status = 401;
        response.error = 'Unknown platform';
        return response;
      }

      // Verify token
      const decodedToken = await PlatformJwtService.verifyToken(token, platform.publicKey);

      // Create platform user
      response.platformUser = PlatformUser.create({
        platformId: platform.id as Shared.IRI,
        externalUserId: decodedToken.sub,
        displayName: decodedToken.displayName,
        email: decodedToken.email
      });

      response.isAuthenticated = true;
      return response;
    } catch (_error) {
      set.status = 401;
      response.error = 'Authentication failed';
      return response;
    }
  });
}
