# Database Testing Best Practices in CI Environments

This document outlines best practices for database testing in CI environments, specifically for PostgreSQL and SQLite in GitHub Actions.

## General Best Practices

### 1. Use Dedicated Test Databases

- Never use production databases for testing
- Create dedicated test databases for each test run
- Reset the database state before each test

### 2. Database-Agnostic Tests

- Write tests that can run against multiple database backends
- Use abstractions to hide database-specific details
- Avoid database-specific features in tests when possible

### 3. Fast Feedback

- Use in-memory databases for unit tests
- Run database-independent tests first
- Parallelize database tests when possible

### 4. Consistent Environment

- Use the same database schema in all environments
- Ensure consistent database configuration
- Use environment variables for configuration

### 5. Proper Cleanup

- Clean up test data after tests
- Ensure tests don't interfere with each other
- Use transactions to isolate tests

## PostgreSQL Best Practices in GitHub Actions

### 1. Service Container Setup

```yaml
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: test_db
    ports:
      - 5432:5432
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
```

### 2. Connection Verification

Always verify the PostgreSQL connection before running tests:

```yaml
- name: Verify PostgreSQL connection
  run: |
    echo "Verifying PostgreSQL connection..."
    PGPASSWORD=postgres psql -h localhost -U postgres -d test_db -c "SELECT 1 as connection_test;"
    echo "PostgreSQL connection verified successfully!"
```

### 3. Migration Handling

Run migrations before tests:

```yaml
- name: Run PostgreSQL migrations
  run: |
    NODE_ENV=test DB_TYPE=postgresql DATABASE_URL=postgresql://postgres:postgres@localhost:5432/test_db npm run migrate
```

### 4. Environment Variables

Use consistent environment variables:

```yaml
env:
  DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
  POSTGRES_USER: postgres
  POSTGRES_PASSWORD: postgres
  POSTGRES_DB: test_db
  POSTGRES_HOST: localhost
  POSTGRES_PORT: 5432
```

### 5. Error Handling

Add proper error handling for database operations:

```yaml
- name: Run PostgreSQL tests
  run: |
    npm test || {
      echo "Tests failed, checking database status..."
      PGPASSWORD=postgres psql -h localhost -U postgres -d test_db -c "SELECT version();"
      exit 1
    }
```

## SQLite Best Practices in GitHub Actions

### 1. In-Memory Database

Use in-memory SQLite for unit and integration tests:

```yaml
env:
  DB_TYPE: sqlite
  SQLITE_FILE: ':memory:'
```

### 2. File-Based Database

For E2E tests that require persistence:

```yaml
- name: Setup SQLite for E2E tests
  run: |
    mkdir -p tests/e2e
    touch tests/e2e/test_database.sqlite
    chmod 666 tests/e2e/test_database.sqlite
```

### 3. File Permissions

Ensure proper file permissions:

```yaml
- name: Verify SQLite file permissions
  run: |
    ls -la tests/e2e/test_database.sqlite
    chmod 666 tests/e2e/test_database.sqlite
```

### 4. Path Handling

Use absolute paths for SQLite files:

```yaml
env:
  SQLITE_DB_PATH: $(pwd)/tests/e2e/test_database.sqlite
```

### 5. Verification

Verify SQLite database creation:

```yaml
- name: Verify SQLite database
  run: |
    node -e "
      const fs = require('fs');
      const path = 'tests/e2e/test_database.sqlite';
      console.log('SQLite file exists:', fs.existsSync(path));
      console.log('SQLite file size:', fs.existsSync(path) ? fs.statSync(path).size : 'N/A');
    "
```

## Matrix Testing

Use matrix testing to test against multiple database configurations:

```yaml
jobs:
  test:
    strategy:
      matrix:
        db-type: [sqlite, postgresql]
        node-version: [16, 18, 20]
    
    steps:
      - name: Set up database
        if: matrix.db-type == 'postgresql'
        uses: ...
      
      - name: Run tests
        env:
          DB_TYPE: ${{ matrix.db-type }}
```

## Database Availability Detection

Create helpers to detect database availability:

```typescript
export async function isPostgresAvailable(connectionString: string): Promise<boolean> {
  try {
    const sql = postgres(connectionString, { max: 1, timeout: 3 });
    await sql`SELECT 1`;
    await sql.end();
    return true;
  } catch (error) {
    return false;
  }
}

export async function isSqliteAvailable(): Promise<boolean> {
  try {
    const db = new Database(':memory:');
    db.close();
    return true;
  } catch (error) {
    return false;
  }
}
```

## Conditional Test Execution

Skip tests that require unavailable databases:

```typescript
const pgAvailable = await isPostgresAvailable();
const describePg = pgAvailable ? describe : describe.skip;

describePg('PostgreSQL tests', () => {
  // Tests that require PostgreSQL
});
```

## Database Reset Between Tests

Reset the database between tests:

```typescript
beforeEach(async () => {
  await resetDatabase();
});

async function resetDatabase() {
  // Delete all data from tables
  await db.query('DELETE FROM table1');
  await db.query('DELETE FROM table2');
  // ...
}
```

## Conclusion

Following these best practices will help ensure reliable and efficient database testing in CI environments. The key principles are:

1. Consistency across environments
2. Proper verification and error handling
3. Efficient test execution
4. Database-agnostic test design
5. Proper cleanup and isolation
