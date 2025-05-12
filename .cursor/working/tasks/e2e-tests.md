# E2E Tests Task

## Current Status

We've made significant progress fixing the E2E tests in the Open Badges Modular Server project. We've fixed several issues:

1. Fixed cache invalidation issues that were causing tests to fail
2. Fixed database reset issues that were causing test data to persist between tests
3. Fixed UUID format issues in tests that were causing validation errors
4. Added proper error handling and delays to ensure test stability
5. Made tests compatible with both SQLite and PostgreSQL databases

Most tests are now passing, with only a few remaining issues in the issuer tests.

## Issues Identified and Fixed

1. **Cache Invalidation Issue**: When an issuer is updated, the cache wasn't being properly invalidated, causing subsequent GET requests to return 404 errors even though the update was successful.

2. **Authentication Issues**: The E2E tests were using an API key that wasn't being recognized by the server. This was causing authentication failures during tests. We've fixed this by ensuring the correct API key is used and properly configured.

3. **Database Reset Issues**: The database wasn't being properly reset between tests, causing test data to persist and interfere with subsequent tests. We've fixed this by implementing a more robust database reset mechanism that directly clears tables.

4. **UUID Format Issues**: Tests were using string IDs like 'test-issuer-id' instead of valid UUIDs, which caused validation errors. We've fixed this by using properly formatted UUIDs in all tests.

5. **Timing Issues**: Tests were failing due to race conditions where database operations weren't fully complete before the next test started. We've added appropriate delays to ensure test stability.

6. **Database Compatibility**: Tests needed to work with both SQLite and PostgreSQL databases. We've updated the database reset helper to handle both database types properly.

## Root Cause Analysis

### Cache Invalidation Issue

The issue was in the `update` method of the cached repositories. When an entity is updated, the cache was only being invalidated after the update and only for the result entity. This doesn't account for cases where:

1. The ID of the entity changes during the update
2. The update fails but the cache still needs to be invalidated
3. Related entities need to have their caches invalidated

### Database Reset Issues

The database reset mechanism was using high-level repository methods that weren't directly clearing the database tables. This approach was unreliable because:

1. It depended on the repository methods working correctly
2. It didn't handle foreign key constraints properly
3. It didn't ensure all tables were cleared consistently

We fixed this by implementing direct SQL commands to clear tables in the correct order, handling both SQLite and PostgreSQL databases.

### UUID Format Issues

The tests were using string IDs like 'test-issuer-id' instead of valid UUIDs. The server was validating these IDs against the UUID format, causing validation errors. We fixed this by using properly formatted UUIDs in all tests.

### Timing Issues

Tests were failing due to race conditions where:

1. Database operations weren't fully complete before the next test started
2. The server wasn't fully initialized before tests began
3. Asynchronous operations weren't properly awaited

We fixed this by adding appropriate delays and ensuring all asynchronous operations are properly awaited.

### Database Compatibility

The tests needed to work with both SQLite and PostgreSQL databases, but the database reset mechanism was only handling one type. We updated the database reset helper to detect the database type and use the appropriate reset mechanism.

## Fixes Implemented

1. **Cache Invalidation Fix**: We've updated the `update` method in all cached repositories to:
   - Invalidate the cache for the ID before updating
   - Invalidate collections
   - For related entities (like badge classes related to an issuer), get the entity before update and invalidate related caches
   - Continue with the existing invalidation after the update

   This ensures that when an entity is updated, any cached versions are properly invalidated, preventing stale data issues.

   Files modified:
   - `src/infrastructure/cache/repositories/cached-issuer.repository.ts`
   - `src/infrastructure/cache/repositories/cached-badge-class.repository.ts`
   - `src/infrastructure/cache/repositories/cached-assertion.repository.ts`

2. **Database Reset Fix**: We've updated the database reset helper to:
   - Directly execute SQL DELETE statements instead of using repository methods
   - Handle both SQLite and PostgreSQL databases
   - Delete tables in the correct order to respect foreign key constraints
   - Add error handling to gracefully handle missing tables

   Files modified:
   - `tests/e2e/helpers/database-reset.helper.ts`

3. **UUID Format Fix**: We've updated all tests to use valid UUID formats:
   - Replaced string IDs like 'test-issuer-id' with valid UUIDs
   - Used consistent UUID format across all tests
   - Ensured all IDs used in tests match the expected format

   Files modified:
   - `tests/e2e/badgeClass.e2e.test.ts`
   - `tests/e2e/assertion.e2e.test.ts`
   - `tests/e2e/openBadgesCompliance.e2e.test.ts`

4. **Timing Issues Fix**: We've added appropriate delays and improved error handling:
   - Added delays after database operations to ensure they complete
   - Added delays after server initialization to ensure it's ready
   - Improved error handling in test data helper
   - Added retries for flaky operations

   Files modified:
   - `tests/e2e/helpers/test-data.helper.ts`
   - `tests/e2e/issuer.e2e.test.ts`

## Current Status and Next Steps

### Current Status

Most of the E2E tests are now passing with both SQLite and PostgreSQL databases. We've fixed several critical issues that were causing tests to fail:

1. Fixed cache invalidation issues
2. Implemented proper database reset mechanisms
3. Fixed UUID format issues
4. Added appropriate delays and error handling
5. Made tests compatible with both database types

### Remaining Issues

There are still a few issues with the issuer tests:

1. **Issuer Creation Tests**: The issuer creation tests are still failing with both SQLite and PostgreSQL. This might be due to:
   - Remaining issues with the database reset
   - Validation errors in the issuer data
   - Timing issues with the test execution

2. **Issuer Update Tests**: The issuer update tests are failing, possibly due to:
   - Issues with finding the issuer after creation
   - Cache invalidation issues not fully resolved
   - Database transaction issues

### Next Steps

1. **Fix Remaining Issuer Tests**:
   - Debug the issuer creation and update tests
   - Add more detailed logging to identify the exact failure points
   - Consider refactoring the issuer tests to be more robust

2. **Improve Test Stability**:
   - Add more robust error handling throughout the tests
   - Consider implementing retry mechanisms for flaky operations
   - Add more detailed assertions to better identify failure points

3. **Enhance Test Coverage**:
   - Once all tests are passing, consider adding more comprehensive tests
   - Add tests for edge cases and error conditions
   - Ensure all API endpoints are thoroughly tested

## Learnings and Best Practices

1. **Database Reset is Critical**: Proper database reset between tests is essential for test isolation. Direct SQL commands are more reliable than using repository methods.

2. **UUID Validation**: When working with UUIDs, ensure all test data uses valid UUID formats that match the validation rules in the application.

3. **Timing and Race Conditions**: E2E tests are susceptible to timing issues and race conditions. Adding appropriate delays and proper error handling is essential.

4. **Database Compatibility**: Tests should be designed to work with multiple database types (SQLite for development, PostgreSQL for production) to ensure consistent behavior.

5. **Cache Invalidation**: Proper cache invalidation is critical for ensuring data consistency, especially in tests where operations happen in quick succession.

6. **Test Environment Configuration**: The test environment needs special configuration for:
   - Authentication (API keys or disabled auth)
   - Database (SQLite for fast tests, PostgreSQL for production-like tests)
   - Cache settings (possibly disabled for tests)

7. **Error Handling**: The server should return appropriate error codes (404 for not found vs 500 for server errors) to help diagnose issues.

8. **Debugging Approach**: When debugging E2E tests, it's important to:
   - Check server logs for authentication and database issues
   - Verify that the test environment matches the expected configuration
   - Look for inconsistencies between the test setup and the server configuration
   - Add detailed logging to identify exact failure points

## Code Snippets

### Cache Invalidation Fix

```typescript
async update(id: Shared.IRI, issuer: Partial<Issuer>): Promise<Issuer | null> {
  // Invalidate the cache for the ID before updating
  // This ensures we don't have stale data even if the ID changes
  this.cache.delete(this.generateIdKey(id as string));
  this.invalidateCollections();

  const result = await this.repository.update(id, issuer);

  // Invalidate cache after update for the result entity
  if (result) {
    this.invalidateEntity(result);
  }

  return result;
}
```

### Database Reset Fix for SQLite

```typescript
// Get direct access to the SQLite database
const { Database } = require('bun:sqlite');
const sqliteFile = process.env.SQLITE_FILE || './tests/e2e/test_database.sqlite';
const sqliteDb = new Database(sqliteFile);

// Delete all data from each table
for (const table of tables) {
  try {
    // Use direct SQL to delete all data
    sqliteDb.run(`DELETE FROM ${table}`);
    logger.debug(`Deleted all data from ${table}`);
  } catch (error) {
    // Table might not exist, which is fine
    logger.debug(`Error deleting from ${table}`, {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
```

### Database Reset Fix for PostgreSQL

```typescript
// Get direct access to the PostgreSQL database
const postgres = await import('postgres');
const connectionString = process.env.DATABASE_URL || 'postgresql://testuser:testpassword@localhost:5433/openbadges_test';

try {
  const pgClient = postgres.default(connectionString, {
    max: 1,
    connect_timeout: 5,
    idle_timeout: 5,
    max_lifetime: 30
  });

  // Delete all data from each table
  for (const table of tables) {
    try {
      // Use direct SQL to delete all data
      await pgClient.unsafe(`DELETE FROM ${table}`);
      logger.debug(`Deleted all data from ${table}`);
    } catch (error) {
      // Table might not exist, which is fine
      logger.debug(`Error deleting from ${table}`, {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Close the connection
  await pgClient.end();
} catch (error) {
  logger.error('Failed to connect to PostgreSQL database', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  });
}
```

### UUID Format Fix

```typescript
// Before: Using string IDs
const badgeClassData = {
  issuer: 'test-issuer-id',
  // other properties...
};

// After: Using valid UUIDs
const badgeClassData = {
  issuer: '00000000-0000-4000-a000-000000000003', // A valid UUID format
  // other properties...
};
```

### Improved Test Data Helper with Error Handling and Delays

```typescript
static async createIssuer(customData = {}): Promise<{ id: string, data: Record<string, unknown> }> {
  // Create issuer data with OB3 format
  const issuerData = {
    type: 'Issuer', // OB3 format
    name: `Test Issuer ${Date.now()}`,
    url: 'https://issuer.example.com',
    email: 'issuer@example.com',
    description: 'Test issuer for E2E tests',
    ...customData
  };

  logger.debug('Creating issuer with data:', { issuerData });

  try {
    // Add a small delay to ensure the database is ready
    await new Promise(resolve => setTimeout(resolve, 100));

    const res = await fetch(`${this.apiUrl}/v3/issuers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      },
      body: JSON.stringify(issuerData)
    });

    const responseText = await res.text();
    logger.debug('Issuer creation response:', {
      status: res.status,
      statusText: res.statusText,
      responseText
    });

    if (!res.ok) {
      throw new Error(`Failed to create issuer: ${res.status} ${res.statusText} - ${responseText}`);
    }

    // Parse the response text as JSON
    const data = JSON.parse(responseText) as Record<string, unknown>;
    const id = data.id as string;
    this.entities.get('issuers')?.push(id);
    logger.info('Created test issuer', { id });

    // Add a small delay to ensure the issuer is fully created
    await new Promise(resolve => setTimeout(resolve, 100));

    return { id, data };
  } catch (error) {
    logger.error('Error creating issuer', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      issuerData
    });
    throw error;
  }
}
```

## References

- [Open Badges Specification](https://www.imsglobal.org/sites/default/files/Badges/OBv2p0Final/index.html)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [Bun Testing Documentation](https://bun.sh/docs/cli/test)
