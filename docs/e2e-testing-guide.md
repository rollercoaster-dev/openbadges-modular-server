# E2E Testing Guide

This guide explains how to run and write E2E tests for the OpenBadges Modular Server, with a focus on the multi-database setup.

## Test Structure

E2E tests are located in the `tests/e2e` directory and are organized by entity:

- `issuer.e2e.test.ts`: Tests for issuer endpoints
- `badgeClass.e2e.test.ts`: Tests for badge class endpoints
- `assertion.e2e.test.ts`: Tests for assertion endpoints
- `auth.e2e.test.ts`: Tests for authentication
- `obv3-compliance.e2e.test.ts`: Tests for Open Badges v3.0 compliance

### Helper Files

The E2E tests use several helper files to standardize testing:

- `helpers/test-data.helper.ts`: Provides methods for creating and cleaning up test data
- `helpers/database-reset.helper.ts`: Provides methods for resetting the database between tests
- `setup/globalSetup.ts`: Sets up the test environment before all tests
- `setup/globalTeardown.ts`: Cleans up the test environment after all tests
- `setup-test-app.ts`: Provides methods for setting up and tearing down the test server

## Multi-Database Architecture

The OpenBadges Modular Server is designed to work with multiple database backends. The current implementation supports:

- **SQLite**: A lightweight, file-based database that's perfect for development and small deployments
- **PostgreSQL**: A powerful, open-source relational database system that's ideal for production deployments

### Key Components

1. **Database Factory (`src/infrastructure/database/database.factory.ts`)**:
   - Central factory that creates database instances based on configuration
   - Registers and manages database modules
   - Determines the default database type from environment variables

2. **Database Modules**:
   - `src/infrastructure/database/modules/sqlite/sqlite.module.ts`
   - `src/infrastructure/database/modules/postgresql/postgresql.module.ts`
   - Each module implements the `DatabaseModuleInterface`

3. **Repository Factory (`src/infrastructure/repository.factory.ts`)**:
   - Creates repositories for different entities
   - Uses the appropriate database implementation based on configuration

4. **Database Configuration**:
   - Controlled by environment variables:
     - `DB_TYPE`: Specifies the database type (`sqlite` or `postgresql`)
     - `DATABASE_URL`: Connection string for PostgreSQL
     - `SQLITE_DB_PATH` or `SQLITE_FILE`: Path to SQLite database file

5. **Test Setup (`tests/e2e/setup-test-app.ts`)**:
   - Configures the test environment based on environment variables
   - Sets up the database connection
   - Applies migrations if needed
   - Handles errors gracefully to allow tests to run in different environments

6. **Database Reset (`tests/e2e/helpers/database-reset.helper.ts`)**:
   - Provides methods to reset the database between tests
   - Handles different database types appropriately

## Running Tests Locally

### Prerequisites

- Bun installed
- Docker installed (for PostgreSQL tests)

### Running with SQLite

```bash
# Run E2E tests with SQLite
bun run test:e2e:sqlite
```

This command:
1. Sets `DB_TYPE=sqlite` in the environment
2. Uses an in-memory SQLite database by default
3. Runs all tests in the `tests/e2e` directory

### Running with PostgreSQL

```bash
# Start PostgreSQL container
bun run db:test:pg:start

# Run migrations
bun run db:test:pg:migrate

# Run E2E tests with PostgreSQL
bun run test:e2e:pg:run

# Stop PostgreSQL container
bun run db:test:pg:stop

# Or run all steps in one command
bun run test:e2e:pg
```

The PostgreSQL test setup:
1. Starts a Docker container with PostgreSQL
2. Applies migrations to create the schema
3. Sets `DB_TYPE=postgresql` and `DATABASE_URL` in the environment
4. Runs all tests in the `tests/e2e` directory
5. Stops the Docker container

### Running All Tests

```bash
# Run E2E tests with both SQLite and PostgreSQL
bun run test:e2e
```

This command runs the tests with both database types sequentially.

## Writing Database-Agnostic E2E Tests

E2E tests should be written to work with any supported database backend. Here's how to make your tests database-agnostic:

### 1. Use Environment Variables for Configuration

Tests should respect the `DB_TYPE` environment variable:

```typescript
// At the top of your test file
// Use SQLite by default for tests, but allow overriding via environment variables
if (!process.env.DB_TYPE) {
  process.env.DB_TYPE = 'sqlite';
}
if (process.env.DB_TYPE === 'sqlite' && !process.env.SQLITE_DB_PATH) {
  process.env.SQLITE_DB_PATH = ':memory:';
}
```

### 2. Use the Database Reset Helper

Always reset the database between tests to ensure isolation:

```typescript
import { resetDatabase } from './helpers/database-reset.helper';

// Reset database before each test
beforeEach(async () => {
  await resetDatabase();
});
```

The `resetDatabase` function automatically handles different database types.

### 3. Use the Test Data Helper

The `TestDataHelper` class provides database-agnostic methods for creating test data:

```typescript
import { TestDataHelper } from './helpers/test-data.helper';

// Initialize test data helper
beforeAll(async () => {
  TestDataHelper.initialize(API_URL, API_KEY);
});

// Create test data
const { id: issuerId } = await TestDataHelper.createIssuer();
const { id: badgeClassId } = await TestDataHelper.createBadgeClass(issuerId);
const { id: assertionId } = await TestDataHelper.createAssertion(badgeClassId);

// Clean up test data
afterAll(async () => {
  await TestDataHelper.cleanup();
});
```

### 4. Handle Database-Specific Behavior

If your test needs to handle database-specific behavior, use conditional logic based on the database type:

```typescript
const dbType = process.env.DB_TYPE || config.database.type;

if (dbType === 'sqlite') {
  // SQLite-specific behavior
} else if (dbType === 'postgresql') {
  // PostgreSQL-specific behavior
}
```

### 5. Complete Test Structure

Here's a complete example of a database-agnostic E2E test:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { TestDataHelper } from './helpers/test-data.helper';
import { resetDatabase } from './helpers/database-reset.helper';
import { config } from '@/config/config';
import { setupTestApp, stopTestServer } from './setup-test-app';

// Use SQLite by default for tests, but allow overriding via environment variables
if (!process.env.DB_TYPE) {
  process.env.DB_TYPE = 'sqlite';
}
if (process.env.DB_TYPE === 'sqlite' && !process.env.SQLITE_DB_PATH) {
  process.env.SQLITE_DB_PATH = ':memory:';
}

// Use a random port for testing to avoid conflicts
const TEST_PORT = Math.floor(Math.random() * 10000) + 10000;
process.env.TEST_PORT = TEST_PORT.toString();

// Base URL for the API
const API_URL = `http://${config.server.host}:${TEST_PORT}`;
const ENDPOINT = `${API_URL}/v3/your-endpoint`;

// API key for protected endpoints
const API_KEY = 'verysecretkeye2e';

// Server instance for the test
let server: { stop: () => void } | null = null;

describe('Your Entity API - E2E', () => {
  // Start the server before all tests
  beforeAll(async () => {
    process.env['NODE_ENV'] = 'test';

    const result = await setupTestApp();
    server = result.server as { stop: () => void };

    // Initialize test data helper
    TestDataHelper.initialize(API_URL, API_KEY);

    // Wait for the server to be fully ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  // Reset database before each test to ensure isolation
  beforeEach(async () => {
    await resetDatabase();
  });

  // Stop the server and clean up test data after all tests
  afterAll(async () => {
    await TestDataHelper.cleanup();

    if (server) {
      stopTestServer(server);
    }
  });

  // Your test cases here...
});
```

## CI/CD Integration

E2E tests are run in CI/CD using GitHub Actions. The workflow is defined in `.github/workflows/e2e-tests.yml`.

The workflow:

1. Sets up the test environment
2. Creates a PostgreSQL database
3. Runs migrations
4. Runs E2E tests with PostgreSQL
5. Runs E2E tests with SQLite

This ensures that tests pass with both database backends.

## Adding Support for a New Database

If you want to add support for a new database (e.g., MongoDB), you'll need to:

1. Create a new database module in `src/infrastructure/database/modules/{database-type}/`
2. Implement the `DatabaseModuleInterface` for your database
3. Add repository implementations for each entity
4. Update the `DatabaseFactory` to register your module
5. Add database-specific tests in `tests/infrastructure/database/modules/{database-type}/`
6. Update the `resetDatabase` function in `tests/e2e/helpers/database-reset.helper.ts`
7. Add CI/CD configuration in `.github/workflows/database-tests.yml`

See the [Database Integration Guide](../database-integration-guide.md) for detailed instructions.

## Best Practices

1. **Database Agnosticism**: Tests should work with any supported database backend.
2. **Test Isolation**: Each test should be independent and not rely on state from other tests.
3. **Clean Up**: Always clean up test data after tests.
4. **Descriptive Names**: Use descriptive test names that clearly indicate what's being tested.
5. **Complete Lifecycle**: Test the complete CRUD lifecycle of entities.
6. **Error Cases**: Test both success and error cases.
7. **Assertions**: Make specific assertions about the response, not just the status code.
8. **Logging**: Use the logger to log important information during tests.
9. **Environment Variables**: Use environment variables for configuration, not hardcoded values.
10. **Graceful Failure**: Handle database connection failures gracefully to allow tests to run in different environments.

## Troubleshooting

### Tests Fail in CI but Pass Locally

1. Check environment variables in CI
2. Check database configuration
3. Check for race conditions or timing issues
4. Check for hardcoded paths or URLs
5. Check if tests are skipped when the database is not available

### Database Connection Issues

1. Check database configuration in `.env.test`
2. Check that PostgreSQL container is running
3. Check that migrations have been applied
4. Check database logs for errors
5. Verify connection string format

### Server Startup Issues

1. Check port configuration
2. Check for conflicting processes
3. Check server logs for errors
4. Verify that the database is accessible

### Database-Specific Issues

#### SQLite

1. Check that the SQLite file path is correct
2. Verify that the directory is writable
3. Check for file locking issues

#### PostgreSQL

1. Check that the PostgreSQL container is running
2. Verify connection credentials
3. Check that the database exists
4. Verify that migrations have been applied
