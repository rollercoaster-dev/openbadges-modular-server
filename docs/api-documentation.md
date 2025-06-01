# Open Badges API Documentation

This document provides comprehensive documentation for the Open Badges API, which currently implements the Open Badges 2.0 "hosted" specification with a planned roadmap for full Open Badges 3.0 implementation.

## Overview

The Open Badges API is a stateless, modular API built using Bun and Hono, with support for multiple database backends (SQLite and PostgreSQL). The API follows Domain-Driven Design principles and provides endpoints for managing issuers, badge classes, and assertions according to the Open Badges 2.0 specification, with a planned roadmap for full Open Badges 3.0 implementation.

## Implementation Status

### Current Status: Open Badges 2.0 "Hosted" Implementation

The current version provides a robust implementation of the Open Badges 2.0 specification for "hosted" badges, including:
- Core entities (Issuer, BadgeClass, Assertion) structured according to the OB2 JSON-LD schema
- Issuance workflow for creating issuers, defining badge classes, and issuing assertions
- Hosted verification with proper verification objects and programmatic status checks
- Complete data for display in client applications

### Roadmap to Full Open Badges Implementation

The project follows a phased roadmap toward full Open Badges 2.0 feature-completeness and subsequent Open Badges 3.0 implementation. For the detailed roadmap with specific tasks and success criteria, see the [OB3 Roadmap](./ob3-roadmap.md).

## API Version Support

The API provides versioned endpoints for both Open Badges 2.0 and 3.0 specifications through:

1. **Versioned Endpoints**: Access version-specific endpoints via `/v2/...` or `/v3/...` paths
2. **Unified Domain Model**: Core entities represent both specifications with version-specific serialization
3. **Version Detection**: Automatic detection of badge version from JSON-LD context
4. **Format Conversion**: Utilities for converting between 2.0 and 3.0 formats

Note: While `/v3/...` endpoints are available, they are currently in development and may not fully implement all Open Badges 3.0 features. See the roadmap for implementation details.

## API Endpoints

### Version 2.0 Endpoints (Open Badges 2.0)

All endpoints under the `/v2/` path return responses formatted according to the Open Badges 2.0 specification.

#### Issuers

- `POST /v2/issuers` - Create a new issuer
- `GET /v2/issuers` - Get all issuers
- `GET /v2/issuers/:id` - Get an issuer by ID
- `PUT /v2/issuers/:id` - Update an issuer
- `DELETE /v2/issuers/:id` - Delete an issuer

#### Badge Classes

- `POST /v2/badge-classes` - Create a new badge class
- `GET /v2/badge-classes` - Get all badge classes
- `GET /v2/badge-classes/:id` - Get a badge class by ID
- `GET /v2/issuers/:id/badge-classes` - Get badge classes by issuer
- `PUT /v2/badge-classes/:id` - Update a badge class
- `DELETE /v2/badge-classes/:id` - Delete a badge class

#### Assertions

- `POST /v2/assertions` - Create a new assertion
- `GET /v2/assertions` - Get all assertions
- `GET /v2/assertions/:id` - Get an assertion by ID
- `GET /v2/badge-classes/:id/assertions` - Get assertions by badge class
- `PUT /v2/assertions/:id` - Update an assertion
- `POST /v2/assertions/:id/revoke` - Revoke an assertion
- `GET /v2/assertions/:id/verify` - Verify an assertion

### Version 3.0 Endpoints (Open Badges 3.0) - In Development

All endpoints under the `/v3/` path are designed to return responses formatted according to the Open Badges 3.0 specification. These endpoints are currently in development and may not fully implement all Open Badges 3.0 features as outlined in the [OB3 Roadmap](./ob3-roadmap.md).

The implementation of these endpoints will follow the phased approach described in the roadmap, with full Open Badges 3.0 compliance expected after completing all phases.

#### Issuers

- `POST /v3/issuers` - Create a new issuer
- `GET /v3/issuers` - Get all issuers
- `GET /v3/issuers/:id` - Get an issuer by ID
- `PUT /v3/issuers/:id` - Update an issuer
- `DELETE /v3/issuers/:id` - Delete an issuer

#### Achievements (v3.0 Compliant Naming)

The following endpoints use the Open Badges 3.0 compliant naming convention where "BadgeClass" is referred to as "Achievement":

- `POST /v3/achievements` - Create a new achievement
- `GET /v3/achievements` - Get all achievements
- `GET /v3/achievements/:id` - Get an achievement by ID
- `GET /v3/issuers/:id/achievements` - Get achievements by issuer
- `PUT /v3/achievements/:id` - Update an achievement
- `DELETE /v3/achievements/:id` - Delete an achievement

#### Credentials (v3.0 Compliant Naming)

The following endpoints use the Open Badges 3.0 compliant naming convention where "Assertion" is referred to as "Credential":

- `POST /v3/credentials` - Create a new credential
- `GET /v3/credentials` - Get all credentials
- `GET /v3/credentials/:id` - Get a credential by ID
- `GET /v3/achievements/:id/credentials` - Get credentials by achievement
- `PUT /v3/credentials/:id` - Update a credential
- `POST /v3/credentials/:id/revoke` - Revoke a credential
- `GET /v3/credentials/:id/verify` - Verify a credential
- `POST /v3/credentials/:id/sign` - Sign a credential

#### Legacy Endpoints (Deprecated)

⚠️ **DEPRECATED**: The following endpoints are deprecated and will be removed in a future version. Please use the v3.0 compliant endpoints above.

**Badge Classes (Legacy)**
- `POST /v3/badge-classes` - Create a new badge class *(Use `/v3/achievements` instead)*
- `GET /v3/badge-classes` - Get all badge classes *(Use `/v3/achievements` instead)*
- `GET /v3/badge-classes/:id` - Get a badge class by ID *(Use `/v3/achievements/:id` instead)*
- `GET /v3/issuers/:id/badge-classes` - Get badge classes by issuer *(Use `/v3/issuers/:id/achievements` instead)*
- `PUT /v3/badge-classes/:id` - Update a badge class *(Use `/v3/achievements/:id` instead)*
- `DELETE /v3/badge-classes/:id` - Delete a badge class *(Use `/v3/achievements/:id` instead)*

**Assertions (Legacy)**
- `POST /v3/assertions` - Create a new assertion *(Use `/v3/credentials` instead)*
- `GET /v3/assertions` - Get all assertions *(Use `/v3/credentials` instead)*
- `GET /v3/assertions/:id` - Get an assertion by ID *(Use `/v3/credentials/:id` instead)*
- `GET /v3/badge-classes/:id/assertions` - Get assertions by badge class *(Use `/v3/achievements/:id/credentials` instead)*
- `PUT /v3/assertions/:id` - Update an assertion *(Use `/v3/credentials/:id` instead)*
- `POST /v3/assertions/:id/revoke` - Revoke an assertion *(Use `/v3/credentials/:id/revoke` instead)*
- `GET /v3/assertions/:id/verify` - Verify an assertion *(Use `/v3/credentials/:id/verify` instead)*
- `POST /v3/assertions/:id/sign` - Sign an assertion *(Use `/v3/credentials/:id/sign` instead)*

> **Note**: Legacy endpoints include deprecation warnings in response headers and response bodies. The `Deprecation` header is set to `true`, and a `Link` header points to the successor endpoint. Response bodies include a `_deprecation` object with migration information.

### Default Endpoints

For convenience, the API also provides default endpoints without version prefixes. Currently, these endpoints use the Open Badges 3.0 format structure but may not fully implement all Open Badges 3.0 features as the implementation progresses through the roadmap phases.

As the Open Badges 3.0 implementation matures according to the roadmap, these default endpoints will be updated to fully comply with the Open Badges 3.0 specification.

## Data Models

### Type System

The API uses the `openbadges-types` package as the single source of truth for types. This package provides TypeScript types for the Open Badges 2.0 and 3.0 specifications, as well as shared types that are used across both specifications.

One of the key shared types is `Shared.IRI` (Internationalized Resource Identifier), which is used for all identifiers and URLs in the API. This type is a branded string type that ensures type safety when working with IRIs.

```typescript
import { Shared } from 'openbadges-types';

// Creating an IRI from a string
const id: Shared.IRI = '123e4567-e89b-12d3-a456-426614174000' as Shared.IRI;
const url: Shared.IRI = 'https://example.org/badges/1' as Shared.IRI;

// Using IRIs in API calls
const issuer = await issuerRepository.findById(id);
const badgeClass = await badgeClassRepository.findByIssuer(issuer.id);
```

### Issuer

An organization or individual that issues badges.

#### Open Badges 2.0 Format

```json
{
  "@context": "https://w3id.org/openbadges/v2",
  "id": "https://example.org/issuers/1",
  "type": "Issuer",
  "name": "Example Organization",
  "url": "https://example.org",
  "email": "badges@example.org",
  "description": "An example organization that issues badges",
  "image": "https://example.org/logo.png"
}
```

#### Open Badges 3.0 Format

```json
{
  "@context": "https://w3id.org/openbadges/v3",
  "id": "https://example.org/issuers/1",
  "type": "Profile",
  "name": "Example Organization",
  "url": "https://example.org",
  "email": "badges@example.org",
  "description": "An example organization that issues badges",
  "image": "https://example.org/logo.png"
}
```

> Note: Fields like `id`, `url`, and `image` are IRIs (`Shared.IRI`).

##### OB3ImageObject Example

```json
{
  "@context": "https://w3id.org/openbadges/v3",
  "id": "https://example.org/issuers/1",
  "type": "Profile",
  "name": "Example Organization",
  "image": {
    "id": "https://example.org/images/logo.png",
    "type": "Image",
    "caption": { "en": "Organization Logo" },
    "author": "https://example.org"
  }
}
```

### Badge Class / Achievement

A type of badge that can be issued. In Open Badges 3.0, this is referred to as an "Achievement".

#### Open Badges 2.0 Format

```json
{
  "@context": "https://w3id.org/openbadges/v2",
  "id": "https://example.org/badges/1",
  "type": "BadgeClass",
  "name": "Example Badge",
  "description": "An example badge",
  "image": "https://example.org/badges/1/image.png",
  "criteria": {
    "narrative": "The recipient must complete all required tasks."
  },
  "issuer": "https://example.org/issuers/1",
  "tags": ["example", "badge"]
}
```

#### Open Badges 3.0 Format

```json
{
  "@context": "https://w3id.org/openbadges/v3",
  "id": "https://example.org/badges/1",
  "type": "BadgeClass",
  "name": "Example Badge",
  "description": "An example badge",
  "image": "https://example.org/badges/1/image.png",
  "criteria": {
    "narrative": "The recipient must complete all required tasks."
  },
  "issuer": "https://example.org/issuers/1",
  "tags": ["example", "badge"]
}
```

### Assertion / Credential

A badge awarded to a recipient. In Open Badges 3.0, this is referred to as a "Credential" and is implemented as a Verifiable Credential.

#### Open Badges 2.0 Format

```json
{
  "@context": "https://w3id.org/openbadges/v2",
  "id": "https://example.org/assertions/1",
  "type": "Assertion",
  "recipient": {
    "type": "email",
    "identity": "recipient@example.org",
    "hashed": false
  },
  "badgeClass": "https://example.org/badges/1",
  "verification": {
    "type": "hosted"
  },
  "issuedOn": "2023-01-01T00:00:00Z",
  "expires": "2024-01-01T00:00:00Z",
  "evidence": {
    "id": "https://example.org/evidence/1",
    "narrative": "The recipient completed all required tasks."
  }
}
```

> Note: The `badgeClass` field is an IRI (`Shared.IRI`).

#### Open Badges 3.0 Format (Verifiable Credential) - Planned Implementation

The following format represents the target Open Badges 3.0 implementation as outlined in the [OB3 Roadmap](./ob3-roadmap.md). This format will be fully implemented as the project progresses through the roadmap phases, particularly Phase 5 (OB 3.0 Core VC) and beyond.

```json
{
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://w3id.org/openbadges/v3"
  ],
  "id": "https://example.org/assertions/1",
  "type": ["VerifiableCredential", "OpenBadgeCredential"],
  "issuer": {
    "id": "https://example.org/issuers/1",
    "type": "Profile",
    "name": "Example Organization",
    "url": "https://example.org"
  },
  "issuanceDate": "2023-01-01T00:00:00Z",
  "expirationDate": "2024-01-01T00:00:00Z",
  "credentialSubject": {
    "id": "recipient@example.org",
    "type": "AchievementSubject",
    "achievement": {
      "id": "https://example.org/badges/1",
      "type": "Achievement",
      "name": "Example Badge",
      "description": "An example badge",
      "image": "https://example.org/badges/1/image.png",
      "criteria": {
        "narrative": "The recipient must complete all required tasks."
      }
    }
  },
  "evidence": {
    "id": "https://example.org/evidence/1",
    "narrative": "The recipient completed all required tasks."
  },
  "proof": {
    // Will be implemented in Phase 5 (OB 3.0 Core VC)
  }
}
```

## Working with IRI Types

The API provides utility functions for working with `Shared.IRI` types. These functions are available in the `src/utils/types/iri-utils.ts` file.

### Converting Between String and IRI

```typescript
import { toIRI, toString } from '../utils/types/iri-utils';

// Convert a string to an IRI (returns null if the string is not a valid IRI)
const id = toIRI('123e4567-e89b-12d3-a456-426614174000');

// Convert an IRI to a string
const idString = toString(id);

// Creating an IRI with validation
import { createOrGenerateIRI } from '../utils/types/type-utils';

// Create an IRI from a string (throws an error if invalid)
const validIRI = createOrGenerateIRI('https://example.org/badges/1');

// Generate a new random UUID as an IRI
const newIRI = createOrGenerateIRI();
```

### Validating IRIs

```typescript
import { isValidIRI, ensureValidIRI } from '../utils/types/iri-utils';

// Check if a value is a valid IRI
if (isValidIRI('https://example.org/badges/1')) {
  // Do something with the IRI
}

// Ensure a value is a valid IRI, or return null
const validIRI = ensureValidIRI(possibleIRI);

// Create a URL IRI (returns undefined if not a valid URL)
import { toUrlIRI } from '../utils/types/type-utils';
const urlIRI = toUrlIRI('https://example.org/badges/1');
```

### Working with Arrays and Objects

```typescript
import { toIRIArray, toStringArray, objectWithIRIToString, objectWithStringToIRI } from '../utils/types/iri-utils';

// Convert an array of strings to an array of IRIs (filters out invalid IRIs)
const iriArray = toIRIArray(['https://example.org/badges/1', 'https://example.org/badges/2']);

// Convert an array of IRIs to an array of strings
const stringArray = toStringArray(iriArray);

// Convert IRI properties in an object to string properties
const stringObject = objectWithIRIToString(iriObject, ['id', 'url']);

// Convert string properties in an object to IRI properties
// This will throw an error if any of the properties are not valid IRIs
try {
  const iriObject = objectWithStringToIRI(stringObject, ['id', 'url']);
} catch (error) {
  console.error('Failed to convert properties to IRIs:', error.message);
}
```

### Best Practices for Working with IRIs

1. **Always validate IRIs**: Use `isValidIRI` or `ensureValidIRI` to check if a value is a valid IRI before using it.
2. **Use utility functions**: Instead of manual type assertions (`as Shared.IRI`), use the provided utility functions.
3. **Handle errors**: Functions like `objectWithStringToIRI` will throw errors for invalid IRIs, so make sure to handle these errors appropriately.
4. **Be consistent**: Use `Shared.IRI` for all identifiers and URLs throughout your application.
5. **Use proper creation**: When creating new IRIs, use `createOrGenerateIRI` to ensure they are valid.

## Version Conversion

The API provides utilities for converting between Open Badges 2.0 and 3.0 formats. These utilities are used internally by the API but can also be useful for client applications.

### Version Detection

The API can automatically detect the version of a badge from its JSON-LD context:

```typescript
import { detectBadgeVersion } from '../utils/version/badge-version';

const badgeData = {
  "@context": "https://w3id.org/openbadges/v2",
  "id": "https://example.org/assertions/1",
  "type": "Assertion",
  // ...
};

const version = detectBadgeVersion(badgeData); // Returns BadgeVersion.V2
```

### Version-Specific Serialization

The API provides serializers for converting between domain entities and version-specific JSON-LD formats:

```typescript
import { BadgeSerializerFactory } from '../utils/version/badge-serializer';
import { BadgeVersion } from '../utils/version/badge-version';

// Create a serializer for Open Badges 2.0
const v2Serializer = BadgeSerializerFactory.createSerializer(BadgeVersion.V2);

// Create a serializer for Open Badges 3.0
const v3Serializer = BadgeSerializerFactory.createSerializer(BadgeVersion.V3);

// Serialize an issuer to Open Badges 2.0 format
const v2Issuer = v2Serializer.serializeIssuer(issuerData);

// Serialize an issuer to Open Badges 3.0 format
const v3Issuer = v3Serializer.serializeIssuer(issuerData);
```

## Database Integration

The API is designed to be database-agnostic, with a modular architecture that allows for easy integration with different database systems. The initial implementation uses PostgreSQL with Drizzle ORM, but additional database modules can be added by implementing the required interfaces.

See the [Database Module Guide](./database-module-guide.md) for more information on adding support for additional database systems.

## Authentication and Security

The API uses JWT for authentication and implements best practices for security, including:

- Input validation
- HTTPS support
- Rate limiting
- CORS configuration
- Secure key management

## Deployment

The API can be deployed as a standalone service or integrated into an existing application. See the README for deployment instructions.

## Open Badges 3.0 Implementation Roadmap

The API follows a phased approach to implementing the Open Badges 3.0 specification. The roadmap is divided into the following phases:

1. **OB 2.0 Feature-Complete**: Adding signed assertions, issuer public keys, and enhanced verification
   - Generate JWS (RS256) for each assertion
   - Expose issuer publicKey in profile

2. **RevocationList**: Implementing revocation lists for signed badges
   - Publish `/revocations/<issuer>.json` (using either a spec bitstring or array)
   - Add revocationList link to issuer profile

3. **Evidence & Alignment**: Supporting evidence objects and alignment arrays
   - Accept evidence objects and alignment arrays on assertions/badge-class

4. **Baked Images Helper**: Developing tools for baking PNG/SVG images with assertion URLs
   - Develop CLI/endpoint to bake PNG/SVG images with assertion URL

5. **OB 3.0 Core VC**: Wrapping assertions in Verifiable Credential envelopes
   - Add VC envelope (with type, issuer, credentialSubject, issuanceDate)
   - Move badge → embed in credentialSubject.achievement
   - Generate proof (starting with JWS)
   - Create new `/v3/assertions` returning VC-JSON

6. **Issuer Identity & Keys**: Implementing JWKS and DID:web methodology for verifiable issuer identity
   - Publish JWKS at `/.well-known/jwks.json` or adopt DID:web methodology
   - Rotate keys via migration script
   - Add verificationMethod DID URL to issuer object

7. **Status & Revocation for OB 3**: Implementing VC-native revocation
   - Implement StatusList2021 (bitstring, 16k entries)
   - Add credentialStatus to every VC
   - Set up a nightly job to rebuild lists

8. **OB 3 Service Description & OAuth**: Implementing CLR/BadgeConnect 3.0 API
   - Publish service JSON at `/.well-known/openbadges`
   - Implement OAuth 2 client-credentials flow
   - Add GET `/credentials` with pagination and filters

9. **Compliance & Interop Tests**: Integrating conformance testing
   - Integrate the OpenBadges Conformance Suite in CI
   - Run vc-http-api test harness for proofs/status
   - Perform fuzz tests for schema variants

10. **Docs & Developer UX**: Providing comprehensive documentation for both versions
    - Split documentation: "Using OB 2" vs "Using OB 3"
    - Provide code samples in strict TypeScript
    - Create a migration guide from `/v2` to `/v3`

For the detailed roadmap with specific tasks and success criteria, see the [OB3 Roadmap](./ob3-roadmap.md).

## Contributing

Contributions are welcome! Please see the README for information on how to contribute to the project.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
