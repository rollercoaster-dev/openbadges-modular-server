# Task: Resolve TypeScript Errors (Post-Restore)

**Objective:** Fix the 50 TypeScript errors reported by `tsc --noEmit` after restoring `src/infrastructure/database/utils/type-conversion.ts` from a previous commit.

**Context:**
Restoring `type-conversion.ts` (commit `ceff06b`) fixed critical test failures related to `convertUuid` import, but introduced numerous type errors due to potential inconsistencies with changes made in the subsequent commit (`b4d9f2a`).

**Error Analysis & Patterns:**

1.  **Branded Type Mismatches (`string` vs. `Shared.IRI`, etc.):**
    *   **Frequency:** Still the most common (~15-20 errors).
    *   **Locations:** Database mappers (`*.mapper.ts`), repositories (`*.repository.ts`), related tests (`tests/infrastructure/...`, `tests/utils/types/...`), database core files (`sqlite.database.ts`).
    *   **Cause:** Assigning or comparing plain strings where branded types are expected. Inconsistent use of type creation/conversion utilities (e.g., `toIRI`, `asIRI`).

2.  **Date/Timestamp Handling (`toISOString`/`new Date` on `unknown`):**
    *   **Frequency:** Increased slightly (~8-10 errors).
    *   **Locations:** PostgreSQL & SQLite mappers (`*.mapper.ts`), database core files (`*.database.ts`), utilities (`prepared-statements.ts`).
    *   **Cause:** Variables expected to be `Date` objects are typed as `unknown`. Suggests issues in upstream data fetching/mapping or incorrect usage/typing within the restored `convertTimestamp` function.

3.  **JSON Handling (`...additionalFields` on non-object):**
    *   **Frequency:** 1 error.
    *   **Locations:** PostgreSQL issuer mapper (`postgres-issuer.mapper.ts`).
    *   **Cause:** `additionalFields` is not typed as an object. Potential issue with `convertJson` or how JSON data is retrieved/typed.

4.  **OB2/OB3 Type Conflicts (`VerificationObject` vs. `Proof`/`CredentialStatus`):**
    *   **Frequency:** ~2 errors remain.
    *   **Locations:** `tests/core/verification.service.test.ts`.
    *   **Cause:** Mixing Open Badges v2 and v3 types for the `verification` property, primarily in tests now.

5.  **Missing Definitions/Imports (`PlatformRepository`):**
    *   **Frequency:** 1 error.
    *   **Locations:** `api.router.ts`.
    *   **Cause:** Incomplete feature or leftover code from refactoring.

6.  **General Type Safety Issues (Incorrect Assertions, Mismatched Args):**
    *   **Frequency:** Remaining errors (~10-15).
    *   **Locations:** Spread across API routers (`backpack.router.ts`), auth adapters (`basic-auth.adapter.ts`), database repositories (`postgres-assertion.repository.ts`, `sqlite-platform-user.repository.ts`, etc.), database core (`sqlite.module.ts`), error handling (`error-handler.middleware.ts`), tests (`postgres-assertion.repository.test.ts`).
    *   **Cause:** Unsafe type assertions (`as Type`), mismatched function arguments (often involving DB types vs. domain types), potential issues with the restored `type-conversion.ts` functions, Elysia-specific type issues.

**Proposed Plan:**

1.  **Refine `type-conversion.ts`:**
    *   Review and update type signatures for `convertTimestamp`, `convertJson`, `convertBoolean`, `convertUuid` to ensure they correctly handle inputs/outputs (`Date`, `Object`, `string`, `number`, `boolean`, `null`) for both SQLite and PostgreSQL.
    *   Explicitly type parameters and return values to avoid `unknown`/`any`.
    *   Fix the `@typescript-eslint/no-explicit-any` lint error (line 135).

2.  **Fix Branded Type Errors Systematically:**
    *   **Mappers:** Update `*.mapper.ts` files. Ensure strings from DB results are converted to branded types (e.g., `Shared.IRI`) using utilities (`toIRI`, `asIRI` etc.) when mapping `toDomain`.
    *   **Tests:** Update tests (`tests/infrastructure/database/...`, `tests/utils/types/iri-utils.test.ts`). Use branded types for test data setup and compare properties individually in `expect` calls where `toEqual` fails on branded types.

3.  **Resolve OB2/OB3 Conflicts:**
    *   Refactor `verification.service.ts` and `tests/core/verification.service.test.ts` according to Memory `[301960c0-52ee-4a91-95e6-d297a69e2aa0]` to handle `VerificationObject`, `Proof`, and `CredentialStatus` correctly.

4.  **Fix Remaining Miscellaneous Errors:**
    *   Address `PlatformRepository` error in `api.router.ts` (add import or definition).
    *   Fix Elysia type error in `backpack.router.ts`.
    *   Improve type safety in `basic-auth.adapter.ts` (avoid `as BasicAuthConfig`).
    *   Resolve remaining errors in database (`*.database.ts`, `*.repository.ts`) and utility files, ensuring correct types are used, especially around `Date` and JSON handling.

5.  **Final Lint Check:**
    *   Run `bun run lint`.
    *   Fix remaining `no-explicit-any` error in `tests/utils/logging/logger.service.test.ts`.

**Next Steps:** Begin with Step 1: Refine `type-conversion.ts`.

## Resolved Issues

*   **`SqliteBadgeClassRepository.update`:** Resolved type conflict between `BadgeClass.toObject()` and `BadgeClass.create()` by using a temporary `as any` cast (addressed in a separate refactoring task).
*   **`PostgresAssertionMapper`:** Refactored `toDomain` and `toPersistence` to correctly handle JSONB fields (`convertJson`) and date conversions, aligning with `Assertion` entity types.
*   **`verification.service.ts`:** Resolved type errors (TS2322, TS2345, TS2352) in `createVerificationForAssertion` and `verifyAssertionSignature`:
    *   Ensured `creator` property uses `Shared.IRI` via `toIRI` utility.
    *   Modified `utils/crypto/signature.ts#createVerification` to return a compatible type (`SignedBadgeVerification`) with `creator: Shared.IRI`.
    *   Used explicit type assertion (`as OB2.VerificationObject`) when passing verification data to `Assertion.create`.
    *   Implemented a user-defined type guard (`isSignedBadgeVerification`) to safely handle the `assertion.verification` union type before calling the `verifyAssertion` utility.
    *   Corrected import paths and removed redundant code.
*   **`AssertionController.ts` / `Assertion.toJsonLd`:** Resolved type errors (including persistent TS `37dac2ea`) related to passing `badgeClass` and `issuer` data. Refactored `Assertion.toJsonLd` to accept entities directly and use their `.toJsonLd(version)` methods. Updated `AssertionController` calls accordingly.
*   **`auth.middleware.ts` (TS2322):** Resolved type mismatch error previously noted for `BasicAuthAdapter.ts`. Root cause was the `authDerive` function returning `{ user: unknown | null }`. Fixed by defining `AuthenticatedUserContext` interface and updating `authDerive`'s return type to `{ user: AuthenticatedUserContext | null }`.

## Resolved Issues (Continued)

* **RBAC Middleware Type Errors:** Fixed TypeScript errors in the RBAC middleware by:
  * Changing the return type of middleware functions from `Elysia` instances to proper middleware functions that take a `Context` parameter
  * Adding proper TypeScript type annotations to ensure type safety
  * Creating a helper function `applyMiddleware` to apply middleware functions to Elysia routes
  * Updating all router files (`api.router.ts`, `backpack.router.ts`, `user.router.ts`) to use the new middleware approach

## Remaining Issues

* All TypeScript errors have been resolved. The code now passes type checking and all tests are passing.
* The changes have been committed and pushed to the `feature/auth-implementation` branch.
