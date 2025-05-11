# E2E Testing Guide

This guide explains how to run and write E2E tests for the OpenBadges Modular Server.

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

## Running Tests Locally

### Prerequisites

- Bun installed
- Docker installed (for PostgreSQL tests)

### Running with SQLite

```bash
# Run E2E tests with SQLite
bun run test:e2e:sqlite
```

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

### Running All Tests

```bash
# Run E2E tests with both SQLite and PostgreSQL
bun run test:e2e
```

## Writing E2E Tests

### Test Structure

E2E tests should follow this structure:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { TestDataHelper } from './helpers/test-data.helper';
import { resetDatabase } from './helpers/database-reset.helper';
import { API_URL, API_KEY } from './setup/globalSetup';

const ENDPOINT = `${API_URL}/your-endpoint`;

describe('Your Entity API - E2E', () => {
  // Initialize test data helper before all tests
  beforeAll(async () => {
    TestDataHelper.initialize(API_URL, API_KEY);
  });

  // Reset database before each test to ensure isolation
  beforeEach(async () => {
    await resetDatabase();
  });

  // Clean up test data after all tests
  afterAll(async () => {
    await TestDataHelper.cleanup();
  });

  describe('Create Entity', () => {
    it('should create an entity with valid data', async () => {
      // Prepare test data
      const entityData = { /* ... */ };

      // Execute test
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify(entityData)
      });

      // Verify response
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toBeDefined();
      expect(body.id).toBeDefined();
      // More assertions...
    });

    // More tests...
  });

  // More test groups...
});
```

### Using Test Data Helper

The `TestDataHelper` class provides methods for creating and cleaning up test data:

```typescript
// Create a test issuer
const { id: issuerId } = await TestDataHelper.createIssuer();

// Create a test badge class
const { id: badgeClassId } = await TestDataHelper.createBadgeClass(issuerId);

// Create a test assertion
const { id: assertionId } = await TestDataHelper.createAssertion(badgeClassId);
```

### Resetting the Database

The `resetDatabase` function resets the database to a clean state:

```typescript
// Reset the database before each test
beforeEach(async () => {
  await resetDatabase();
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

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on state from other tests.
2. **Clean Up**: Always clean up test data after tests.
3. **Descriptive Names**: Use descriptive test names that clearly indicate what's being tested.
4. **Complete Lifecycle**: Test the complete CRUD lifecycle of entities.
5. **Error Cases**: Test both success and error cases.
6. **Assertions**: Make specific assertions about the response, not just the status code.
7. **Logging**: Use the logger to log important information during tests.

## Troubleshooting

### Tests Fail in CI but Pass Locally

1. Check environment variables in CI
2. Check database configuration
3. Check for race conditions or timing issues
4. Check for hardcoded paths or URLs

### Database Connection Issues

1. Check database configuration in `.env.test`
2. Check that PostgreSQL container is running
3. Check that migrations have been applied

### Server Startup Issues

1. Check port configuration
2. Check for conflicting processes
3. Check server logs for errors
