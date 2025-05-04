# Database Integration Guide

This guide provides instructions for adding new database support to the OpenBadges Modular Server. The server is designed to be database-agnostic, allowing it to work with various database systems through a common repository interface.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Adding a New Database Implementation](#adding-a-new-database-implementation)
3. [Testing Your Implementation](#testing-your-implementation)
4. [Parallel CI Setup](#parallel-ci-setup)
5. [Documentation Requirements](#documentation-requirements)
6. [Contribution Checklist](#contribution-checklist)

## Architecture Overview

The OpenBadges Modular Server uses a repository pattern to abstract database operations. Each domain entity (Issuer, BadgeClass, Assertion, etc.) has a corresponding repository interface that defines the operations that can be performed on that entity.

The repository interfaces are implemented for each supported database system. The current implementations include:

- SQLite
- PostgreSQL

The system is designed to be easily extended to support additional database systems.

### Key Components

- **Repository Interfaces**: Located in `src/domains/*/repository.ts` files
- **Repository Factory**: Located in `src/infrastructure/repository.factory.ts`
- **Database Implementations**: Located in `src/infrastructure/database/modules/{database-type}/`

## Adding a New Database Implementation

To add support for a new database system, follow these steps:

### 1. Create the Directory Structure

Create the following directory structure for your database implementation:

```
src/infrastructure/database/modules/{database-type}/
├── mappers/
│   ├── {database-type}-issuer.mapper.ts
│   ├── {database-type}-badge-class.mapper.ts
│   ├── {database-type}-assertion.mapper.ts
│   ├── {database-type}-api-key.mapper.ts
│   ├── {database-type}-platform.mapper.ts
│   ├── {database-type}-platform-user.mapper.ts
│   └── {database-type}-user-assertion.mapper.ts
├── repositories/
│   ├── {database-type}-issuer.repository.ts
│   ├── {database-type}-badge-class.repository.ts
│   ├── {database-type}-assertion.repository.ts
│   ├── {database-type}-api-key.repository.ts
│   ├── {database-type}-platform.repository.ts
│   ├── {database-type}-platform-user.repository.ts
│   └── {database-type}-user-assertion.repository.ts
├── schema.ts
└── {database-type}.database.ts
```

### 2. Implement the Schema

Create a schema file that defines the database schema for your database system. This should include all the tables and relationships needed for the OpenBadges Modular Server.

Example: `src/infrastructure/database/modules/{database-type}/schema.ts`

### 3. Implement the Mappers

Create mapper classes that convert between domain entities and database records. Each mapper should implement the following methods:

- `toDomain(record: DatabaseRecord): DomainEntity`
- `toPersistence(entity: DomainEntity): DatabaseRecord`

Example: `src/infrastructure/database/modules/{database-type}/mappers/{database-type}-issuer.mapper.ts`

### 4. Implement the Repositories

Create repository classes that implement the repository interfaces for each domain entity. Each repository should use the corresponding mapper to convert between domain entities and database records.

Example: `src/infrastructure/database/modules/{database-type}/repositories/{database-type}-issuer.repository.ts`

### 5. Update the Repository Factory

Update the `src/infrastructure/repository.factory.ts` file to include your new database implementation. Add a new case to the `createXxxRepository` methods for your database type.

Example:

```typescript
static async createIssuerRepository(): Promise<IssuerRepository> {
  // Check if caching is enabled
  const enableCaching = config.cache?.enabled !== false;

  if (this.dbType === 'postgresql') {
    // PostgreSQL implementation
    // ...
  } else if (this.dbType === 'sqlite') {
    // SQLite implementation
    // ...
  } else if (this.dbType === '{database-type}') {
    // Your database implementation
    if (!this.client) {
      throw new Error('{Database-Type} client not initialized');
    }

    // Create the base repository
    const baseRepository = new {DatabaseType}IssuerRepository(this.client);

    // Wrap with cache if enabled
    return enableCaching ? new CachedIssuerRepository(baseRepository) : baseRepository;
  }

  throw new Error(`Unsupported database type: ${this.dbType}`);
}
```

### 6. Update the Configuration

Update the configuration to support your new database type. This includes:

- Adding a new case to the `drizzle.config.ts` file
- Adding environment variables for your database connection
- Adding scripts to `package.json` for your database

## Testing Your Implementation

### 1. Create Test Files

Create test files for your database implementation in the `tests/infrastructure/database/modules/{database-type}/` directory. These should include:

- Repository tests for each domain entity
- Integration tests for your database implementation

Example: `tests/infrastructure/database/modules/{database-type}/repositories/{database-type}-issuer.repository.test.ts`

### 2. Implement Test Skipping

Implement a mechanism to skip tests when your database is not available. This ensures that tests can run in environments where your database is not installed.

Example:

```typescript
let canConnect = false;
try {
  // Try to connect to your database
  const client = createClient();
  await client.connect();
  await client.disconnect();
  canConnect = true;
} catch (error) {
  logger.warn('Could not connect to {Database-Type} for tests', { error });
}

const describe{DatabaseType} = canConnect ? describe : describe.skip;

describe{DatabaseType}('{Database-Type} Repositories', () => {
  // Your tests here
});
```

### 3. Add Test Scripts

Add test scripts to `package.json` for your database implementation:

```json
"scripts": {
  "test:{database-type}": "bun test tests/infrastructure/database/modules/{database-type}",
  "test:{database-type}:setup": "docker-compose -f docker-compose.{database-type}.yml up -d",
  "test:{database-type}:teardown": "docker-compose -f docker-compose.{database-type}.yml down",
  "test:{database-type}:with-docker": "npm run test:{database-type}:setup && npm run test:{database-type} && npm run test:{database-type}:teardown"
}
```

## Parallel CI Setup

To enable parallel CI for your database implementation, you need to update the GitHub Actions workflow file.

### 1. Create a Docker Compose File

Create a Docker Compose file for your database implementation:

Example: `docker-compose.{database-type}.yml`

```yaml
version: '3'
services:
  {database-type}:
    image: {database-image}:{version}
    environment:
      - {ENV_VAR1}={value1}
      - {ENV_VAR2}={value2}
    ports:
      - "{port}:{port}"
```

### 2. Update the GitHub Actions Workflow

Add a new job to the GitHub Actions workflow file for your database implementation:

```yaml
{database-type}-tests:
  runs-on: ubuntu-latest
  services:
    {database-type}:
      image: {database-image}:{version}
      env:
        {ENV_VAR1}: {value1}
        {ENV_VAR2}: {value2}
      ports:
        - {port}:{port}
      options: >-
        --health-cmd "{health-command}"
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
  steps:
    - uses: actions/checkout@v3
    - uses: oven-sh/setup-bun@v1
      with:
        bun-version: latest
    - name: Install dependencies
      run: bun install
    - name: Run {Database-Type} tests
      run: bun test tests/infrastructure/database/modules/{database-type}
      env:
        {ENV_VAR1}: {value1}
        {ENV_VAR2}: {value2}
```

## Documentation Requirements

When adding a new database implementation, you should provide the following documentation:

### 1. README Updates

Update the main README.md file to include information about your database implementation:

- Add your database to the list of supported databases
- Add a status badge for your database implementation
- Add any specific requirements or limitations for your database

### 2. Database-Specific Documentation

Create a database-specific documentation file in the `docs/` directory:

Example: `docs/{database-type}-integration.md`

This file should include:

- Installation instructions for your database
- Configuration options for your database
- Any specific features or limitations of your database implementation
- Performance considerations
- Migration instructions (if applicable)

### 3. Code Documentation

Ensure that your code is well-documented with JSDoc comments. Each class, method, and property should have a clear description of its purpose and behavior.

## Contribution Checklist

Before submitting your database implementation, ensure that:

- [ ] All repository interfaces are implemented
- [ ] All tests pass for your database implementation
- [ ] The CI workflow is updated to include your database
- [ ] Documentation is updated to include your database
- [ ] Code is well-documented with JSDoc comments
- [ ] Code follows the project's style guide
- [ ] All linting and type checking passes

## Supported Databases

Currently, the OpenBadges Modular Server supports the following databases:

- **SQLite**: A lightweight, file-based database that's perfect for development and small deployments.
- **PostgreSQL**: A powerful, open-source relational database system that's ideal for production deployments.

We welcome contributions to add support for additional database systems!
