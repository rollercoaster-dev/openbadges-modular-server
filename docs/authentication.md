# Authentication System Documentation

## Overview

The OpenBadges Modular Server implements a flexible, multi-provider authentication system with role-based access control (RBAC). The system is designed to be extensible, allowing for different authentication methods to be used based on configuration.

## Authentication Methods

The server supports the following authentication methods:

### 1. JWT-based Authentication

JSON Web Tokens (JWT) are used for stateless authentication. Once a user is authenticated through any method, a JWT token is generated and can be used for subsequent requests.

- **Token Format**: `Bearer <token>`
- **Header**: `Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Expiration**: Configurable via `JWT_TOKEN_EXPIRY_SECONDS` (default: 3600 seconds / 1 hour)

### 2. API Key Authentication

API keys can be used for service-to-service authentication or for clients that don't support interactive login.

- **Header**: `Authorization: ApiKey <key>`
- **Configuration**: API keys are configured in the server configuration

### 3. Basic Authentication

Username and password authentication using HTTP Basic Auth.

- **Header**: `Authorization: Basic <base64-encoded-credentials>`
- **Format**: `base64(username:password)`

### 4. OAuth2 Authentication

OAuth2 support for integration with external identity providers.

- **Supported Flows**: Authorization Code, Client Credentials
- **Configuration**: OAuth2 settings are configured in the server configuration

## Role-Based Access Control (RBAC)

The authentication system implements role-based access control to restrict access to resources based on user roles and permissions.

### User Roles

- **Admin**: Full system access
- **Issuer**: Can create and manage badge classes and assertions
- **Viewer**: Read-only access to public resources
- **User**: Basic user with limited permissions

### Permissions

Permissions are granular access controls that define what actions a user can perform. Each role has a default set of permissions, but these can be customized per user.

Examples of permissions:
- `manage:users` - Can manage user accounts
- `create:badgeClass` - Can create badge classes
- `issue:assertion` - Can issue badge assertions
- `view:backpack` - Can view backpack contents

## Authentication Flow

1. **Client Authentication**:
   - Client sends credentials via one of the supported authentication methods
   - Server validates credentials using the appropriate adapter

2. **Token Generation**:
   - Upon successful authentication, server generates a JWT token
   - Token contains user ID, roles, and permissions

3. **Subsequent Requests**:
   - Client includes JWT token in the Authorization header
   - Server validates token and extracts user information
   - RBAC middleware checks if user has required roles/permissions

## API Authentication

### Authenticating API Requests

All API endpoints that require authentication should include the appropriate authentication header based on the method being used:

#### JWT Authentication

```
GET /v2/issuers
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### API Key Authentication

```
GET /v2/issuers
Authorization: ApiKey your-api-key
```

#### Basic Authentication

```
GET /v2/issuers
Authorization: Basic base64(username:password)
```

### Authentication Response Codes

- **200 OK**: Request successful
- **401 Unauthorized**: Authentication required or failed
- **403 Forbidden**: Authenticated but insufficient permissions

### Authentication in E2E Tests

For E2E tests, you can use the test API key defined in the environment variables:

```typescript
// In your test file
const API_KEY = 'test-api-key';

// Make authenticated request
const response = await fetch(`${API_URL}/v2/issuers`, {
  headers: {
    'Authorization': `ApiKey ${API_KEY}`,
    'Content-Type': 'application/json'
  }
});
```

## Configuration

Authentication settings are configured through environment variables and the server configuration:

### Environment Variables

```bash
# JWT Configuration
JWT_SECRET=your-secure-jwt-secret
JWT_TOKEN_EXPIRY_SECONDS=3600
JWT_ISSUER=openbadges-server

# API Keys
AUTH_API_KEY=your-api-key
AUTH_API_KEY_TEST=test-api-key
AUTH_API_KEY_E2E=e2e-test-api-key

# Admin User
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure-admin-password
```

### Configuration File

The authentication configuration is loaded in the server's config module:

```typescript
// src/config/config.ts
export const config = {
  auth: {
    enabled: process.env.AUTH_ENABLED !== 'false',
    jwtSecret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    tokenExpirySeconds: parseInt(process.env.JWT_TOKEN_EXPIRY_SECONDS || '3600', 10),
    issuer: process.env.JWT_ISSUER || 'openbadges-server',
    apiKeys: {
      main: process.env.AUTH_API_KEY || 'default-api-key-change-in-production',
      test: process.env.AUTH_API_KEY_TEST || 'test-api-key',
      e2e: process.env.AUTH_API_KEY_E2E || 'e2e-test-api-key'
    },
    // Public paths that don't require authentication
    publicPaths: [
      '/health',
      '/docs',
      '/swagger'
    ]
  }
};
```

## Security Considerations

1. **JWT Secret**: Use a strong, unique secret for JWT signing
2. **Password Storage**: Passwords are hashed using bcrypt
3. **Rate Limiting**: Implement rate limiting for authentication endpoints
4. **HTTPS**: Always use HTTPS in production
5. **Token Expiry**: Set appropriate token expiry times
6. **Logging**: Authentication events are logged for audit purposes

## Error Handling

Authentication errors return appropriate HTTP status codes:

- **400 Bad Request**: Invalid input data
- **401 Unauthorized**: Authentication required or failed
- **403 Forbidden**: Authenticated but insufficient permissions
- **500 Internal Server Error**: Server-side error

## Logging

The authentication system includes comprehensive logging for security events:

- Login attempts (successful and failed)
- Registration events
- Permission checks
- Token validation
- Authentication adapter usage

Logs include structured data for easy filtering and analysis.
