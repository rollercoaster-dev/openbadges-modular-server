# Backpack Feature Typing Improvements

This task tracks improvements to TypeScript typing in the backpack feature to enhance code clarity, maintainability, and developer experience.

## Overview

The backpack feature allows external platforms to integrate with the OpenBadges Modular Server and store badges for their users. While the current implementation uses TypeScript, there are several areas where typing could be improved to make the code more robust and self-documenting.

## Progress Update

**Completed:**
- Fixed TypeScript errors across the codebase
- Removed `any` types where possible
- Improved validation middleware typing
- Added proper type handling for database operations
- Fixed repository method parameter types

**Remaining:**
- Implement specific improvements outlined in the sections below

## Areas for Improvement

### 1. Platform JWT Payload

**Current Status**: The `PlatformJwtPayload` interface has some typing but could be improved.

**Improvements Needed**:
- Add more specific types for properties instead of `string`
- Add proper JSDoc comments for all properties
- Consider making some properties optional with proper typing
- Add validation for the payload structure

**Files to Modify**:
- `src/auth/services/platform-jwt.service.ts`

```typescript
/**
 * Platform JWT payload structure
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

  // Add more specific types and validation
}
```

### 2. Metadata Types

**Current Status**: Several entities use `Record<string, unknown>` for metadata.

**Improvements Needed**:
- Create specific metadata interfaces for each entity type
- Add validation for metadata structure
- Consider using generics for flexible but typed metadata

**Files to Modify**:
- `src/domains/backpack/platform-user.entity.ts`
- `src/domains/backpack/user-assertion.entity.ts`

```typescript
// Example improvement
export interface PlatformUserMetadata {
  roles?: string[];
  preferences?: {
    theme?: 'light' | 'dark';
    notifications?: boolean;
  };
  // Other platform-specific metadata
  [key: string]: unknown;
}

export class PlatformUser {
  // ...
  metadata?: PlatformUserMetadata;
  // ...
}
```

### 3. Status Enums

**Current Status**: Status fields use string literals.

**Improvements Needed**:
- Convert string literal types to proper TypeScript enums
- Add documentation for each status value
- Ensure consistent status values across the codebase

**Files to Modify**:
- `src/domains/backpack/platform.entity.ts`
- `src/domains/backpack/user-assertion.entity.ts`

```typescript
// Example improvement
export enum PlatformStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

export class Platform {
  // ...
  status: PlatformStatus;
  // ...
}
```

### 4. API Response Types

**Current Status**: API responses are not consistently typed.

**Improvements Needed**:
- Create specific response interfaces for each API endpoint
- Add proper error response types
- Use generics for consistent response structures

**Files to Modify**:
- `src/domains/backpack/backpack.controller.ts`
- `src/api/backpack.router.ts`

```typescript
// Example improvement
export interface PlatformResponse {
  id: Shared.IRI;
  name: string;
  clientId: string;
  // Other fields
}

export interface ErrorResponse {
  error: string;
  code: string;
  details?: unknown;
}

export type ApiResponse<T> = T | ErrorResponse;
```

### 5. Repository Method Parameters

**Current Status**: Some repository methods use generic parameter types.

**Improvements Needed**:
- Create specific parameter interfaces for complex operations
- Add validation for parameter structures
- Use more specific types instead of `Partial<T>`

**Files to Modify**:
- `src/domains/backpack/platform.repository.ts`
- `src/domains/backpack/platform-user.repository.ts`
- `src/domains/backpack/user-assertion.repository.ts`

```typescript
// Example improvement
export interface PlatformUpdateParams {
  name?: string;
  description?: string;
  publicKey?: string;
  webhookUrl?: string;
  status?: PlatformStatus;
}

export interface PlatformRepository {
  // ...
  update(id: Shared.IRI, params: PlatformUpdateParams): Promise<Platform | null>;
  // ...
}
```

### 6. Authentication Middleware Types

**Current Status**: The platform authentication middleware returns a generic object.

**Improvements Needed**:
- Create specific interface for authentication response
- Add proper error types
- Use discriminated unions for different response states

**Files to Modify**:
- `src/auth/middleware/platform-auth.middleware.ts`

```typescript
// Example improvement
export interface AuthSuccess {
  isAuthenticated: true;
  platformUser: PlatformUser;
  error: null;
}

export interface AuthFailure {
  isAuthenticated: false;
  platformUser: null;
  error: string;
}

export type AuthResponse = AuthSuccess | AuthFailure;
```

### 7. Service Method Parameters and Returns

**Current Status**: Some service methods use generic parameter and return types.

**Improvements Needed**:
- Create specific parameter and return interfaces for service methods
- Add validation for parameter structures
- Use more specific types instead of `any` or generic objects

**Files to Modify**:
- `src/domains/backpack/backpack.service.ts`

```typescript
// Example improvement
export interface AddAssertionParams {
  userId: Shared.IRI;
  assertionId: Shared.IRI;
  status?: UserAssertionStatus;
  metadata?: UserAssertionMetadata;
}

export interface AddAssertionResult {
  userAssertion: UserAssertion;
  isNew: boolean;
}

export class BackpackService {
  // ...
  async addAssertion(params: AddAssertionParams): Promise<AddAssertionResult> {
    // Implementation
  }
  // ...
}
```

### 8. Database Schema Types

**Current Status**: Database schema uses basic types.

**Improvements Needed**:
- Align database schema types with domain entity types
- Add proper constraints and validations
- Use more specific types for columns

**Files to Modify**:
- `src/infrastructure/database/modules/postgresql/schema.ts`
- `src/infrastructure/database/modules/sqlite/schema.ts`

```typescript
// Example improvement
export const platforms = pgTable(
  'platforms',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull().unique(),
    description: text('description'),
    clientId: text('client_id').notNull().unique(),
    publicKey: text('public_key').notNull(),
    webhookUrl: text('webhook_url'),
    status: text('status', { enum: ['active', 'inactive', 'suspended'] }).notNull().default('active'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  // ...
);
```

## Implementation Plan

1. **Phase 1: Core Entity Types** (In Progress)
   - [ ] Implement enums for status fields
   - [ ] Create metadata interfaces
   - [ ] Update entity classes with improved types

2. **Phase 2: Repository and Service Types** (Partially Completed)
   - [x] Create parameter and return interfaces for repository methods
   - [ ] Update service methods with improved types
   - [x] Add validation for complex operations

3. **Phase 3: API and Authentication Types** (Partially Completed)
   - [ ] Create response interfaces for API endpoints
   - [ ] Implement discriminated unions for authentication responses
   - [x] Update middleware with improved types

4. **Phase 4: Database Schema Types** (Completed)
   - [x] Align database schema types with domain entity types
   - [x] Add constraints and validations
   - [x] Update mappers to handle improved types

## Benefits

- **Improved Code Clarity**: More specific types make the code easier to understand
- **Better Developer Experience**: TypeScript will provide better autocomplete and error checking
- **Reduced Bugs**: Stronger typing catches more issues at compile time
- **Self-Documenting Code**: Proper types serve as documentation
- **Easier Maintenance**: Future developers will better understand the code structure

## Acceptance Criteria

- [ ] All identified areas have improved typing
- [x] No `any` types in the codebase (except where absolutely necessary)
- [ ] All public methods and interfaces have proper JSDoc comments
- [x] TypeScript compiler shows no errors or warnings
- [x] Code remains backward compatible with existing implementations

