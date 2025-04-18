/**
 * OAuth2 Authentication Adapter
 * 
 * This adapter provides OAuth2-based authentication for integration with
 * external identity providers like Google, Microsoft, Auth0, Okta, etc.
 * It supports Bearer token validation against the provider's endpoints.
 */

import { AuthAdapter, AuthAdapterOptions, AuthenticationResult } from './auth-adapter.interface';
import { logger } from '../../utils/logging/logger.service';

interface OAuth2Config {
  /**
   * JWKS URI for validating tokens
   */
  jwksUri?: string;
  
  /**
   * Token introspection endpoint
   */
  introspectionEndpoint?: string;
  
  /**
   * Client ID for this application
   */
  clientId?: string;
  
  /**
   * Client secret for this application
   */
  clientSecret?: string;
  
  /**
   * User ID claim name in the JWT token
   */
  userIdClaim?: string;
  
  /**
   * Expected audience value in the token
   */
  audience?: string;
  
  /**
   * Expected issuer value in the token
   */
  issuer?: string;
}

export class OAuth2Adapter implements AuthAdapter {
  private readonly providerName: string = 'oauth2';
  private readonly config: OAuth2Config;
  
  constructor(options: AuthAdapterOptions) {
    if (options.providerName) {
      this.providerName = options.providerName;
    }
    
    this.config = options.config as OAuth2Config;
    
    // Validate required configuration
    if (!this.config.jwksUri && !this.config.introspectionEndpoint) {
      logger.warn(`OAuth2 adapter ${this.providerName} requires either jwksUri or introspectionEndpoint`);
    }
  }

  getProviderName(): string {
    return this.providerName;
  }

  canHandle(request: Request): boolean {
    const authHeader = request.headers.get('Authorization');
    return authHeader !== null && authHeader.startsWith('Bearer ');
  }

  async authenticate(request: Request): Promise<AuthenticationResult> {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        isAuthenticated: false,
        error: 'No Bearer token provided',
        provider: this.providerName
      };
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      // For demonstration purposes, we'll implement a simple check
      // In a real implementation, you would:
      // 1. Verify the JWT signature using the JWKS endpoint
      // 2. OR use the introspection endpoint to validate the token
      // 3. Extract user information from the validated token
      
      // For now, this is a placeholder for the actual implementation
      const tokenPayload = await this.verifyToken(token);
      
      if (!tokenPayload) {
        return {
          isAuthenticated: false,
          error: 'Invalid or expired token',
          provider: this.providerName
        };
      }
      
      // Extract the user ID using the configured claim
      const userIdClaim = this.config.userIdClaim || 'sub';
      const userId = tokenPayload[userIdClaim];
      
      if (!userId) {
        return {
          isAuthenticated: false,
          error: `Token missing required claim: ${userIdClaim}`,
          provider: this.providerName
        };
      }
      
      // Extract other relevant claims
      const {_iat, _exp, _aud, _iss, ...otherClaims} = tokenPayload;
      
      return {
        isAuthenticated: true,
        userId,
        claims: otherClaims,
        provider: this.providerName
      };
    } catch (error) {
      logger.logError(`OAuth2 token validation failed: ${this.providerName}`, error as Error);
      return {
        isAuthenticated: false,
        error: 'Token validation failed',
        provider: this.providerName
      };
    }
  }
  
  /**
   * Verify the OAuth2 token
   * This is a placeholder for actual JWT verification logic
   * In production, use jose or jsonwebtoken libraries to properly validate
   * @param token The Bearer token to verify
   */
  private async verifyToken(token: string): Promise<Record<string, any> | null> {
    try {
      // In a real implementation:
      // 1. Fetch the JWKS from the jwksUri if provided
      // 2. Extract the key ID from the token header
      // 3. Find the matching public key from the JWKS
      // 4. Verify the token signature
      // 5. Check token claims (exp, aud, iss)
      
      // For now, return a simple decoded payload (this is NOT secure and for demo only)
      // In production, use proper JWT verification with signature validation
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }
      
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString('utf-8')
      );
      
      // Perform basic validation
      const now = Math.floor(Date.now() / 1000);
      
      // Check expiration
      if (payload.exp && payload.exp < now) {
        logger.debug('Token expired');
        return null;
      }
      
      // Check audience if configured
      if (this.config.audience && 
          payload.aud && 
          payload.aud !== this.config.audience) {
        logger.debug('Token audience mismatch');
        return null;
      }
      
      // Check issuer if configured
      if (this.config.issuer && 
          payload.iss && 
          payload.iss !== this.config.issuer) {
        logger.debug('Token issuer mismatch');
        return null;
      }
      
      return payload;
    } catch (error) {
      logger.error('Token verification failed', { error: (error as Error).message });
      return null;
    }
  }
}