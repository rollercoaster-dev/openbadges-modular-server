# CI Pipeline Fixes

## Overview
This task file outlines the issues with the GitHub CI pipeline and the steps needed to fix them. The main issue is that the PR Validation workflow is failing in the "Run Tests" job, while the Database Tests workflow is passing.

## Current Status
- **PR Validation (ci.yml)**: ❌ FAILING
- **Database Tests (database-tests.yml)**: ✅ PASSING
- **CodeQL Analysis**: ✅ PASSING

## Issues to Fix

### 1. Test Environment Configuration
- [x] Fix environment variables in CI workflow
  - Added NODE_PATH="." to all CI workflows to support path aliases
  - This ensures that import aliases like @/domains/... work correctly in CI

### 2. Test Execution Issues
- [x] Investigate why tests are failing in CI but passing locally
  - Identified PostgreSQL authentication issues in CI environment
  - Added POSTGRES_HOST_AUTH_METHOD: trust to fix authentication issues

### 3. Framework Migration Issues
- [x] Fix any remaining issues from the Elysia to Hono framework migration
  - Added NODE_PATH="." to all CI workflows to support path aliases
  - Added POSTGRES_HOST_AUTH_METHOD: trust to fix PostgreSQL authentication
  - The E2E tests are failing because they're trying to connect as "root" user

### 4. Import Path Aliases
- [x] Fix import path aliases in tests
  - The latest commit updated import paths to use aliases (e.g., @/domains/...)
  - Added NODE_PATH="." to CI workflows to ensure path aliases work correctly

### 5. Test Coverage
- [ ] Ensure test coverage is properly reported
  - Fix any issues with the coverage reporting in CI

## Action Plan

### 1. Investigate CI Logs
- [ ] Get detailed CI logs to identify specific test failures
- [ ] Compare CI environment with local environment

### 2. Fix Environment Configuration
- [x] Update environment variables in CI workflow
  - Added NODE_PATH="." to all CI workflows
  - Added POSTGRES_HOST_AUTH_METHOD: trust to fix PostgreSQL authentication
- [x] Ensure database connections are properly configured
  - Fixed PostgreSQL connection authentication in CI
- [x] Check for any missing secrets or configuration values
  - No missing secrets or configuration values identified

### 3. Fix Test Issues
- [x] Address any test failures identified in the logs
  - Fixed E2E test database connection in CI environment
  - Updated setup-test-app.ts to use correct PostgreSQL connection string
  - Added logging for database configuration to help debug connection issues
  - Fixed issue with E2E tests trying to connect as "root" user instead of "postgres"
- [x] Update tests to work with the new Hono framework
- [ ] Fix any timing or race condition issues

### 4. Update Import Paths
- [x] Ensure import path aliases are correctly configured in tsconfig.json
  - Path aliases are correctly configured in tsconfig.json
- [x] Update CI environment to support path aliases
  - Added NODE_PATH="." to all CI workflows

### 5. Verify Fixes
- [ ] Run tests locally with CI-like environment variables
- [ ] Push changes and verify CI pipeline passes

## Additional Considerations

### Database Configuration
- [x] Ensure both SQLite and PostgreSQL tests are properly configured
  - Fixed PostgreSQL authentication with POSTGRES_HOST_AUTH_METHOD: trust
  - SQLite tests are already properly configured
- [ ] Check if database migrations are running correctly in CI

### Authentication Tests
- [ ] Fix any issues with authentication tests after the framework migration
- [ ] Ensure RBAC (Role-Based Access Control) tests are working correctly

### E2E Tests
- [x] Verify that E2E tests are properly configured for the CI environment
  - Updated CI workflow to use PostgreSQL for E2E tests
  - Added API key for E2E tests in the CI environment
  - Improved E2E test logging for better debugging
- [x] Fix issues with the OpenBadges v3.0 compliance tests
  - Added Accept header to API requests
  - Enhanced error logging in tests

### Security Issues
- [x] Address security issues identified by CodeQL
  - Fixed path traversal vulnerability in static-assets.middleware.ts
  - Replaced hard-coded credentials in test files with constants
  - Improved input validation for file paths
  - Created a centralized constants file for test tokens

## Resources
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Hono Framework Documentation](https://hono.dev/)
- [Bun Testing Documentation](https://bun.sh/docs/cli/test)
