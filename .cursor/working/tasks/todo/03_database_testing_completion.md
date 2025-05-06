# Task: Database Testing Completion

## Priority
High - Estimated effort: 2-3 days

## Background
The test suite has a good structure but many PostgreSQL tests are currently skipped. This creates a significant gap in test coverage for the production database environment. Completing and enabling these tests is essential for ensuring the reliability of database operations in production. Additionally, there are issues with duplicate IDs in tests that need to be resolved.

## Objectives
- Fix and enable all skipped PostgreSQL tests
- Implement a robust approach to handling test data cleanup
- Ensure consistent test behavior across database types
- Improve test coverage for database edge cases

## Implementation Details
The PostgreSQL tests need to be fixed and enabled to ensure proper test coverage for the production database environment. This involves resolving issues with duplicate IDs, implementing proper test data cleanup, and ensuring consistent test behavior across database types.

### Technical Approach
1. Create a test helper that generates guaranteed unique IDs for test entities
2. Implement proper cleanup between test runs to ensure a clean state
3. Use a unique database schema for each test run to avoid conflicts
4. Add more comprehensive tests for PostgreSQL-specific features
5. Ensure consistent test behavior across SQLite and PostgreSQL

## Acceptance Criteria
- All skipped PostgreSQL tests are fixed and enabled
- Tests run successfully in CI environment
- No issues with duplicate IDs or test data conflicts
- Consistent test behavior across SQLite and PostgreSQL
- Comprehensive test coverage for database operations
- Clear documentation for running tests against different database types

## Related Files
- `/tests/infrastructure/database/modules/postgresql/repositories/postgres-assertion.repository.test.ts`
- `/tests/infrastructure/database/modules/postgresql/repositories/postgres-badge-class.repository.test.ts`
- `/tests/infrastructure/database/modules/postgresql/repositories/postgres-issuer.repository.test.ts`
- `/src/infrastructure/database/modules/postgresql/repositories/` - PostgreSQL repository implementations
- `/src/infrastructure/database/utils/type-conversion.ts` - Database type conversion utilities

## Dependencies
- None, but should be completed before production deployment

## Notes
- Consider using a test container for PostgreSQL tests in CI
- Ensure proper cleanup of test data to avoid test pollution
- Document any PostgreSQL-specific behavior that differs from SQLite
- Consider adding performance benchmarks for database operations

## Progress
- [ ] Create test helper for generating unique IDs
- [ ] Implement proper cleanup between test runs
- [ ] Fix "should find all issuers" test in PostgreSQL repositories.test.ts
- [ ] Enable and fix all skipped PostgreSQL tests
- [ ] Add tests for PostgreSQL-specific features
- [ ] Ensure consistent test behavior across database types
- [ ] Update documentation for running tests

## Current Status (Updated 2025-05-05)
Not started. This task is identified as a high priority item from the codebase review. The issue with duplicate IDs in tests has been identified in the future-issues.md document.
