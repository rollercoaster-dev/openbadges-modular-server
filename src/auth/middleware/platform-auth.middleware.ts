/**
 * Platform authentication middleware
 */
import { Elysia } from 'elysia';
import { PlatformRepository } from '../../domains/backpack/platform.repository';
import { PlatformJwtService } from '../services/platform-jwt.service';
import { PlatformUser } from '../../domains/backpack/platform-user.entity';
import { Shared } from 'openbadges-types';
import { PlatformAuthSuccess, PlatformAuthFailure } from '../../domains/backpack/auth.types';
type AuthResult = Record<string, unknown>;

/**
 * Create a middleware for platform authentication
 * @param platformRepository The platform repository
 * @returns An Elysia middleware
 */
export function createPlatformAuthMiddleware(platformRepository: PlatformRepository): Elysia {
  return new Elysia().derive(async ({ request, set }): Promise<AuthResult> => {
    // Default response
    let response: PlatformAuthFailure & AuthResult = {
      isAuthenticated: false,
      platformUser: null,
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
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf-8'));
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
      const platformUser = PlatformUser.create({
        platformId: platform.id as Shared.IRI,
        externalUserId: decodedToken.sub,
        displayName: decodedToken.displayName,
        email: decodedToken.email
      });

      // Create success response
      const successResponse: PlatformAuthSuccess & AuthResult = {
        isAuthenticated: true,
        platformUser: {
          id: platformUser.id as Shared.IRI,
          platformId: platformUser.platformId,
          externalUserId: platformUser.externalUserId,
          displayName: platformUser.displayName,
          email: platformUser.email
        },
        error: null
      };
      return successResponse;
    } catch (_error) {
      set.status = 401;
      response.error = 'Authentication failed';
      return response;
    }
  });
}
