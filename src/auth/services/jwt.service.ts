/**
 * JWT Service
 * 
 * This service handles JWT token generation, validation, and management
 * for the authentication system. It uses the jose library for standards-compliant
 * JWT operations.
 */

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { config } from '../../config/config';
import { logger } from '../../utils/logging/logger.service';

/**
 * JWT payload structure for authenticated users
 */
export interface JwtPayload {
  /**
   * Subject - typically the user ID
   */
  sub: string;
  
  /**
   * Claims about the user from the authentication provider
   */
  claims?: Record<string, any>;
  
  /**
   * Authentication provider that originally authenticated the user
   */
  provider: string;
  
  /**
   * Issuer - typically the badge server URL or identifier
   */
  iss?: string;
  
  /**
   * Expiration time (Unix timestamp)
   */
  exp?: number;
  
  /**
   * Issued at time (Unix timestamp)
   */
  iat?: number;
}

export class JwtService {
  private static readonly SECRET = new TextEncoder().encode(config.auth?.jwtSecret || 'temp_secret_replace_in_production');
  private static readonly TOKEN_EXPIRY = config.auth?.tokenExpirySeconds || 3600; // 1 hour default
  private static readonly ISSUER = config.auth?.issuer || config.openBadges.baseUrl;
  private static readonly ALGORITHM = 'HS256';

  /**
   * Generate a JWT token for an authenticated user
   * @param payload JWT payload with user information
   * @returns The signed JWT token
   */
  static async generateToken(payload: JwtPayload): Promise<string> {
    try {
      const now = Math.floor(Date.now() / 1000);
      
      // Add standard claims if not provided
      payload.iss = payload.iss || this.ISSUER;
      payload.iat = payload.iat || now;
      payload.exp = payload.exp || now + this.TOKEN_EXPIRY;
      
      // Convert our JwtPayload to a standard JWTPayload compatible object
      const jwtPayload: JWTPayload = {
        ...payload,
        // Add any other required properties for JWTPayload
      };
      
      const token = await new SignJWT(jwtPayload)
        .setProtectedHeader({ alg: this.ALGORITHM })
        .setIssuedAt()
        .setIssuer(payload.iss)
        .setExpirationTime(payload.exp)
        .sign(this.SECRET);
      
      return token;
    } catch (error) {
      logger.logError('Failed to generate JWT token', error as Error);
      throw new Error('Token generation failed');
    }
  }

  /**
   * Verify and decode a JWT token
   * @param token The JWT token to verify
   * @returns The decoded payload if valid
   */
  static async verifyToken(token: string): Promise<JwtPayload> {
    try {
      const { payload } = await jwtVerify(token, this.SECRET, {
        issuer: this.ISSUER,
      });
      
      // Ensure the payload has the required provider property
      if (!payload.provider) {
        throw new Error('Token payload missing required provider property');
      }
      
      return {
        sub: payload.sub as string,
        provider: payload.provider as string,
        claims: payload.claims as Record<string, any> | undefined,
        iss: payload.iss,
        exp: payload.exp,
        iat: payload.iat,
      };
    } catch (error) {
      logger.logError('JWT token verification failed', error as Error);
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Extract token from Authorization header
   * @param authHeader Authorization header value
   * @returns The token if found, null otherwise
   */
  static extractTokenFromHeader(authHeader: string | null): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }
}