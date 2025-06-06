# OpenBadges Modular Server (OBMS): Current State & Future Roadmap Reference

This document provides a concise overview of the OpenBadges Modular Server's current capabilities regarding Open Badges 2.0 (OB2), key areas for enhancement based on recent compliance reviews, and the planned roadmap towards full OB2 feature-completeness and subsequent Open Badges 3.0 (OB3) implementation.

## Current State: OB 2.0 Hosted Badge Implementation

The OBMS currently offers a robust implementation of the **Open Badges 2.0 specification for "hosted" badges**.

**Key Strengths & Compliance Points:**

*   **Issuer Profiles, BadgeClasses, Assertions:** Core entities (Issuer, BadgeClass, Assertion) are structured according to the OB2 JSON-LD schema. Required fields, `@context`, and `type` properties are correctly implemented for hosted scenarios.
*   **Issuance Workflow:** The server supports the creation of issuers, definition of badge classes, and issuance of assertions to recipients.
*   **Hosted Verification:** Assertions include the necessary `verification` object (`type: "hosted"`), and the server provides a `/v2/assertions/:id/verify` endpoint for programmatic status checks. This endpoint correctly verifies valid, non-revoked assertions.
*   **Data for Display:** The API provides all necessary data (badge name, description, image URL, criteria, issuer details) for client applications to display badges.
*   **API Endpoints:** Standard RESTful endpoints are available for managing issuers, badge classes, and assertions (`GET`, `POST`, `PUT`, `DELETE`).

## Key Gaps & Areas for Enhancement (OB 2.0)

Based on the [OBMS Review](./OBMS_Review_FULL_13_05_25.md), the following areas are targeted for enhancement to achieve full OB 2.0 feature-completeness:

1.  **Signed Badge Support (Cryptographic Signatures):**
    *   **Current:** Not implemented. Badges are verified via the "hosted" model only.
    *   **Needed:**
        *   Generation of JSON Web Signatures (JWS) for assertions.
        *   Inclusion of `publicKey` in Issuer profiles.
        *   Support for `RevocationList` for signed badges.

2.  **Clarity on Revocation for Hosted Badges:**
    *   **Current:** Revocation is handled via a `POST /v2/assertions/:id/revoke` endpoint, and the `/verify` endpoint reflects this.
    *   **Needed:** Clearer indication of revocation status if a revoked assertion's JSON is fetched directly via `GET /v2/assertions/:id` (e.g., HTTP 410, or a `revoked: true` field).

3.  **Optional OB 2.0 Features:**
    *   **Current:** Core features are prioritized.
    *   **Needed:**
        *   Support for `evidence` and `narrative` fields in Assertions.
        *   Support for `alignment` and `tags` fields in BadgeClasses.
        *   A utility/endpoint for "baking" badges (embedding assertion data into images).

4.  **Verification Endpoint Enhancements:**
    *   **Current:** The `/v2/assertions/:id/verify` endpoint functions for basic validity and revocation.
    *   **Needed:** Ensure the endpoint also checks the `expires` field of an assertion.

5.  **E2E Test Coverage Specifics:**
    *   **Current:** Good coverage of main flows.
    *   **Needed:** Additional tests for negative paths (e.g., creation with missing fields), recipient hashing variants, assertion expiry, and behavior of `DELETE` operations on linked entities.

## Roadmap to OB 2.0 Feature-Completeness

The [OBMS OB3 Roadmap](./OBMS_OB3_roadmap.md) (Phases 0-4) directly addresses these OB 2.0 gaps:

*   **Phase 0: Baseline:** Freeze current OB 2.0 "hosted" implementation.
*   **Phase 1: OB 2.0 Feature-Complete (Signed Assertions):**
    *   Implement JWS generation for assertions.
    *   Expose issuer `publicKey` in profiles.
    *   Enhance `/verify` endpoint (e.g., for `expires` check - *implied, to be confirmed as explicit task*).
*   **Phase 2: RevocationList:**
    *   Publish `RevocationList` for signed badges.
    *   Link `revocationList` in issuer profiles.
    *   Ensure clear handling of revoked badges for display/direct access (*clarification for hosted badges needed*).
*   **Phase 3: Evidence & Alignment:**
    *   Implement support for `evidence` objects in Assertions.
    *   Implement support for `alignment` arrays in BadgeClasses.
    *   (Consider explicitly adding `narrative` and `tags` here).
*   **Phase 4: Baked Images Helper:**
    *   Develop a CLI tool or API endpoint for baking badge images.

## Future Direction: Open Badges 3.0

Following OB 2.0 feature-completeness, the roadmap outlines a transition to Open Badges 3.0 (Phases 5-10):

*   **Phase 5: OB 3.0 Core Verifiable Credential (VC):** Wrap assertions in VC envelopes, implement `proof` generation.
*   **Phase 6: Issuer Identity & Keys (OB3):** Publish JWKS, DID:web methodology for verifiable issuer identity.
*   **Phase 7: Status & Revocation for OB 3.0:** Implement VC-native revocation (e.g., StatusList2021).
*   **Phase 8: OB 3.0 Service Description & OAuth:** Implement CLR/BadgeConnect 3.0 API requirements.
*   **Phase 9: Compliance & Interop Tests:** Integrate OB Conformance Suite, VC test harnesses. (Incorporate specific OB2 E2E test enhancements here).
*   **Phase 10: Docs & Developer UX:** Provide comprehensive documentation for OB2 and OB3, including migration guides.

This reference should help align development and documentation efforts as the OBMS evolves.
