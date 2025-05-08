# Task: Migrate Tests from Elysia.js to Hono

**Objective:** Adapt all existing tests (E2E, integration, unit) to work with the new Hono framework, ensuring test coverage is maintained or improved and leveraging Hono's testing utilities for better type safety and efficiency.

**Background:**
The project is migrating its API framework from Elysia.js to Hono. This task focuses on migrating the associated test suites.

- Current E2E tests primarily use `fetch` against a running server.
- Integration tests (some unimplemented) were planned to use `supertest` with an Elysia app instance.
- Hono provides `app.request()` and a more convenient `testClient` (from `hono/testing`) for direct app testing.

**Key Areas of Change & Migration Strategy:**

1.  **Integration Tests (e.g., `tests/api/auth.integration.test.ts`, `tests/api/api-endpoints.test.ts`):
    *   **Strategy:** Replace `supertest` (or plans for it) and direct Elysia app instantiation with Hono's `testClient`.
    *   **Actions:**
        *   Import `testClient` from `hono/testing`.
        *   Instantiate the Hono application (the main `app` instance from your Hono setup).
        *   Create a test client: `const client = testClient(honoApp);`
        *   Refactor test requests to use the client's methods (e.g., `await client.v3.assertions.$get()` or `await client.api.v1.auth.login.$post({json: {...}})` if using RPC mode, or generic `await client.get('/path')`).
        *   Update response assertions based on the structure returned by `testClient`.

2.  **E2E Tests (e.g., `test/e2e/*.e2e.test.ts`):
    *   **Strategy:** The core `fetch` logic may remain. Focus on ensuring the Hono server is correctly started and managed for the test environment.
    *   **Actions:**
        *   Verify/update scripts or configurations (e.g., `bun test:e2e:*`, `docker-compose.test.yml`) to correctly start and stop the Hono application instead of Elysia for E2E test runs.
        *   Ensure the `API_URL` used in tests correctly points to the Hono server during test execution.
        *   Review and adjust any request headers, bodies, or response parsing if Hono's default behavior differs slightly from Elysia's in ways that affect the tests (e.g., error response formats if not standardized).

3.  **Unit Tests (e.g., testing individual services, controllers, middleware if they had Elysia-specific mocks):
    *   **Strategy:** Update mocks of Elysia's context, request, or response objects to reflect Hono's `Context` (`c`) object and its structure.
    *   **Actions:**
        *   Identify unit tests that mock parts of the Elysia framework.
        *   Refactor these mocks to create Hono `Context` objects. Hono's `app.request()` can be useful here to generate a context or parts of it for testing, e.g., `const req = new Request('http://localhost/path'); const c = app.createContext(req);` (or similar, check Hono docs for precise context creation for tests).
        *   Ensure that any tested functions expecting a framework context receive a Hono-compatible context.

**General Steps & Considerations:**

1.  **Install Hono Testing Utilities:**
    *   Ensure `hono` is already a dependency. The `hono/testing` module is part of the main `hono` package.

2.  **Review Test Scripts (`package.json`):
    *   Examine scripts like `bun test:core`, `bun test:pg`, `bun test:sqlite`, `bun test:e2e:sqlite`.
    *   Modify any setup/teardown logic or environment configurations that were specific to running Elysia for tests.
    *   For PostgreSQL tests (`bun test:pg`), ensure the Hono app can connect to the database provided by `docker-compose.test.yml`.

3.  **Iterative Migration:**
    *   Migrate tests file by file or module by module.
    *   Start with integration tests as `testClient` is a direct replacement for the `supertest` pattern.
    *   Then, adapt E2E test environments.
    *   Finally, review and update unit tests for any framework-specific mocking.

4.  **Helper Functions & Shared Mocks:**
    *   Review any existing test helper functions or shared mock modules (if any) for Elysia dependencies and update them for Hono.

5.  **Leverage Hono's Features:**
    *   **Type Safety:** Utilize the type-safe nature of `testClient` where possible.
    *   **Mocking Environment/Bindings:** For tests needing specific environment variables or context bindings (like D1, KV, etc., though perhaps less relevant for this project's stack), use `app.request(url, options, MOCK_ENV)` as shown in Hono's documentation.

6.  **Maintain Consistency:**
    *   Adhere to existing test structure, naming conventions, and project guidelines (`MEMORY[3b5f8625-16ba-49e7-86f0-86a51bd5e0c1]`).

7.  **Thorough Testing:**
    *   After migration, run all test suites to ensure all tests pass and coverage is maintained.

8.  **Cleanup:**
    *   Remove `supertest` and any other Elysia-specific testing dependencies from `package.json` if they are no longer needed.
    *   Remove unused imports of Elysia types or utilities from test files.
    *   Ensure all code passes linting (`bun run lint`) and type-checking (`bun run typecheck`).

**List of Test Files to Migrate (from previous `find_by_name`):**

*   `test/api/validation/assertion.schemas.test.ts`
*   `test/e2e/assertion.e2e.test.ts`
*   `test/e2e/auth.e2e.test.ts`
*   `test/e2e/badgeClass.e2e.test.ts`
*   `test/e2e/issuer.e2e.test.ts`
*   `test/e2e/openBadgesCompliance.e2e.test.ts`
*   `tests/api/api-endpoints.test.ts`
*   `tests/api/auth.integration.test.ts`
*   `tests/api/endpoints.test.ts`
*   `tests/api/validation/dto.validator.test.ts`
*   `tests/auth/adapters/api-key.adapter.test.ts`
*   `tests/auth/middleware/auth.middleware.test.ts`
*   `tests/auth/services/jwt.service.test.ts`
*   `tests/config/drizzle-config.test.ts`
*   `tests/core/verification.service.test.ts`
*   `tests/domains/assertion/assertion.entity.test.ts`
*   `tests/domains/auth/api-key.test.ts`
*   `tests/domains/backpack/platform-user.entity.test.ts`
*   `tests/domains/backpack/platform.entity.test.ts`
*   `tests/domains/backpack/user-assertion.entity.test.ts`
*   `tests/domains/badgeClass/badgeClass.entity.test.ts`
*   `tests/domains/issuer/issuer.entity.test.ts`
*   `tests/infrastructure/assets/local-storage.adapter.test.ts`
*   `tests/infrastructure/database/migrations/run.test.ts`
*   `tests/infrastructure/database/modules/postgresql/repositories/postgres-assertion.repository.test.ts`
*   `tests/infrastructure/database/modules/postgresql/repositories/postgres-badge-class.repository.test.ts`
*   `tests/infrastructure/database/modules/postgresql/repositories/postgres-issuer.repository.test.ts`
*   `tests/infrastructure/database/modules/postgresql/repositories/postgres-platform.repository.test.ts`
*   `tests/infrastructure/database/modules/postgresql/repositories.test.ts`
*   `tests/infrastructure/database/modules/sqlite/repositories/sqlite-issuer.repository.test.ts`
*   `tests/infrastructure/database/modules/sqlite/sqlite.database.test.ts`
*   `tests/infrastructure/database/utils/query-logger.service.test.ts`
*   `tests/infrastructure/database/utils/type-conversion.test.ts`
*   `tests/utils/crypto/signature.test.ts`
*   `tests/utils/errors/validation.errors.test.ts`
*   `tests/utils/logging/logger.service.test.ts`
*   `tests/utils/monitoring/health-check.service.test.ts`
*   `tests/utils/types/iri-utils.test.ts`
*   `tests/utils/validation/entity-validator.test.ts`
*   `tests/utils/validation/validation-middleware.test.ts`
