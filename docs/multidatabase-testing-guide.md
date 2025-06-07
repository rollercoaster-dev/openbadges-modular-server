# Multi-Database Testing Guide

This guide provides detailed information about the multi-database testing setup in the OpenBadges Modular Server. It explains how tests are configured to work with different database backends and how to write database-agnostic tests.

## Architecture Overview

The OpenBadges Modular Server is designed to be database-agnostic, allowing it to work with various database systems through a common repository interface. The current implementation supports:

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

## Test Configuration

### Environment Variables

Tests use the following environment variables to configure the database:

- `DB_TYPE`: Specifies the database type (`sqlite` or `postgresql`)
- `DATABASE_URL`: Connection string for PostgreSQL
- `SQLITE_DB_PATH`: Path to SQLite database file (`:memory:` for in-memory database)

These variables can be set in the `.env.test` file or passed directly to the test command.

### Test Setup

The test setup is handled by the following files:

- `tests/e2e/setup-test-app.ts`: Sets up the test server and database connection
- `tests/e2e/setup/globalSetup.ts`: Global setup for all tests
- `tests/e2e/setup/globalTeardown.ts`: Global teardown for all tests

The `setupTestApp` function in `setup-test-app.ts` is responsible for:

1. Creating a new Hono app instance
2. Configuring the database connection based on environment variables
3. Running migrations if needed
4. Setting up repositories and controllers
5. Starting the server

### Database Reset

The `resetDatabase` function in `tests/e2e/helpers/database-reset.helper.ts` is responsible for resetting the database between tests. It:

1. Determines the database type from environment variables
2. Calls the appropriate reset function (`resetSqliteDatabase` or `resetPostgresDatabase`)
3. Handles errors gracefully to allow tests to continue even if reset fails

## Writing Database-Agnostic Tests

### Test Structure

E2E tests should follow this structure:

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

### Best Practices

1. **Use Environment Variables**: Always respect the `DB_TYPE` environment variable and provide sensible defaults.
2. **Reset Database**: Always reset the database between tests to ensure isolation.
3. **Use Test Data Helper**: Use the `TestDataHelper` class to create and clean up test data.
4. **Handle Database-Specific Behavior**: If your test needs to handle database-specific behavior, use conditional logic based on the database type.
5. **Graceful Failure**: Handle database connection failures gracefully to allow tests to run in different environments.

## Running Tests

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

See the [Database Integration Guide](./database-integration-guide.md) for detailed instructions.

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
