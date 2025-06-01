# GitHub Copilot Custom Instructions for OpenBadges Modular Server

This repository implements an OpenBadges v3.0 compliant modular server using TypeScript, Bun runtime, and Drizzle ORM with support for both SQLite and PostgreSQL databases.

## Code Quality & TypeScript Standards

- **Strict TypeScript**: Always use explicit return types and never use `any` types. Use strict type checking.
- **No console.log**: Replace all `console.log` statements with the project's logger service from `@/utils/logger.ts`.
- **Import paths**: Use absolute imports with `@/` path aliases instead of relative imports. Available aliases:
  - `@/*` for `src/*`
  - `@core/*` for `src/core/*`
  - `@domains/*` for `src/domains/*`
  - `@infrastructure/*` for `src/infrastructure/*`
  - `@utils/*` for `src/utils/*`
  - `@config/*` for `src/config/*`
  - `@types/*` for `src/types/*`
  - `@tests/*` for `tests/*`
- **Error handling**: Use centralized error handling patterns with helper functions like `sendApiError` for consistent HTTP error responses.
- **Utility functions**: Create utility functions for common operations to standardize code and simplify future modifications.

## Database & Architecture Patterns

- **Drizzle ORM**: Always use Drizzle ORM for database operations with type-safe patterns.
- **Repository Pattern**: Use the RepositoryFactory pattern for database access. Repository constructors should receive connectionManager instances, not raw database clients.
- **Transactions**: Use Drizzle's transaction helper `db.transaction()` and always use the provided `tx` parameter inside transaction callbacks.
- **Database Operations**: When updating records, exclude the `id` field from update sets and use `JSON.stringify()` for metadata fields. Use `returning()` clause to avoid extra round-trips.
- **Connection Management**: For SQLite, always resolve file paths to absolute paths using `path.resolve()`. Use proper resource cleanup and connection management through RepositoryFactory.
- **SensitiveValue**: Use SensitiveValue objects only for logging, not for actual connection strings. When logging connection strings, use optional chaining for undefined values.

## Security & Compliance

- **Open Badges 3.0**: Ensure compliance with Open Badges 3.0 specification. The `recipientId` must be a valid DID/IRI format - reject empty strings or 'unknown' values.
- **Unique Identifiers**: Use `crypto.randomUUID()` instead of `Math.random()` for generating unique identifiers.
- **Data Sanitization**: When logging errors with user data, sanitize sensitive fields like `passwordHash` by replacing them with '[REDACTED]'.
- **Validation**: Require proper validation for DID/IRI formats and implement comprehensive input validation.
- **Required Fields**: The `criteria` field should be required (not optional) in base schemas for Open Badges compliance.

## Testing & Development Patterns

- **Database-agnostic Testing**: Write E2E tests that work with both SQLite and PostgreSQL. Use SQLite for local development.
- **Test Isolation**: Ensure proper test isolation and cleanup. Avoid sharing TEST_PORT environment variables between test suites.
- **Status Code Expectations**: Use specific status code expectations in authentication tests (401/403) rather than broad ranges.
- **Test URLs**: Use `127.0.0.1/localhost` instead of `0.0.0.0` for test URLs to avoid Windows/Linux compatibility issues.
- **Concurrent Testing**: Return ports from `setupTestApp()` or use dependency injection to keep port scope local to each test suite.
- **Exit Handling**: Avoid `process.exit()` in test setup functions - use conditional test skipping with `describe.skip` instead.

## Runtime & Package Management

- **Bun Runtime**: This project uses Bun as the runtime and package manager. Always use `bun` commands instead of `npm` commands.
- **Package Management**: Use Bun package manager commands (`bun add`, `bun remove`) instead of manually editing `package.json` for dependency management.
- **Environment Loading**: Bun has built-in environment variable loading and doesn't require the dotenv package.

## API & Error Handling Patterns

- **Validation Errors**: Differentiate validation errors (400 Bad Request) from internal server errors (500) by checking if error messages contain 'invalid' or 'validation' keywords.
- **Request Parsing**: When using validation middleware that parses request bodies, store the mapped body in context with `c.set('validatedBody', mappedBody)` to avoid double parsing.
- **Entity Mapping**: Use explicit `allowId` flags in entity mapping functions - `allowId=false` for create operations, `allowId=true` for update operations.
- **Reference Validation**: Validate referenced entity existence during both creation and update operations.

## Authentication & Authorization

- **Email Validation**: Use proper email regex patterns for validation.
- **Password Security**: Implement password complexity requirements and proper hashing.
- **Username Validation**: Include reserved name checks and proper validation patterns.
- **Error Specificity**: Provide specific error messages for different validation failures.

## Development Workflow

- **Git Hooks**: The project uses Husky for pre-commit and pre-push hooks that run linting, type checking, and tests.
- **CI/CD**: GitHub Actions workflows use Bun for all operations. Multi-architecture Docker images are built for deployment.
- **Semantic Release**: Use semantic-release for version management with proper commit message conventions.
- **Code Review**: Address security vulnerabilities first, then type safety, then code quality, then testing gaps.

## Architecture Notes

- **Modular Design**: Follow the established modular architecture with clear separation between domains, infrastructure, and core functionality.
- **Configuration**: Use the centralized configuration system in `@/config/config.ts` for all environment-dependent settings.
- **Logging**: Use the structured logging system with appropriate log levels and context information.
- **Health Checks**: Implement proper health check endpoints for monitoring and deployment verification.
