# CI Pipeline Guide

This document explains the CI pipeline structure for the Open Badges API project and provides guidance on troubleshooting common issues.

## Pipeline Structure

The CI pipeline is designed to be efficient, reliable, and easy to maintain. It consists of the following workflows:

### 1. Unified CI Pipeline (`ci.yml`)

This is the main workflow that runs on all pull requests and pushes to the main branch. It consists of the following jobs:

#### a. Lint and Type Check
- Runs ESLint to check code quality
- Runs TypeScript type checking to ensure type safety
- Fast and lightweight, runs first to catch basic errors

#### b. Unit and Integration Tests
- Runs all unit and integration tests
- Uses PostgreSQL for database tests
- Skips E2E tests to run them separately

#### c. E2E Tests
- Runs end-to-end tests with both PostgreSQL and SQLite
- Tests the API endpoints with real HTTP requests
- Verifies Open Badges compliance

### 2. CI/CD Pipeline (`ci-cd.yml`)

This workflow runs only on the main branch and release tags. It includes:

- All the tests from the Unified CI Pipeline
- Building and pushing the Docker image to GitHub Container Registry
- Deploying to Kubernetes when a new version is tagged

### 3. CodeQL Analysis (`codeql.yml`)

This workflow runs security scanning for code vulnerabilities.

## Test Environment

The test environment is configured to be as close as possible to the production environment:

- **PostgreSQL**: Uses PostgreSQL 16 Alpine for database tests
- **SQLite**: Uses in-memory SQLite for fast tests and file-based SQLite for E2E tests
- **Authentication**: Uses test API keys for authentication tests
- **Environment Variables**: Sets up all necessary environment variables for testing

## Common Issues and Troubleshooting

### 1. Tests Pass Locally But Fail in CI

This is a common issue that can have several causes:

#### a. Database Connection Issues
- **Symptom**: Database-related errors in CI logs
- **Solution**: Check database connection parameters and ensure the database is ready before tests run
- **Fix Example**: Add a wait step to ensure the database is ready before running tests

#### b. Environment Variable Differences
- **Symptom**: Undefined values or missing configuration errors
- **Solution**: Compare local and CI environment variables, ensure all required variables are set in CI
- **Fix Example**: Add missing environment variables to the workflow file

#### c. Path Resolution Problems
- **Symptom**: Module not found errors
- **Solution**: Ensure NODE_PATH is set correctly in CI
- **Fix Example**: Add `NODE_PATH: "."` to environment variables

#### d. Timing Issues
- **Symptom**: Intermittent failures, especially in E2E tests
- **Solution**: Add delays or retries for time-sensitive operations
- **Fix Example**: Increase test timeouts or add retry logic

### 2. Database-Specific Issues

#### a. PostgreSQL Issues
- **Symptom**: Connection refused or authentication errors
- **Solution**: Check PostgreSQL service configuration in workflow
- **Fix Example**: Add `POSTGRES_HOST_AUTH_METHOD: trust` to PostgreSQL service environment

#### b. SQLite Issues
- **Symptom**: File permission errors or "database is locked" errors
- **Solution**: Ensure SQLite file has proper permissions and is not being accessed by multiple processes
- **Fix Example**: Use `:memory:` SQLite database for tests that don't need persistence

### 3. E2E Test Issues

#### a. Server Not Starting
- **Symptom**: Connection refused errors in E2E tests
- **Solution**: Ensure the server is started before tests run
- **Fix Example**: Add a health check to verify the server is running

#### b. Authentication Issues
- **Symptom**: 401 Unauthorized or 403 Forbidden errors
- **Solution**: Ensure test API keys are correctly set in environment variables
- **Fix Example**: Add `AUTH_API_KEY_TEST` and `AUTH_API_KEY_E2E` to environment variables

## Best Practices

### 1. Keep Workflows Simple

- Avoid complex conditional logic in workflows
- Split complex jobs into smaller, focused jobs
- Use job dependencies to control execution order

### 2. Standardize Environment Setup

- Use the same database versions in CI and development
- Set up environment variables consistently across all jobs
- Create `.env.test` files for test-specific configuration

### 3. Improve Error Reporting

- Add descriptive names to all steps
- Use the Test Summary step to provide clear information about test results
- Add debugging information for common failure points

### 4. Optimize Performance

- Run fast checks (lint, type check) before slow tests
- Use job dependencies to run tests in parallel when possible
- Cache dependencies to speed up builds

## Modifying the CI Pipeline

When making changes to the CI pipeline:

1. Test changes locally first using `act` or similar tools
2. Make small, incremental changes rather than large rewrites
3. Document changes in pull request descriptions
4. Monitor the first few runs after changes to ensure everything works as expected

## Conclusion

The CI pipeline is designed to catch issues early and provide clear feedback to developers. By following the guidelines in this document, you can help maintain a reliable and efficient CI process.

If you encounter persistent issues with the CI pipeline, please open an issue on GitHub with detailed information about the problem, including logs and steps to reproduce.
