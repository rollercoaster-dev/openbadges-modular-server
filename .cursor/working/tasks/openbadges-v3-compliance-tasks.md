# Open Badges 3.0 Compliance & Verification Tasks

This document outlines the tasks required to ensure our application aligns with the Open Badges 3.0 specification and to prepare for potential 1EdTech certification. This is based on the [Open Badges Verification and Certification Plan (MEMORY[60b0d154-004e-4e29-b053-61e01a29fb1a])].

## Phase 1: Preparation and Gap Analysis

### 1.1. `BadgeClass` Entity (Alignment with OBv3 `Achievement`)

-   [ ] **`type` Property:** Review the internal `type` property of the `BadgeClass` entity. While `toObject(BadgeVersion.V3)` correctly sets it to 'Achievement', assess if the default internal value ('BadgeClass') could lead to issues. Ensure all OBv3 outputs correctly use 'Achievement'.
-   [ ] **`name` Property:** Update `BadgeClass.name` to support `MultiLanguageString` (currently `string`) as per OBv3 `Achievement` specification and `openbadges-types`.
-   [ ] **`description` Property:** Update `BadgeClass.description` to support `MultiLanguageString` (currently `string`) as per OBv3 `Achievement` specification and `openbadges-types`.
-   [ ] **`issuer` Property:** Modify `BadgeClass.issuer` to support an embedded `Issuer` object in addition to an IRI (currently `Shared.IRI` only), as per OBv3 `Achievement` (`Shared.IRI | OB3.Issuer`).
-   [ ] **`criteria` Property:**
    -   [ ] Ensure `BadgeClass.criteria` when serialized for OBv3 conforms strictly to `OB3.Criteria` (i.e., an object with optional `id`:IRI and optional `narrative`:MarkdownText, one of which is required).
    -   [ ] Review the `toJsonLd()` method's casting of `criteria` to `Shared.IRI`; update if `criteria` can be a narrative object for OBv3.
-   [ ] **Optional OBv3 Properties:** Evaluate and implement (if desired) optional OBv3 `Achievement` properties in `BadgeClass`:
    -   [ ] `achievementType` (string)
    -   [ ] `related` (AchievementRelationship[])
    -   [ ] `resultDescription` (ResultDescription[])

### 1.2. `Assertion` Entity (Alignment with OBv3 `VerifiableCredential` & `Assertion` structure)

-   [x] Locate `Assertion` entity file(s).
-   [x] Retrieve OBv3 `VerifiableCredential` and `Assertion` (if distinct from VC context) data model specifications from `openbadges-types` or 1EdTech. (OBv3 uses `VerifiableCredential` model; specific assertion details are in `credentialSubject`).
-   [x] Compare local `Assertion` entity with OBv3 specifications.
-   [x] Document gaps (e.g., property mismatches, missing fields, type differences for `evidence`, `narrative`, `recipient` identity types).
-   [ ] Create sub-tasks for addressing identified gaps in the `Assertion` entity.
    -   [ ] **`@context`**: Ensure `toObject(V3)` and `toJsonLd(V3)` include both W3C Verifiable Credentials context AND the official Open Badges v3 context (e.g., `https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.1.json`).
    -   [ ] **`type` Property**: The `toObject(V3)` and `toJsonLd(V3)` methods should ensure the `type` array includes 'VerifiableCredential' AND 'OpenBadgeCredential' (and any other types mandated by the OBv3 spec for badges).
    -   [ ] **`issuer` Property**: Modify `Assertion.issuer` (and its handling in `toObject`/`toJsonLd`) to support an embedded `Issuer` object (OB3.Issuer) in addition to an IRI, as per OBv3 `VerifiableCredential.issuer`.
    -   [ ] **`issuanceDate` / `issuedOn`**: Confirm `issuedOn` is always correctly transformed to `issuanceDate` with `DateTime` formatting in `toObject(V3)`/`toJsonLd(V3)`.
    -   [ ] **`expirationDate` / `expires`**: If `Assertion.expires` is present, ensure it's transformed to `expirationDate` with `DateTime` formatting in `toObject(V3)`/`toJsonLd(V3)`.
    -   [ ] **`credentialSubject` Construction (`recipient` mapping)**:
        -   [ ] Review and refactor `toObject(V3)` logic for `credentialSubject` creation. It should correctly handle cases where `this.recipient` might be `OB2.IdentityObject` OR an `OB3.CredentialSubject` structure.
        -   [ ] Ensure `credentialSubject.id` correctly reflects the recipient's identifier.
        -   [ ] Ensure `credentialSubject.type` is appropriately set (e.g., 'AchievementSubject').
        -   [ ] Ensure `credentialSubject.achievement` correctly links to the `BadgeClass` IRI (or embedded `Achievement` if supported later).
    -   [ ] **`proof` Property (replaces `verification` for cryptographic proof)**:
        -   [ ] Remove the direct mapping of `this.verification` to `OB3.Proof` in `toObject(V3)` as it's incorrect.
        -   [ ] Add a dedicated `proof: OB3.Proof` property to the OBv3 output structure in `toObject(V3)` and `toJsonLd(V3)`.
        -   [ ] Plan integration with a digital signature mechanism (e.g., `DataIntegrityProof`) to generate and populate this `proof` object.
        -   [ ] The existing `this.verification` (e.g. `{type: 'hosted'}`) is for OBv2 and is not part of the core OBv3 VC structure for proof; it might be represented as evidence or a service endpoint if relevant for OBv3.
    -   [ ] **`credentialStatus` Property (for revocation)**:
        -   [ ] Remove direct inclusion of `revoked` and `revocationReason` in `toObject(V3)` output.
        -   [ ] Add a `credentialStatus: OB3.CredentialStatus` property to the OBv3 output structure in `toObject(V3)` and `toJsonLd(V3)`.
        -   [ ] Map `this.revoked` and `this.revocationReason` to populate the `credentialStatus` object (e.g., pointing to a status list or providing embedded status).
    -   [ ] Specifically review `type` handling as per MEMORY[301960c0-52ee-4a91-95e6-d297a69e2aa0] (Covered by the `type` sub-task above).

### 1.3. `Issuer` / `IssuerProfile` Entity (Alignment with OBv3 `Issuer`)

-   [x] Locate `Issuer` / `IssuerProfile` entity file(s).
-   [x] Retrieve OBv3 `Issuer` data model specification from `openbadges-types` or 1EdTech.
-   [x] Compare local `Issuer` / `IssuerProfile` entity with OBv3 `Issuer` specification.
-   [x] Document gaps (e.g., `image` type, multi-language support for `name`/`description`).
-   [ ] Create sub-tasks for addressing identified gaps.
    -   [ ] **`type` Property**: 
        -   [ ] Update `Issuer.type` internal default and `toObject(V3)` / `toJsonLd(V3)` output to be 'Issuer' (or an array including 'Issuer') for OBv3, instead of 'Profile'. Clarify if 'Profile' is needed for other contexts.
    -   [ ] **`name` Property**: Update `Issuer.name` to support `MultiLanguageString` (currently `string`) as per OBv3 `Issuer` spec. Update `toJsonLd` accordingly.
    -   [ ] **`description` Property**: Update `Issuer.description` to support `MultiLanguageString` (currently `string`) as per OBv3 `Issuer` spec. Update `toJsonLd` accordingly.
    -   [ ] **`image` Property**: Ensure `Issuer.image` can correctly store and serialize `OB3.ImageObject` for OBv3 (not just IRI). Update `toJsonLd` to handle `OB3.ImageObject` instead of casting to `Shared.IRI`.
    -   [ ] **`telephone` Property**: Add optional `telephone: string` property to `Issuer` entity and its serialization methods for OBv3.
    -   [ ] Specifically review `toObject()` method as per MEMORY[301960c0-52ee-4a91-95e6-d297a69e2aa0] (Covered by `type` sub-task above, with clarification on 'Issuer' vs 'Profile').

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
-   [ ] Study the W3C Verifiable Credentials Data Model v2.0, particularly how it's applied in Open Badges 3.0 (e.g., `proof` property).
-   [ ] Ensure our signing process generates compliant `proof` objects for OBv3 assertions.
-   [ ] Document gaps and create tasks for alignment.

## Phase 2: Implementation and Internal Testing

-   [ ] **Address Gaps:** Work through the prioritized list of gaps identified in Phase 1 for entities and APIs.
    -   [ ] Ensure strict typing (MEMORY[a4a77766-bf8e-4e3e-aad4-ed3e5b9418a8]).
    -   [ ] Utilize Zod for validation where appropriate (MEMORY[29ccfc7d-18d3-4d60-860b-9a9a28b7fefc]).
    -   [x] Fix lint errors in `tests/api/auth.integration.test.ts` (unused `result` and `error` variables).
-   [ ] **Develop/Update Internal Test Suite for OBv3 Compliance:**
    -   [ ] Create/update unit tests for `BadgeClass`, `Assertion`, `Issuer` entities to verify OBv3 structure and serialization.
    -   [ ] Create/update integration tests for the badge issuance flow, ensuring OBv3 compliance.
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
