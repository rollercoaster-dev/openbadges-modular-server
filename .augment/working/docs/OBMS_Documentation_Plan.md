# OpenBadges Modular Server (OBMS) Documentation Plan

## 1. Goal

To update and enhance the OBMS documentation to accurately reflect the current stable Open Badges 2.0 (OB2) "hosted" implementation, clearly outline the planned path to OB2 feature-completeness, and prepare for future Open Badges 3.0 (OB3) capabilities. The documentation should be clear, comprehensive, and user-friendly for both new and existing integrators.

## 2. Audience

*   **New Integrators/Developers:** Seeking to understand OBMS capabilities, how to set it up, and use its API for issuing and managing Open Badges.
*   **Existing Integrators/Developers:** Needing updates on new features, changes in API behavior, compliance status, and migration paths.
*   **Project Contributors:** Requiring up-to-date internal documentation for development and maintenance.

## 3. Key Documentation Components & Actions

This plan incorporates findings from the OBMS Review, the OB3 Roadmap, and tasks identified in `.cursor/working/tasks/openbadges-v3-compliance-tasks.md` and `.cursor/working/tasks/master-task-tracking-updated.md`.

### 3.1. Core Documentation (Review & Update for Current OB2 Hosted State)

*   **`README.md` (High Priority)**
    *   **Action:** Update with the current status of OB2 hosted badge implementation.
    *   **Action:** Briefly list key supported features and current limitations (e.g., "Currently supports OB2 Hosted Badges; Signed Badge support is upcoming").
    *   **Action:** Link to the new `OBMS_State_and_Future_Reference.md` and detailed API/User guides.
*   **API Documentation (e.g., `docs/api-documentation.md`) (High Priority)**
    *   **Action:** Thoroughly review and update all OB2 endpoint descriptions (`/v2/...`) to reflect current behavior for hosted badges.
    *   **Action:** Clearly document the `verification` object structure for hosted badges.
    *   **Action:** Detail the current behavior of the `/v2/assertions/:id/verify` endpoint.
    *   **Action:** Document the current mechanism for revoking assertions and how it's reflected (or not) in direct `GET` requests to assertion URLs.
    *   **Action:** Add a "Known Limitations" or "Current Scope for OB2" section summarizing what's not yet supported (signed badges, specific optional fields).
*   **User Guide / Getting Started (e.g., `docs/user-guide.md` or similar) (Medium Priority - Task 07 from master tracking)**
    *   **Action:** Ensure it accurately guides users through setting up and using the current OB2 hosted features (creating issuers, badge classes, issuing assertions, verifying).
    *   **Action:** Add examples for all common OB2 hosted badge operations.
*   **Existing `docs/` Directory Content (Medium Priority)**
    *   **Action:** Review all existing markdown files in `docs/` (e.g., `authentication.md`, `database.md`, `docker-setup.md`, etc.) for accuracy against the current implementation. Update as necessary.

### 3.2. New Documentation (Reflecting Review & Roadmap)

*   **`OBMS_State_and_Future_Reference.md` (COMPLETED)**
    *   **Purpose:** Concise summary of current OB2 state, gaps, and roadmap.
    *   **Status:** Created.
*   **OB 2.0 Compliance Details (Medium Priority)**
    *   **Action:** Create a dedicated section within API docs or a new file (e.g., `docs/ob2-compliance.md`) that summarizes OB2 compliance based on the review, more accessibly than the full review document. This can leverage content from `OBMS_State_and_Future_Reference.md`.
*   **Guides for Upcoming OB 2.0 Features (Align with Roadmap Phases 1-4)**
    *   **Signed Badges Guide (Medium Priority - as Phase 1/2 complete):**
        *   How to enable/use signed assertions.
        *   Issuer `publicKey` management.
        *   Understanding and using `RevocationList`.
        *   Verifying signed badges.
    *   **Evidence, Alignment, Tags, Narrative Guide (Low Priority - as Phase 3 complete):**
        *   API usage for adding these optional fields.
        *   Examples of their structure.
    *   **Badge Baking Guide (Low Priority - as Phase 4 complete):**
        *   How to use the CLI/endpoint for baking images.
*   **E2E Testing & Compliance Documentation (Medium Priority - as Phase 9 progresses)**
    *   **Action:** Document the E2E testing strategy, including how to run tests.
    *   **Action:** Explain how the specific E2E test recommendations from the review (negative tests, expiry, hashing, delete behaviors) are covered.
    *   **Action:** Document the integration and use of the OpenBadges Conformance Suite.

### 3.3. Documentation for OB 3.0 (Align with Roadmap Phases 5-10 & OB3 Tasks)

*   **OB 3.0 API Documentation (Staged Approach - as Phase 5+ complete)**
    *   **Action:** Create new sections or a separate document for `/v3/...` API endpoints as they are developed.
    *   **Action:** Document the Verifiable Credential structure for assertions.
    *   **Action:** Detail `proof` generation and `credentialStatus` mechanisms.
    *   **Action:** Cover OAuth 2.0 integration and new service descriptions.
*   **Developer Guide for OB 3.0 API (Medium Priority - Task from `openbadges-v3-compliance-tasks.md`)**
    *   **Action:** Create a comprehensive guide for developers on using the OB3-compliant API, including code samples in TypeScript.
*   **OB 2.0 to OB 3.0 Migration Guide (Medium Priority - Task from Roadmap Phase 10)**
    *   **Action:** Detail steps and considerations for users migrating from v2 to v3.
*   **General OB 3.0 Documentation (Task from `openbadges-v3-compliance-tasks.md`)**
    *   **Action:** Document all changes made to align with the OB3 specification throughout the codebase and API.

### 3.4. General Documentation Enhancements (Task 08 from master tracking - Ongoing)

*   **Consistency:** Ensure consistent terminology, formatting, and style across all documents.
*   **Clarity & Conciseness:** Refine language for better readability.
*   **Examples:** Add more practical code examples where needed.
*   **Diagrams:** Consider adding diagrams for architecture, data flows, or complex concepts.
*   **Searchability/Index:** Improve navigation and searchability if documentation becomes extensive (e.g., using a static site generator).

## 4. Timeline & Priorities

*   **Immediate (Pre-Release/Current):**
    1.  Update `README.md` for current OB2 hosted state.
    2.  Thoroughly review and update existing API documentation (`docs/api-documentation.md`) for OB2 hosted accuracy.
    3.  Review and update core `docs/` files for current state.
    4.  Publish `OBMS_State_and_Future_Reference.md`.
*   **Short-Term (Align with OB2 Feature-Complete Roadmap - Phases 1-4):**
    1.  Document Signed Badge features as they are implemented.
    2.  Document RevocationList functionality.
    3.  Document Evidence, Alignment, etc.
    4.  Document Badge Baking helper.
    5.  Update E2E testing documentation.
*   **Mid-Term (Align with OB3 Development - Phases 5-8):**
    1.  Begin drafting OB3 API documentation.
    2.  Develop the "Developer Guide for OB3 API."
*   **Long-Term (Align with OB3 Stabilization & Release - Phases 9-10):**
    1.  Finalize all OB3 documentation.
    2.  Create the "OB2 to OB3 Migration Guide."
    3.  Complete general documentation enhancements.

## 5. Tools & Platform

*   Continue using Markdown files within the `/docs` directory.
*   Consider a static site generator (e.g., Docusaurus, MkDocs, VitePress) in the future if documentation grows significantly, to improve presentation, navigation, and versioning.

## 6. Review & Maintenance

*   Documentation should be reviewed and updated alongside code changes for new features or fixes.
*   Major documentation releases should accompany significant software releases.
*   Periodically review all documentation for accuracy and completeness.

This plan provides a structured approach to bringing the OBMS documentation up to date and ensuring it remains a valuable resource throughout the project's evolution.
