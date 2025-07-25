# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Development Commands

**Development workflow:**
```bash
bun run dev                 # Start development server with hot reload
bun run start              # Start production server
```

**Quality checks (run before commits):**
```bash
bun run check:all          # Run lint, typecheck, and test suite
bun run lint               # Lint TypeScript files
bun run lint:fix           # Auto-fix linting issues
bun run typecheck          # TypeScript type checking
```

**Testing:**
```bash
bun test                   # Run full test suite (auto-detects available databases)
bun run test:core          # Core tests only (no database-specific tests)
bun run test:sqlite        # SQLite-specific tests
bun run test:pg            # PostgreSQL tests (requires PostgreSQL)
bun run test:pg:with-docker # PostgreSQL tests using Docker container
bun run test:coverage      # Run tests with coverage report
```

**End-to-end testing:**
```bash
bun run test:e2e           # E2E tests for both databases
bun run test:e2e:sqlite    # E2E tests with SQLite
bun run test:e2e:pg        # E2E tests with PostgreSQL
```

**Database operations:**
```bash
bun run db:generate        # Generate migrations for current DB_TYPE
bun run db:migrate         # Run migrations for current DB_TYPE
bun run db:studio          # Open Drizzle Studio for current DB_TYPE
```

**Database-specific operations:**
```bash
# PostgreSQL
DB_TYPE=postgresql bun run db:generate:pg
DB_TYPE=postgresql bun run db:migrate:pg
DB_TYPE=postgresql bun run db:studio:pg

# SQLite
DB_TYPE=sqlite bun run db:generate:sqlite
DB_TYPE=sqlite bun run db:migrate:sqlite  
DB_TYPE=sqlite bun run db:studio:sqlite
```

## Architecture Overview

### Core Architecture Patterns

**Domain-Driven Design (DDD):** The codebase is organized around three main domains:
- `src/domains/issuer/` - Badge issuer management
- `src/domains/badgeClass/` - Badge class definitions
- `src/domains/assertion/` - Badge assertions (issued badges)

**Multi-Database Architecture:** The system supports both SQLite and PostgreSQL through a modular database adapter pattern:
- Database modules in `src/infrastructure/database/modules/`
- Each database has its own repositories, mappers, and connection management
- Tests automatically detect available databases and run accordingly

**Repository Pattern:** Each domain has repository interfaces and database-specific implementations:
- Generic interfaces in domain folders (e.g., `assertion.repository.ts`)
- Database-specific implementations in `src/infrastructure/database/modules/{sqlite|postgresql}/repositories/`

### Key Architectural Components

**Database Factory (`src/infrastructure/database/database.factory.ts`):**
- Registers and manages database modules based on `DB_TYPE` environment variable
- Provides unified interface for database operations

**Configuration System (`src/config/config.ts`):**
- Environment-driven configuration with sensible defaults
- Database connection string determination with priority order
- Comprehensive caching, auth, and logging configuration

**API Structure:**
- Hono-based REST API with OpenAPI/Swagger documentation
- Controllers in `src/api/controllers/`
- Request/response DTOs with Zod validation
- Interactive API docs available at `/docs` endpoint

### Database-Specific Considerations

**SQLite:**
- Uses better-sqlite3 with WAL mode and optimized pragmas
- Connection pooling managed through singleton pattern
- Prepared statements for performance
- Supports in-memory databases for testing

**PostgreSQL:** 
- Uses postgres.js driver with connection pooling
- Supports SSL connections and full PostgreSQL feature set
- Environment variables: `DATABASE_URL` or individual `POSTGRES_*` vars
- Docker Compose setup available for development

### Testing Strategy

**Multi-Database Testing:**
- Tests automatically skip if database is unavailable
- Use `bun run test:pg:with-docker` for PostgreSQL testing with Docker
- Database-specific test files in `tests/infrastructure/database/modules/`
- E2E tests validate complete API workflows

**Test Database Management:**
- SQLite tests use isolated database files
- PostgreSQL tests use dedicated test database with Docker
- Database reset helpers ensure test isolation

## Open Badges Implementation

**Current Status:** Full Open Badges 2.0 "hosted" specification support
**Roadmap:** Planned migration to Open Badges 3.0 (see `docs/ob3-roadmap.md`)

**Core Entities:**
- **Issuer:** Organization that issues badges
- **BadgeClass:** Template/definition for a type of badge  
- **Assertion:** Individual badge issued to a recipient

**API Endpoints:**
- Version-specific endpoints: `/v2/` (current), `/v3/` (planned)
- Default endpoints without version prefix for convenience
- Full OpenAPI documentation at `/docs`

## Development Guidelines

**Code Style:**
- TypeScript with strict type checking
- ESLint with TypeScript rules
- Husky git hooks enforce quality checks
- Conventional Commits for automated releases

**Database Patterns:**
- Always use repository pattern, never direct database calls
- Database-agnostic code in domain layer
- Database-specific logic isolated to infrastructure layer
- Use mappers to convert between domain entities and database schemas

**Adding New Database Support:**
See `docs/database-integration-guide.md` for comprehensive instructions on implementing new database adapters.

**Authentication:**
- Multi-adapter authentication system (API keys, Basic Auth, OAuth2)
- RBAC middleware for role-based access control
- JWT tokens for session management
- Configuration in `config.auth` section

**Error Handling:**
- Custom error classes in `src/infrastructure/errors/`
- Structured error responses with proper HTTP status codes
- Comprehensive logging with request correlation IDs