/**
 * OAuth2 Authentication Adapter
 * 
 * This adapter provides OAuth2-based authentication for integration with
 * external identity providers like Google, Microsoft, Auth0, Okta, etc.
 * It supports Bearer token validation against the provider's endpoints.
 */

import { AuthAdapter, AuthAdapterOptions, AuthenticationResult } from './auth-adapter.interface';
import { logger } from '../../utils/logging/logger.service';
import { createRemoteJWKSet, jwtVerify, errors as joseErrors, JWTPayload } from 'jose';

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
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
  
  constructor(options: AuthAdapterOptions) {
    if (options.providerName) {
      this.providerName = options.providerName;
    }
    
    this.config = options.config as OAuth2Config;
    
    // Validate required configuration
    if (!this.config.jwksUri && !this.config.introspectionEndpoint) {
      logger.warn(`OAuth2 adapter ${this.providerName} requires either jwksUri or introspectionEndpoint`);
    }

    // Initialize JWKS client if URI is provided
    if (this.config.jwksUri) {
      try {
        this.jwks = createRemoteJWKSet(new URL(this.config.jwksUri));
        logger.info(`JWKS client initialized for ${this.providerName}`);
      } catch (error) {
        logger.error(`Failed to initialize JWKS client for ${this.providerName}`, { 
          error: (error as Error).message,
          jwksUri: this.config.jwksUri
        });
      }
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
      // Safely access the claim using type assertion to Record<string, any>
      const userIdValue = (tokenPayload as Record<string, any>)[userIdClaim];
      
      if (!userIdValue) {
        return {
          isAuthenticated: false,
          error: `Token missing required claim: ${userIdClaim}`,
          provider: this.providerName
        };
      }
      
      // Ensure userId is a string as required by AuthenticationResult interface
      const userId = String(userIdValue);
      
      // Extract relevant claims for authentication result
      // Excluding standard JWT claims to focus on application-specific claims
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { iat, exp, aud, iss, sub, ...otherClaims } = tokenPayload;
      
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
   * Verify the OAuth2 token using secure verification methods
   * @param token The Bearer token to verify
   * @returns The validated token payload or null if invalid
   */
  private async verifyToken(token: string): Promise<JWTPayload | null> {
    try {
      // Primary verification method: JWKS-based signature validation
      if (this.jwks) {
        try {
          const { payload } = await jwtVerify(token, this.jwks, {
            audience: this.config.audience,
            issuer: this.config.issuer,
          });
          logger.debug('Token verified successfully using JWKS');
          return payload;
        } catch (error) {
          if (error instanceof joseErrors.JWTExpired) {
            logger.debug('Token expired');
            return null;
          } else if (error instanceof joseErrors.JWTClaimValidationFailed) {
            logger.debug('JWT claim validation failed', { error: (error as Error).message });
            return null;
          } else {
            logger.warn('JWKS token validation failed, trying fallback methods', { 
              error: (error as Error).message
            });
            // Continue to try other methods
          }
        }
      }
      
      // Fallback verification: Token introspection
      if (this.config.introspectionEndpoint && this.config.clientId && this.config.clientSecret) {
        try {
          const response = await fetch(this.config.introspectionEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `Basic ${Buffer.from(
                `${this.config.clientId}:${this.config.clientSecret}`
              ).toString('base64')}`
            },
            body: new URLSearchParams({
              token,
              token_type_hint: 'access_token'
            })
          });
          
          if (!response.ok) {
            logger.warn('Introspection endpoint returned error', {
              status: response.status,
              statusText: response.statusText
            });
            return null;
          }
          
          const introspectionResult = await response.json() as { active?: boolean };
          if (!introspectionResult.active) {
            logger.debug('Token is not active according to introspection');
            return null;
          }
          
          logger.debug('Token verified successfully using introspection endpoint');
          return introspectionResult as JWTPayload;
        } catch (error) {
          logger.error('Token introspection failed', { error: (error as Error).message });
          return null;
        }
      }
      
      // If we reach here, we don't have any valid verification method
      logger.error('No valid token verification method available', { 
        hasJwks: !!this.jwks,
        hasIntrospection: !!(this.config.introspectionEndpoint && this.config.clientId && this.config.clientSecret)
      });
      return null;
    } catch (error) {
      logger.error('Token verification failed', { error: (error as Error).message });
      return null;
    }
  }
}