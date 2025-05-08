# Open Badges 3.0 Compliance & Verification Tasks

This document outlines the tasks required to ensure our application aligns with the Open Badges 3.0 specification and to prepare for potential 1EdTech certification. This is based on the [Open Badges Verification and Certification Plan (MEMORY[60b0d154-004e-4e29-b053-61e01a29fb1a])].

## Phase 1: Preparation and Gap Analysis

### 1.1. `BadgeClass` Entity (Alignment with OBv3 `Achievement`) ✅

-   [x] **`type` Property:** Review the internal `type` property of the `BadgeClass` entity. While `toObject(BadgeVersion.V3)` correctly sets it to 'Achievement', assess if the default internal value ('BadgeClass') could lead to issues. Ensure all OBv3 outputs correctly use 'Achievement'.
-   [x] **`name` Property:** Update `BadgeClass.name` to support `MultiLanguageString` (currently `string`) as per OBv3 `Achievement` specification and `openbadges-types`.
-   [x] **`description` Property:** Update `BadgeClass.description` to support `MultiLanguageString` (currently `string`) as per OBv3 `Achievement` specification and `openbadges-types`.
-   [x] **`issuer` Property:** Modify `BadgeClass.issuer` to support an embedded `Issuer` object in addition to an IRI (currently `Shared.IRI` only), as per OBv3 `Achievement` (`Shared.IRI | OB3.Issuer`).
-   [x] **`criteria` Property:**
    -   [x] Ensure `BadgeClass.criteria` when serialized for OBv3 conforms strictly to `OB3.Criteria` (i.e., an object with optional `id`:IRI and optional `narrative`:MarkdownText, one of which is required).
    -   [x] Review the `toJsonLd()` method's casting of `criteria` to `Shared.IRI`; update if `criteria` can be a narrative object for OBv3.
-   [x] **Optional OBv3 Properties:** Evaluate and implement (if desired) optional OBv3 `Achievement` properties in `BadgeClass`:
    -   [x] `achievementType` (string)
    -   [x] `creator` (IRI | Issuer) - Implemented instead of `related` as it's part of the OB3 Achievement interface
    -   [x] `resultDescriptions` (ResultDescription[])

### 1.2. `Assertion` Entity (Alignment with OBv3 `VerifiableCredential` & `Assertion` structure) ✅

-   [x] Locate `Assertion` entity file(s).
-   [x] Retrieve OBv3 `VerifiableCredential` and `Assertion` (if distinct from VC context) data model specifications from `openbadges-types` or 1EdTech. (OBv3 uses `VerifiableCredential` model; specific assertion details are in `credentialSubject`).
-   [x] Compare local `Assertion` entity with OBv3 specifications.
-   [x] Document gaps (e.g., property mismatches, missing fields, type differences for `evidence`, `narrative`, `recipient` identity types).
-   [x] Create sub-tasks for addressing identified gaps in the `Assertion` entity.
    -   [x] **`@context`**: Ensure `toObject(V3)` and `toJsonLd(V3)` include both W3C Verifiable Credentials context AND the official Open Badges v3 context (e.g., `https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.1.json`).
    -   [x] **`type` Property**: The `toObject(V3)` and `toJsonLd(V3)` methods should ensure the `type` array includes 'VerifiableCredential' AND 'OpenBadgeCredential' (and any other types mandated by the OBv3 spec for badges).
    -   [x] **`issuer` Property**: Modify `Assertion.issuer` (and its handling in `toObject`/`toJsonLd`) to support an embedded `Issuer` object (OB3.Issuer) in addition to an IRI, as per OBv3 `VerifiableCredential.issuer`.
    -   [x] **`issuanceDate` / `issuedOn`**: Confirm `issuedOn` is always correctly transformed to `issuanceDate` with `DateTime` formatting in `toObject(V3)`/`toJsonLd(V3)`.
    -   [x] **`expirationDate` / `expires`**: If `Assertion.expires` is present, ensure it's transformed to `expirationDate` with `DateTime` formatting in `toObject(V3)`/`toJsonLd(V3)`.
    -   [x] **`credentialSubject` Construction (`recipient` mapping)**:
        -   [x] Review and refactor `toObject(V3)` logic for `credentialSubject` creation. It should correctly handle cases where `this.recipient` might be `OB2.IdentityObject` OR an `OB3.CredentialSubject` structure.
        -   [x] Ensure `credentialSubject.id` correctly reflects the recipient's identifier.
        -   [x] Ensure `credentialSubject.type` is appropriately set (e.g., 'AchievementSubject').
        -   [x] Ensure `credentialSubject.achievement` correctly links to the `BadgeClass` IRI (or embedded `Achievement` if supported later).
    -   [ ] **`proof` Property (replaces `verification` for cryptographic proof)**:
        -   [x] Review direct mapping of `this.verification` to `OB3.Proof` in `toObject(V3)`; ensure new proof structure is handled.
        -   [x] Ensure a dedicated `proof: OB3.Proof` property is present in the OBv3 output structure in `toObject(V3)` and `toJsonLd(V3)`.
        -   [x] Integrated `DataIntegrityProof` mechanism to generate and populate this `proof` object via `VerificationService`.
        -   [ ] The existing `this.verification` (e.g. `{type: 'hosted'}`) is for OBv2 and is not part of the core OBv3 VC structure for proof; it might be represented as evidence or a service endpoint if relevant for OBv3.
    -   [x] **`credentialStatus` Property (for revocation)**:
        -   [x] Remove direct inclusion of `revoked` and `revocationReason` in `toObject(V3)` output.
        -   [x] Add a `credentialStatus: OB3.CredentialStatus` property to the OBv3 output structure in `toObject(V3)` and `toJsonLd(V3)`.
        -   [x] Map `this.revoked` and `this.revocationReason` to populate the `credentialStatus` object (e.g., pointing to a status list or providing embedded status).
    -   [x] Specifically review `type` handling as per MEMORY[301960c0-52ee-4a91-95e6-d297a69e2aa0] (Covered by the `type` sub-task above).

### 1.3. `Issuer` / `IssuerProfile` Entity (Alignment with OBv3 `Issuer`) ✅

-   [x] Locate `Issuer` / `IssuerProfile` entity file(s).
-   [x] Retrieve OBv3 `Issuer` data model specification from `openbadges-types` or 1EdTech.
-   [x] Compare local `Issuer` / `IssuerProfile` entity with OBv3 `Issuer` specification.
-   [x] Document gaps (e.g., `image` type, multi-language support for `name`/`description`).
-   [ ] Create sub-tasks for addressing identified gaps.
    -   [x] **`type` Property**:
        -   [x] Update `Issuer.type` internal default and `toObject(V3)` / `toJsonLd(V3)` output to be 'Issuer' (or an array including 'Issuer') for OBv3, instead of 'Profile'. Clarify if 'Profile' is needed for other contexts.
    -   [x] **`name` Property**: Update `Issuer.name` to support `MultiLanguageString` (currently `string`) as per OBv3 `Issuer` spec. Update `toJsonLd` accordingly.
    -   [x] **`description` Property**: Update `Issuer.description` to support `MultiLanguageString` (currently `string`) as per OBv3 `Issuer` spec. Update `toJsonLd` accordingly.
    -   [x] **`image` Property**: Ensure `Issuer.image` can correctly store and serialize `OB3.ImageObject` for OBv3 (not just IRI). Update `toJsonLd` to handle `OB3.ImageObject` instead of casting to `Shared.IRI`.
    -   [x] **`telephone` Property**: Add optional `telephone: string` property to `Issuer` entity and its serialization methods for OBv3.
    -   [x] Specifically review `toObject()` method as per MEMORY[301960c0-52ee-4a91-95e6-d297a69e2aa0] (Covered by `type` sub-task above, with clarification on 'Issuer' vs 'Profile').

### 1.4. API Endpoints Review

-   [x] Identify all API endpoints related to badge issuance, discovery (issuer profiles, badge classes), and verification.
    -   **Issuer (Discovery & Management):**
        -   `POST /issuers`
        -   `GET /issuers`
        -   `GET /issuers/:id`
        -   `PUT /issuers/:id`
        -   `DELETE /issuers/:id`
    -   **BadgeClass (Discovery & Management):**
        -   `POST /badgeclasses`
        -   `GET /badgeclasses`
        -   `GET /badgeclasses/:id`
        -   `PUT /badgeclasses/:id`
        -   `DELETE /badgeclasses/:id`
    -   **Assertion/OpenBadgeCredential (Issuance, Retrieval/Verification & Management):**
        -   `POST /assertions` (Issuance)
        -   `GET /assertions` (List all)
        -   `GET /assertions/:id` (Retrieval for Verification)
        -   `PUT /assertions/:id` (Update, e.g., revocation)
        -   `DELETE /assertions/:id`
    *(These are generally available under `/v2/` and `/v3/` prefixes, with `/` defaulting to v3)*
-   [x] Review 1EdTech Open Badges 3.0 specification for API requirements.
    *   [x] Locate the official Open Badges 3.0 Specification documents.
    *   [x] Identify specific API-related sections or documents.
        *   The primary API definition is found in an OpenAPI 3.0 JSON file: [https://purl.imsglobal.org/spec/ob/v3p0/schema/openapi/ob_v3p0_oas.json](https://purl.imsglobal.org/spec/ob/v3p0/schema/openapi/ob_v3p0_oas.json)
    *   [x] Compare current Hono API endpoints against these specifications.
        *   **Issuer Endpoints (Comparison Complete)**
        *   **BadgeClass/Achievement Endpoints (Comparison Complete)**
        *   **Assertion/OpenBadgeCredential Endpoints (Comparison Complete)**
-   [ ] Compare current Hono API endpoints against OBv3 requirements for:
    -   [ ] Request/response formats (JSON-LD).
    -   [ ] Necessary data fields.
    -   [ ] HTTP methods and status codes.
    -   [ ] Authentication/authorization mechanisms (if specified).
 -   [ ] Document gaps and create tasks for API alignment.
    -   [ ] **Task: Verify and Align API Resource Naming Conventions** (e.g., `/badgeclasses` vs `/achievements`).
    -   [ ] **Task: Ensure JSON-LD Compliance for All OBv3 Entities** (correct `@context`, `type`, mandatory properties).
    -   [ ] **Task: Standardize Request/Response Payloads with OpenAPI Spec** (structure, relationships).
    -   [ ] **Task: Implement/Verify `proof` Generation and Handling for Assertions**.
    -   [ ] **Task: Implement/Verify Credential Revocation (`credentialStatus`)**.
    -   [ ] **Task: Review and Align HTTP Status Code Usage**.
    -   [ ] **Task: Plan for OAuth 2.0 Integration**.
    -   [ ] **Task: Review List Endpoints (`GET /<resource>`)** for pagination, filtering, sorting parameters.

### 1.5. Digital Signatures & Verifiable Credentials

-   [x] Review current digital signature mechanisms for issued badges.
-   [~] Studied W3C Verifiable Credentials Data Model v2.0, particularly how it's applied in Open Badges 3.0 (e.g., `proof` property); implemented `DataIntegrityProof`.
-   [~] Signing process now generates compliant `DataIntegrityProof` objects for OBv3 assertions; tests ongoing.
-   [x] Identified and addressed initial gaps in proof generation; further E2E testing may reveal more.

## Phase 2: Implementation and Internal Testing

-   [ ] **Address Gaps:** Work through the prioritized list of gaps identified in Phase 1 for entities and APIs.
    -   [ ] Ensure strict typing (MEMORY[a4a77766-bf8e-4e3e-aad4-ed3e5b9418a8]).
    -   [ ] Utilize Zod for validation where appropriate (MEMORY[29ccfc7d-18d3-4d60-860b-9a9a28b7fefc]).
    -   [x] Fix lint errors in `tests/api/auth.integration.test.ts` (unused `result` and `error` variables).
-   [ ] **Develop/Update Internal Test Suite for OBv3 Compliance:**
    -   [~] Updated unit tests for `Assertion`/`VerificationService` related to OBv3 proof structure; ongoing for full coverage.
    -   [~] Integration tests for badge issuance flow being implicitly tested/updated; E2E failures indicate more work needed.
    -   [ ] Create/update API/E2E tests for OBv3 endpoints (request/response validation, behavior).
        -   Ensure tests generate sample badges and validate them against OBv3 schemas/contexts.
        -   Follow existing test structure and scripts (MEMORY[3b5f8625-16ba-49e7-86f0-86a51bd5e0c1]).
-   [ ] **Utilize 1EdTech Pre-Certification Tools:**
    -   [ ] Regularly test generated badges and API endpoints using the official **Open Badges 3.0 Testing Suite**: [https://certification.imsglobal.org/certification/verifiable-credentials](https://certification.imsglobal.org/certification/verifiable-credentials)
    -   [ ] (If applicable) Test OBv2.0 compatibility using: [https://openbadgesvalidator.imsglobal.org/openbadges20/index.html](https://openbadgesvalidator.imsglobal.org/openbadges20/index.html)
    -   [ ] Address any issues identified by these tools.

## Phase 3: Formal Certification Process (Optional)

-   [ ] **Assess Readiness:** Based on internal testing and 1EdTech tool results, decide if formal certification will be pursued.
-   [ ] **Official Testing:** If proceeding, use the 1EdTech Certification Suite for final testing.
-   [ ] **Submission:** Submit test results and required documentation to 1EdTech.
-   [ ] **Validation & Reception:** Engage with 1EdTech through the validation process.

## Phase 4: Ongoing Maintenance & Compliance

-   [ ] **Regression Testing:** Integrate OBv3 compliance tests into CI/CD pipeline.
-   [ ] **Specification Updates:** Monitor 1EdTech for Open Badges specification updates and adapt.
-   [ ] **Documentation:** Maintain internal and external documentation regarding Open Badges support.

## Next Steps (as of 2025-05-08)

-   [ ] **Investigate Failing Unit Test:**
    -   [ ] Determine why `Verification Service > should handle malformed creator URLs` test in `tests/core/verification.service.test.ts` is failing, despite logic suggesting it should pass. Consider running this test in isolation for more detailed output.
-   [x] **Address E2E Test Failures:**
    -   [x] Begin systematically investigating the failing E2E tests. Fixed the issue with the Hono router by creating a new app instance for each test.
-   [x] **Continue `Assertion` Entity Alignment:**
    -   [x] Review and implement remaining sub-tasks for the `Assertion` entity under section `1.2`, focusing on:
        -   [x] `credentialSubject` construction, particularly handling different `recipient` types.
        -   [x] `credentialStatus` property implementation for revocation.
        -   [x] Ensuring correct `@context` and `type` array values in OBv3 output.
-   [x] **Continue `BadgeClass` and `Issuer` Entity Alignment:**
    -   [x] Progress through the sub-tasks for `BadgeClass` (section `1.1`) and `Issuer` (section `1.3`) to ensure full OBv3 compliance for these entities (e.g., multi-language strings, `issuer` embedding, `image` object).
-   [ ] **API Endpoint Review & Alignment:**
    -   [ ] Continue tasks under section `1.4` to ensure API endpoints align with OBv3 specifications, particularly regarding JSON-LD, request/response payloads, and handling of `proof` and `credentialStatus`.
-   [x] Resolve TypeScript import errors in `VerificationService` by utilizing `tsconfig.json` path aliases and correcting package imports. Discovered `DataIntegrityProof` is a local type in `@utils/crypto/signature.ts`, not from `openbadges-types` as initially presumed. All related type errors in `verification.service.ts` have been addressed.
