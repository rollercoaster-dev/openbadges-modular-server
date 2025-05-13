# GitHub Actions CI Implementation Guide

This guide provides step-by-step instructions for implementing the improved GitHub Actions CI setup for the Open Badges Modular Server project.

## Implementation Steps

### Step 1: Create a New Branch

```bash
git checkout -b feat/improve-github-actions-ci
```

### Step 2: Replace the Existing Workflow Files

1. Create the new unified workflow file:

```bash
mkdir -p .github/workflows
cp .cursor/working/tasks/unified-ci-workflow.yml .github/workflows/unified-ci.yml
```

2. Remove the old workflow files:

```bash
# Keep these files as backup until the new workflow is confirmed working
mv .github/workflows/ci.yml .github/workflows/ci.yml.bak
mv .github/workflows/ci-cd.yml .github/workflows/ci-cd.yml.bak
mv .github/workflows/database-tests.yml .github/workflows/database-tests.yml.bak
mv .github/workflows/docker-publish.yml .github/workflows/docker-publish.yml.bak
```

### Step 3: Update Test Scripts in package.json

Ensure the package.json scripts are aligned with the new workflow:

```json
"scripts": {
  "test:sqlite": "DB_TYPE=sqlite SQLITE_FILE=':memory:' bun test tests/infrastructure/database/modules/sqlite",
  "test:pg": "NODE_ENV=test DB_TYPE=postgresql DATABASE_URL=postgresql://postgres:postgres@localhost:5432/openbadges_test bun test tests/infrastructure/database/modules/postgresql",
  "test:e2e:sqlite": "NODE_ENV=test DB_TYPE=sqlite SQLITE_DB_PATH=$(pwd)/tests/e2e/test_database.sqlite bun test ./tests/e2e",
  "test:e2e:pg": "NODE_ENV=test DB_TYPE=postgresql DATABASE_URL=postgresql://postgres:postgres@localhost:5432/openbadges_test bun test ./tests/e2e"
}
```

### Step 4: Create Database Test Helper

Create a helper file to detect database availability:

```typescript
// tests/helpers/database-availability.ts

import { logger } from '@/utils/logging/logger.service';

/**
 * Check if PostgreSQL is available
 * @returns Promise<boolean> True if PostgreSQL is available
 */
export async function isPostgresAvailable(connectionString: string): Promise<boolean> {
  try {
    const postgres = await import('postgres');
    const sql = postgres.default(connectionString, { max: 1, timeout: 3 });
    
    try {
      await sql`SELECT 1`;
      await sql.end();
      logger.info('PostgreSQL is available');
      return true;
    } catch (error) {
      logger.warn('PostgreSQL is not available', { error });
      await sql.end();
      return false;
    }
  } catch (error) {
    logger.warn('Failed to import postgres module', { error });
    return false;
  }
}

/**
 * Check if SQLite is available
 * @returns Promise<boolean> True if SQLite is available
 */
export async function isSqliteAvailable(): Promise<boolean> {
  try {
    // Try to import bun:sqlite and create a DB
    const { Database } = await import('bun:sqlite');
    const db = new Database(':memory:');
    db.close();
    logger.info('SQLite is available');
    return true;
  } catch (error) {
    logger.warn('SQLite is not available', { error });
    return false;
  }
}
```

### Step 5: Update E2E Test Setup

Modify the E2E test setup to handle both database types:

```typescript
// tests/e2e/setup-test-app.ts

// Add this at the beginning of the file
import { isPostgresAvailable } from '../helpers/database-availability';

// Add this before the tests
const pgConnectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/openbadges_test';
const isPgAvailable = process.env.DB_TYPE === 'postgresql' ? await isPostgresAvailable(pgConnectionString) : false;

// Skip PostgreSQL tests if PostgreSQL is not available
if (process.env.DB_TYPE === 'postgresql' && !isPgAvailable) {
  console.warn('PostgreSQL is not available, skipping PostgreSQL E2E tests');
  process.exit(0);
}
```

### Step 6: Create a Database Reset Helper

Create a helper to reset the database between tests:

```typescript
// tests/e2e/helpers/database-reset.helper.ts

import { DatabaseFactory } from '@/infrastructure/database/database.factory';
import { config } from '@/config/config';
import { logger } from '@/utils/logging/logger.service';

/**
 * Reset the database to a clean state
 */
export async function resetDatabase(): Promise<void> {
  const dbType = process.env.DB_TYPE || config.database.type;

  logger.info('Resetting database', {
    dbType,
    sqliteFile: process.env.SQLITE_DB_PATH || process.env.SQLITE_FILE,
    postgresUrl: process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':***@') : undefined
  });

  try {
    // Create database instance
    const db = await DatabaseFactory.createDatabase();

    // Delete all data from tables in reverse order to handle foreign key constraints
    await db.query('DELETE FROM user_assertions');
    await db.query('DELETE FROM user_roles');
    await db.query('DELETE FROM platform_users');
    await db.query('DELETE FROM assertions');
    await db.query('DELETE FROM badge_classes');
    await db.query('DELETE FROM issuers');
    await db.query('DELETE FROM platforms');
    await db.query('DELETE FROM roles');
    await db.query('DELETE FROM api_keys');
    await db.query('DELETE FROM users');

    logger.info('Database reset completed successfully');
  } catch (error) {
    logger.error('Error resetting database', { error });
    throw error;
  }
}
```

### Step 7: Test Locally

Test the new workflow locally before pushing:

```bash
# Test SQLite setup
DB_TYPE=sqlite SQLITE_FILE=':memory:' bun test tests/infrastructure/database/modules/sqlite

# Test PostgreSQL setup (if available)
docker-compose -f docker-compose.test.yml up -d
NODE_ENV=test DB_TYPE=postgresql DATABASE_URL=postgresql://testuser:testpassword@localhost:5433/openbadges_test bun test tests/infrastructure/database/modules/postgresql
docker-compose -f docker-compose.test.yml down
```

### Step 8: Commit and Push

```bash
git add .
git commit -m "Improve GitHub Actions CI setup for database testing"
git push origin feat/improve-github-actions-ci
```

### Step 9: Create Pull Request

Create a pull request on GitHub and monitor the CI workflow to ensure it's working correctly.

## Troubleshooting

### PostgreSQL Connection Issues

If you encounter PostgreSQL connection issues in CI:

1. Verify the service container is running:
   ```yaml
   - name: Check PostgreSQL service
     run: docker ps
   ```

2. Check PostgreSQL logs:
   ```yaml
   - name: Check PostgreSQL logs
     run: docker logs $(docker ps | grep postgres | awk '{print $1}')
   ```

3. Verify connection parameters:
   ```yaml
   - name: Test PostgreSQL connection
     run: PGPASSWORD=postgres psql -h localhost -U postgres -d openbadges_test -c "SELECT version();"
   ```

### SQLite Issues

If you encounter SQLite issues in CI:

1. Verify SQLite is installed:
   ```yaml
   - name: Check SQLite installation
     run: sqlite3 --version
   ```

2. Check file permissions:
   ```yaml
   - name: Check SQLite file permissions
     run: ls -la tests/e2e/test_database.sqlite
   ```

3. Verify the database file:
   ```yaml
   - name: Verify SQLite database
     run: sqlite3 tests/e2e/test_database.sqlite .tables
   ```

## Best Practices

1. **Use Matrix Testing**: For testing multiple Node.js versions or database configurations.
2. **Cache Dependencies**: Always cache dependencies to speed up workflows.
3. **Health Checks**: Use health checks for service containers.
4. **Verify Connections**: Always verify database connections before running tests.
5. **Clear Error Messages**: Provide clear error messages for debugging.
6. **Skip Unavailable Services**: Skip tests that require unavailable services.
7. **Clean Up**: Always clean up resources after tests.
8. **Consistent Environment Variables**: Use consistent environment variables across all environments.
