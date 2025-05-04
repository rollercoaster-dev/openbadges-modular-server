# Entity Type Safety in OpenBadges Modular Server

This document describes the approach to type safety in the core entities of the OpenBadges Modular Server.

## Overview

The OpenBadges Modular Server uses TypeScript to provide type safety throughout the codebase. The core entities (Issuer, BadgeClass, Assertion, and UserAssertion) are designed to be compatible with both OpenBadges 2.0 and 3.0 specifications.

## Entity Design

Each entity has a `toObject()` method that returns a properly typed representation of the entity, compatible with the OpenBadges specifications:

- **Issuer**: Returns `OB2.Profile | OB3.Issuer`
- **BadgeClass**: Returns `OB2.BadgeClass | OB3.Achievement`
- **Assertion**: Returns `OB2.Assertion | OB3.VerifiableCredential`
- **UserAssertion**: Returns `UserAssertionData`

## Version-Specific Transformations

The `toObject()` method in each entity takes an optional `version` parameter that controls the output format:

```typescript
toObject(version: BadgeVersion = BadgeVersion.V3): OB2.Profile | OB3.Issuer {
  // Create a base object with common properties
  const baseObject = {
    id: this.id,
    name: this.name,
    // ...other common properties
  };

  // Add version-specific properties
  if (version === BadgeVersion.V2) {
    // OB2 specific format
    return {
      ...baseObject,
      type: 'Issuer',
      // ...other OB2 specific properties
    } as OB2.Profile;
  } else {
    // OB3 specific format
    return {
      ...baseObject,
      type: 'Profile',
      // ...other OB3 specific properties
    } as OB3.Issuer;
  }
}
```

## JSON-LD Serialization

The `toJsonLd()` method in each entity uses the `toObject()` method to get a properly typed representation of the entity, and then passes it to the appropriate serializer:

```typescript
toJsonLd(version: BadgeVersion = BadgeVersion.V3): Record<string, unknown> {
  const serializer = BadgeSerializerFactory.createSerializer(version);
  
  // Use toObject() with the specified version to get properly typed data
  const typedData = this.toObject(version);
  
  // Ensure the data has all required fields for the serializer
  const dataForSerializer = {
    ...typedData,
    // Add any required fields that might be missing
  };
  
  // Pass the properly typed data to the serializer
  return serializer.serializeIssuer(dataForSerializer);
}
```

## Type Guards

Type guards are used to check the type of objects at runtime:

```typescript
// Type guard to check if an object is a SignedBadgeVerification
function isSignedBadgeVerification(proof: unknown): proof is SignedBadgeVerification {
  return (
    typeof proof === 'object' &&
    proof !== null &&
    'type' in proof &&
    proof.type === 'SignedBadge' &&
    'creator' in proof &&
    'created' in proof &&
    'signatureValue' in proof
  );
}
```

## Benefits

This approach provides several benefits:

1. **Type Safety**: The TypeScript compiler can catch type errors at compile time.
2. **Version Compatibility**: The entities can be serialized to either OpenBadges 2.0 or 3.0 format.
3. **Clear Interfaces**: The interfaces for each entity are clearly defined and documented.
4. **Reduced Type Assertions**: The need for type assertions (`as`) is minimized, reducing the risk of runtime errors.

## Example Usage

```typescript
// Create an issuer
const issuer = Issuer.create({
  name: 'Example Issuer',
  url: 'https://example.com',
  email: 'issuer@example.com'
});

// Get the issuer as an OB2.Profile
const ob2Issuer = issuer.toObject(BadgeVersion.V2);

// Get the issuer as an OB3.Issuer
const ob3Issuer = issuer.toObject(BadgeVersion.V3);

// Get the issuer as JSON-LD
const jsonLd = issuer.toJsonLd(BadgeVersion.V3);
```

## Future Improvements

1. **Type Narrowing**: Add more type guards to narrow types in complex scenarios.
2. **Schema Validation**: Add runtime schema validation to ensure the entities conform to the OpenBadges specifications.
3. **Type Generation**: Generate TypeScript types from the OpenBadges JSON schemas.
