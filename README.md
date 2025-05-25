# BadgeForge - Open Badges API

A stateless, modular API server for issuing and managing Open Badges, with robust Open Badges 2.0 support and a planned roadmap for full Open Badges 3.0 implementation. Built with modern TypeScript, it supports multiple database backends.

[![Unified CI Pipeline](https://github.com/rollercoaster-dev/openbadges-modular-server/actions/workflows/ci.yml/badge.svg)](https://github.com/rollercoaster-dev/openbadges-modular-server/actions/workflows/ci.yml)
[![CI/CD Pipeline](https://github.com/rollercoaster-dev/openbadges-modular-server/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/rollercoaster-dev/openbadges-modular-server/actions/workflows/ci-cd.yml)
[![CodeQL](https://github.com/rollercoaster-dev/openbadges-modular-server/actions/workflows/codeql.yml/badge.svg)](https://github.com/rollercoaster-dev/openbadges-modular-server/actions/workflows/codeql.yml)

## Features

- **Open Badges 2.0**: Robust implementation of the Open Badges 2.0 "hosted" specification
- **Open Badges 3.0**: Planned implementation following the [OB3 Roadmap](./docs/ob3-roadmap.md)
- **Multi-Database Support**: Works with both SQLite and PostgreSQL databases
- **Modular Architecture**: Easy integration with different database systems through a clean adapter pattern
- **Domain-Driven Design**: Clean separation of concerns with bounded contexts
- **Stateless API**: RESTful design with no client session state
- **Comprehensive Testing**: Unit, integration, and end-to-end tests for both database types
- **Developer-Friendly**: Detailed documentation, type safety, and modern TypeScript practices

## Technology Stack

- **Runtime**: [Bun](https://bun.sh/) - Fast JavaScript runtime with built-in package manager
- **Web Framework**: [Hono](https://hono.dev/) - Lightweight, high-performance web framework
- **Database**: Multiple database support via [Drizzle ORM](https://orm.drizzle.team/)
  - SQLite - Embedded database for local development and testing
  - PostgreSQL - Production-ready relational database
  - Extensible architecture for adding more database backends
- **Validation**: [Zod](https://zod.dev/) - TypeScript-first schema validation
- **Testing**: Bun's built-in test runner with comprehensive test suite
- **Types**: Strong type safety with custom types for Open Badges specifications

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (v1.0.0 or higher)
- One of the following databases:
  - [SQLite](https://www.sqlite.org/) (included with Bun, no additional setup required)
  - [PostgreSQL](https://www.postgresql.org/) (v12 or higher, optional for production use)

### Quick Start

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
# Edit .env with your configuration (SQLite is used by default)
```

4. Run database migrations:

```bash
# For SQLite (default)
bun run db:migrate

# For PostgreSQL (if configured in .env)
DB_TYPE=postgresql bun run db:migrate
```

5. Start the server:

```bash
bun run dev  # Development mode with hot reloading
# or
bun run start  # Production mode
```

The API will be available at http://localhost:3000 (or the port specified in your `.env` file).

### Verifying Installation

Once the server is running, you can verify the installation by:

1. Accessing the API documentation at http://localhost:3000/docs
2. Making a test request to http://localhost:3000/health

## API Overview

The API provides versioned endpoints for both Open Badges 2.0 and 3.0 specifications:

- **Version 2.0 Endpoints** (`/v2/...`): Fully implemented endpoints for the Open Badges 2.0 "hosted" specification
- **Version 3.0 Endpoints** (`/v3/...`): Endpoints for Open Badges 3.0 (in development according to the roadmap)
- **Default Endpoints**: For convenience, the API also provides default endpoints without version prefixes

For a complete list of all available endpoints and detailed API documentation, please refer to:

- [API Documentation](./docs/api-documentation.md) - Comprehensive documentation of all endpoints, data models, and usage examples
- Interactive API documentation is also available at the `/docs` endpoint when running the server

## Open Badges Implementation Roadmap

BadgeForge follows a phased approach to implementing the Open Badges specifications:

### Current Status: Open Badges 2.0 "Hosted" Implementation

The current version provides a robust implementation of the Open Badges 2.0 specification for "hosted" badges, including:
- Core entities (Issuer, BadgeClass, Assertion) structured according to the OB2 JSON-LD schema
- Issuance workflow for creating issuers, defining badge classes, and issuing assertions
- Hosted verification with proper verification objects and programmatic status checks
- Complete data for display in client applications

### Roadmap to Full Open Badges Implementation

The project follows a phased roadmap toward full Open Badges 2.0 feature-completeness and subsequent Open Badges 3.0 implementation:

1. **OB 2.0 Feature-Complete**: Adding signed assertions, issuer public keys, and enhanced verification
2. **RevocationList**: Implementing revocation lists for signed badges
3. **Evidence & Alignment**: Supporting evidence objects and alignment arrays
4. **Baked Images Helper**: Developing tools for baking PNG/SVG images with assertion URLs
5. **OB 3.0 Core VC**: Wrapping assertions in Verifiable Credential envelopes
6. **Issuer Identity & Keys**: Implementing JWKS and DID:web methodology for verifiable issuer identity
7. **Status & Revocation for OB 3**: Implementing VC-native revocation
8. **OB 3 Service Description & OAuth**: Implementing CLR/BadgeConnect 3.0 API
9. **Compliance & Interop Tests**: Integrating conformance testing
10. **Docs & Developer UX**: Providing comprehensive documentation for both versions

For the detailed roadmap with specific tasks and success criteria, see the [OB3 Roadmap](./docs/ob3-roadmap.md).

## Documentation

### Core Documentation

- [API Documentation](./docs/api-documentation.md) - Comprehensive guide to all API endpoints, data models, and usage examples
- [OB3 Roadmap](./docs/ob3-roadmap.md) - Detailed roadmap for Open Badges 3.0 implementation

### Interactive Documentation

When running the server, interactive API documentation is available at:
- `/docs` - Interactive API explorer with request/response examples

### Developer Guides

- [Database Integration Guide](./docs/database-integration-guide.md) - How to add support for additional database systems
- [E2E Testing Guide](./docs/e2e-testing-guide.md) - Guide for running and writing end-to-end tests
- [Multidatabase Testing Guide](./docs/multidatabase-testing-guide.md) - Guide for the multidatabase testing setup
- [CI Pipeline Guide](./docs/ci-pipeline-guide.md) - CI pipeline structure and troubleshooting
- [Logging System](./docs/logging.md) - Structured logging system documentation

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

The project includes a comprehensive test suite covering unit, integration, and end-to-end tests for both SQLite and PostgreSQL databases.

#### Running Tests

Run the full test suite (automatically skips tests for unavailable databases):

```bash
bun test
```

Run specific test types:

```bash
# Database-specific tests
bun run test:sqlite                # SQLite tests only
bun run test:pg                    # PostgreSQL tests (requires PostgreSQL)
bun run test:pg:with-docker        # PostgreSQL tests with Docker container

# End-to-end tests
bun run test:e2e:sqlite            # E2E tests with SQLite
bun run test:e2e:pg                # E2E tests with PostgreSQL
bun run test:e2e                   # E2E tests with both databases

# Test with coverage reporting
bun run test:coverage
```

#### Test Suite Components

- **Unit Tests**: Test individual domain entities and services
- **Integration Tests**: Test repositories and database interactions
- **E2E Tests**: Test complete API flows from request to response
- **Validation Tests**: Ensure Open Badges compliance

For more details, see the [E2E Testing Guide](./docs/e2e-testing-guide.md) and [Multidatabase Testing Guide](./docs/multidatabase-testing-guide.md).

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

### CI Workflows

- **Unified CI Pipeline**: Runs on all branches and pull requests
  - Linting and type checking
  - Unit and integration tests with both database types
  - E2E tests with both SQLite and PostgreSQL
  - Sequential test execution to avoid resource conflicts

- **CI/CD Pipeline**: Runs on release tags (v*)
  - Full test suite with coverage reporting
  - Docker image building and publishing to GitHub Container Registry
  - Automated deployment for tagged releases

- **CodeQL Analysis**: Security scanning for code vulnerabilities

For detailed information about the CI pipeline structure and troubleshooting, see the [CI Pipeline Guide](./docs/ci-pipeline-guide.md).

### Creating Releases

To create a new release:

```bash
git tag v1.0.0
git push origin v1.0.0
```

## Docker Support

### Multi-Architecture Support

Our Docker images support multiple CPU architectures:

- **linux/amd64**: For standard x86_64 servers and Intel-based desktops/laptops
- **linux/arm64**: For Apple Silicon Macs (M1/M2/M3), AWS Graviton instances, and ARM-based servers

This means the same image works natively on both Intel/AMD and ARM-based systems without emulation, providing better performance across all platforms. For detailed information, see our [Multi-Architecture Support Guide](./docs/multi-architecture-support.md).

### Quick Start with Docker Compose

The easiest way to run the application with PostgreSQL:

```bash
docker-compose up -d
```

This starts both the API server and a PostgreSQL database with proper configuration.

### Using Pre-built Docker Images

Official images are available from GitHub Container Registry:

```bash
# Pull the latest image (Docker automatically selects the right architecture for your system)
docker pull ghcr.io/rollercoaster-dev/openbadges-modular-server:main

# Run with SQLite (no external database needed)
docker run -p 3000:3000 \
  -e DB_TYPE=sqlite \
  ghcr.io/rollercoaster-dev/openbadges-modular-server:main

# Run with PostgreSQL
docker run -p 3000:3000 \
  -e DB_TYPE=postgresql \
  -e DATABASE_URL=postgres://postgres:postgres@your-db-host:5432/openbadges \
  ghcr.io/rollercoaster-dev/openbadges-modular-server:main
```

### Verifying Image Architecture

To verify which architecture variant you're running:

```bash
docker inspect --format '{{.Architecture}}' $(docker ps -q -f name=your-container-name)
```

### Building Your Own Image

```bash
docker build -t openbadges-modular-server .
```

For building multi-architecture images locally, see our [Multi-Architecture Support Guide](./docs/multi-architecture-support.md).

## License

This project is licensed under the MIT License - see the LICENSE file for details.
