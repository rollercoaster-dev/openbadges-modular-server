# BadgeForge - Open Badges API

A stateless, modular Open Badges API with support for both Open Badges 2.0 and 3.0 specifications.

[![CI/CD Pipeline](https://github.com/rollercoaster-dev/openbadges-modular-server/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/rollercoaster-dev/openbadges-modular-server/actions/workflows/ci-cd.yml)
[![Core Tests](https://github.com/rollercoaster-dev/openbadges-modular-server/actions/workflows/database-tests.yml/badge.svg?job=core-tests)](https://github.com/rollercoaster-dev/openbadges-modular-server/actions/workflows/database-tests.yml)
[![SQLite Tests](https://github.com/rollercoaster-dev/openbadges-modular-server/actions/workflows/database-tests.yml/badge.svg?job=sqlite-tests)](https://github.com/rollercoaster-dev/openbadges-modular-server/actions/workflows/database-tests.yml)
[![PostgreSQL Tests](https://github.com/rollercoaster-dev/openbadges-modular-server/actions/workflows/database-tests.yml/badge.svg?job=postgres-tests)](https://github.com/rollercoaster-dev/openbadges-modular-server/actions/workflows/database-tests.yml)

## Features

- **Dual-Version Support**: Full support for both Open Badges 2.0 and 3.0 specifications
- **Modular Architecture**: Easy integration with different database systems
- **Domain-Driven Design**: Clean separation of concerns with bounded contexts
- **Stateless API**: No client session state maintained
- **Comprehensive Documentation**: Full API documentation and guides
- **Extensive Test Suite**: Unit, integration, and compliance tests

## Technology Stack

- **Runtime**: [Bun](https://bun.sh/)
- **Web Framework**: [Elysia](https://elysiajs.com/)
- **Database**: Multiple database support
  - SQLite (using [Drizzle ORM](https://orm.drizzle.team/))
  - PostgreSQL (using [Drizzle ORM](https://orm.drizzle.team/))
  - Extensible architecture for adding more database backends
- **Types**: [openbadges-types](https://github.com/rollercoaster-dev/openbadges-types)

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (v1.0.0 or higher)
- One of the following databases:
  - [SQLite](https://www.sqlite.org/) (included with Bun)
  - [PostgreSQL](https://www.postgresql.org/) (v12 or higher)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/rollercoaster-dev/openbadges-modular-server.git
cd openbadges-modular-server
```

2. Install dependencies:

```bash
bun install
```

3. Configure environment variables:

```bash
cp .env.example .env
# Edit .env with your database connection details
```

4. Run database migrations:

```bash
# For SQLite (default)
bun run db:migrate

# For PostgreSQL
bun run db:migrate:pg
```

5. Start the server:

```bash
bun run start
```

The API will be available at http://localhost:3000.

## API Endpoints

The API provides versioned endpoints for both Open Badges 2.0 and 3.0 specifications:

### Version 2.0 Endpoints (Open Badges 2.0)

- `POST /v2/issuers` - Create a new issuer
- `GET /v2/issuers` - Get all issuers
- `GET /v2/issuers/:id` - Get an issuer by ID
- `PUT /v2/issuers/:id` - Update an issuer
- `DELETE /v2/issuers/:id` - Delete an issuer
- `POST /v2/badge-classes` - Create a new badge class
- `GET /v2/badge-classes` - Get all badge classes
- `GET /v2/badge-classes/:id` - Get a badge class by ID
- `GET /v2/issuers/:id/badge-classes` - Get badge classes by issuer
- `PUT /v2/badge-classes/:id` - Update a badge class
- `DELETE /v2/badge-classes/:id` - Delete a badge class
- `POST /v2/assertions` - Create a new assertion
- `GET /v2/assertions` - Get all assertions
- `GET /v2/assertions/:id` - Get an assertion by ID
- `GET /v2/badge-classes/:id/assertions` - Get assertions by badge class
- `PUT /v2/assertions/:id` - Update an assertion
- `POST /v2/assertions/:id/revoke` - Revoke an assertion
- `GET /v2/assertions/:id/verify` - Verify an assertion

### Version 3.0 Endpoints (Open Badges 3.0)

- `POST /v3/issuers` - Create a new issuer
- `GET /v3/issuers` - Get all issuers
- `GET /v3/issuers/:id` - Get an issuer by ID
- `PUT /v3/issuers/:id` - Update an issuer
- `DELETE /v3/issuers/:id` - Delete an issuer
- `POST /v3/badge-classes` - Create a new badge class
- `GET /v3/badge-classes` - Get all badge classes
- `GET /v3/badge-classes/:id` - Get a badge class by ID
- `GET /v3/issuers/:id/badge-classes` - Get badge classes by issuer
- `PUT /v3/badge-classes/:id` - Update a badge class
- `DELETE /v3/badge-classes/:id` - Delete a badge class
- `POST /v3/assertions` - Create a new assertion
- `GET /v3/assertions` - Get all assertions
- `GET /v3/assertions/:id` - Get an assertion by ID
- `GET /v3/badge-classes/:id/assertions` - Get assertions by badge class
- `PUT /v3/assertions/:id` - Update an assertion
- `POST /v3/assertions/:id/revoke` - Revoke an assertion
- `GET /v3/assertions/:id/verify` - Verify an assertion

For convenience, the API also provides default endpoints without version prefixes that use the Open Badges 3.0 format.

## Documentation

### API Documentation

The API provides interactive documentation through Swagger UI:

- `/docs` - Swagger UI for interactive API exploration
- `/swagger` - Raw OpenAPI specification in JSON format

### Additional Documentation

- [API Documentation](./docs/api-documentation.md) - Detailed documentation of all API endpoints
- [Database Integration Guide](./docs/database-integration-guide.md) - Comprehensive guide for adding support for additional database systems
- [E2E Testing Guide](./docs/e2e-testing-guide.md) - Guide for running and writing E2E tests
- [Multidatabase Testing Guide](./docs/multidatabase-testing-guide.md) - Detailed guide for the multidatabase testing setup
- [Logging System](./docs/logging.md) - Documentation for the neuro-friendly structured logging system

## Architecture

The API follows a Domain-Driven Design approach with the following structure:

```
src/
├── api/                  # API endpoints and controllers
├── config/               # Configuration
├── core/                 # Core services
├── domains/              # Domain entities and repositories
│   ├── assertion/
│   ├── badgeClass/
│   └── issuer/
├── infrastructure/       # Infrastructure concerns
│   └── database/         # Database modules
│       ├── interfaces/   # Database interfaces
│       └── modules/      # Database implementations
└── utils/                # Utility functions
    ├── crypto/           # Cryptographic utilities
    ├── jsonld/           # JSON-LD utilities
    ├── validation/       # Validation utilities
    └── version/          # Version detection and serialization
```

## Adding Database Support

The API is designed to be database-agnostic, with a modular architecture that allows for easy integration with different database systems. The current implementation supports both SQLite and PostgreSQL with Drizzle ORM, but additional database modules can be added by implementing the required interfaces.

We welcome contributions for additional database backends! See the [Database Integration Guide](./docs/database-integration-guide.md) for comprehensive instructions on adding support for additional database systems.

The parallel CI setup makes it easy to test your database implementation alongside the existing ones, ensuring compatibility and reliability.

## Integration with Your Own Data Structures

If you want to integrate the Open Badges API with your own data structures, you can create a custom database module that connects to your existing data store. This allows you to use the Open Badges domain logic while storing the data in your own format.

See the [Database Integration Guide](./docs/database-integration-guide.md) for detailed instructions on how to integrate with your own data structures.

## Development

### Testing

Run the full test suite (will skip tests for unavailable databases):

```bash
bun test
```

Run database-specific tests:

```bash
# SQLite tests
bun run test:sqlite

# PostgreSQL tests (requires PostgreSQL running)
bun run test:pg

# PostgreSQL tests with Docker (starts and stops a PostgreSQL container)
bun run test:pg:with-docker
```

Run E2E tests:

```bash
# Run E2E tests with SQLite
bun run test:e2e:sqlite

# Run E2E tests with PostgreSQL
bun run test:e2e:pg

# Run E2E tests with both SQLite and PostgreSQL
bun run test:e2e
```

Run tests with coverage:

```bash
bun test:coverage
```

The test suite includes:

- Unit tests for domain entities
- Integration tests for repositories (for each supported database)
- E2E tests for API endpoints (for each supported database)
- Validation tests for Open Badges compliance

See the [E2E Testing Guide](./docs/e2e-testing-guide.md) and [Multidatabase Testing Guide](./docs/multidatabase-testing-guide.md) for more information on running and writing tests.

### Linting and Type Checking

Lint the codebase:

```bash
bun run lint
```

Fix linting issues automatically:

```bash
bun run lint:fix
```

Run TypeScript type checking:

```bash
bun run typecheck
```

### Building

Build the project:

```bash
bun run build
```

## CI/CD Pipeline

The project uses GitHub Actions for continuous integration and deployment:

1. **CI Pipeline**: Runs on all branches and pull requests
   - **Lint and Type Check**: Ensures code quality and type safety
   - **Tests**: Runs the test suite with coverage reporting

2. **Database Tests Pipeline**: Runs database-specific tests in parallel
   - **Core Tests**: Tests that don't depend on specific databases
   - **SQLite Tests**: Tests specific to SQLite
   - **PostgreSQL Tests**: Tests specific to PostgreSQL

3. **CI/CD Pipeline**: Runs only on release tags (v*)
   - **Lint and Type Check**: Ensures code quality and type safety
   - **Tests**: Runs the test suite with coverage reporting
   - **Build and Push**: Builds and pushes the Docker image to GitHub Container Registry
   - **Deploy**: Deploys to Kubernetes when a new version is tagged

To create a new release:

```bash
git tag v1.0.0
git push origin v1.0.0
```

## Docker Support

### Using Docker Compose

The easiest way to run the application is using Docker Compose:

```bash
docker-compose up -d
```

This will start both the API and a PostgreSQL database.

### Using Pre-built Docker Image

You can also use the pre-built Docker image from GitHub Container Registry:

```bash
docker pull ghcr.io/rollercoaster-dev/openbadges-modular-server:main

docker run -p 3000:3000 \
  -e DATABASE_URL=postgres://postgres:postgres@your-db-host:5432/openbadges \
  ghcr.io/rollercoaster-dev/openbadges-modular-server:main
```

### Building the Docker Image Locally

To build the Docker image locally:

```bash
docker build -t openbadges-modular-server .
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
