# End-to-End Testing Guide

This document provides guidance on running and writing end-to-end tests for the OpenBadges Modular Server.

## Overview

The E2E tests verify that the entire system works correctly from end to end, including:

- API endpoints
- Database interactions
- Authentication
- Open Badges protocol compliance

## Test Structure

The E2E tests are organized as follows:

- `tests/e2e/setup-test-app.ts`: Sets up a test server for E2E tests
- `tests/e2e/utils/`: Utility functions for E2E tests
- `tests/e2e/*.e2e.test.ts`: Individual E2E test files

## Running E2E Tests

### Prerequisites

- Bun installed
- PostgreSQL (optional, for PostgreSQL tests)

### Running with SQLite (Default)

SQLite tests are the simplest to run as they don't require an external database:

```bash
# Run all E2E tests with SQLite
DB_TYPE=sqlite bun run test:e2e:sqlite

# Run a specific E2E test file
DB_TYPE=sqlite bun test tests/e2e/issuer.e2e.test.ts
```

### Running with PostgreSQL

To run tests with PostgreSQL, you need a PostgreSQL server running:

```bash
# Start PostgreSQL test container
bun run db:test:pg:start

# Run migrations
bun run db:test:pg:migrate

# Run E2E tests with PostgreSQL
DB_TYPE=postgresql bun run test:e2e:pg

# Stop PostgreSQL test container
bun run db:test:pg:stop
```

### Running with Test Containers

You can also run tests with PostgreSQL in a Docker container managed by the test framework:

```bash
# Run E2E tests with PostgreSQL in test containers
DB_TYPE=postgresql USE_TEST_CONTAINERS=true bun run test:e2e
```

## Writing E2E Tests

### Test Structure

E2E tests should follow this structure:

```typescript
// tests/e2e/example.e2e.test.ts
import { it, expect } from 'bun:test';
import { setupTestApp, stopTestServer } from './setup-test-app';
import { databaseAwareDescribe } from './utils/test-setup';

// Use database-aware describe to handle database availability
databaseAwareDescribe('Example API - E2E', (describeTest) => {
  // Use the provided describe function that handles database availability
  describeTest('Example operations', () => {
    let server: any;
    
    // Set up the test server before tests
    beforeAll(async () => {
      const setup = await setupTestApp();
      server = setup.server;
    });
    
    // Clean up after tests
    afterAll(async () => {
      await stopTestServer(server);
    });
    
    // Test case
    it('should do something', async () => {
      // Test code here
      expect(true).toBe(true);
    });
  });
});
```

### Best Practices

1. **Use the database-aware describe function**:
   ```typescript
   import { databaseAwareDescribe } from './utils/test-setup';
   
   databaseAwareDescribe('Test Suite', (describeTest) => {
     describeTest('Test Group', () => {
       // Tests here
     });
   });
   ```

2. **Clean up test data**:
   ```typescript
   afterEach(async () => {
     // Delete test data
     await fetch(`${API_BASE_URL}/v3/issuers/${testIssuerId}`, {
       method: 'DELETE',
       headers: { 'X-API-Key': API_KEY }
     });
   });
   ```

3. **Use test data generators**:
   ```typescript
   import { createTestIssuerData } from './utils/test-data-generator';
   
   const issuerData = createTestIssuerData('Test Issuer');
   ```

4. **Validate responses thoroughly**:
   ```typescript
   import { validateIssuerFields } from './utils/validation';
   
   const response = await fetch(ISSUERS_ENDPOINT, { /* ... */ });
   const data = await response.json();
   
   // Validate the response
   expect(response.status).toBe(200);
   validateIssuerFields(data);
   ```

## CI Pipeline

The CI pipeline runs E2E tests with both SQLite and PostgreSQL databases:

### SQLite Tests

1. Sets up the test environment
2. Creates necessary directories and files
3. Runs SQLite migrations
4. Runs tests with SQLite
5. Uploads coverage data

### PostgreSQL Tests

1. Sets up PostgreSQL service
2. Verifies PostgreSQL connection
3. Runs PostgreSQL migrations
4. Runs tests with PostgreSQL
5. Uploads coverage data

## Troubleshooting

### Tests are being skipped

If tests are being skipped with a message about database availability:

1. Check that the database is running and accessible
2. Verify environment variables are set correctly
3. Check for permission issues with database files

### SQLite file permission issues

If you see errors about SQLite file permissions:

```bash
# Create the directory and set permissions
mkdir -p tests/e2e
touch tests/e2e/test_database.sqlite
chmod 777 tests/e2e/test_database.sqlite
chmod 777 tests/e2e
```

### PostgreSQL connection issues

If you have issues connecting to PostgreSQL:

1. Verify PostgreSQL is running: `pg_isready -h localhost -p 5433`
2. Check credentials: `psql -h localhost -p 5433 -U testuser -d openbadges_test`
3. Verify environment variables: `echo $DATABASE_URL`
