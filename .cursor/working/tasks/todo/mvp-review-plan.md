# MVP Code Review Plan

**Goal:** Conduct a systematic review of the `openbadges-modular-server` MVP codebase, focusing on Open Badges 3.0 alignment, TypeScript quality (especially `openbadges-types` usage), and adherence to the DRY principle. The review will be broken down by feature, with findings and refactoring for each feature consolidated into a separate Pull Request.

**Proposed Feature Review Order:**

1.  **Platform Management & Authentication/Authorization:** Reviewing tenant setup, user roles, JWT handling, etc.
    *   **Findings:**
        1.  **Configuration Mismatch (`isPublicPath`):** `auth.middleware.ts` uses a hardcoded list for public paths, ignoring `config.auth.publicPaths`. Needs synchronization.
        2.  **JWT Response Header (`X-Auth-Token`):** New JWTs sent in non-standard `X-Auth-Token` header. Consider standard practices (e.g., `Authorization: Bearer` in response or body).
        3.  **Unused Import (`ApiKeyRepository`):** `api-key.adapter.ts` imports an unused repository.
        4.  **Missing Platform Management/Authorization Logic:** Explicit tenant/role management or detailed authorization logic not found in `src/auth`. Likely elsewhere or TBD.

2.  **BadgeClass Management:** Checking the definition, creation, and updating of badge classes.
    *   **Findings:**
        1.  **`toObject()` Refactoring Needed:** Current implementation (`badgeClass.entity.ts`) uses simple spread/cast, known to cause type issues (MEMORY[5a8c8c1f], MEMORY[301960c0]). Needs proper transformation for OB2/OB3.
        2.  **Static `type` Property:** Entity `type` defaults to 'BadgeClass', incompatible with OB3 'Achievement'. Needs dynamic handling.
        3.  **ID Strategy (IRI):** Using `uuidv4() as Shared.IRI` internally requires clarification on conversion to valid external IRIs.
        4.  **`toJsonLd()` Typing Complexity:** Relies on assertions/casting to `BadgeClassData`, suggesting potential type mismatches or complex mapping. Needs review.
        5.  **Refine `BadgeClassData` Type:** `BadgeClassData` (`badge-data.types.ts`) is loosely typed (`unknown` for criteria/alignment) and mismatches entity (required description, image type/optionality). Refine type or serializer expectation to improve safety.
        6.  **DTO Type Refinement:** DTOs (`badgeClass.dto.ts`) use inline types for `image`/`criteria` instead of reusing `openbadges-types`. Refine to improve consistency.
        7.  **Explicit Version Handling:** API relies on inferring OB version from DTO shape (e.g., `type`). Consider requiring explicit version indicator (param/header/field) for robustness.
        8.  **Missing DTO -> Entity Mapping:** Controller (`badgeClass.controller.ts`) directly casts DTO to `Partial<BadgeClass>`, skipping essential mapping logic (version inference, type handling, image/criteria structure).
        9.  **Excessive Casting:** Controller heavily uses `as` for DTO->Entity, ID->IRI (`Shared.IRI` type needs check - MEMORY[4fc912b4]), and Entity->Response (`toJsonLd` output cast to `BadgeClassResponseDto`). Needs explicit transformations.
        10. **Minimal Controller Validation:** Basic field checks in controller are insufficient. Needs robust DTO validation (likely via middleware).
        11. **Refactor Response Formatting:** Controller uses `toJsonLd` + cast for responses. Should use refactored `BadgeClass.toObject()` for correct `OB2.BadgeClass | OB3.Achievement` structure.
        12. **Confirm `Shared.IRI` Type:** Verify `Shared.IRI` definition/export in `openbadges-types` to ensure casts (`as string`) in repository queries are safe (relates to Finding #9, MEMORY[4fc912b4]).
        13. **Repository `update` Workaround:** SQLite repo `update` uses `toPartial()` + `create()` for merging, avoiding the `toObject()` issue (MEMORY[5a8c8c1f]) *for updates*, but the core `toObject()` problem (Finding #2) persists.
        14. **Mapper Casting:** Mapper (`sqlite-badge-class.mapper.ts`) relies heavily on `as` casts, reducing type safety.
        15. **Mapper `image` Logic/Schema:** `toPersistence` loses `OB3ImageObject` data (only saves ID). `toDomain` has complex/fragile reconstruction. DB schema likely needs update if full object persistence is required.
        16. **Investigate `getAdditionalFields` Access:** Mapper uses `(entity as any).getAdditionalFields()`. Method visibility/typing on `BadgeClass` needs checking.
        17. **Mapper Null Handling:** Uses `null as unknown as ...` for null inputs, which is poor practice. Needs explicit error handling or defined returns.

3.  **Badge Issuance:** Examining the process of issuing badges based on defined classes.
    *   **Files:** `assertion.entity.ts`, `assertion.dto.ts`, `assertion.controller.ts`, `assertion.repository.ts`, related mappers/implementations.
    *   **Findings:**
        18. **Refactor `Assertion.toObject()`:** Method returns shallow copy (`Record<string, unknown>`), forcing downstream casts. Refactor to return specific `OB2.Assertion | OB3.VerifiableCredential` union. (Relates to Finding #2, MEMORY[301960c0]).
        19. **Clarify Internal `type` Handling:** Entity's `type` is always 'Assertion'. Review alignment with OB3 VC 'type' requirements.
        20. **Clarify `verification`/`proof` Handling:** Default `verification` is OB2-specific. Review internal representation and serialization for OB3 `proof`. (Relates to MEMORY[301960c0]).
        21. **Reduce Casting in `Assertion.toJsonLd`:** Heavy use of `as`. Refactor using improved `toObject` methods.
        *   **DTO (`assertion.dto.ts`):**
            22. **Refine Nested Assertion DTOs:** Custom `RecipientDto`, `VerificationDto`, `EvidenceDto` duplicate `openbadges-types`; replace/use library types.
            23. **Refine `VerificationDto` for OB3:** Current structure mirrors OB2 `VerificationObject`; needs adjustment for OB3 `Proof`/`CredentialStatus`.
            24. **Refine Assertion `image` DTO:** Use library types for `image` in `AssertionBaseDto` (like Finding #6).
            25. **Explicit Version Handling (Assertion):** Consider requiring explicit OB version for create/update API calls (like Finding #7).
        *   **Controller (`assertion.controller.ts`):**
            26. **Refactor `mapToPartialAssertion`:** Helper uses extensive `as` casts, failing to implement *proper*, type-safe DTO->Entity mapping required by MEMORY[301960c0]. Needs transformation logic, not just casting.
            27. **Complete DTO Mapping:** `mapToPartialAssertion` ignores DTO fields like `narrative`, `image`. Ensure all relevant fields are mapped.
            28. **Controller Validation (Assertion):** Needs robust DTO validation (middleware) before controller logic (like Finding #10).
            29. **Review `VerificationService` Interaction:** Understand how `VerificationService.createVerificationForAssertion` interacts with the `assertion.verification` property, especially for OB3 Proof.
        *   **Repository (`assertion.repository.ts` interface):**
            30. **Clarify `findByRecipient` Logic:** Interface uses `string` for `recipientId`. Implementation needs clear handling for matching against potentially complex/hashed recipient data structures.
        *   **Repository Impl (`sqlite-assertion.repository.ts`):**
            31. **Rework `findByRecipient` Impl:** SQLite `json_extract` logic is fragile; only works for simple, non-hashed OB2 `$.identity`. Fails for hashed IDs, other types, and OB3 structures. Needs robust logic for querying JSON, handling hashing, and version compatibility.
            32. **Refactor `update` Merging Logic:** Current merge uses `Assertion.create({...existing.toObject(), ...updateData})`, relying on problematic `toObject()` output (Finding #18). Needs safer merge mechanism within entity or repository.
            33. **Verify `create` Return Shape:** Confirm Drizzle `.returning()` provides needed fields for mapper `toDomain`, or fetch via `findById` post-insert.
            34. **Requires `SqliteAssertionMapper` Review:** Correctness depends heavily on the mapper, especially for nested JSON fields (`recipient`, `verification`, `evidence`).
        *   **Mapper (`sqlite-assertion.mapper.ts`):**
            35. **Critical Data Loss in `toPersistence`:** Method **fails to save** most assertion data (`expires`, `evidence`, `verification`, `revoked`, `revocationReason`, `additionalFields`), only persisting minimal fields. Breaks updates/revocations. **MUST FIX.**
            36. **Remove `toObject()` Dependency:** Refactor `toPersistence` to avoid `entity.toObject()` due to its known issues (Finding #18). Access properties directly or use reliable serialization.
            37. **Enhance `toDomain` JSON Validation:** Improve validation of parsed JSON fields (`recipient`, `evidence`, `verification`) in `toDomain` or ensure `Assertion.create` is robust enough.
            38. **Review Type Conversion Utilities:** Briefly check helpers in `@infrastructure/database/utils/type-conversion`.

4.  **Assertion Retrieval & Validation:** Verifying how badge assertions are served and validated.
    *   **Findings:**
        *   **Controller (`assertion.controller.ts` - Retrieval):**
            39. **Performance of `getAllAssertions`:** OB3 enrichment fetches related BadgeClass/Issuer per assertion, risking N+1 query issues. Consider optimization.
            40. **Robustness of `convertAssertionToJsonLd`:** Ensure helper handles missing related entities gracefully for OB3 enrichment.
            41. **Dependency on `toIRI`:** Retrieval relies on `toIRI` utility; verify its correctness (related to MEMORY[4fc912b4]).
        *   **Controller (`assertion.controller.ts` - Validation/Revocation):**
            42. **`revokeAssertion` Broken by Persistence:** Method calls `assertionRepository.revoke`, which fails to persist changes in SQLite due to broken mapper (Finding #35). **MUST FIX mapper.**
            43. **`verifyAssertion` Delegates Correctly:** Method correctly fetches data and delegates core logic to `VerificationService`.
            44. **Requires `VerificationService` Review:** Complete validation assessment needs review of `VerificationService.verifyAssertion`.
            45. **Requires `KeyService` Review:** Key management (`KeyService`) is crucial for signing/verification and needs review.

5.  **Backpack/Integration Points:** (If applicable) Reviewing any code related to external system interactions.
    *   **User Assertion Management (Backpack Functionality):** Reviewing how users are linked to assertions and how this is managed/exposed.
        *   **Findings:**
            *   **Schema (`user_assertions` table):**
                46. **Schema Supports Backpack:** Table structure effectively links `platformUsers` to `assertions`, enabling user-centric views.
                47. **PostgreSQL Integrity:** Use of `onDelete: 'cascade'` on foreign keys enhances data integrity vs. SQLite.
                48. **JSON Storage:** PostgreSQL's `jsonb` for `metadata` is preferable to SQLite's `text`.
            *   **Entity (`user-assertion.entity.ts`):**
                49. **Entity Aligns with Schema:** Entity correctly models the `user_assertions` table data.
                50. **Factory Pattern Good:** `create` factory method promotes consistent instantiation and defaults.
                51. **`toObject()` Type Issue:** Method returns `Record<string, unknown>`, repeating the type safety issue from other entities (Findings #18, #32, #36). Avoid reliance in persistence.
            *   **Repository (`sqlite-user-assertion.repository.ts`):**
                52. **Inconsistent DB Access:** Uses `bun:sqlite` directly, unlike other repositories using Drizzle.
                53. **Manual Schema Duplication:** Constructor duplicates table/index creation from Drizzle schema file.
                54. **`ON DELETE CASCADE` Discrepancy:** Manual `CREATE TABLE` includes `ON DELETE CASCADE`, conflicting with Drizzle's SQLite schema definition.
                55. **Reliance on `toObject()`:** `addAssertion` uses `UserAssertion.toObject()`, inheriting type safety concern (Finding #51).
                56. **ON CONFLICT Strategy Good:** Use of `INSERT ... ON CONFLICT DO UPDATE` is robust for `addAssertion`.
                57. **Mapping Internal:** Relies on internal `rowToDomain` for mapping (needs confirmation of correct JSON parsing).
            *   **Repository (`postgres-user-assertion.repository.ts`):**
                58. **Consistent ORM/Schema:** Uses Drizzle and relies on central schema definition (Good). Contrast with SQLite repo.
                59. **Reliance on `toObject()`:** `addAssertion` still uses `UserAssertion.toObject()` with casts, inheriting type safety concern (Finding #51).
                60. **Unnecessary Cast:** `updateStatus` casts update values to `Record<string, unknown>` for `.set()`, reducing type safety.
                61. **Mapping Internal:** Relies on internal `rowToDomain`. Drizzle rows are typed, but a dedicated mapper could be safer/more maintainable.
            *   **Service (`backpack.service.ts`):**
                *   **Correct Delegation:** Service correctly delegates to injected repositories.
                *   **Assertion Validation:** `addAssertion` correctly checks if the target assertion exists before creating the link (Good).
                62. **Error Masking:** Re-throwing generic errors hides specific failure reasons. Consider custom errors or propagating specific DB/validation errors.
            *   **Controller (`backpack.controller.ts`):**
                *   **Clear Structure:** Follows consistent request/service-call/response pattern (Good).
                63. **Reliance on `toObject()`:** Uses `entity.toObject()` for success responses, propagating type safety issue (Finding #51, #55, #58).
                64. **Generic Error Responses:** Returns generic error messages in response bodies (Similar to Finding #62).

6.  **Database Layer:** A cross-cutting review of Drizzle schema, mappers, migrations, and type conversion utilities for both PostgreSQL and SQLite, ensuring consistency and correctness.
    *   **Findings:**
        *   **Type Conversion Utilities (`type-conversion.ts`):**
            *   **Correct Dialect Handling:** Utilities correctly abstract differences for JSON, Timestamps, UUIDs, Booleans between PG/SQLite (Good).
            *   **Robust Timestamp Logic:** `convertTimestamp` handles various inputs, nulls, and includes validation/logging (Good).
            *   **Safe JSON Parsing:** `convertJson` uses try/catch with logging for SQLite parsing (Good).
            65. **Minor JSON Edge Case:** SQLite `convertJson` (from DB) assumes input is string if parsing needed; could pass non-string unexpected types through (Minor).
        *   **PostgreSQL Schema (`postgresql/schema.ts`):**
            *   **Appropriate Type Usage:** Leverages PG native types (uuid, jsonb, timestamp, boolean) effectively (Good).
            *   **Referential Integrity:** FKs and cascade deletes correctly implemented (Good).
            *   **Performance:** Indices well-defined for common queries (Good).
            *   **Extensibility:** `additionalFields` column provides flexibility (Good).
            *   **Completeness:** Schema covers all required entities (Good).
        *   **SQLite Schema (`sqlite/schema.ts`):**
            *   **Correct Type Mapping:** Uses SQLite types (`text`, `integer`) mapping correctly to PG concepts (Good).
            *   **Consistency (Structure):** Table structure and indices largely mirror PG schema (Good).
            66. **Missing Cascade Deletes in Schema File:** The `sqlite/schema.ts` file lacks `{ onDelete: 'cascade' }` on FKs, unlike the PG schema and the generated *first* migration (`0000_initial`). The *second* migration (`0000_...phantom`) then explicitly adds `ON DELETE no action`, further contradicting intent. Requires fixing `sqlite/schema.ts` *and* migrations, plus ensuring `PRAGMA foreign_keys = ON;`. (Critical)
        *   **PostgreSQL Migrations (`drizzle/pg-migrations/`):**
            *   **`0000_initial_schema.sql`:**
                *   **Cascade Delete Present:** Correctly includes `ON DELETE CASCADE` for core FKs (Good).
            67. **Schema Drift:** Significant discrepancies between migration SQL and current `postgresql/schema.ts` (IDs: TEXT vs uuid, Tags: TEXT[] vs jsonb, Revoked: BOOLEAN vs jsonb, naming). Indicates migrations may be out of sync with schema definitions. (Critical)
            *   **`0001_worried_zzzax.sql`:**
                *   **Corrects Schema Drift:** Aligns core OB tables (issuers, badgeClasses, assertions) with `schema.ts` types (Good).
                *   **Cascade Delete Present:** Correctly includes `ON DELETE CASCADE` in FK definitions (Good).
                68. **Incomplete Schema Migration:** Fails to create RBAC (apiKeys, roles, userRoles) or Backpack (platforms, platformUsers, userAssertions) tables defined in `schema.ts`. (Critical)
                69. **Unusual `CREATE TABLE`:** Redefines tables using `CREATE TABLE` instead of `ALTER TABLE`, suggesting potential issues with the migration generation/sequence. (Minor)
        *   **SQLite Migrations (`drizzle/migrations/`):**
            *   **`0000_initial_schema.sql`:**
                *   **Cascade Delete Present:** Migration correctly includes `ON DELETE CASCADE` for core FKs, matching PG intent (Good - Confirms #66 is schema file issue).
                70. **Schema Drift:** Significant discrepancies between migration SQL and current `sqlite/schema.ts` (onDelete clause presence, Timestamps: TEXT vs INTEGER, naming). Migrations out of sync with schema definitions. (Critical)
            *   **`0000_medical_blonde_phantom.sql`:**
                *   **Corrects Timestamp Types:** Aligns timestamp columns with `integer` type from `schema.ts` (Good).
                71. **Removes Cascade Deletes:** Explicitly sets `ON DELETE no action`, contradicting the first migration and PG behavior. (Critical)
                72. **Incomplete Schema Migration:** Fails to create RBAC or Backpack tables defined in `schema.ts`. (Critical)
                73. **Unusual `CREATE TABLE` Pattern:** Redefines tables instead of altering. (Minor)

7.  **Validation Layer:** Examine input validation (e.g., using Zod) in controllers and services.
    *   **`AssertionController` (`src/api/controllers/assertion.controller.ts`):**
        74. **Lack of Robust Validation:** Relies on manual mapping (`mapToPartialAssertion`) and type assertions (`as ...`) instead of a schema validation library (e.g., Zod) for incoming `CreateAssertionDto`/`UpdateAssertionDto`. (Critical)
        75. **Potential for Invalid Data:** Complex nested objects (`recipient`, `verification`, `evidence`) are not structurally validated at runtime, potentially allowing malformed data into the domain layer. (High)
        76. **Inconsistent Date Error Handling:** `mapToPartialAssertion` throws error for invalid `issuedOn` but only logs warning for invalid `expires`. (Medium)

## Refactoring Priorities (Post-Review)
*   **Critical:**
    *   **Migration Inconsistencies (#67, #68, #70, #71, #72):** Migrations are incomplete, out-of-sync with schema definitions, and have conflicting SQLite `ON DELETE` behavior. Blocks reliable database setup.
    *   **Lack of Robust Input Validation (#74):** Controllers don't validate complex input DTOs structures at runtime.
*   **High:**
    *   **Potential for Invalid Data (#75):** Lack of validation allows potentially malformed data into the domain layer.
    *   **Entity `toObject()` Type Safety (#7, #16, #26, #48, #51):** Generic return types force unsafe downstream assertions.
    *   **Missing SQLite `onDelete` in Schema (#66):** `sqlite/schema.ts` contradicts migrations and PG behavior.
*   **Medium:**
    *   **SQLite Repository Implementation (#52):** Inconsistent use of `bun:sqlite` vs Drizzle ORM.
    *   **Inconsistent Date Error Handling (#76):** Different handling for `issuedOn` vs `expires` validation.
    *   *(Numerous other Medium findings related to specific implementation details)*
*   **Minor:**
    *   *(Several Minor findings related to code style, logging, potential edge cases)*

## Proposed PR Plan

1.  **PR 1: Stabilize Database Schema & Migrations (Critical)** – ✅ (branch `fix/db-migrations`, PR opened)
    *   **Goal:** Ensure reliable and consistent database setup across both dialects.
    *   **Tasks Completed:** Fixed `sqlite/schema.ts` `onDelete: 'cascade'`, regenerated PostgreSQL & SQLite migrations, verified SQL, ensured `PRAGMA foreign_keys = ON`, and replaced temporary console logging in `drizzle.config.ts` with an isolated `RdLogger` instance to satisfy lint hooks. All tests and pre-push checks pass. **Learning:** `drizzle-kit` config must avoid importing the full application logger; instantiating a minimal logger resolves module-resolution issues.
2.  **PR 2: Implement Robust Input Validation (Critical/High)**
    *   **Goal:** Secure API endpoints by validating incoming data structures.
    *   **Tasks:** Add Zod, define schemas for DTOs (`CreateAssertionDto`, etc.), refactor controllers (`AssertionController`) to use Zod parsing, standardize date error handling. (Addresses #74, #75, #76).
3.  **PR 3: Enhance Core Entity Type Safety (High)**
    *   **Goal:** Improve internal type safety and reduce reliance on assertions.
    *   **Tasks:** Refactor `toObject()` methods in core entities (`Assertion`, `BadgeClass`, `Issuer`, `UserAssertion`) to return specific OB types, remove downstream `as` assertions. (Addresses #7, #16, #26, #48, #51).
4.  **PR 4: Unify SQLite Repository Implementation (Medium)**
    *   **Goal:** Ensure consistent data access patterns using Drizzle ORM.
    *   **Tasks:** Refactor SQLite repositories (`SqliteUserAssertionRepository`, etc.) to use Drizzle, remove manual SQL/table creation, ensure use of type conversion utilities. (Addresses #52).
5.  **PR 5: Address Minor Issues & Investigate Types (Medium/Low)**
    *   **Goal:** Clean up remaining smaller issues.
    *   **Tasks:** Review type conversion edge cases (#65), investigate `IRI` type import (#4fc912b4), address other Medium/Minor findings (#4, #17, #69, #73, etc.).
