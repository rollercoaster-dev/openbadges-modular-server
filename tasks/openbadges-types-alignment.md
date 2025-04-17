# OpenBadges Types Alignment Task

## Overview

This task involves aligning the domain entities in the openbadges-modular-server with the types provided by the openbadges-types package, which is now the single source of truth for types in the project.

## Current Issues

After reviewing the codebase, the following type inconsistencies have been identified:

### 1. Domain Entities

#### 1.1. Issuer Entity
- **Current State**: Uses `Shared.IRI` for `id` and `url`, and `Shared.IRI | OB2.Image | Shared.OB3ImageObject` for `image`.
- **Status**: Correctly uses shared types, but has inconsistent implementation compared to other entities.

#### 1.2. BadgeClass Entity
- **Current State**: Uses `string` for `id`, `issuer`, and `image`.
- **Issue**: Should use `Shared.IRI` for `id`, `issuer`, and `image` (or appropriate image type) for consistency with the Issuer entity.

#### 1.3. Assertion Entity
- **Current State**: Uses `string` for `id` and `badgeClass`.
- **Issue**: Should use `Shared.IRI` for `id` and `badgeClass` for consistency.

### 2. Database Interface

- **Current State**: Imports `Issuer`, `BadgeClass`, and `Assertion` directly from openbadges-types.
- **Issue**: These imported types may not match the domain entities, causing type mismatches when data is passed between layers.

### 3. Database Implementation

- **Current State**: Uses `as any` extensively to bypass type checking.
- **Issue**: Reduces type safety and may hide potential bugs.

## Progress Update

We've made significant progress in aligning the domain entities with the openbadges-types package. Here's what has been completed as of the latest update:

### Completed Tasks

1. **Domain Entities**:
   - ✅ Updated `BadgeClass` entity to use `Shared.IRI` for `id`, `issuer`, and `image`
   - ✅ Updated `Assertion` entity to use `Shared.IRI` for `id` and `badgeClass`
   - ✅ Updated the `create` methods to cast UUIDs to `Shared.IRI`

2. **Database Interface**:
   - ✅ Changed imports to use domain entities instead of importing directly from openbadges-types
   - ✅ Updated method signatures to use `Shared.IRI` instead of `string` for IDs

3. **Database Implementation**:
   - ✅ Fixed type issues in the PostgreSQL database implementation
   - ✅ Added proper type conversions for JSON fields
   - ✅ Removed `as any` casts where possible
   - ✅ Used domain entity factory methods to create entities

### Remaining Issues

We've made significant progress, but there are still a few issues that need to be addressed:

1. **Integration Tests**:
   - Repository tests need to be updated to use the correct types
   - Controller tests need to be updated to use the correct types

2. **Repository Implementation**:
   - Some methods like `findAll` are missing from the repositories
   - The PostgreSQL implementation needs to be updated to handle the new types

3. **Serialization**:
   - Serializers need to be updated to handle `Shared.IRI` and other shared types

4. **OpenAPI Schema**:
   - The OpenAPI schema needs to be updated to match the new types

## Implementation Plan

### Phase 1: Update Tests ✅

1. **Update Unit Tests**:
   - [x] Update test data to use `Shared.IRI` for IDs
   - [x] Fix type issues in entity tests
   - [x] Update validation tests to handle the new types

2. **Update Integration Tests**: ✅
   - [x] Update repository tests to use the correct types (04)
   - [x] Update controller tests to use the correct types (04)
   - [x] Update database schema tests (AI)

### Phase 2: Update Controllers and Repositories ⏳

1. **Update Controllers**: ✅
   - [x] Update controller method signatures to use `Shared.IRI` for IDs
   - [x] Fix type issues in controller implementations

2. **Update Repositories**: ✅
   - [x] Add missing methods like `findAll` to repositories
   - [x] Ensure repository interfaces use the correct types
   - [x] Update repository implementations to handle `Shared.IRI` types

### Phase 3: Update Validation and Serialization ⏳

1. **Update Entity Validators**: ✅
   - [x] Update validators to handle `Shared.IRI` and other shared types
   - [x] Fix type issues in validation functions

2. **Update Serializers**: ✅
   - [x] Update serializers to handle `Shared.IRI` and other shared types
   - [x] Fix type issues in serialization functions

### Phase 4: Update OpenAPI Schema and Documentation 🔄

1. **Update OpenAPI Schema**: 04
   - [x] Update the OpenAPI schema to match the new types
   - [x] Fix type issues in the OpenAPI schema

2. **Update Documentation**: 04
   - [x] Update API documentation to reflect the new types
   - [x] Add examples using `Shared.IRI` types in the documentation

### Phase 5: Final Testing and Validation 🔄

1. **TypeScript Type Checking**: 04
   - [x] Run TypeScript type checking to identify any remaining type issues
   - [x] Fix most TypeScript errors related to the type changes
   - [x] Fix remaining TypeScript errors in database implementation (except PostgreSQL implementation)

2. **Runtime Testing**: AI
   - [x] Test the API endpoints with the new types
   - [x] Fix any runtime errors related to the type changes

## Implemented Changes

### BadgeClass Entity Update

```typescript
// src/domains/badgeClass/badgeClass.entity.ts
import { OB2, OB3, Shared } from 'openbadges-types';

export class BadgeClass implements Omit<Partial<OB2.BadgeClass>, 'image'>, Omit<Partial<OB3.Achievement>, 'image'> {
  id: Shared.IRI;
  type: string = 'BadgeClass';
  issuer: Shared.IRI;
  name: string;
  description?: string;
  image?: Shared.IRI | Shared.OB3ImageObject;
  criteria?: OB2.Criteria | OB3.Criteria;
  alignment?: OB2.AlignmentObject[] | OB3.Alignment[];
  tags?: string[];
  [key: string]: any;

  // ...rest of the class...

  static create(data: Partial<BadgeClass>): BadgeClass {
    // Generate ID if not provided
    if (!data.id) {
      data.id = uuidv4() as Shared.IRI;
    }

    // ...rest of the method...
  }
}
```

### Assertion Entity Update

```typescript
// src/domains/assertion/assertion.entity.ts
import { OB2, OB3, Shared } from 'openbadges-types';

export class Assertion implements Partial<OB2.Assertion>, Partial<OB3.VerifiableCredential> {
  id: Shared.IRI;
  type: string = 'Assertion';
  badgeClass: Shared.IRI;
  recipient: OB2.Recipient | OB3.CredentialSubject;
  issuedOn: string; // Consider using a more specific date type
  expires?: string; // Consider using a more specific date type
  evidence?: OB2.Evidence[] | OB3.Evidence[];
  verification?: OB2.Verification | {
    type: string;
    creator?: Shared.IRI;
    created?: string;
    signatureValue?: string;
    verificationProperty?: string;
    startsWith?: string;
    allowedOrigins?: string | string[];
    [key: string]: any;
  };

  // ...rest of the class...

  static create(data: Partial<Assertion>): Assertion {
    // Generate ID if not provided
    if (!data.id) {
      data.id = uuidv4() as Shared.IRI;
    }

    // ...rest of the method...
  }
}
```

### Database Interface Update

```typescript
// src/infrastructure/database/interfaces/database.interface.ts
import { Issuer } from '../../../domains/issuer/issuer.entity';
import { BadgeClass } from '../../../domains/badgeClass/badgeClass.entity';
import { Assertion } from '../../../domains/assertion/assertion.entity';
import { Shared } from 'openbadges-types';

export interface DatabaseInterface {
  // Issuer operations
  createIssuer(issuer: Omit<Issuer, 'id'>): Promise<Issuer>;
  getIssuerById(id: Shared.IRI): Promise<Issuer | null>;
  updateIssuer(id: Shared.IRI, issuer: Partial<Issuer>): Promise<Issuer | null>;
  deleteIssuer(id: Shared.IRI): Promise<boolean>;

  // BadgeClass operations
  createBadgeClass(badgeClass: Omit<BadgeClass, 'id'>): Promise<BadgeClass>;
  getBadgeClassById(id: Shared.IRI): Promise<BadgeClass | null>;
  getBadgeClassesByIssuer(issuerId: Shared.IRI): Promise<BadgeClass[]>;
  updateBadgeClass(id: Shared.IRI, badgeClass: Partial<BadgeClass>): Promise<BadgeClass | null>;
  deleteBadgeClass(id: Shared.IRI): Promise<boolean>;

  // Assertion operations
  createAssertion(assertion: Omit<Assertion, 'id'>): Promise<Assertion>;
  getAssertionById(id: Shared.IRI): Promise<Assertion | null>;
  getAssertionsByBadgeClass(badgeClassId: Shared.IRI): Promise<Assertion[]>;
  getAssertionsByRecipient(recipientId: string): Promise<Assertion[]>;
  updateAssertion(id: Shared.IRI, assertion: Partial<Assertion>): Promise<Assertion | null>;
  deleteAssertion(id: Shared.IRI): Promise<boolean>;

  // Database connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}
```

### Database Implementation Update

The PostgreSQL database implementation has been updated to handle `Shared.IRI` types and proper type conversions for JSON fields. Here's an example of the changes made to the `getIssuerById` method:

```typescript
async getIssuerById(id: Shared.IRI): Promise<Issuer | null> {
  this.ensureConnected();

  const result = await this.db!.select().from(issuers).where(eq(issuers.id, id as string));

  if (!result[0]) {
    return null;
  }

  return Issuer.create({
    id: result[0].id.toString() as Shared.IRI,
    name: result[0].name,
    url: result[0].url as Shared.IRI,
    email: result[0].email,
    description: result[0].description,
    image: result[0].image as Shared.IRI,
    publicKey: result[0].publicKey ? JSON.parse(result[0].publicKey as string) : undefined,
    ...(result[0].additionalFields as Record<string, unknown> || {})
  });
}
```

## Testing Strategy

1. **Unit Tests**:
   - ✅ Update test data to use `Shared.IRI` for IDs
   - ✅ Fix type issues in entity tests
   - ✅ Update validation tests to handle the new types

2. **Integration Tests**: ✅
   - ✅ Update repository tests to use the correct types
   - ✅ Update controller tests to use the correct types
   - ✅ Verify serialization/deserialization works correctly

## Completion Criteria

- ✅ All domain entities use appropriate types from openbadges-types
- ⏳ Database interface and implementation correctly handle the updated types
- ✅ Controllers use the correct types
- ⏳ Repositories use the correct types
- ✅ Validation utilities handle the new types
- 🔄 Serialization utilities handle the new types
- 🔄 OpenAPI schema matches the new types
- ✅ All tests pass with the updated types (except PostgreSQL repository tests that require a database)
- ⏳ No TypeScript errors or warnings related to types
- ✅ No runtime type errors when using the API

## Current Focus

The current focus is on updating the OpenAPI schema to match the new types and running the integration tests to ensure everything works correctly.

## Task Splitting

The tasks have been split between you (marked with "04") and me (marked with "AI"):

### Tasks for You (04):

1. **Update OpenAPI Schema**:
   - Update the OpenAPI schema to match the new types
   - Fix type issues in the OpenAPI schema

2. **Update Integration Tests**:
   - Update repository tests to use the correct types
   - Update controller tests to use the correct types

3. **TypeScript Type Checking**: ✅
   - ✅ Run TypeScript type checking to identify any remaining type issues
   - ✅ Fix most TypeScript errors related to the type changes
   - ✅ Fix remaining TypeScript errors in database implementation (except PostgreSQL implementation)

4. **Documentation Updates**: ✅
   - ✅ Update API documentation to reflect the new types
   - ✅ Add examples using `Shared.IRI` types in the documentation

### Tasks for Me (AI):

1. **Database Schema Updates**:
   - ✅ Update database schema tests
   - Ensure database schema correctly handles the new types

2. **Runtime Testing**: ✅
   - ✅ Test the API endpoints with the new types
   - ✅ Fix any runtime errors related to the type changes

3. **Edge Case Handling**: ✅
   - ✅ Identify and fix edge cases related to type conversions
   - ✅ Ensure backward compatibility with existing data

These tasks can be worked on in parallel to complete the alignment with openbadges-types.
