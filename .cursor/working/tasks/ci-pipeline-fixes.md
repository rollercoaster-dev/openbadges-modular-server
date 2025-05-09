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
- [ ] Fix any remaining issues from the Elysia to Hono framework migration
  - The PR is a major refactoring that switched from Elysia.js to Hono
  - Ensure all middleware and routes are properly migrated

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
- [ ] Address any test failures identified in the logs
- [ ] Update tests to work with the new Hono framework
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
- [ ] Verify that E2E tests are properly configured for the CI environment
- [ ] Fix any issues with the OpenBadges v3.0 compliance tests

## Resources
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Hono Framework Documentation](https://hono.dev/)
- [Bun Testing Documentation](https://bun.sh/docs/cli/test)
