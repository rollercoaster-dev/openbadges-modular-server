# Database Conditional Testing

This document explains how to write E2E tests that conditionally run based on database availability, preventing test failures when specific database types are not available.

## Problem

Previously, the E2E test setup would call `process.exit(0)` when PostgreSQL was not available, which would:
- Terminate the entire test process
- Prevent SQLite tests from running
- Make CI logs opaque
- Reduce overall test coverage

## Solution

The new approach uses conditional test skipping instead of process termination:

1. **Availability Detection**: Check database availability without exiting
2. **Conditional Skipping**: Use `describe.skip` and `it.skip` for unavailable databases
3. **Graceful Degradation**: Allow other tests to continue running

## Usage

### Import the Helper Functions

```typescript
import {
  describePostgreSQL,
  describeSQLite,
  describeAnyDatabase,
  itPostgreSQL,
  itSQLite,
  getCurrentDatabaseType,
  isPostgresqlAvailable,
  isSqliteInUse,
} from './helpers/database-conditional.helper';
```

### Database-Agnostic Tests

For tests that should run with any available database:

```typescript
describeAnyDatabase('My Test Suite', () => {
  it('should work with any database', async () => {
    // This test runs with SQLite or PostgreSQL
    const dbType = getCurrentDatabaseType();
    console.log(`Running with ${dbType}`);
  });
});
```

### PostgreSQL-Specific Tests

For tests that require PostgreSQL:

```typescript
describePostgreSQL('PostgreSQL Features', () => {
  it('should test PostgreSQL-specific functionality', async () => {
    // This test only runs when PostgreSQL is available
    expect(getCurrentDatabaseType()).toBe('postgresql');
  });
});

// Or for individual tests
describe('Mixed Tests', () => {
  itPostgreSQL('should use PostgreSQL arrays', async () => {
    // PostgreSQL-specific test
  });
});
```

### SQLite-Specific Tests

For tests that require SQLite:

```typescript
describeSQLite('SQLite Features', () => {
  it('should test SQLite-specific functionality', async () => {
    // This test only runs when SQLite is in use
    expect(getCurrentDatabaseType()).toBe('sqlite');
  });
});

// Or for individual tests
describe('Mixed Tests', () => {
  itSQLite('should use SQLite pragmas', async () => {
    // SQLite-specific test
  });
});
```

### Manual Conditional Logic

For more complex scenarios:

```typescript
describe('Complex Conditional Tests', () => {
  it('should handle different databases differently', async () => {
    const dbType = getCurrentDatabaseType();
    
    if (dbType === 'postgresql' && isPostgresqlAvailable()) {
      // PostgreSQL-specific logic
    } else if (dbType === 'sqlite' && isSqliteInUse()) {
      // SQLite-specific logic
    } else {
      // Skip or handle unavailable database
      console.log('Database not available, skipping test');
      return;
    }
  });
});
```

## Running Tests

### SQLite Tests Only

```bash
# Run E2E tests with SQLite (default)
bun run test:e2e:sqlite
```

### PostgreSQL Tests Only

```bash
# Start PostgreSQL, run tests, then stop PostgreSQL
bun run test:e2e:pg
```

### All Tests (Both Databases)

```bash
# Run SQLite tests, then PostgreSQL tests
bun run test:e2e
```

## How It Works

### 1. Availability Detection

The `setup-test-app.ts` file checks PostgreSQL availability:

```typescript
const checkPgAvailability = async (): Promise<boolean> => {
  if (process.env.DB_TYPE === 'postgresql') {
    try {
      isPgAvailable = await isPostgresAvailable(pgConnectionString);
      if (!isPgAvailable) {
        logger.warn('PostgreSQL not available, tests will be skipped');
        return false;
      }
      return true;
    } catch (error) {
      logger.warn('PostgreSQL not available, tests will be skipped');
      isPgAvailable = false;
      return false;
    }
  }
  return true; // SQLite or other databases
};
```

### 2. Global Flag Export

The availability flag is exported for use in tests:

```typescript
export { isPgAvailable };
```

### 3. Conditional Test Functions

Helper functions check availability and return appropriate test functions:

```typescript
export function describePostgreSQL(name: string, fn: () => void): void {
  if (isPostgresqlAvailable()) {
    describe(name, fn);
  } else {
    describe.skip(name, fn);
  }
}
```

## Benefits

1. **No Process Termination**: Tests continue running even when a database is unavailable
2. **Clear Logging**: Explicit messages about which tests are being skipped
3. **Better CI Coverage**: SQLite tests run even when PostgreSQL is unavailable
4. **Flexible Testing**: Easy to write database-specific or database-agnostic tests
5. **Graceful Degradation**: System continues to work with available resources

## Migration Guide

### Before (Old Approach)

```typescript
// This would exit the entire process
if (!isPgAvailable) {
  process.exit(0);
}
```

### After (New Approach)

```typescript
// This skips only PostgreSQL tests
describePostgreSQL('PostgreSQL Tests', () => {
  // Tests that require PostgreSQL
});

describeAnyDatabase('General Tests', () => {
  // Tests that work with any database
});
```

## Best Practices

1. **Use Database-Agnostic Tests**: Write tests that work with any database when possible
2. **Explicit Database Requirements**: Use specific conditional functions for database-specific features
3. **Clear Test Names**: Include database type in test names when relevant
4. **Proper Logging**: Log which database type is being used in test output
5. **Fallback Behavior**: Always provide fallback behavior for unavailable databases
