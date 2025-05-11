# Consolidated E2E Testing Task

## Task Description

Implement comprehensive end-to-end tests for the OpenBadges Modular Server. This task is essential for ensuring the reliability and correctness of the system as a whole.

## Priority

High

## Effort Estimate

2-3 days

## Dependencies

- Task 01: API Router Integration
- Task 02: Security Middleware Migration

## Current Status (Updated 2025-05-10)

This task has been partially implemented. Based on a review of the codebase and test execution, here's the current status:

### Completed:
- ✅ Selected E2E testing tools: Bun Test as the test runner and native fetch API for HTTP requests
- ✅ Set up a dedicated E2E test environment with both SQLite and PostgreSQL support
  - Created `tests/e2e` directory structure with test files
  - Created `docker-compose.test.yml` for PostgreSQL testing
  - Added bun scripts (in `package.json`) for running E2E tests with both database types
- ✅ Implemented global setup/teardown for E2E tests in `bunfig.toml` (`tests/e2e/setup/globalSetup.ts`, `tests/e2e/setup/globalTeardown.ts`)
- ✅ Created basic E2E tests for critical API endpoints (OpenBadges compliance, Issuer, Badge Class, Assertion, Authentication)
- ✅ Created comprehensive OBv3 compliance E2E test in `tests/e2e/obv3-compliance.e2e.test.ts` that:
  - Creates a complete badge (issuer, badge class, assertion)
  - Verifies the badge
  - Validates correct context URLs, proof structure, and verification process
  - Includes proper test cleanup to ensure test resources are properly deleted

### Partially Completed / Needs Enhancement:
- 🟨 Current tests verify API endpoints exist and respond (and basic create/cleanup for some), but **do not yet fully test complete data persistence and retrieval flows (e.g., detailed Create -> Read -> Update -> Delete -> Verify lifecycle for all fields and relationships).**

### Remaining (Prioritized):
1. **High Priority:**
   - **Enable existing tests:** Remove `.skip` from test cases and ensure they pass
   - **Enhance existing E2E tests to verify complete data flows:** Ensure tests for Issuer, BadgeClass, and Assertion APIs thoroughly validate creation, accurate retrieval (single and list), updates to various fields, and successful deletion with verification. This includes checking that all persisted data matches the input data and that relationships between entities are correctly handled.

2. **Medium Priority:**
   - Add tests for error cases and edge conditions (e.g., invalid input data, unauthorized access attempts, concurrency issues if applicable).
   - Integrate E2E tests into CI pipeline.
   - Improve test server startup/shutdown logic within the test files or global setup/teardown if further optimizations are needed.

3. **Lower Priority:**
   - Document E2E testing procedures for developers (how to run, how to write new tests, common pitfalls).
   - Optimize test performance and reliability further if they become slow or flaky.

## Acceptance Criteria

1. End-to-end tests are implemented for all core functionality
2. End-to-end tests are implemented for backpack functionality
3. End-to-end tests are implemented for user management
4. End-to-end tests are implemented for authentication
5. All tests pass consistently
6. Tests are documented and maintainable

## Implementation Plan

Based on the analysis of the current codebase, here's a detailed plan for implementing comprehensive E2E tests:

1. **Enable the Existing Tests**:
   - The current E2E tests are well-structured but are skipped (using `it.skip`)
   - We need to enable these tests by removing the `.skip` and ensuring they pass

2. **Enhance Issuer E2E Tests**:
   - Complete the CRUD lifecycle tests for Issuer entity
   - Add validation for all fields in responses
   - Add error case tests

3. **Enhance BadgeClass E2E Tests**:
   - Complete the CRUD lifecycle tests for BadgeClass entity
   - Add validation for all fields in responses
   - Add error case tests

4. **Enhance Assertion E2E Tests**:
   - Complete the CRUD lifecycle tests for Assertion entity
   - Add validation for all fields in responses
   - Add error case tests

5. **Enhance Authentication E2E Tests**:
   - Fix the skipped auth tests
   - Add tests for different authentication scenarios

6. **Ensure Open Badges v3.0 Compliance**:
   - Enhance the existing OBv3 compliance test
   - Ensure all entities conform to the Open Badges v3.0 specification

7. **Add Documentation**:
   - Document how to run the E2E tests
   - Document the test structure and how to add new tests

## Technical Notes

- Use the existing test setup in `tests/e2e/setup-test-app.ts`
- Use random ports to avoid conflicts
- Clean up the database before and after each test
- Use the Hono test client for API tests
- Consider using a test framework like Playwright for browser-based tests

## Testing

- Run the tests in a clean environment
- Verify that all tests pass consistently
- Check test coverage to ensure all functionality is tested
- Verify that tests are isolated and don't interfere with each other

## Documentation

- Document the test setup and configuration
- Document the test fixtures and helpers
- Document the test cases and expected results
- Document how to run the tests

## Related Files

- `tests/e2e/setup-test-app.ts`
- `tests/e2e/assertion.e2e.test.ts`
- `tests/e2e/auth.e2e.test.ts`
- `tests/e2e/badgeClass.e2e.test.ts`
- `tests/e2e/issuer.e2e.test.ts`
- `tests/e2e/obv3-compliance.e2e.test.ts`
- `tests/e2e/openBadgesCompliance.e2e.test.ts`
