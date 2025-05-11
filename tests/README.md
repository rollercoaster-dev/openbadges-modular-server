# Testing Guide

This document provides an overview of the testing approach used in this project, including how to run tests with different database configurations.

## Testing Architecture

The project uses a multi-layered testing approach:

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test interactions between components
3. **E2E Tests**: Test the entire application from end to end

## Database Configuration for Tests

Tests can be run against different database backends:

- **SQLite**: Fast, in-memory database for local development and CI
- **PostgreSQL**: Production-like database for more comprehensive testing

### Database Availability Handling

The test framework automatically handles database availability:

- Tests that require a database will check if the configured database is available
- If the database is not available, the tests will be skipped with a clear message
- The framework supports using Docker containers for PostgreSQL tests

## Running Tests

### Basic Test Commands

```bash
# Run all tests with default configuration (SQLite)
bun test

# Run only core tests (no database tests)
bun run test:core

# Run only SQLite tests
bun run test:sqlite

# Run only PostgreSQL tests
bun run test:pg

# Run E2E tests with SQLite
bun run test:e2e:sqlite

# Run E2E tests with PostgreSQL
bun run test:e2e:pg

# Run E2E tests with PostgreSQL in Docker containers
bun run test:e2e:containers

# Run all tests (core, SQLite, and E2E with SQLite)
bun run test:all
```

### Environment Variables

You can configure the test environment with these variables:

- `DB_TYPE`: Database type to use (`sqlite` or `postgresql`)
- `DATABASE_URL`: Connection string for PostgreSQL
- `SQLITE_DB_PATH`: Path to SQLite database file
- `USE_TEST_CONTAINERS`: Whether to use Docker containers for PostgreSQL tests

## Test Containers

The project supports using Docker containers for PostgreSQL tests. This ensures a consistent test environment across all developers and CI pipelines.

To use test containers:

```bash
# Install testcontainers library
bun add -d testcontainers

# Run tests with test containers
bun run test:e2e:containers
```

The test containers are automatically started and stopped as needed.

## Writing Tests

### Unit Tests

Unit tests should be placed in the same directory as the code they test, with a `.test.ts` suffix.

```typescript
// src/utils/math.ts
export function add(a: number, b: number): number {
  return a + b;
}

// src/utils/math.test.ts
import { describe, it, expect } from 'bun:test';
import { add } from './math';

describe('add', () => {
  it('should add two numbers', () => {
    expect(add(1, 2)).toBe(3);
  });
});
```

### Integration Tests

Integration tests should be placed in the `tests` directory, with a `.integration.test.ts` suffix.

```typescript
// tests/api/auth.integration.test.ts
import { describe, it, expect } from 'bun:test';
import { app } from '../../src/app';

describe('Authentication Integration Tests', () => {
  it('should return 401 for unauthenticated requests', async () => {
    const res = await app.request('/api/protected');
    expect(res.status).toBe(401);
  });
});
```

### E2E Tests

E2E tests should be placed in the `tests/e2e` directory, with a `.e2e.test.ts` suffix.

```typescript
// tests/e2e/issuer.e2e.test.ts
import { it, expect } from 'bun:test';
import { databaseAwareDescribe } from './utils/test-setup';

databaseAwareDescribe('Issuer API - E2E', (describeTest) => {
  describeTest('Issuer CRUD operations', () => {
    it('should create an issuer', async () => {
      // Test code here
    });
  });
});
```

## Best Practices

1. **Use the database-aware describe function for E2E tests**:
   ```typescript
   import { databaseAwareDescribe } from './utils/test-setup';
   
   databaseAwareDescribe('Test Suite', (describeTest) => {
     describeTest('Test Group', () => {
       it('should do something', async () => {
         // Test code here
       });
     });
   });
   ```

2. **Clean up test data after tests**:
   ```typescript
   afterAll(async () => {
     await cleanupTestData();
   });
   ```

3. **Use test containers for consistent environments**:
   ```typescript
   // This is handled automatically by the databaseAwareDescribe function
   ```

4. **Write database-agnostic tests when possible**:
   ```typescript
   // Tests should work with both SQLite and PostgreSQL
   ```

5. **Use clear, descriptive test names**:
   ```typescript
   it('should return 404 when the resource does not exist', async () => {
     // Test code here
   });
   ```
