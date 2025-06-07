---
applyTo: "**/*.test.ts,**/*.spec.ts,tests/**/*.ts"
---

# Testing Pattern Instructions

Apply these testing-specific guidelines for all test files.

## Test Structure
- Use Bun's built-in test framework, not Vitest
- Use descriptive test names that explain the expected behavior
- Group related tests with `describe` blocks
- Use `beforeAll`, `afterAll`, `beforeEach`, `afterEach` for setup/teardown

## Database Testing
- Write database-agnostic tests that work with both SQLite and PostgreSQL
- Use `setupTestApp()` for E2E tests with proper port management
- Clean up test data after each test
- Use transactions for test isolation when possible

## Authentication Testing
- Test both authenticated and unauthenticated scenarios
- Use specific status code expectations (401/403) not ranges
- Test different permission levels and roles

## Assertion Patterns
- Use specific assertions rather than generic ones
- Test error messages and error types, not just that errors occur
- Verify both success and failure scenarios
- Include edge cases and boundary conditions
