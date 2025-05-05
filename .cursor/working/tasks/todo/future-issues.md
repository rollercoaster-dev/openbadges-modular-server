# Future Issues to Address

## Current Status (Updated 2025-05-05)

This document serves as a collection of future improvements that have been identified but not yet scheduled for implementation. These items represent technical debt and enhancement opportunities that should be addressed in future development cycles.

### Priority Assessment:

**High Priority:**
- Fix the PostgreSQL test issues, particularly the "should find all issuers" test
- Improve error handling in database repositories

**Medium Priority:**
- Further reduce type assertions across the codebase
- Implement a more robust approach to handling duplicate IDs in tests

**Lower Priority:**
- Enhance PostgreSQL CI testing infrastructure
- Improve documentation for working with types

### Next Steps:
1. Schedule the high-priority items for the next development sprint
2. Create specific GitHub issues for each high-priority item
3. Assign owners to each issue based on expertise and availability

## PostgreSQL Testing

1. **Fix the "should find all issuers" test in PostgreSQL repositories.test.ts**
   - The test is currently skipped due to issues with duplicate IDs
   - Need to implement a more robust approach to handling test data cleanup between tests
   - Consider using a unique database schema for each test run to avoid conflicts

2. **Implement a more robust approach to handling duplicate IDs in tests**
   - Current approach relies on skipping problematic tests
   - Consider implementing a test helper that generates guaranteed unique IDs for test entities
   - Add proper cleanup between test runs to ensure a clean state

3. **Improve PostgreSQL CI testing infrastructure**
   - Add more comprehensive tests for PostgreSQL-specific features (like JSON querying)
   - Consider adding performance benchmarks for PostgreSQL vs SQLite
   - Implement parallel CI for both PostgreSQL and SQLite testing

## Type Safety Improvements

1. **Further reduce type assertions across the codebase**
   - Continue to replace `as` type assertions with proper type guards
   - Implement more robust type checking for IRI values
   - Consider adding runtime validation for IRI values

2. **Improve documentation for working with types**
   - Add more comprehensive documentation for IRI type usage
   - Create examples of proper type handling in the codebase
   - Document common type conversion patterns

## Other Improvements

1. **Enhance error handling in database repositories**
   - Implement more specific error types for database operations
   - Add better error messages for common database errors
   - Improve error logging for database operations

2. **Improve test coverage**
   - Add more tests for edge cases in type conversion
   - Add tests for error handling in database repositories
   - Add tests for IRI type validation and conversion
