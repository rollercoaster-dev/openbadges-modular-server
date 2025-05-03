/**
 * Platform JWT service
 */
import * as jose from 'jose';

import { PlatformJwtPayload } from '../../domains/backpack/auth.types';

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
      return payload as unknown as PlatformJwtPayload;
    } catch (error) {
      throw new Error('Invalid token', error as Error);
    }
  }
}
