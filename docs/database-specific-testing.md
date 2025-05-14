# Database-Specific Testing Guide

This guide explains how to write tests that only run for specific database types.

## Overview

The OpenBadges server supports multiple database backends (SQLite and PostgreSQL). Some tests should run for all database types, while others are specific to a particular database. The `database-test-filter` helper provides functions to conditionally run tests based on the connected database.

## How It Works

The system:
1. Checks which database is currently connected
2. Only runs tests configured for that database
3. Skips tests for databases that aren't connected

This ensures that:
- Tests don't fail because a specific database isn't available
- You can write database-specific tests without worrying about other database types
- CI/CD pipelines can run tests for different database types in parallel

## Usage

### Basic Usage

```typescript
import { describe, beforeAll } from 'bun:test';
import {
  describeSqlite,
  describePostgres
} from '../helpers/database-test-filter';

// Variables to hold the database-specific test functions
let describeSqliteTests: (label: string, fn: () => void) => void = describe.skip;
let describePostgresTests: (label: string, fn: () => void) => void = describe.skip;

// Initialize the test functions before running any tests
beforeAll(async () => {
  describeSqliteTests = await describeSqlite();
  describePostgresTests = await describePostgres();
});

// SQLite-specific tests
describeSqliteTests('SQLite-Specific Tests', () => {
  it('should run only when SQLite is connected', () => {
    // This test only runs when SQLite is connected
  });
});

// PostgreSQL-specific tests
describePostgresTests('PostgreSQL-Specific Tests', () => {
  it('should run only when PostgreSQL is connected', () => {
    // This test only runs when PostgreSQL is connected
  });
});
```

### Individual Test Cases

You can also conditionally run individual test cases:

```typescript
import { describe, it, beforeAll } from 'bun:test';
import {
  itSqlite,
  itPostgres
} from '../helpers/database-test-filter';

// Variables to hold the database-specific test functions
let itSqliteTest: (label: string, fn: () => void | Promise<unknown>) => void = it.skip;
let itPostgresTest: (label: string, fn: () => void | Promise<unknown>) => void = it.skip;

// Initialize the test functions before running any tests
beforeAll(async () => {
  itSqliteTest = await itSqlite();
  itPostgresTest = await itPostgres();
});

describe('Mixed Database Tests', () => {
  // This test only runs for SQLite
  itSqliteTest('should run only for SQLite', () => {
    // SQLite-specific test
  });

  // This test only runs for PostgreSQL
  itPostgresTest('should run only for PostgreSQL', () => {
    // PostgreSQL-specific test
  });

  // This test runs for all database types
  it('should run for all database types', () => {
    // Database-agnostic test
  });
});
```

## API Reference

### Functions

- `describeSqlite()`: Returns a `describe` function that only runs if SQLite is connected
- `describePostgres()`: Returns a `describe` function that only runs if PostgreSQL is connected
- `itSqlite()`: Returns an `it` function that only runs if SQLite is connected
- `itPostgres()`: Returns an `it` function that only runs if PostgreSQL is connected
- `isDatabaseAvailable(dbType)`: Checks if a specific database type is available
- `isCurrentDatabaseType(dbType)`: Checks if the current database type matches the specified type
- `getDescribeForDatabase(dbType)`: Gets a `describe` function for a specific database type
- `getItForDatabase(dbType)`: Gets an `it` function for a specific database type

## Best Practices

1. **Use Database-Agnostic Tests When Possible**: Most tests should be database-agnostic and run for all database types.

2. **Only Use Database-Specific Tests When Necessary**: Only use database-specific tests for features that are truly specific to a particular database.

3. **Document Database Requirements**: Clearly document which database types are required for each test.

4. **Use Descriptive Test Names**: Include the database type in the test name to make it clear which database is being tested.

5. **Reset Database State**: Always reset the database state between tests to ensure isolation.

## Example

See `tests/examples/database-specific.test.ts` for a complete example of how to use this system.

## Running Tests

To run tests for a specific database type:

```bash
# Run tests with SQLite
DB_TYPE=sqlite bun test

# Run tests with PostgreSQL
DB_TYPE=postgresql DATABASE_URL=postgresql://user:password@localhost:5432/openbadges_test bun test
```

The system will automatically skip tests that aren't applicable to the connected database.
