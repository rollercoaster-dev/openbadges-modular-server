/**
 * Platform JWT service
 */
import * as jose from 'jose';

/**
 * Platform JWT payload structure
 *
 * This interface defines the expected structure of JWT tokens
 * issued by external platforms for authentication.
 */
export interface PlatformJwtPayload {
  /**
   * Subject - typically the external user ID
   */
  sub: string;

  /**
   * Issuer - typically the platform identifier (clientId)
   */
  iss: string;

  /**
   * Platform UUID in our system (optional as it might not be known by the platform)
   */
  platformId?: string;

  /**
   * Authentication provider identifier (e.g., 'google', 'local', 'oauth')
   */
  provider?: string;

  /**
   * User display name (optional)
   */
  displayName?: string;

  /**
   * User email (optional)
   */
  email?: string;

  /**
   * Expiration time (standard JWT claim)
   */
  exp?: number;

  /**
   * Issued at time (standard JWT claim)
   */
  iat?: number;

  /**
   * JWT ID (standard JWT claim)
   */
  jti?: string;

  /**
   * User roles or permissions
   */
  roles?: string[];

  /**
   * Additional properties
   */
  [key: string]: unknown;
}

/**
 * Service for handling platform JWT tokens
 */
export class PlatformJwtService {
  /**
   * Extract token from authorization header
   * @param authHeader The authorization header
   * @returns The token or null if not found
   */
  static extractTokenFromHeader(authHeader: string): string | null {
    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : null;
  }

  /**
   * Verify a JWT token
   * @param token The token to verify
   * @param publicKey The public key to verify with
   * @returns The decoded token payload
   */
  static async verifyToken(token: string, publicKey: string): Promise<PlatformJwtPayload> {
    try {
      // Import public key
      const key = await jose.importSPKI(publicKey, 'RS256');

      // Verify token
      const { payload } = await jose.jwtVerify(token, key);

      // Return payload
      return payload as PlatformJwtPayload;
    } catch (error) {
      throw new Error('Invalid token', error as Error);
    }
  }
}
