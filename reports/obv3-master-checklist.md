# Open Badges 3.0 Master Checklist

A comprehensive checklist for implementing Open Badges 3.0 specification compliance.

**Sources:**
- Open Badges 3.0 Specification (https://purl.imsglobal.org/spec/ob/v3p0/)
- VC Data Model v2.0
- VC-JOSE-COSE

## Core Verifiable Credential Requirements

| Feature | Requirement Level | Description | Source |
|---------|------------------|-------------|--------|
| **VC Envelope Structure** | MUST | OpenBadgeCredential MUST be wrapped in Verifiable Credential envelope | OB 3.0 Spec |
| `@context` Property | MUST | MUST include required JSON-LD contexts | VC Data Model 2.0 |
| Required Contexts | MUST | MUST include `https://www.w3.org/ns/credentials/v2` and `https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json` | OB 3.0 Spec |
| `type` Property | MUST | MUST include ["VerifiableCredential", "OpenBadgeCredential"] | OB 3.0 Spec |
| `issuer` Property | MUST | MUST contain issuer Profile with id | OB 3.0 Spec |
| `validFrom` Property | MUST | MUST specify when credential becomes valid | OB 3.0 Spec |
| `credentialSubject` Property | MUST | MUST contain AchievementSubject | OB 3.0 Spec |
| Subject Identity | MUST | credentialSubject MUST have id and/or identifier | OB 3.0 Spec |
| Achievement Property | MUST | credentialSubject MUST contain achievement | OB 3.0 Spec |
| UTF-8 Encoding | MUST | JSON MUST be encoded using UTF-8 for non-closed ecosystems | OB 3.0 Spec |

## Proof Requirements

| Feature | Requirement Level | Description | Source |
|---------|------------------|-------------|--------|
| **At Least One Proof** | MUST | Credential MUST have at least one verifiable proof | VC Data Model 2.0 |
| JWT Proof Support | MUST | MUST support JSON Web Token (VC-JWT) proof format | OB 3.0 Spec |
| JWS Algorithm | MUST | JWT proof MUST use RS256 algorithm (minimum) | OB 3.0 Spec |
| JOSE Header | MUST | MUST include alg property, MAY include kid/jwk/typ | OB 3.0 Spec |
| JWT Claims | MUST | MUST include iss, sub, nbf, jti claims | OB 3.0 Spec |
| Public Key Access | MUST | MUST provide public key via kid URI or jwk property | OB 3.0 Spec |
| Linked Data Proof Support | SHOULD | SHOULD support EdDSA Linked Data Proofs | OB 3.0 Spec |
| Multiple Proofs | MAY | MAY include multiple proof formats | OB 3.0 Spec |

## Document Format Requirements

| Feature | Requirement Level | Description | Source |
|---------|------------------|-------------|--------|
| **File Extensions** | SHOULD | JWT files SHOULD use .jws or .jwt extension | OB 3.0 Spec |
| **JSON-LD Files** | SHOULD | Embedded proof files SHOULD use .json extension | OB 3.0 Spec |
| **Content-Type** | SHOULD | JWT web resources SHOULD use text/plain | OB 3.0 Spec |
| **LD Content-Type** | SHOULD | JSON-LD web resources SHOULD use application/vc+ld+json | OB 3.0 Spec |
| **PNG Baking** | MUST | PNG baking MUST use iTXt chunk with keyword 'openbadgecredential' | OB 3.0 Spec |
| **SVG Baking** | MUST | SVG baking MUST use openbadges:credential element | OB 3.0 Spec |
| **Baking Uniqueness** | MUST | Only one credential per image file | OB 3.0 Spec |

## Verification Requirements

| Feature | Requirement Level | Description | Source |
|---------|------------------|-------------|--------|
| **Schema Validation** | MUST | MUST validate against JSON Schema if credentialSchema present | OB 3.0 Spec |
| **Subject Identity Check** | MUST | MUST verify credentialSubject has id and/or identifier | OB 3.0 Spec |
| **Signature Verification** | MUST | MUST verify proof signatures | OB 3.0 Spec |
| **Refresh Support** | SHOULD | SHOULD support credential refresh if refreshService present | OB 3.0 Spec |
| **Status Checking** | MUST | MUST check revocation status if credentialStatus present | OB 3.0 Spec |
| **Date Validation** | MUST | MUST check validFrom and validUntil dates | OB 3.0 Spec |
| **Recipient Verification** | SHOULD | SHOULD verify recipient identity when credential is exchanged as a document | OB 3.0 Spec |
| **Endorsement Verification** | MUST | MUST verify any embedded EndorsementCredentials | OB 3.0 Spec |

## API Requirements

| Feature | Requirement Level | Description | Source |
|---------|------------------|-------------|--------|
| **TLS Security** | MUST | All API endpoints MUST use TLS 1.2 or 1.3 | OB 3.0 Spec |
| **OAuth 2.0** | MUST | Secure endpoints MUST use OAuth 2.0 authentication | OB 3.0 Spec |
| **Credential Scopes** | MUST | MUST implement required OAuth scopes for credential operations | OB 3.0 Spec |
| **GET /credentials** | MUST | MUST implement getCredentials endpoint | OB 3.0 Spec |
| **POST /credentials** | MUST | MUST implement upsertCredential endpoint | OB 3.0 Spec |
| **GET /profile** | MUST | MUST implement getProfile endpoint | OB 3.0 Spec |
| **PUT /profile** | MUST | MUST implement putProfile endpoint | OB 3.0 Spec |
| **Service Discovery** | MUST | MUST provide unprotected discovery endpoint | OB 3.0 Spec |
| **Pagination Support** | MUST | MUST support pagination for credential lists | OB 3.0 Spec |
| **Pagination Headers** | MUST | MUST include X-Total-Count and Link headers for pagination | OB 3.0 Spec |

## OAuth and Security

| Feature | Requirement Level | Description | Source |
|---------|------------------|-------------|--------|
| **OAuth Scopes** | MUST | MUST implement specified credential and profile scopes | OB 3.0 Spec |
| **Service Description** | SHOULD | SHOULD publish OAuth service description document | OB 3.0 Spec |
| **Well-known Endpoint** | SHOULD | SHOULD provide /.well-known/openbadges endpoint | OB 3.0 Spec |
| **Authorization Code Flow** | MUST | MUST support OAuth 2.0 Authorization Code Grant | OB 3.0 Spec |
| **Client Credentials** | MAY | MAY support OAuth 2.0 Client Credentials Grant | OB 3.0 Spec |

## Credential Status and Revocation

| Feature | Requirement Level | Description | Source |
|---------|------------------|-------------|--------|
| **Revocation Support** | SHOULD | SHOULD implement credentialStatus for revocation | OB 3.0 Spec |
| **RevocationList** | SHOULD | SHOULD support 1EdTechRevocationList status type | OB 3.0 Spec |
| **StatusList2021** | SHOULD | SHOULD implement StatusList2021 for VC-native revocation | OB 3.0 Spec |
| **Status Checking** | MUST | MUST check revocation status during verification | OB 3.0 Spec |

## Key Management

| Feature | Requirement Level | Description | Source |
|---------|------------------|-------------|--------|
| **Public Key Dereferencing** | MUST | MUST support HTTP URL dereferencing for public keys | OB 3.0 Spec |
| **JWK Format** | MUST | Public keys MUST be available in JWK format | OB 3.0 Spec |
| **JWKS Endpoint** | SHOULD | SHOULD provide /.well-known/jwks.json endpoint | OB 3.0 Spec |
| **DID Support** | MAY | MAY support DID:web methodology | OB 3.0 Spec |
| **Key Security** | MUST | MUST NOT expose private key material in JWK | OB 3.0 Spec |

## Extended Features

| Feature | Requirement Level | Description | Source |
|---------|------------------|-------------|--------|
| **Evidence Objects** | SHOULD | SHOULD support evidence objects in assertions | OB 3.0 Spec |
| **Alignment Arrays** | SHOULD | SHOULD support alignment arrays in badge classes | OB 3.0 Spec |
| **Endorsements** | MAY | MAY support EndorsementCredentials | OB 3.0 Spec |
| **Image Baking** | MAY | MAY provide CLI/endpoint for baking images | OB 3.0 Spec |
| **Multiple Formats** | MAY | MAY support both PNG and SVG baking | OB 3.0 Spec |

## Conformance and Testing

| Feature | Requirement Level | Description | Source |
|---------|------------------|-------------|--------|
| **Conformance Tests** | SHOULD | SHOULD integrate OpenBadges Conformance Suite | OB 3.0 Spec |
| **VC-HTTP-API Tests** | SHOULD | SHOULD run vc-http-api test harness | OB 3.0 Spec |
| **Schema Validation** | MUST | MUST validate against provided JSON schemas | OB 3.0 Spec |
| **Interoperability** | MUST | MUST ensure interoperability with other OB 3.0 implementations | OB 3.0 Spec |

---

**Legend:**
- **MUST** = Mandatory requirement for compliance
- **SHOULD** = Recommended for best practices
- **MAY** = Optional feature

**Note:** This checklist is derived from the Open Badges 3.0 specification and related W3C standards. Implementers SHOULD verify their work against the latest specification versions and conformance test suites.
