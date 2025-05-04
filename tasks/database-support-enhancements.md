# Database Support Enhancement Tasks

This document outlines planned enhancements to improve the database support system in the OpenBadges Modular Server. These tasks aim to make it easier to add new database implementations, improve testing, and provide better documentation for users and contributors.

## 1. Abstract Common Test Logic

**Goal**: Reduce duplication in test files across different database implementations.

**Tasks**:
- [ ] Create base test classes or helper functions for common test patterns
- [ ] Extract common test setup and teardown logic
- [ ] Create reusable test fixtures for each entity type
- [ ] Implement parameterized tests that can run against any database implementation
- [ ] Document the testing framework and how to use it

**Implementation Details**:
- Create a `tests/infrastructure/database/common` directory for shared test utilities
- Implement a `BaseRepositoryTest` class that can be extended by specific database tests
- Create helper functions for common assertions and test data generation
- Use dependency injection to allow tests to run against any database implementation

**Example**:
```typescript
// Base test class
export abstract class BaseIssuerRepositoryTest {
  abstract createRepository(): IssuerRepository;
  
  // Common test cases
  async testCreateIssuer() {
    const repository = this.createRepository();
    const issuer = createTestIssuer();
    const result = await repository.create(issuer);
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    // More assertions...
  }
  
  // More test methods...
}

// PostgreSQL implementation
class PostgresIssuerRepositoryTest extends BaseIssuerRepositoryTest {
  createRepository() {
    return new PostgresIssuerRepository(getPostgresClient());
  }
  
  // PostgreSQL-specific tests...
}
```

## 2. Database Feature Matrix

**Goal**: Provide clear documentation about which features are supported by each database implementation.

**Tasks**:
- [ ] Create a feature matrix document in the docs directory
- [ ] List all repository methods and which databases implement them
- [ ] Document any database-specific limitations or behaviors
- [ ] Add performance characteristics for each database
- [ ] Keep the matrix updated as new features are added

**Implementation Details**:
- Create `docs/database-feature-matrix.md`
- Use a table format for easy comparison
- Include sections for each repository type
- Add notes about transaction support, concurrency, etc.

**Example**:
```markdown
# Database Feature Matrix

This document shows which features are supported by each database implementation.

## IssuerRepository

| Method | SQLite | PostgreSQL | MongoDB |
|--------|--------|------------|---------|
| create | ✅     | ✅         | ✅      |
| findById | ✅   | ✅         | ✅      |
| findAll | ✅    | ✅         | ✅      |
| update | ✅     | ✅         | ✅      |
| delete | ✅     | ✅         | ✅      |
| transaction support | ❌ | ✅ | ✅ |

## Notes
- SQLite: Simple file-based database, good for development
- PostgreSQL: Full ACID compliance, best for production
- MongoDB: Document-based, good for flexible schemas
```

## 3. Database-Specific Configuration

**Goal**: Make it easier to switch between different database types.

**Tasks**:
- [ ] Create database-specific configuration file templates
- [ ] Update the configuration loading logic to support multiple database types
- [ ] Add documentation about configuration options for each database
- [ ] Implement a simple way to switch between databases
- [ ] Add validation for database-specific configuration

**Implementation Details**:
- Create `.env.sqlite`, `.env.postgres`, etc. template files
- Update `src/config/config.ts` to load database-specific configuration
- Add a command-line flag or environment variable to select the database type
- Document all configuration options in the README

**Example**:
```
# .env.postgres
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=openbadges

# .env.sqlite
DB_TYPE=sqlite
DB_FILE=sqlite.db
```

## 4. Database Migration Strategy

**Goal**: Develop a strategy for migrating data between different database implementations.

**Tasks**:
- [ ] Create a data export tool for each database implementation
- [ ] Create a data import tool for each database implementation
- [ ] Implement a migration CLI command
- [ ] Add documentation about migration process
- [ ] Test migration between different database types

**Implementation Details**:
- Create `src/infrastructure/database/migration` directory
- Implement `exportData` and `importData` functions for each database
- Use a common JSON format for data exchange
- Add a `db:migrate-data` command to package.json
- Document the migration process in the README

**Example**:
```typescript
// Export data from SQLite
async function exportFromSqlite(outputFile: string) {
  const db = await getSqliteDatabase();
  const issuers = await db.getAllIssuers();
  const badgeClasses = await db.getAllBadgeClasses();
  const assertions = await db.getAllAssertions();
  
  const data = { issuers, badgeClasses, assertions };
  await fs.writeFile(outputFile, JSON.stringify(data, null, 2));
}

// Import data to PostgreSQL
async function importToPostgres(inputFile: string) {
  const data = JSON.parse(await fs.readFile(inputFile, 'utf8'));
  const db = await getPostgresDatabase();
  
  // Import in the correct order to maintain relationships
  for (const issuer of data.issuers) {
    await db.createIssuer(issuer);
  }
  
  for (const badgeClass of data.badgeClasses) {
    await db.createBadgeClass(badgeClass);
  }
  
  for (const assertion of data.assertions) {
    await db.createAssertion(assertion);
  }
}
```

## 5. Performance Benchmarks

**Goal**: Add performance benchmarks to compare different database implementations.

**Tasks**:
- [ ] Create a benchmarking framework
- [ ] Implement benchmarks for common operations
- [ ] Run benchmarks against all database implementations
- [ ] Generate reports and visualizations
- [ ] Document performance characteristics

**Implementation Details**:
- Create `benchmarks` directory
- Implement benchmarks for CRUD operations on each entity type
- Test with different data sizes and concurrency levels
- Generate Markdown reports with tables and charts
- Add CI job to run benchmarks periodically

**Example**:
```typescript
// Benchmark create operation
async function benchmarkCreate(repository: IssuerRepository, count: number) {
  const start = performance.now();
  
  for (let i = 0; i < count; i++) {
    await repository.create(createTestIssuer());
  }
  
  const end = performance.now();
  return end - start;
}

// Run benchmarks for all database types
async function runBenchmarks() {
  const results = {
    sqlite: {},
    postgres: {},
    mongodb: {}
  };
  
  // SQLite benchmarks
  const sqliteRepo = await getSqliteRepository();
  results.sqlite.create = await benchmarkCreate(sqliteRepo, 1000);
  
  // PostgreSQL benchmarks
  const postgresRepo = await getPostgresRepository();
  results.postgres.create = await benchmarkCreate(postgresRepo, 1000);
  
  // MongoDB benchmarks
  const mongoRepo = await getMongoRepository();
  results.mongodb.create = await benchmarkCreate(mongoRepo, 1000);
  
  // Generate report
  generateReport(results);
}
```

## Timeline and Priority

1. **Abstract Common Test Logic** - High Priority
   - Estimated time: 1-2 weeks
   - This will make it easier to add new database implementations and ensure consistent testing

2. **Database Feature Matrix** - Medium Priority
   - Estimated time: 3-5 days
   - This will help users understand the differences between database implementations

3. **Database-Specific Configuration** - Medium Priority
   - Estimated time: 1 week
   - This will make it easier to switch between different database types

4. **Performance Benchmarks** - Medium Priority
   - Estimated time: 1-2 weeks
   - This will help users choose the most appropriate database for their needs

5. **Database Migration Strategy** - Low Priority
   - Estimated time: 2-3 weeks
   - This is more complex but will be valuable for users who need to migrate between database types

## Conclusion

These enhancements will significantly improve the database support system in the OpenBadges Modular Server. They will make it easier to add new database implementations, improve testing, and provide better documentation for users and contributors.

The tasks are designed to be implemented incrementally, with each enhancement building on the previous ones. The abstract common test logic should be implemented first, as it will make it easier to add and test new database implementations.
