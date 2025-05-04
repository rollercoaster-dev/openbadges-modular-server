# Validation in OpenBadges Modular Server

This document describes the validation approach used in the OpenBadges Modular Server.

## Overview

The OpenBadges Modular Server uses [Zod](https://github.com/colinhacks/zod) for input validation. Zod is a TypeScript-first schema validation library that allows us to define schemas for our data and validate it at runtime.

## Validation Flow

1. **Schema Definition**: Schemas are defined in the `src/api/validation` directory, organized by entity type (e.g., `assertion.schemas.ts`, `badgeClass.schemas.ts`, `issuer.schemas.ts`).

2. **Controller Validation**: Controllers use these schemas to validate incoming request data before processing it.

3. **Type Inference**: Types are inferred from the schemas using Zod's `z.infer<typeof Schema>` utility, ensuring type safety between validation and usage.

4. **Entity Mapping**: After validation, data is mapped to internal entity formats using dedicated mapping functions that handle type conversions and property transformations.

## Schema Structure

Each entity has multiple schemas:

- **Base Schema**: Defines common fields shared across versions
- **Create Schema**: Extends the base schema for creation operations
- **Update Schema**: Typically a partial version of the create schema for update operations

Example:

```typescript
// Base schema with common fields
export const AssertionBaseSchema = z.object({
  recipient: RecipientSchema,
  badge: z.string(),
  issuedOn: z.string().datetime(),
  // ...other fields
});

// Create schema for OB2
export const CreateAssertionOB2Schema = AssertionBaseSchema.extend({
  type: z.union([z.string(), z.array(z.string())]).optional(),
});

// Create schema for OB3
export const CreateAssertionOB3Schema = AssertionBaseSchema.extend({
  type: z.string().optional(),
  id: z.string().optional(),
  credentialSubject: z.record(z.unknown()).optional(),
});

// Union schema for both versions
export const CreateAssertionSchema = z.union([
  CreateAssertionOB2Schema,
  CreateAssertionOB3Schema,
]);

// Update schema (partial version)
export const UpdateAssertionSchema = z.union([
  CreateAssertionOB2Schema.partial(),
  CreateAssertionOB3Schema.partial(),
]);
```

## Entity Mapping

After validation, data is mapped to internal entity formats using dedicated mapping functions:

```typescript
function mapToAssertionEntity(
  data: ValidatedCreateAssertionData | ValidatedUpdateAssertionData
): Partial<Assertion> {
  const mappedData: Partial<Assertion> = {};
  
  // Map properties with appropriate type handling
  if (data.badge !== undefined) mappedData.badgeClass = data.badge as Shared.IRI;
  if (data.recipient !== undefined) mappedData.recipient = data.recipient as OB2.IdentityObject | OB3.CredentialSubject;
  // ...other mappings
  
  return mappedData;
}
```

## Best Practices

1. **Strict Schemas**: Use `strict()` on schemas to reject unknown fields, preventing potential security issues.

2. **Custom Error Messages**: Provide clear error messages for validation failures.

3. **Type Safety**: Use type inference to ensure type safety between validation and usage.

4. **Dedicated Mapping Functions**: Create dedicated functions for mapping validated data to internal entity formats.

5. **Handle Complex Types**: Use type guards and explicit casting for complex nested structures.

## Future Improvements

1. **Validation Middleware**: Consider implementing validation middleware to centralize validation logic.

2. **Schema Documentation**: Generate API documentation from schemas.

3. **Test Coverage**: Add comprehensive tests for validation logic.
