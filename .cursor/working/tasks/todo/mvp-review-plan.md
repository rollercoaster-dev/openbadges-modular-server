# MVP Code Review Plan

**Goal:** Conduct a systematic review of the `openbadges-modular-server` MVP codebase, focusing on Open Badges 3.0 alignment, TypeScript quality (especially `openbadges-types` usage), and adherence to the DRY principle. The review will be broken down by feature, with findings and refactoring for each feature consolidated into a separate Pull Request.

**Proposed Feature Review Order:**

1.  **Platform Management & Authentication/Authorization:** Reviewing tenant setup, user roles, JWT handling, etc.
    *   **Findings:**
        *   `postgres-platform.repository.ts`: Not implemented; method signatures mismatch interface.
        *   `sqlite-platform.repository.ts`: Contains unsafe type casts (`as Platform`, `as any`); relies on manual type conversions (string/date) instead of potentially leveraging ORM features; uses `Platform.create` for update logic.
        *   `platform.entity.ts`: `create` method input (`Partial<Platform>`) is too permissive; `toObject` returns broad `Record<string, unknown>`; uses unsafe cast (`as Shared.IRI`) for generated ID.
        *   `platform-jwt.service.ts`: `verifyToken` uses unsafe cast (`as unknown as PlatformJwtPayload`); should validate payload structure.
        *   `platform-auth.middleware.ts`: Derived context type (`AuthResult`) is too broad (`Record<string, unknown>`); contains unsafe casts (`as Shared.IRI`).
2.  **BadgeClass Management:** Checking the definition, creation, and updating of badge classes.
    *   **Findings:**
        *   `badgeClass.entity.ts`: `create` method input (`Partial<BadgeClass>`) is too permissive; `toObject`/`toJsonLd`/`getProperty` return overly broad types (`any`, `Record<string, any>`); uses unsafe cast (`as Shared.IRI`) for generated ID; index signature `[key: string]: any;` reduces type safety.
        *   `badgeClass.repository.ts`: `create` method signature requires correction (should accept creation data, not `Omit<BadgeClass, 'id'>`).
        *   `postgres-badge-class.repository.ts` & `sqlite-badge-class.repository.ts`: Mismatch `create` signature from interface; contain unsafe casts (`as BadgeClass`, `as string`, `as any`); use `BadgeClass.create` for update logic which needs review.
3.  **Badge Issuance:** Examining the process of issuing badges based on defined classes.
    *   **Findings:**
        *   `assertion.entity.ts`: `create` input (`Partial<Assertion>`) is too permissive; widespread use of `any` for core properties (`recipient`, `evidence`, `verification`) reduces type safety; uses unsafe cast (`as Shared.IRI`) for generated ID; `toObject`/`toJsonLd`/`getProperty` return overly broad types; `[key: string]: any;` signature.
        *   `assertion.repository.ts`: `create` method signature requires correction (accept creation data, not `Omit<Assertion, 'id'>`); `findByRecipient` uses `string` for recipient ID (needs review based on storage).
        *   `postgres-assertion.repository.ts`: Mismatches `create` signature; contains unsafe casts (`as Assertion`, `as string`, `as any`, `as Partial<Assertion>`); uses `Assertion.create` for update logic; `verify` logic duplicates some `isValid` checks.
4.  **Assertion Retrieval & Validation:** Verifying how badge assertions are served and validated.
    *   **Findings:**
        *   `assertion.controller.ts`: Lacks input DTOs/validation (`createAssertion`, `updateAssertion` accept `Record<string, any>`); uses potentially unsafe cast `toIRI(...) as Shared.IRI` repeatedly; logic for fetching related entities for V3 serialization is duplicated across methods (violates DRY); returns broad `Record<string, any>` types.
5.  **Backpack/Integration Points:** (If applicable) Reviewing any code related to external system interactions.
    *   **Findings:**
        *   `user-assertion.entity.ts`: `create` input (`Partial<UserAssertion>`) is too permissive (missing `userId`, `assertionId` enforcement); uses unsafe cast (`as Shared.IRI`) for generated ID; `toObject` returns broad `Record<string, unknown>`.
        *   `user-assertion.repository.ts`: Well-defined interface; uses specific types (`UserAssertionStatus`, `UserAssertionCreateParams`); employs function overloading well. No major issues noted.
6.  **Database Layer:** A cross-cutting review of Drizzle schema, mappers, migrations, and type conversion utilities for both PostgreSQL and SQLite, ensuring consistency and correctness.
    *   **Findings:**
        *   **PostgreSQL Schema (`postgresql/schema.ts`):**
            *   Generally well-structured, aligns with OB 3.0 concepts (uses `jsonb` effectively for extensibility).
            *   Leverages Drizzle features (types, constraints, foreign keys with cascade, indexing) correctly.
            *   **Potential Issue:** `assertions.revoked` is `jsonb`, which differs from the OB 3.0 boolean standard. Recommend changing to `boolean('revoked').default(false).notNull()`.
        *   **SQLite Schema (`sqlite/schema.ts`):**
            *   Correctly adapts structure for SQLite limitations (uses `text` for UUIDs/JSON, `integer` for timestamps/booleans).
            *   Maintains structural consistency (tables, fields, indexing) with PG schema.
            *   Handles `assertions.revoked` as `integer`, aligning better with OB 3.0 boolean than the current PG schema.
            *   **Minor Inconsistency:** Lacks explicit `onDelete: 'cascade'` in foreign key definitions compared to PG schema; adding this would improve clarity.
        *   **Overall:** Schema definitions are consistent across dialects for core structure. Type conversions (JSON, UUID, timestamp, boolean) are necessary and seem handled appropriately at the schema level (implying repository responsibility for runtime conversion). The main action item is reconciling the `assertions.revoked` type definition.

**Review Process per Feature:**

*   **Locate Code:** Identify all relevant source files (services, controllers, routes, mappers, etc.).
*   **Open Badges Alignment:** Compare implementation against the Open Badges 3.0 specification.
*   **TypeScript Review:** Check `openbadges-types` usage, type safety, and best practices.
*   **DRY Analysis:** Identify and refactor repetitive code patterns.
*   **Document & Refactor:** Record findings and implement necessary changes.
*   **Create PR:** Consolidate all changes for the feature into a single, focused Pull Request.

**Next Step:**

Begin review with **Platform Management & Authentication/Authorization**.
