# Implementing User-Specific Badge Storage (Backpack) in OpenBadges Modular Server

This guide outlines how to implement a "Backpack" feature in the OpenBadges Modular Server, allowing consuming platforms like Fobizz to associate stored badges with their existing user accounts.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Authentication & Authorization](#authentication--authorization)
5. [API Endpoints](#api-endpoints)
6. [Implementation Steps](#implementation-steps)
7. [Integration Example](#integration-example)
8. [Security Considerations](#security-considerations)

## Overview

The Backpack feature allows users from external platforms to store and manage their earned badges within the OpenBadges Modular Server. This implementation follows a clear separation of concerns:

- **OpenBadges Modular Server**: Issues assertions, verifies them, and provides an API to store/retrieve assertions linked to external user IDs.
- **Consuming Platform (e.g., Fobizz)**: Owns the user identity, authenticates users, and uses the OpenBadges API to manage users' badge collections.

## Architecture

<div style="text-align: center">
    <img src="https://mermaid.ink/img/pako:eNp1kk1vgzAMhv9KlFMnVYJCPwrtYdJ22A7TpO2wyyQcaFQSUBJWVeW_L6FQWm3zxbGf2K_tHDFXEjDGN2O0gx1aBRu0CoxDt4ENPIJxYHL4BXqHMWRGO4QNPGmV5x428B11DhqcgB0o5-HFmhyc1fAEuoQMHRRGl7AHn8EejHZgdQZuD8-gCw97A9_BZViChQMqDwfwBXgPT-BycCXsjPawN7qEL-BL8BUYZeEA2sHR6AKORpfwFXwFvgKjHRxBOzgZXcLJ6BK-gW_A12C0hxNoD2ejSzgbXcIT-BZ8C0Z7OIP2cDG6gIvRJTyB78B3YLSHC2gPV6MLuBpdwBP4HnwPRnu4gfZwM7qAm9EFPIE_wB9gtIc7aA93owu4G13AE_gT_AlGe3iA9vAwuoCH0QU8gb_AX2C0h0doD0-jC3gaXcAT-Bv8DUZ7eIb28DS6gKfRBTyBf8A_YLSHF9AeXowu4GV0AU_gX_AvGO3hH2gP_4wu4J_RBTyB_8H_YLSHf6E9_DO6gH9GF_AE_gf_g9EeXkF7eDW6gFejC3gCr-BVxnQJVqMxJkNXGLuBzGiHMR1QJzGdG-VjOjfKxXRulI_p3Kgc07lRJaZzo2pM50a1mM6N6jGdGzViOjdqxnRu1IrpnNFYxXTOaKxjOmc0NjGdMxrbmM4ZjV1M54zGPqZzRuMQ0zmjcYzpnNE4xXTOaJxjOmc0LjGdMxrXmM4ZjVtM54zGPaZzRuMR0zmj8YzpnNF4xXTOaLzFdM5ofMR0zmh8xnTOaPyM6ZzR-BXTOaPxO6ZzRuNPTOeMxt-YzhmNfzGdMxr_YzpnNKqYzhmNOqZzRqOJ6ZzRaGM6ZzS6mM4ZjT6mc0ZjiOmc0RhjOmc0ppjOGY05pnNGY4npnNFYYzpnNLaYzhmNPaZzRuOA6ZzROGI6ZzROmM4ZjTOmc0bjgumcMRpXTOeMxi2mc0bjjumc0XhgOmc0npjOGY1XTOeMxndM54zGj5jOGY2fMZ0zGr9iOmc0fsd0zmj8iemcMRp_YjpnNP7GdM5o_IvpnNH4H9M5o1HHdM5oNDGdMxptTOeMRhfTOaPRx3TOaAwxnTMaY0znjMYU0zmjMcd0zmgsMZ0zGmtM54zGFtM5o7HHdM5oHDCdMxpHTOeMxgnTOaNxxnTOaFwwnTMaV0znjMYN0zmjccd0zmg8MJ0zGk9M54zGK6ZzRuM7pnNG40dM54zGz5jOGY1fMZ0zGr9jOmc0_sR0zmj8jemcMRr_YjpnNP7HdM5o1DGdMxpNTOeMRhvTOaPRxXTOaPQxnTMaQ0znjMYY0zmjMcV0zmjMMZ0zGktM54zGGtM5o7HFdM5o7DGdMxoHTOeMxhHTOaNxwnTOaJwxnTMaF0znjMYV0zmjccN0zmjcMZ0zGg9M54zGE9M5o_GK6ZzR-I7pnNH4EdM5o_EzpnNG41dM54zG75jOGY0_MZ0zGn9jOmc0_sV0zmj8j-mc0ahjOmc0mpjOGY02pnNGo4vpnNHoYzpnNIaYzhmNMaZzRmOK6ZzRmGM6ZzSWmM4ZjTWmc0Zji-mc0dhjOmc0DpjOGY0jpnNG44TpnNE4YzpnNC6YzhmNK6ZzRuOG6ZzRuGM6ZzQemM4ZjSemcxbTf8Iy-Oc?type=png" alt="Backpack Architecture Diagram" width="800">
</div>

<!-- If the image above doesn't display, you can view it at: https://mermaid.live/edit#pako:eNp1kk1vgzAMhv9KlFMnVYJCPwrtYdJ22A7TpO2wyyQcaFQSUBJWVeW_L6FQWm3zxbGf2K_tHDFXEjDGN2O0gx1aBRu0CoxDt4ENPIJxYHL4BXqHMWRGO4QNPGmV5x428B11DhqcgB0o5-HFmhyc1fAEuoQMHRRGl7AHn8EejHZgdQZuD8-gCw97A9_BZViChQMqDwfwBXgPT-BycCXsjPawN7qEL-BL8BUYZeEA2sHR6AKORpfwFXwFvgKjHRxBOzgZXcLJ6BK-gW_A12C0hxNoD2ejSzgbXcIT-BZ8C0Z7OIP2cDG6gIvRJTyB78B3YLSHC2gPV6MLuBpdwBP4HnwPRnu4gfZwM7qAm9EFPIE_wB9gtIc7aA93owu4G13AE_gT_AlGe3iA9vAwuoCH0QU8gb_AX2C0h0doD0-jC3gaXcAT-Bv8DUZ7eIb28DS6gKfRBTyBf8A_YLSHF9AeXowu4GV0AU_gX_AvGO3hH2gP_4wu4J_RBTyB_8H_YLSHf6E9_DO6gH9GF_AE_gf_g9EeXkF7eDW6gFejC3gCr-BVxnQJVqMxJkNXGLuBzGiHMR1QJzGdG-VjOjfKxXRulI_p3Kgc07lRJaZzo2pM50a1mM6N6jGdGzViOjdqxnRu1IrpnNFYxXTOaKxjOmc0NjGdMxrbmM4ZjV1M54zGPqZzRuMQ0zmjcYzpnNE4xXTOaJxjOmc0LjGdMxrXmM4ZjVtM54zGPaZzRuMR0zmj8YzpnNF4xXTOaLzFdM5ofMR0zmh8xnTOaPyM6ZzR-BXTOaPxO6ZzRuNPTOeMxt-YzhmNfzGdMxr_YzpnNKqYzhmNOqZzRqOJ6ZzRaGM6ZzS6mM4ZjT6mc0ZjiOmc0RhjOmc0ppjOGY05pnNGY4npnNFYYzpnNLaYzhmNPaZzRuOA6ZzROGI6ZzROmM4ZjTOmc0bjgumcMRpXTOeMxi2mc0bjjumc0XhgOmc0npjOGY1XTOeMxndM54zGj5jOGY2fMZ0zGr9iOmc0fsd0zmj8iemcMRp_YjpnNP7GdM5o_IvpnNH4H9M5o1HHdM5oNDGdMxptTOeMRhfTOaPRx3TOaAwxnTMaY0znjMYU0zmjMcd0zmgsMZ0zGmtM54zGFtM5o7HHdM5oHDCdMxpHTOeMxgnTOaNxxnTOaFwwnTMaV0znjMYN0zmjccd0zmg8MJ0zGk9M54zGK6ZzRuM7pnNG40dM54zGz5jOGY1fMZ0zGr9jOmc0_sR0zmj8jemcMRr_YjpnNP7HdM5o1DGdMxpNTOeMRhvTOaPRxXTOaPQxnTMaQ0znjMYY0zmjMcV0zmjMMZ0zGktM54zGGtM5o7HFdM5o7DGdMxoHTOeMxhHTOaNxwnTOaJwxnTMaF0znjMYV0zmjccN0zmjcMZ0zGg9M54zGE9M5o_GK6ZzR-I7pnNH4EdM5o_EzpnNG41dM54zG75jOGY0_MZ0zGn9jOmc0_sV0zmj8j-mc0ahjOmc0mpjOGY02pnNGo4vpnNHoYzpnNIaYzhmNMaZzRmOK6ZzRmGM6ZzSWmM4ZjTWmc0Zji-mc0dhjOmc0DpjOGY0jpnNG44TpnNE4YzpnNC6YzhmNK6ZzRuOG6ZzRuGM6ZzQemM4ZjSemcxbTf8Iy-Oc -->


### Key Components

1. **External Platform (e.g., Fobizz)**
   - Manages user authentication and identity
   - Integrates with OpenBadges API for badge management

2. **OpenBadges Modular Server**
   - **Backpack Module**: New module to handle user-specific badge storage
   - **JWT Authentication**: Validates tokens from external platforms
   - **Platform Registry**: Manages trusted external platforms

3. **Database**
   - Stores platform users and their associated badges
   - Maintains platform registration information

## Database Schema

We need to add the following tables to the existing schema:

### 1. Platforms Table

```typescript
// Platforms table - for registering external platforms
export const platforms = pgTable(
  'platforms',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull().unique(),
    description: text('description'),
    clientId: text('client_id').notNull().unique(),
    publicKey: text('public_key').notNull(), // For JWT verification
    webhookUrl: text('webhook_url'),
    status: text('status').notNull().default('active'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      nameIdx: index('platform_name_idx').on(table.name),
      clientIdIdx: index('platform_client_id_idx').on(table.clientId),
    };
  }
);
```

### 2. Platform Users Table

```typescript
// Platform Users table - for storing external users
export const platformUsers = pgTable(
  'platform_users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    platformId: uuid('platform_id').notNull().references(() => platforms.id, { onDelete: 'cascade' }),
    externalUserId: text('external_user_id').notNull(), // User ID in the external platform
    displayName: text('display_name'),
    email: text('email'),
    metadata: jsonb('metadata'), // Additional user data
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => {
    return {
      platformUserIdx: index('platform_user_idx').on(table.platformId, table.externalUserId),
      emailIdx: index('platform_user_email_idx').on(table.email),
    };
  }
);
```

### 3. User Assertions Table (Backpack)

```typescript
// User Assertions table (Backpack) - links users to assertions
export const userAssertions = pgTable(
  'user_assertions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => platformUsers.id, { onDelete: 'cascade' }),
    assertionId: uuid('assertion_id').notNull().references(() => assertions.id, { onDelete: 'cascade' }),
    addedAt: timestamp('added_at').defaultNow().notNull(),
    status: text('status').notNull().default('active'), // active, hidden, etc.
    metadata: jsonb('metadata'), // Additional data about this user-assertion relationship
  },
  (table) => {
    return {
      userAssertionIdx: index('user_assertion_idx').on(table.userId, table.assertionId),
      addedAtIdx: index('user_assertion_added_at_idx').on(table.addedAt),
    };
  }
);
```

## Authentication & Authorization

### JWT-Based Authentication

We'll use JWT tokens for secure authentication between platforms and the OpenBadges server:

1. **Token Structure**:
   ```typescript
   interface BackpackJwtPayload extends JwtPayload {
     // Standard JWT claims
     sub: string;         // External user ID
     iss: string;         // Platform identifier (clientId)
     exp: number;         // Expiration time
     iat: number;         // Issued at time

     // Custom claims
     platformId: string;  // Platform UUID in our system
     displayName?: string; // Optional user display name
     email?: string;      // Optional user email
   }
   ```

2. **JWT Verification**:
   - Verify the token signature using the platform's public key
   - Validate the token expiration and issuer
   - Extract the user information for backpack operations

### Platform Registration

Platforms must register with the OpenBadges server to use the Backpack API:

1. **Registration Process**:
   - Platform provides name, description, and public key
   - OpenBadges server generates a unique client ID
   - Platform stores the client ID for future API calls

2. **Platform Authentication**:
   - For platform-level operations (not user-specific)
   - Uses API key authentication (existing mechanism)

## API Endpoints

### Platform Management Endpoints

```
POST /api/v1/platforms
GET /api/v1/platforms
GET /api/v1/platforms/{platformId}
PUT /api/v1/platforms/{platformId}
DELETE /api/v1/platforms/{platformId}
```

### Backpack Endpoints

```
POST /api/v1/backpack/assertions
GET /api/v1/backpack/assertions
GET /api/v1/backpack/assertions/{assertionId}
DELETE /api/v1/backpack/assertions/{assertionId}
PUT /api/v1/backpack/assertions/{assertionId}/status
```

## Implementation Steps

### 1. Create the Backpack Domain

Create a new domain for the backpack functionality:

```
src/domains/backpack/
├── backpack.controller.ts
├── backpack.service.ts
├── platform.entity.ts
├── platform.repository.ts
├── platform-user.entity.ts
├── platform-user.repository.ts
└── user-assertion.repository.ts
```

### 2. Update Database Schema

Add the new tables to the database schema files:

```typescript
// In src/infrastructure/database/modules/postgresql/schema.ts
// Add the platforms, platformUsers, and userAssertions tables

// In src/infrastructure/database/modules/sqlite/schema.ts
// Add the equivalent tables for SQLite
```

### 3. Create Entity Classes

```typescript
// src/domains/backpack/platform.entity.ts
export class Platform {
  id: string;
  name: string;
  description?: string;
  clientId: string;
  publicKey: string;
  webhookUrl?: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  updatedAt: Date;

  // Factory method
  static create(data: Partial<Platform>): Platform {
    // Implementation
  }

  // Convert to plain object
  toObject(): Record<string, any> {
    // Implementation
  }
}

// src/domains/backpack/platform-user.entity.ts
export class PlatformUser {
  id: string;
  platformId: string;
  externalUserId: string;
  displayName?: string;
  email?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;

  // Factory method
  static create(data: Partial<PlatformUser>): PlatformUser {
    // Implementation
  }

  // Convert to plain object
  toObject(): Record<string, any> {
    // Implementation
  }
}
```

### 4. Create Repository Classes

```typescript
// src/domains/backpack/platform.repository.ts
export interface PlatformRepository {
  create(platform: Platform): Promise<Platform>;
  findById(id: string): Promise<Platform | null>;
  findByClientId(clientId: string): Promise<Platform | null>;
  update(id: string, platform: Partial<Platform>): Promise<Platform | null>;
  delete(id: string): Promise<boolean>;
  findAll(): Promise<Platform[]>;
}

// src/domains/backpack/platform-user.repository.ts
export interface PlatformUserRepository {
  create(user: PlatformUser): Promise<PlatformUser>;
  findById(id: string): Promise<PlatformUser | null>;
  findByPlatformAndExternalId(platformId: string, externalUserId: string): Promise<PlatformUser | null>;
  update(id: string, user: Partial<PlatformUser>): Promise<PlatformUser | null>;
  delete(id: string): Promise<boolean>;
}

// src/domains/backpack/user-assertion.repository.ts
export interface UserAssertionRepository {
  addAssertion(userId: string, assertionId: string, metadata?: Record<string, any>): Promise<boolean>;
  removeAssertion(userId: string, assertionId: string): Promise<boolean>;
  updateStatus(userId: string, assertionId: string, status: string): Promise<boolean>;
  getUserAssertions(userId: string): Promise<Assertion[]>;
  hasAssertion(userId: string, assertionId: string): Promise<boolean>;
}
```

### 5. Implement JWT Verification for Platforms

```typescript
// src/auth/services/platform-jwt.service.ts
export class PlatformJwtService {
  /**
   * Verify a JWT token from a platform
   * @param token The JWT token to verify
   * @param platformPublicKey The platform's public key
   * @returns The decoded payload if valid
   */
  static async verifyToken(token: string, platformPublicKey: string): Promise<BackpackJwtPayload> {
    try {
      const publicKey = await importSPKI(platformPublicKey, 'RS256');

      const { payload } = await jwtVerify(token, publicKey, {
        algorithms: ['RS256'],
      });

      // Validate required fields
      if (!payload.sub || !payload.iss || !payload.platformId) {
        throw new Error('Token missing required claims');
      }

      return {
        sub: payload.sub as string,
        iss: payload.iss as string,
        exp: payload.exp,
        iat: payload.iat,
        platformId: payload.platformId as string,
        provider: 'platform',
        displayName: payload.displayName as string | undefined,
        email: payload.email as string | undefined,
      };
    } catch (error) {
      logger.logError('Platform JWT verification failed', error as Error);
      throw new Error('Invalid or expired platform token');
    }
  }
}
```

### 6. Create Backpack Service

```typescript
// src/domains/backpack/backpack.service.ts
export class BackpackService {
  constructor(
    private platformRepository: PlatformRepository,
    private platformUserRepository: PlatformUserRepository,
    private userAssertionRepository: UserAssertionRepository,
    private assertionRepository: AssertionRepository
  ) {}

  /**
   * Get or create a platform user
   */
  async getOrCreateUser(platformId: string, externalUserId: string, displayName?: string, email?: string): Promise<PlatformUser> {
    // Implementation
  }

  /**
   * Add an assertion to a user's backpack
   */
  async addAssertion(userId: string, assertionId: string): Promise<boolean> {
    // Implementation
  }

  /**
   * Remove an assertion from a user's backpack
   */
  async removeAssertion(userId: string, assertionId: string): Promise<boolean> {
    // Implementation
  }

  /**
   * Get all assertions in a user's backpack
   */
  async getUserAssertions(userId: string): Promise<Assertion[]> {
    // Implementation
  }

  /**
   * Update the status of an assertion in a user's backpack
   */
  async updateAssertionStatus(userId: string, assertionId: string, status: string): Promise<boolean> {
    // Implementation
  }
}
```

### 7. Create Backpack Controller

```typescript
// src/domains/backpack/backpack.controller.ts
export class BackpackController {
  constructor(
    private backpackService: BackpackService,
    private platformRepository: PlatformRepository
  ) {}

  /**
   * Add an assertion to the user's backpack
   */
  async addAssertion(req: Request): Promise<Response> {
    try {
      const token = extractTokenFromHeader(req.headers.authorization);
      if (!token) {
        return { status: 401, body: { error: 'Authentication required' } };
      }

      // Get platform from the token issuer
      const decodedToken = await this.verifyPlatformToken(token);

      // Get or create the user
      const user = await this.backpackService.getOrCreateUser(
        decodedToken.platformId,
        decodedToken.sub,
        decodedToken.displayName,
        decodedToken.email
      );

      // Add the assertion
      const { assertionId } = req.body;
      const result = await this.backpackService.addAssertion(user.id, assertionId);

      return { status: 200, body: { success: result } };
    } catch (error) {
      logger.logError('Failed to add assertion to backpack', error as Error);
      return { status: 500, body: { error: 'Failed to add assertion' } };
    }
  }

  /**
   * Get all assertions in the user's backpack
   */
  async getUserAssertions(req: Request): Promise<Response> {
    // Implementation
  }

  /**
   * Remove an assertion from the user's backpack
   */
  async removeAssertion(req: Request, assertionId: string): Promise<Response> {
    // Implementation
  }

  /**
   * Update the status of an assertion in the user's backpack
   */
  async updateAssertionStatus(req: Request, assertionId: string): Promise<Response> {
    // Implementation
  }

  /**
   * Verify a platform token and return the decoded payload
   */
  private async verifyPlatformToken(token: string): Promise<BackpackJwtPayload> {
    // Implementation
  }
}
```

### 8. Add API Routes

```typescript
// In src/api/api.router.ts

// Backpack routes
router.post('/backpack/assertions',
  ({ body, headers }) => backpackController.addAssertion({ body, headers }),
  { beforeHandle: [platformAuthMiddleware] }
);

router.get('/backpack/assertions',
  ({ headers }) => backpackController.getUserAssertions({ headers }),
  { beforeHandle: [platformAuthMiddleware] }
);

router.delete('/backpack/assertions/:id',
  ({ params, headers }) => backpackController.removeAssertion({ headers }, params.id),
  { beforeHandle: [platformAuthMiddleware] }
);

router.put('/backpack/assertions/:id/status',
  ({ params, body, headers }) => backpackController.updateAssertionStatus({ body, headers }, params.id),
  { beforeHandle: [platformAuthMiddleware] }
);

// Platform management routes
router.post('/platforms',
  ({ body }) => platformController.createPlatform(body),
  { beforeHandle: [adminAuthMiddleware] }
);

router.get('/platforms',
  () => platformController.getAllPlatforms(),
  { beforeHandle: [adminAuthMiddleware] }
);

// Additional platform routes...
```

### 9. Create Authentication Middleware

```typescript
// src/auth/middleware/platform-auth.middleware.ts
export const platformAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Extract the platform ID from the token issuer
    const decodedToken = jwt.decode(token);
    if (!decodedToken || typeof decodedToken === 'string' || !decodedToken.iss) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get the platform by client ID
    const platform = await platformRepository.findByClientId(decodedToken.iss);
    if (!platform) {
      return res.status(401).json({ error: 'Unknown platform' });
    }

    // Verify the token with the platform's public key
    const verifiedToken = await PlatformJwtService.verifyToken(token, platform.publicKey);

    // Attach the token payload to the request for later use
    req.user = {
      platformId: platform.id,
      externalUserId: verifiedToken.sub,
      displayName: verifiedToken.displayName,
      email: verifiedToken.email,
    };

    next();
  } catch (error) {
    logger.logError('Platform authentication failed', error as Error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};
```

## Integration Example

### External Platform (Fobizz) Integration

```typescript
// Example code for Fobizz to integrate with the OpenBadges Backpack API

// 1. Generate a JWT token for the current user
async function generateBackpackToken(userId, displayName, email) {
  const privateKey = await loadPrivateKey(); // Load from secure storage

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: userId,
    iss: 'fobizz-client-id', // Client ID provided by OpenBadges server
    exp: now + 3600, // 1 hour expiry
    iat: now,
    platformId: 'fobizz-platform-uuid', // Platform UUID in OpenBadges server
    displayName,
    email
  };

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .setIssuer('fobizz-client-id')
    .setExpirationTime('1h')
    .sign(privateKey);
}

// 2. Add a badge to the user's backpack
async function addBadgeToBackpack(userId, assertionId) {
  const token = await generateBackpackToken(userId, 'User Name', 'user@example.com');

  const response = await fetch('https://openbadges-server.example.com/api/v1/backpack/assertions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ assertionId })
  });

  return await response.json();
}

// 3. Get all badges in the user's backpack
async function getUserBadges(userId) {
  const token = await generateBackpackToken(userId, 'User Name', 'user@example.com');

  const response = await fetch('https://openbadges-server.example.com/api/v1/backpack/assertions', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return await response.json();
}
```

## Security Considerations

1. **JWT Security**:
   - Use RS256 (asymmetric) rather than HS256 (symmetric) for platform tokens
   - Keep token expiry short (1 hour or less)
   - Validate all claims, especially issuer and subject

2. **Platform Verification**:
   - Verify platforms before registration
   - Store platform public keys securely
   - Implement rate limiting for platform API calls

3. **User Privacy**:
   - Store minimal user information
   - Allow platforms to control what user data is shared
   - Implement proper data deletion when requested

4. **Assertion Verification**:
   - Always verify assertions before adding to a backpack
   - Check for revocation and expiration
   - Validate assertion signatures

5. **API Security**:
   - Implement HTTPS for all API endpoints
   - Use proper CORS settings
   - Add rate limiting to prevent abuse

## Conclusion

This implementation allows the OpenBadges Modular Server to function as both an issuer/verifier and a "mini-backpack" for external platforms. By using JWT-based authentication and a clear separation of concerns, platforms like Fobizz can seamlessly integrate badge storage while maintaining control over user identity and authentication.

The design is flexible enough to support multiple platforms, each with their own user base, while keeping the OpenBadges server focused on its core functionality of badge issuance and verification.
