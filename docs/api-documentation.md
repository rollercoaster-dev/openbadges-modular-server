# Open Badges API Documentation

This document provides comprehensive documentation for the Open Badges API, which supports both Open Badges 2.0 and 3.0 specifications.

## Overview

The Open Badges API is a stateless, modular API built using Bun and Elysia, with support for multiple database backends (initially PostgreSQL). The API follows Domain-Driven Design principles and provides endpoints for managing issuers, badge classes, and assertions according to both Open Badges 2.0 and 3.0 specifications.

## Dual-Version Support

The API provides full support for both Open Badges 2.0 and 3.0 specifications through:

1. **Versioned Endpoints**: Access version-specific endpoints via `/v2/...` or `/v3/...` paths
2. **Unified Domain Model**: Core entities represent both specifications with version-specific serialization
3. **Version Detection**: Automatic detection of badge version from JSON-LD context
4. **Format Conversion**: Utilities for converting between 2.0 and 3.0 formats

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

### Version 3.0 Endpoints (Open Badges 3.0)

All endpoints under the `/v3/` path return responses formatted according to the Open Badges 3.0 specification.

#### Issuers

- `POST /v3/issuers` - Create a new issuer
- `GET /v3/issuers` - Get all issuers
- `GET /v3/issuers/:id` - Get an issuer by ID
- `PUT /v3/issuers/:id` - Update an issuer
- `DELETE /v3/issuers/:id` - Delete an issuer

#### Badge Classes

- `POST /v3/badge-classes` - Create a new badge class
- `GET /v3/badge-classes` - Get all badge classes
- `GET /v3/badge-classes/:id` - Get a badge class by ID
- `GET /v3/issuers/:id/badge-classes` - Get badge classes by issuer
- `PUT /v3/badge-classes/:id` - Update a badge class
- `DELETE /v3/badge-classes/:id` - Delete a badge class

#### Assertions

- `POST /v3/assertions` - Create a new assertion
- `GET /v3/assertions` - Get all assertions
- `GET /v3/assertions/:id` - Get an assertion by ID
- `GET /v3/badge-classes/:id/assertions` - Get assertions by badge class
- `PUT /v3/assertions/:id` - Update an assertion
- `POST /v3/assertions/:id/revoke` - Revoke an assertion
- `GET /v3/assertions/:id/verify` - Verify an assertion

### Default Endpoints

For convenience, the API also provides default endpoints without version prefixes that use the Open Badges 3.0 format.

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

### Badge Class

A type of badge that can be issued.

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

### Assertion

A badge awarded to a recipient.

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

#### Open Badges 3.0 Format (Verifiable Credential)

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
  }
}
```

## Working with IRI Types

The API provides utility functions for working with `Shared.IRI` types. These functions are available in the `src/utils/types/iri-utils.ts` file.

### Converting Between String and IRI

```typescript
import { toIRI, toString } from '../utils/types/iri-utils';

// Convert a string to an IRI
const id = toIRI('123e4567-e89b-12d3-a456-426614174000');

// Convert an IRI to a string
const idString = toString(id);
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
```

### Working with Arrays and Objects

```typescript
import { toIRIArray, toStringArray, objectWithIRIToString, objectWithStringToIRI } from '../utils/types/iri-utils';

// Convert an array of strings to an array of IRIs
const iriArray = toIRIArray(['https://example.org/badges/1', 'https://example.org/badges/2']);

// Convert an array of IRIs to an array of strings
const stringArray = toStringArray(iriArray);

// Convert IRI properties in an object to string properties
const stringObject = objectWithIRIToString(iriObject, ['id', 'url']);

// Convert string properties in an object to IRI properties
const iriObject = objectWithStringToIRI(stringObject, ['id', 'url']);
```

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

## Contributing

Contributions are welcome! Please see the README for information on how to contribute to the project.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
