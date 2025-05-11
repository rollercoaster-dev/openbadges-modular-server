# CI/CD Configuration

This directory contains the GitHub Actions workflows for continuous integration and deployment of the OpenBadges Modular Server.

## Workflows

### Test Workflow (`test.yml`)

The test workflow runs on every push to the `main` and `develop` branches, as well as on pull requests to these branches. It can also be triggered manually via the GitHub Actions UI.

The workflow consists of the following jobs:

#### Lint

Runs ESLint to check code quality and style.

```bash
bun run lint
```

#### Core Tests

Runs core tests that don't depend on any database.

```bash
bun run test:core
bun run test:unit
```

#### SQLite Tests

Runs integration and E2E tests with SQLite as the database backend.

```bash
bun run test:integration:sqlite
bun run test:e2e:sqlite
```

#### PostgreSQL Tests

Runs integration and E2E tests with PostgreSQL as the database backend. This job uses a PostgreSQL service container provided by GitHub Actions.

```bash
bun run test:integration:pg
bun run test:e2e:pg
```

#### Test Containers

Runs E2E tests with PostgreSQL in Docker containers using the testcontainers library.

```bash
bun run test:e2e:containers
```

#### Build

Builds the application if all tests pass.

```bash
bun run build
```

## Database Configuration

The tests can be run with different database configurations:

- **SQLite**: Fast, in-memory database for local development and CI
- **PostgreSQL**: Production-like database for more comprehensive testing
- **Test Containers**: PostgreSQL in Docker containers for isolated testing

## Environment Variables

The following environment variables are used in the CI/CD pipeline:

- `DB_TYPE`: Database type to use (`sqlite` or `postgresql`)
- `DATABASE_URL`: Connection string for PostgreSQL
- `POSTGRES_USER`: PostgreSQL username
- `POSTGRES_PASSWORD`: PostgreSQL password
- `POSTGRES_HOST`: PostgreSQL host
- `POSTGRES_PORT`: PostgreSQL port
- `POSTGRES_DB`: PostgreSQL database name
- `USE_TEST_CONTAINERS`: Whether to use Docker containers for PostgreSQL tests

## Adding New Tests

When adding new tests, make sure they follow the existing patterns:

1. **Unit Tests**: Place in `tests/unit`
2. **Integration Tests**: Place in `tests/integration`
3. **E2E Tests**: Place in `tests/e2e`

For database-dependent tests, use the `databaseAwareDescribe` function to handle database availability:

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

## Troubleshooting

If tests are failing in CI but passing locally, check the following:

1. **Database Configuration**: Make sure the database configuration is correct
2. **Environment Variables**: Check that all required environment variables are set
3. **Test Containers**: If using test containers, make sure Docker is available in the CI environment
4. **Timeouts**: CI environments may be slower than local machines, so increase timeouts if necessary

## Best Practices

1. **Run Tests Locally**: Always run tests locally before pushing to remote
2. **Use the Right Database**: Use SQLite for fast local development, PostgreSQL for production-like testing
3. **Clean Up Resources**: Make sure tests clean up resources after they're done
4. **Isolate Tests**: Tests should not depend on each other or on external resources
5. **Use Test Containers**: Use test containers for isolated testing when possible
