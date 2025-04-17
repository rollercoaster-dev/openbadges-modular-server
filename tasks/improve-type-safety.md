# Task: Improve Type Safety with openbadges-types

## Overview

This task involves improving the type safety of the OpenBadges Modular Server by properly utilizing the `openbadges-types` package. Currently, the codebase imports types from this package but often doesn't use them correctly, leading to type inconsistencies and potential runtime errors.

## Goals

1. Properly validate and convert types from `openbadges-types`
2. Create utility functions for working with branded types
3. Update domain entities to use imported types correctly
4. Implement proper mappers between domain entities and database models
5. Ensure type safety throughout the application

## Current Issues

1. **Imports Without Usage**: Types are imported but then not used in the actual implementation.
2. **Parallel Type Definitions**: The domain entities define their own structures that mirror the imported types but don't fully leverage them.
3. **Type Casting Without Validation**: Values are cast to branded types (like `Shared.IRI`) without proper validation.
4. **Inconsistent Type Usage**: Different parts of the application use different types for the same concepts.
5. **Any Types in Database Layer**: The database layer uses `any` types to bypass TypeScript's strict checking.

## Implementation Plan

### Phase 1: Create Type Utilities and Guards (2 days)

- [ ] Create utility functions for working with branded types
  - [ ] `createOrGenerateIRI`: Safely creates a `Shared.IRI` from a string or generates a new UUID
  - [ ] `parseJSON`: Safely parses JSON strings to objects with proper typing
  - [ ] `stringifyJSON`: Safely converts objects to JSON strings

- [ ] Implement type guards for complex objects
  - [ ] `isOB2Image`: Checks if a value is a valid OB2.Image
  - [ ] `isOB3ImageObject`: Checks if a value is a valid OB3.OB3ImageObject
  - [ ] `normalizeImage`: Converts various image formats to a consistent format

- [ ] Add validation functions for all imported types
  - [ ] Leverage existing validation functions from `openbadges-types`
  - [ ] Add custom validation for complex types not covered by the package

### Phase 2: Update Domain Entities (3 days)

- [ ] Update `Issuer` entity
  - [ ] Modify constructor to properly validate and convert types
  - [ ] Update factory methods to use the new utilities
  - [ ] Ensure all properties use the correct imported types

- [ ] Update `BadgeClass` entity
  - [ ] Modify constructor to properly validate and convert types
  - [ ] Update factory methods to use the new utilities
  - [ ] Ensure all properties use the correct imported types

- [ ] Update `Assertion` entity
  - [ ] Modify constructor to properly validate and convert types
  - [ ] Update factory methods to use the new utilities
  - [ ] Ensure all properties use the correct imported types

### Phase 3: Create Proper Mappers (2 days)

- [ ] Implement `IssuerMapper`
  - [ ] `toDatabaseRecord`: Converts domain entity to database record
  - [ ] `toDomainEntity`: Converts database record to domain entity
  - [ ] Add tests for the mapper

- [ ] Implement `BadgeClassMapper`
  - [ ] `toDatabaseRecord`: Converts domain entity to database record
  - [ ] `toDomainEntity`: Converts database record to domain entity
  - [ ] Add tests for the mapper

- [ ] Implement `AssertionMapper`
  - [ ] `toDatabaseRecord`: Converts domain entity to database record
  - [ ] `toDomainEntity`: Converts database record to domain entity
  - [ ] Add tests for the mapper

### Phase 4: Update Database Layer (3 days)

- [ ] Update PostgreSQL database implementation
  - [ ] Refactor database methods to use the mappers
  - [ ] Update query parameters to respect branded types
  - [ ] Remove `any` type usage
  - [ ] Add proper error handling for type conversions

- [ ] Update SQLite database implementation (if applicable)
  - [ ] Apply the same changes as for PostgreSQL

- [ ] Update database interfaces
  - [ ] Ensure interfaces use the correct types
  - [ ] Update method signatures to use branded types

### Phase 5: Update API and Tests (2 days)

- [ ] Update API controllers
  - [ ] Use proper type validation for request and response data
  - [ ] Ensure all controllers use the correct types

- [ ] Update tests
  - [ ] Modify tests to verify type safety
  - [ ] Add integration tests for end-to-end type consistency
  - [ ] Ensure all tests pass with the new type system

## Acceptance Criteria

1. All imports from `openbadges-types` are properly used in the implementation
2. No unsafe type casts (`as Shared.IRI`) without validation
3. Domain entities correctly implement the imported interfaces
4. Database operations maintain type safety without using `any`
5. All tests pass with the new type system
6. No TypeScript errors or warnings related to types

## Resources

- [openbadges-types package documentation](https://github.com/openbadges/openbadges-types)
- [TypeScript Handbook: Type Guards and Type Assertions](https://www.typescriptlang.org/docs/handbook/advanced-types.html#type-guards-and-type-assertions)
- [Branded Types in TypeScript](https://egghead.io/blog/using-branded-types-in-typescript)

## Notes

- This task is focused on improving type safety without changing the actual behavior of the application
- The changes should be backward compatible with existing code
- The task should be completed on the `feature/improve-type-safety` branch
- A pull request should be created for review once the task is complete
