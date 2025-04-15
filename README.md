# BadgeForge - Open Badges API

A stateless, modular Open Badges API with support for both Open Badges 2.0 and 3.0 specifications.

[![Build and Publish Docker Image](https://github.com/rollercoaster-dev/openbadges-modular-server/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/rollercoaster-dev/openbadges-modular-server/actions/workflows/docker-publish.yml)

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
- **Database**: PostgreSQL (using [Drizzle ORM](https://orm.drizzle.team/))
- **Types**: [openbadges-types](https://github.com/rollercoaster-dev/openbadges-types)

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (v1.0.0 or higher)
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
bun run db:migrate
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

- [API Documentation](./docs/api-documentation.md) - Detailed documentation of all API endpoints
- [Database Module Guide](./docs/database-module-guide.md) - Guide for adding support for additional database systems

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

The API is designed to be database-agnostic, with a modular architecture that allows for easy integration with different database systems. The initial implementation uses PostgreSQL with Drizzle ORM, but additional database modules can be added by implementing the required interfaces.

See the [Database Module Guide](./docs/database-module-guide.md) for more information on adding support for additional database systems.

## Integration with Your Own Data Structures

If you want to integrate the Open Badges API with your own data structures, you can create a custom database module that connects to your existing data store. This allows you to use the Open Badges domain logic while storing the data in your own format.

See the [Database Module Guide](./docs/database-module-guide.md) for detailed instructions on how to integrate with your own data structures.

## Testing

Run the test suite:

```bash
bun test
```

The test suite includes:

- Unit tests for domain entities
- Integration tests for repositories
- Validation tests for Open Badges compliance

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
