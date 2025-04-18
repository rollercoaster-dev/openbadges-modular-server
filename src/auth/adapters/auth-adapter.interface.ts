/**
 * Authentication Adapter Interface
 * 
 * This interface defines the contract for authentication adapters that connect
 * to external identity providers. It allows the badge server to work with various
 * authentication systems while maintaining a consistent internal authentication flow.
 */

export interface AuthenticationResult {
  /**
   * Whether authentication was successful
   */
  isAuthenticated: boolean;

  /**
   * User ID from the external system, if authentication was successful
   */
  userId?: string;

  /**
   * Additional claims/attributes about the user from the external system
   */
  claims?: Record<string, any>;

  /**
   * Error message if authentication failed
   */
  error?: string;

  /**
   * Original authentication provider name (for logging/debugging)
   */
  provider: string;
}

export interface AuthAdapterOptions {
  /**
   * Configuration options for the adapter
   */
  config: Record<string, any>;
  
  /**
   * Optional provider name override
   */
  providerName?: string;
}

export interface AuthAdapter {
  /**
   * Get the name of this authentication provider
   */
  getProviderName(): string;
  
  /**
   * Authenticate a request using provider-specific details
   * @param request The HTTP request to authenticate
   * @returns Authentication result with user information or error
   */
  authenticate(request: Request): Promise<AuthenticationResult>;
  
  /**
   * Verify if this adapter can handle the given request
   * @param request The HTTP request to check
   * @returns True if this adapter can authenticate the request
   */
  canHandle(request: Request): boolean;
}