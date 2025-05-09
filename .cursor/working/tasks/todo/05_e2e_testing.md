# Implement and Improve E2E Testing

> _Intended for: [x] Internal Task  [x] GitHub Issue  [ ] Pull Request_

## 1. Goal & Context
- **Objective:** Establish robust end-to-end (E2E) testing to validate the full API stack, including HTTP endpoints, database, and integration flows.
- **Branch:** `feat/e2e-testing`
- **Status:** [ In Progress]

### Background
Current testing is focused on unit and integration tests. E2E tests are needed to ensure the system works as expected from the perspective of a real client, catching issues that lower-level tests may miss.

## 2. Steps
- [x] Select an E2E testing tool (e.g., Playwright, Supertest, or curl scripts)
- [x] Set up a dedicated E2E test environment (SQLite and Docker/Postgres)
- [~] Write E2E tests for critical user flows (issuer, badge, assertion CRUD, verification, revocation) - *Partially completed*
  - [x] Basic API endpoint tests for Issuer, BadgeClass, and Assertion
  - [x] Comprehensive OBv3 compliance test (full badge issuance flow with verification)
  - [ ] Complete CRUD lifecycle tests for all entities
- [ ] Add E2E tests for error cases and edge conditions
- [ ] Integrate E2E tests into CI pipeline
- [ ] Document how to run E2E tests locally and in CI

## 3. Definition of Done
- [ ] E2E tests cover all major API flows
- [ ] E2E tests run successfully in CI
- [ ] Documentation is updated

## 4. Current Status (Updated 2025-05-07 by David)

This task has been partially implemented. Based on a review of the codebase and test execution, here's the current status:

### Completed:
- ✅ Selected E2E testing tools: Bun Test as the test runner and native fetch API for HTTP requests
- ✅ Set up a dedicated E2E test environment with both SQLite and PostgreSQL support
  - Created `test/e2e` directory structure with test files
  - Created `docker-compose.test.yml` for PostgreSQL testing
  - Added bun scripts (in `package.json`) for running E2E tests with both database types
  - **Note:** The documented `.env.test` file was not found at the project root. Environment configuration for tests appears to be primarily managed via `NODE_ENV` and `DB_TYPE` variables in `package.json` scripts.
- ✅ Implemented global setup/teardown for E2E tests in `bunfig.toml` (`test/e2e/setup/globalSetup.ts`, `test/e2e/setup/globalTeardown.ts`)
- ✅ Created basic E2E tests for critical API endpoints (OpenBadges compliance, Issuer, Badge Class, Assertion, Authentication)
- ✅ **RESOLVED:** PostgreSQL E2E test setup issue with `rd-logger` dependency. Both SQLite and PostgreSQL E2E tests (`bun run test:e2e:sqlite` and `bun run test:e2e:pg`) now complete successfully.
- ✅ Created comprehensive OBv3 compliance E2E test in `test/e2e/obv3-compliance.e2e.test.ts` that:
  - Creates a complete badge (issuer, badge class, assertion)
  - Verifies the badge
  - Validates correct context URLs, proof structure, and verification process
  - Includes proper test cleanup to ensure test resources are properly deleted

### Partially Completed / Needs Enhancement:
- 🟨 Current tests verify API endpoints exist and respond (and basic create/cleanup for some), but **do not yet fully test complete data persistence and retrieval flows (e.g., detailed Create -> Read -> Update -> Delete -> Verify lifecycle for all fields and relationships).** This was confirmed by reviewing `test/e2e/issuer.e2e.test.ts`.

### Remaining (Prioritized - Updated):
1. **High Priority:**
   - **Enhance existing E2E tests to verify complete data flows:** Ensure tests for Issuer, BadgeClass, and Assertion APIs thoroughly validate creation, accurate retrieval (single and list), updates to various fields, and successful deletion with verification. This includes checking that all persisted data matches the input data and that relationships between entities are correctly handled.
   - ✅ **Add more comprehensive verification tests:** The new `test/e2e/obv3-compliance.e2e.test.ts` test now provides comprehensive validation of Open Badges 3.0 compliance, including verification of badges.

2. **Medium Priority:**
   - Add tests for error cases and edge conditions (e.g., invalid input data, unauthorized access attempts, concurrency issues if applicable).
   - Integrate E2E tests into CI pipeline.
   - Improve test server startup/shutdown logic within the test files or global setup/teardown if further optimizations are needed (current per-file server start/stop in `issuer.e2e.test.ts` seems reasonable for now but could be centralized).

3. **Lower Priority:**
   - Document E2E testing procedures for developers (how to run, how to write new tests, common pitfalls).
   - Optimize test performance and reliability further if they become slow or flaky.

### Next Steps (Updated):
1. **Enhance Existing E2E Tests for Full Data Lifecycle Coverage:**
   - Systematically go through `issuer.e2e.test.ts`, `badgeClass.e2e.test.ts`, and `assertion.e2e.test.ts`.
   - For each entity:
     - **Create:** Verify 201/200 status, and that the response body matches the input data (including all relevant fields) and contains a valid ID.
     - **Read (Specific):** Use the ID from creation to fetch the specific entity. Verify 200 status and that all data matches what was created.
     - **Read (List):** Fetch all entities. Verify 200 status and that the newly created entity is present in the list with correct data.
     - **Update:** Modify several fields of the created entity. Verify 200 status and that the response body reflects the changes. Fetch the entity again by ID and verify all updated fields are persisted correctly.
     - **Delete:** Delete the entity by ID. Verify 200/204 status.
     - **Verify Deletion:** Attempt to fetch the deleted entity by ID and expect a 404 status.
   - Ensure proper test data cleanup between test runs or individual test cases if not already handled by global/local teardown or test structure.

2. **Implement Error Case and Edge Condition Tests:**
   - Once CRUD tests are robust, add tests for scenarios like submitting incomplete data, invalid data types, requests to non-existent resources, etc.

## 5. Parking Lot
- Explore browser-based E2E tests for Swagger UI
- Consider E2E tests for authentication and security flows
- Investigate visual regression testing for any UI components

## E2E Testing Plan for Openbadges Modular Server

This plan outlines high-level End-to-End (E2E) test scenarios for the `openbadges-modular-server`, focusing on core functionalities as defined by the Open Badges v2.0 and v3.0 specifications.

**Guiding Principles:**
*   **Specification Compliance:** Ensure all generated badge objects (Issuer, BadgeClass/Achievement, Assertion/AchievementCredential) adhere to Open Badges v2.0 and v3.0 (including Verifiable Credential structure).
*   **Lifecycle Coverage:** Test the complete lifecycle of badge creation, issuance, and verification.
*   **API-focused:** Tests will primarily target the server's API endpoints.
*   **Data Integrity:** Verify that data is correctly persisted and retrieved.
*   **Error Handling:** Test for graceful failure on invalid inputs or conditions.

**Tooling Considerations:**
*   Tests will likely be written in TypeScript/JavaScript.
*   Execution via Bun's test runner (`bun test`).
*   HTTP request library (e.g., `fetch`, `axios`) for API interaction.
*   Assertion library (e.g., Jest's `expect`, Chai).
*   A running instance of the `openbadges-modular-server` with a dedicated test database.

### E2E Environment Setup

This section details the configuration and components of the End-to-End testing environment.

**1. Directory Structure:**
*   `test/e2e/`: Root directory for all E2E test files (e.g., `*.test.ts`).
*   `test/e2e/helpers/`: (Optional) For utility functions and helper classes specific to E2E tests.
*   `test/e2e/config/`: (Optional) For any E2E test-specific configuration files.
*   Note: An empty `.gitkeep` file was initially planned for these directories but encountered issues. Directories will be created when the first files are added to them.

**2. Test Databases:**
The E2E tests are designed to run against both PostgreSQL and SQLite databases.

*   **PostgreSQL (via Docker):**
    *   **Configuration:** Managed by `docker-compose.test.yml` at the project root.
    *   **Service Name:** `test-db-pg` (as defined in `docker-compose.test.yml`).
    *   **Credentials & DB Name:**
        *   Defined in `docker-compose.test.yml`:
            *   `POSTGRES_USER=testuser`
            *   `POSTGRES_PASSWORD=testpassword`
            *   `POSTGRES_DB=openbadges_test`
        *   Mirrored/Overridden in `.env.test` for application connection:
            *   `POSTGRES_HOST=localhost` (or your Docker host)
            *   `POSTGRES_PORT=5433` (as mapped in `docker-compose.test.yml`)
            *   `POSTGRES_USER=postgres` (Note: This was previously `postgres`, ensure your Drizzle config and app use the correct user from `.env.test` or `docker-compose.test.yml` for runtime connection. The `docker-compose.test.yml` creates `testuser`.)
            *   `POSTGRES_PASSWORD=postgres` (Similarly, ensure consistency with the runtime user's password.)
            *   `POSTGRES_DB=openbadges_test`
    *   **Data Persistence:** Database volumes are removed on `docker compose down --volumes` (see `package.json` scripts) to ensure a clean state for each full test run.

*   **SQLite:**
    *   **Type:** File-based.
    *   **Location:** The test database file will be created at `test/e2e/test_database.sqlite`.
    *   **Configuration:** The path is primarily managed by the `SQLITE_DB_PATH` environment variable, set in `.env.test` and used by `package.json` scripts and `drizzle.config.ts`.

**3. Environment Configuration File (`.env.test`):**
*   **Location:** Project root: `.env.test`
*   **Purpose:** Stores environment variables specific to the E2E testing environment.
*   **Key Variables:**
    *   `API_BASE_URL=http://localhost:3000` (Example: Ensure this points to your running test server)
    *   `DB_TYPE=postgresql` or `DB_TYPE=sqlite` (Used by `drizzle.config.ts` and application logic to switch DB dialect)
    *   PostgreSQL connection details (see above).
    *   `SQLITE_DB_PATH=./test/e2e/test_database.sqlite`
*   **Security:** This file **should be added to `.gitignore`** to prevent committing local test configurations or sensitive credentials if any are added in the future.

**4. Drizzle ORM Configuration (`drizzle.config.ts`):**
*   Dynamically adapts based on the `DB_TYPE` environment variable.
*   **PostgreSQL:** Uses connection details derived from `config.database.connectionString` (loaded from `./src/config/config.ts`, which should source environment variables like `DATABASE_URL` or individual `POSTGRES_*` vars set by `.env.test`).
*   **SQLite:** Prioritizes `process.env.SQLITE_DB_PATH` for the database file path, falling back to `config.database.sqliteFile` or a default. This allows test scripts to specify the exact test SQLite DB location.

**5. `package.json` Scripts for E2E Testing:**
The following scripts have been added to manage and run E2E tests:

*   **PostgreSQL:**
    *   `db:test:pg:start`: `docker compose -f docker-compose.test.yml up -d --wait`
        *   Starts the PostgreSQL Docker container in detached mode and waits for it to be healthy.
    *   `db:test:pg:stop`: `docker compose -f docker-compose.test.yml down --volumes`
        *   Stops the PostgreSQL container and removes its data volumes for a clean slate.
    *   `db:test:pg:migrate`: `DB_TYPE=postgresql bun run db:generate:pg && DB_TYPE=postgresql bun run db:migrate:pg`
        *   Generates and applies Drizzle migrations to the PostgreSQL test database.
    *   `test:e2e:pg:setup`: `bun run db:test:pg:start && bun run db:test:pg:migrate`
        *   Convenience script to start and migrate the PostgreSQL test database.
    *   `test:e2e:pg:run`: `DB_TYPE=postgresql bun test test/e2e/**/*.test.ts`
        *   Runs all test files matching `test/e2e/**/*.test.ts` against the PostgreSQL database.
    *   `test:e2e:pg`: `bun run test:e2e:pg:setup && bun run test:e2e:pg:run ; bun run db:test:pg:stop`
        *   A full cycle: sets up the PG test DB, runs tests, and then tears down the DB.

*   **SQLite:**
    *   `db:test:sqlite:migrate`: `DB_TYPE=sqlite SQLITE_DB_PATH=$(pwd)/test/e2e/test_database.sqlite bun run db:generate:sqlite && DB_TYPE=sqlite SQLITE_DB_PATH=$(pwd)/test/e2e/test_database.sqlite bun run db:migrate:sqlite`
        *   Generates and applies Drizzle migrations to the SQLite test database file.
    *   `test:e2e:sqlite:run`: `DB_TYPE=sqlite SQLITE_DB_PATH=$(pwd)/test/e2e/test_database.sqlite bun test test/e2e/**/*.test.ts`
        *   Runs all E2E tests against the SQLite database.
    *   `test:e2e:sqlite`: `bun run db:test:sqlite:migrate && bun run test:e2e:sqlite:run`
        *   A full cycle: migrates the SQLite test DB and runs tests.

*   **Combined:**
    *   `test:e2e`: `bun run test:e2e:sqlite && bun run test:e2e:pg`
        *   Runs E2E tests sequentially against SQLite and then PostgreSQL.

**6. Running the Application Server for Tests:**
*   **Prerequisite:** For the E2E tests (`test:e2e:*:run`) to execute successfully, the `openbadges-modular-server` application itself must be running and accessible at the URL specified by `API_BASE_URL` in `.env.test`.
*   **Management:** The current scripts do not automatically start/stop the application server. This needs to be done manually or by integrating a tool like `concurrently` into the test scripts if desired (e.g., `concurrently "bun run dev" "bun run test:e2e:pg:run"`).

**Test Categories & High-Level Scenarios:**

1.  **Issuer Profile Management (OB 2.0 Profile / OB 3.0 Issuer)**
    *   **Scenario 1.1: Create Issuer Profile**
        *   _Action:_ API call to create a new Issuer Profile with all required fields (name, URL, email) and some optional fields (e.g., description, image).
        *   _Expected Outcome:_ Successful creation (e.g., 201 status), response contains the created Issuer Profile JSON, data is persisted correctly. Issuer JSON conforms to spec.
    *   **Scenario 1.2: Retrieve Issuer Profile**
        *   _Action:_ API call to retrieve an existing Issuer Profile by its ID.
        *   _Expected Outcome:_ Successful retrieval (e.g., 200 status), response contains the correct Issuer Profile JSON, conforming to spec.
    *   **Scenario 1.3: Update Issuer Profile**
        *   _Action:_ API call to update an existing Issuer Profile (e.g., change its name or contact email).
        *   _Expected Outcome:_ Successful update (e.g., 200 status), response contains the updated Issuer Profile, changes are persisted.
    *   **Scenario 1.4: Create Issuer Profile (Invalid Data)**
        *   _Action:_ API call to create an Issuer Profile with missing required fields (e.g., no name) or invalid data (e.g., malformed URL).
        *   _Expected Outcome:_ Request fails (e.g., 400 status) with a clear error message. No data is persisted.
    *   **Scenario 1.5: (If Implemented) Delete Issuer Profile**
        *   _Action:_ API call to delete an Issuer Profile.
        *   _Expected Outcome:_ Successful deletion (e.g., 200 or 204 status). Subsequent attempts to retrieve the Issuer Profile fail (e.g., 404 status).

2.  **Badge Class / Achievement Management (OB 2.0 BadgeClass / OB 3.0 Achievement)**
    *   **Scenario 2.1: Create Badge Class/Achievement**
        *   _Prerequisite:_ An Issuer Profile exists.
        *   _Action:_ API call to create a new Badge Class/Achievement associated with the Issuer, including name, description, criteria (URL and narrative), and image.
        *   _Expected Outcome:_ Successful creation, response contains the Badge Class/Achievement JSON, data persisted. JSON conforms to spec.
    *   **Scenario 2.2: Retrieve Badge Class/Achievement**
        *   _Action:_ API call to retrieve an existing Badge Class/Achievement by its ID.
        *   _Expected Outcome:_ Successful retrieval, response contains correct Badge Class/Achievement JSON, conforming to spec.
    *   **Scenario 2.3: Update Badge Class/Achievement**
        *   _Action:_ API call to update an existing Badge Class/Achievement (e.g., modify criteria narrative).
        *   _Expected Outcome:_ Successful update, response contains updated JSON, changes persisted.
    *   **Scenario 2.4: Create Badge Class/Achievement (Invalid Data)**
        *   _Action:_ API call to create a Badge Class/Achievement with invalid data (e.g., no criteria specified).
        *   _Expected Outcome:_ Request fails with a clear error message.
    *   **Scenario 2.5: (If Implemented) Delete Badge Class/Achievement**
        *   _Action:_ API call to delete a Badge Class/Achievement.
        *   _Expected Outcome:_ Successful deletion. Consider impact on existing assertions.

3.  **Assertion / AchievementCredential Issuance (OB 2.0 Assertion / OB 3.0 AchievementCredential)**
    *   **Scenario 3.1: Issue Assertion/Credential**
        *   _Prerequisites:_ An Issuer Profile and a Badge Class/Achievement exist.
        *   _Action:_ API call to issue an Assertion/Credential for the Badge Class to a recipient (e.g., identified by hashed email or ID).
        *   _Expected Outcome:_ Successful issuance, response contains Assertion/Credential JSON (conforming to OB 2.0 and OB 3.0/VC spec, including `type` fields). Assertion is linked to Issuer and Badge Class.
    *   **Scenario 3.2: Issue Assertion/Credential with Evidence & Expiration**
        *   _Action:_ API call to issue an Assertion/Credential with `evidence` (URL and narrative) and an `expires` date.
        *   _Expected Outcome:_ Successful issuance, all fields correctly represented in the output JSON.
    *   **Scenario 3.3: Issue Assertion/Credential (Non-existent Badge Class)**
        *   _Action:_ API call to issue an Assertion for a Badge Class ID that does not exist.
        *   _Expected Outcome:_ Request fails with a clear error message.
    *   **Scenario 3.4: Issue Assertion/Credential (Invalid Recipient)**
        *   _Action:_ API call to issue an Assertion with an improperly formatted recipient identifier.
        *   _Expected Outcome:_ Request fails with a clear error message.

4.  **Assertion / AchievementCredential Verification**
    *   **Scenario 4.1: Retrieve/Verify Public Assertion/Credential**
        *   _Prerequisite:_ An Assertion/Credential has been issued and is publicly accessible.
        *   _Action:_ HTTP GET request to the Assertion/Credential's public URL (or verification endpoint).
        *   _Expected Outcome:_ Successful retrieval, response contains the correct Assertion/Credential JSON, conforming to spec.
    *   **Scenario 4.2: Verify Signed Assertion/Credential (If applicable)**
        *   _Action:_ If Assertions are signed (e.g., JWS for OB 3.0), retrieve and verify the signature.
        *   _Expected Outcome:_ Signature is valid.
    *   **Scenario 4.3: Verify Revoked Assertion/Credential (If revocation is implemented)**
        *   _Action:_ Attempt to retrieve/verify an Assertion/Credential that has been revoked.
        *   _Expected Outcome:_ Response indicates the Assertion/Credential is revoked (e.g., `revoked` property is true, or specific status code).
    *   **Scenario 4.4: Verify Expired Assertion/Credential**
        *   _Action:_ Attempt to retrieve/verify an Assertion/Credential whose `expires` date is in the past.
        *   _Expected Outcome:_ Response indicates the Assertion/Credential is expired (or verification logic treats it as invalid).

5.  **Public Endpoints & Discovery**
    *   **Scenario 5.1: Access Public Issuer Profile URL**
        *   _Action:_ HTTP GET request to an Issuer's public profile URL.
        *   _Expected Outcome:_ Returns valid Issuer JSON.
    *   **Scenario 5.2: Access Public Badge Class/Achievement URL**
        *   _Action:_ HTTP GET request to a Badge Class/Achievement's public URL.
        *   _Expected Outcome:_ Returns valid Badge Class/Achievement JSON.
    *   **Scenario 5.3: (If applicable) List Badges by Issuer/Recipient**
        *   _Action:_ API call to an endpoint listing all badges awarded by an issuer (or to a recipient, if backpack-like functionality is server-side).
        *   _Expected Outcome:_ Returns a list of Assertion/Credential objects or links.

6.  **Authentication & Authorization (Cross-cutting)**
    *   **Scenario 6.1: Protected Action (No Authentication)**
        *   _Action:_ Attempt to perform a protected action (e.g., create Issuer, issue Badge) without authentication credentials.
        *   _Expected Outcome:_ Request fails (e.g., 401 Unauthorized status).
    *   **Scenario 6.2: Protected Action (Invalid Credentials)**
        *   _Action:_ Attempt to perform a protected action with invalid/expired authentication credentials.
        *   _Expected Outcome:_ Request fails (e.g., 401 or 403 Forbidden status).
    *   **Scenario 6.3: Protected Action (Insufficient Permissions - If roles exist)**
        *   _Action:_ Authenticated user attempts an action they are not authorized for.
        *   _Expected Outcome:_ Request fails (e.g., 403 Forbidden status).

7.  **Open Badges Specification Compliance (Cross-cutting)**
    *   **Explicitly Tested:** The `test/e2e/obv3-compliance.e2e.test.ts` test file now provides comprehensive validation of Open Badges 3.0 compliance, including:
        * Creating a complete badge (issuer, badge class, assertion)
        * Verifying the badge
        * Validating correct context URLs (`https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json` and `https://www.w3.org/ns/credentials/v2`)
        * Validating proof structure and verification process
        * Checking correct entity types (e.g., `VerifiableCredential`, `OpenBadgeCredential`)
    *   **Implicitly Tested:** Throughout all scenarios, the JSON outputs for Issuer, BadgeClass/Achievement, and Assertion/Credential must be validated against the relevant Open Badges (v2.0, v3.0) and Verifiable Credential specifications. This includes checking `type` fields, `@context` URLs, presence of required properties, and correct data types. (Addresses memories regarding type mismatches in entities).