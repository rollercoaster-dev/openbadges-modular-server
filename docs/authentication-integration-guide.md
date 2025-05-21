# Authentication Integration Guide

This guide provides comprehensive instructions for configuring and integrating the Open Badges Modular Server's authentication system with your existing infrastructure.

## Table of Contents

1. [Authentication System Architecture](#authentication-system-architecture)
2. [Authentication Methods](#authentication-methods)
3. [Configuration](#configuration)
4. [Integration Examples](#integration-examples)
5. [Custom Authentication Providers](#custom-authentication-providers)
6. [Security Best Practices](#security-best-practices)
7. [Troubleshooting](#troubleshooting)

## Authentication System Architecture

The Open Badges Modular Server implements a flexible, multi-provider authentication system with role-based access control (RBAC). The system is designed to be extensible, allowing for different authentication methods to be used based on configuration.

### Key Components

- **Auth Middleware**: Intercepts requests and handles authentication
- **Auth Adapters**: Pluggable components that implement specific authentication methods
- **JWT Service**: Manages JWT token generation and validation
- **Role-Based Access Control**: Controls access to resources based on user roles

### Authentication Flow

1. **Request Interception**: The auth middleware intercepts incoming requests
2. **Authentication Method Detection**: The middleware determines which authentication method to use
3. **Adapter Authentication**: The appropriate adapter authenticates the request
4. **JWT Token Generation**: Upon successful authentication, a JWT token is generated
5. **Context Population**: The authenticated user context is added to the request
6. **Access Control**: RBAC checks are performed to ensure the user has appropriate permissions

## Authentication Methods

The server supports the following authentication methods:

### 1. JWT-based Authentication

JSON Web Tokens (JWT) are used for stateless authentication. Once a user is authenticated through any method, a JWT token is generated and can be used for subsequent requests.

- **Token Format**: `Bearer <token>`
- **Header**: `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Expiration**: Configurable via `JWT_TOKEN_EXPIRY_SECONDS` (default: 3600 seconds / 1 hour)
- **Configuration**:
  ```
  JWT_SECRET=your-secure-jwt-secret
  JWT_TOKEN_EXPIRY_SECONDS=3600
  JWT_ISSUER=your-issuer-name
  ```

### 2. API Key Authentication

API keys can be used for service-to-service authentication or for clients that don't support interactive login.

- **Header**: `Authorization: ApiKey <key>` or `X-API-Key: <key>`
- **Configuration**:
  ```
  AUTH_API_KEY_ENABLED=true
  AUTH_API_KEY_SYSTEM=your-api-key:user-id:description
  ```
- **Format**: `<API_KEY>:<USER_ID>:<DESCRIPTION>`

### 3. Basic Authentication

Username and password authentication using HTTP Basic Auth.

- **Header**: `Authorization: Basic <base64-encoded-credentials>`
- **Format**: `base64(username:password)`
- **Configuration**:
  ```
  AUTH_BASIC_AUTH_ENABLED=true
  AUTH_BASIC_AUTH_USERNAME=password:user-id:role
  ```
- **Format**: `<PASSWORD>:<USER_ID>:<ROLE>`

### 4. OAuth2 Authentication

OAuth2 support for integration with external identity providers.

- **Supported Flows**: Authorization Code, Client Credentials
- **Configuration**:
  ```
  AUTH_OAUTH2_ENABLED=true
  AUTH_OAUTH2_JWKS_URI=https://your-identity-provider/.well-known/jwks.json
  AUTH_OAUTH2_INTROSPECTION_ENDPOINT=https://your-identity-provider/oauth2/introspect
  AUTH_OAUTH2_CLIENT_ID=your-client-id
  AUTH_OAUTH2_CLIENT_SECRET=your-client-secret
  AUTH_OAUTH2_USER_ID_CLAIM=sub
  AUTH_OAUTH2_AUDIENCE=your-audience
  AUTH_OAUTH2_ISSUER=https://your-identity-provider
  ```

## Configuration

### Environment Variables

The authentication system is configured using environment variables. Here are the key variables:

#### General Authentication Settings

| Variable | Description | Default |
|----------|-------------|---------|
| `AUTH_ENABLED` | Enable/disable authentication | `true` |
| `AUTH_DISABLE_RBAC` | Disable role-based access control | `false` |
| `AUTH_PUBLIC_PATHS` | Comma-separated list of paths that don't require authentication | `/docs,/swagger,/health,/public` |

#### JWT Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key for JWT signing | Random in dev, required in prod |
| `JWT_TOKEN_EXPIRY_SECONDS` | JWT token expiry in seconds | `3600` (1 hour) |
| `JWT_ISSUER` | JWT issuer claim | `http://localhost:3000` |

#### API Key Authentication

| Variable | Description | Default |
|----------|-------------|---------|
| `AUTH_API_KEY_ENABLED` | Enable API key authentication | `true` |
| `AUTH_API_KEY_<NAME>` | API key definition | Format: `<key>:<user-id>:<description>` |

#### Basic Authentication

| Variable | Description | Default |
|----------|-------------|---------|
| `AUTH_BASIC_AUTH_ENABLED` | Enable basic authentication | `true` |
| `AUTH_BASIC_AUTH_<USERNAME>` | Basic auth credentials | Format: `<password>:<user-id>:<role>` |

#### OAuth2 Authentication

| Variable | Description | Default |
|----------|-------------|---------|
| `AUTH_OAUTH2_ENABLED` | Enable OAuth2 authentication | `false` |
| `AUTH_OAUTH2_JWKS_URI` | URI for JWKS (for token validation) | None |
| `AUTH_OAUTH2_INTROSPECTION_ENDPOINT` | Token introspection endpoint | None |
| `AUTH_OAUTH2_CLIENT_ID` | OAuth2 client ID | None |
| `AUTH_OAUTH2_CLIENT_SECRET` | OAuth2 client secret | None |
| `AUTH_OAUTH2_USER_ID_CLAIM` | Claim to use as user ID | `sub` |
| `AUTH_OAUTH2_AUDIENCE` | Expected audience value | None |
| `AUTH_OAUTH2_ISSUER` | Expected issuer value | None |

### Docker Configuration

When using Docker, you can set these environment variables in your `docker-compose.yml` file:

```yaml
services:
  api:
    image: ghcr.io/rollercoaster-dev/openbadges-modular-server:latest
    environment:
      # Authentication configuration
      - AUTH_ENABLED=true
      - JWT_SECRET=your-secure-jwt-secret
      - JWT_TOKEN_EXPIRY_SECONDS=3600
      - AUTH_API_KEY_ENABLED=true
      - AUTH_API_KEY_SYSTEM=your-api-key:system-user:System integration
      # ... other configuration
```

## Integration Examples

### Example 1: API Key Authentication for Service Integration

This example shows how to set up API key authentication for a service-to-service integration:

1. Configure the API key in the server:
   ```
   AUTH_API_KEY_ENABLED=true
   AUTH_API_KEY_SERVICE1=api-key-123:service1-user:Service 1 Integration
   ```

2. Use the API key in client requests:
   ```bash
   curl -X GET http://localhost:3000/v2/issuers \
     -H "Authorization: ApiKey api-key-123"
   ```

### Example 2: OAuth2 Integration with Auth0

This example shows how to integrate with Auth0 as an identity provider:

1. Configure OAuth2 in the server:
   ```
   AUTH_OAUTH2_ENABLED=true
   AUTH_OAUTH2_JWKS_URI=https://your-tenant.auth0.com/.well-known/jwks.json
   AUTH_OAUTH2_AUDIENCE=https://api.yourdomain.com
   AUTH_OAUTH2_ISSUER=https://your-tenant.auth0.com/
   ```

2. Obtain a token from Auth0 in your client application

3. Use the token in requests:
   ```bash
   curl -X GET http://localhost:3000/v2/issuers \
     -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
   ```

### Example 3: Basic Authentication for Development

This example shows how to set up basic authentication for development:

1. Configure basic auth in the server:
   ```
   AUTH_BASIC_AUTH_ENABLED=true
   AUTH_BASIC_AUTH_ADMIN=admin-password:admin-user:admin
   AUTH_BASIC_AUTH_USER=user-password:regular-user:user
   ```

2. Use basic auth in requests:
   ```bash
   curl -X GET http://localhost:3000/v2/issuers \
     -H "Authorization: Basic $(echo -n 'ADMIN:admin-password' | base64)"
   ```

## Custom Authentication Providers

The authentication system is designed to be extensible, allowing you to implement custom authentication providers for your specific needs.

### Implementing a Custom Auth Adapter

To implement a custom authentication provider:

1. Create a new adapter class that implements the `AuthAdapter` interface:

```typescript
import { AuthAdapter, AuthAdapterOptions, AuthenticationResult } from './auth-adapter.interface';

interface CustomAuthConfig {
  // Your custom configuration
}

export class CustomAuthAdapter implements AuthAdapter {
  private readonly providerName: string = 'custom-auth';
  private readonly config: CustomAuthConfig;

  constructor(options: AuthAdapterOptions) {
    if (options.providerName) {
      this.providerName = options.providerName;
    }
    this.config = options.config as CustomAuthConfig;
  }

  getProviderName(): string {
    return this.providerName;
  }

  canHandle(request: Request): boolean {
    // Determine if this adapter can handle the request
    return request.headers.has('X-Custom-Auth');
  }

  async authenticate(request: Request): Promise<AuthenticationResult> {
    // Implement your custom authentication logic
    const authHeader = request.headers.get('X-Custom-Auth');

    if (!authHeader) {
      return {
        isAuthenticated: false,
        error: 'No custom auth header provided',
        provider: this.providerName
      };
    }

    // Validate the auth header and return the result
    // ...

    return {
      isAuthenticated: true,
      userId: 'user-id',
      claims: {
        role: 'user',
        // Other claims
      },
      provider: this.providerName
    };
  }
}
```

2. Register your adapter in the authentication initializer:

```typescript
// src/auth/auth.initializer.ts
import { CustomAuthAdapter } from './adapters/custom-auth.adapter';

export async function initializeAuth(): Promise<void> {
  // ... existing code

  // Initialize custom authentication if enabled
  if (config.auth.adapters.customAuth?.enabled) {
    const customAuthAdapter = new CustomAuthAdapter({
      providerName: 'custom-auth',
      config: config.auth.adapters.customAuth
    });
    registerAuthAdapter(customAuthAdapter);
    logger.info('Custom authentication enabled');
  }

  // ... existing code
}
```

3. Update the configuration to include your custom adapter:

```typescript
// src/config/config.ts
export const config = {
  // ... existing config
  auth: {
    // ... existing auth config
    adapters: {
      // ... existing adapters
      customAuth: {
        enabled: process.env['AUTH_CUSTOM_AUTH_ENABLED'] === 'true',
        // Your custom configuration
      }
    }
  }
};
```

### Integration with External Identity Systems

For integration with external identity systems:

1. Implement an adapter that communicates with your identity system
2. Use the appropriate authentication protocol (OAuth2, SAML, etc.)
3. Map external user identities to internal user IDs
4. Extract relevant claims from the external identity

## Security Best Practices

### JWT Security

1. **Use a Strong Secret**: Generate a strong, unique secret for JWT signing
2. **Set Appropriate Expiry**: Balance security and user experience
3. **Include Standard Claims**: Use standard JWT claims (iss, sub, exp, iat)
4. **Validate Tokens**: Always validate tokens on the server side

### API Key Security

1. **Use Strong Keys**: Generate long, random API keys
2. **Limit Scope**: Assign the minimum necessary permissions to each key
3. **Rotate Keys**: Regularly rotate API keys
4. **Secure Transmission**: Always use HTTPS for API key transmission

### OAuth2 Security

1. **Validate Tokens**: Always validate tokens against the identity provider
2. **Check Claims**: Verify audience, issuer, and expiration claims
3. **Use PKCE**: Implement PKCE for public clients
4. **Secure Client Secrets**: Keep client secrets secure

## Troubleshooting

### Common Issues

#### Authentication Failures

If authentication is failing:

1. Check that the authentication method is enabled
2. Verify the credentials are correct
3. Check the server logs for detailed error messages
4. Ensure the request includes the correct headers

#### JWT Token Issues

If JWT tokens are not working:

1. Verify the JWT secret is correctly set
2. Check the token expiration time
3. Ensure the token is properly formatted
4. Validate the token signature

#### OAuth2 Integration Issues

If OAuth2 integration is not working:

1. Verify the JWKS URI is correct
2. Check that the client ID and secret are valid
3. Ensure the audience and issuer claims match the configuration
4. Check the token format and signature algorithm

### Debugging

To enable debug logging for authentication:

```
DEBUG=true
LOG_LEVEL=debug
```

This will provide detailed logs of the authentication process, including which adapters are being tried and why authentication might be failing.
