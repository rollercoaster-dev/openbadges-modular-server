# OpenBadges Modular Server - MVP Implementation Plan

This document outlines the implementation plan for the MVP (Minimum Viable Product) version of the OpenBadges Modular Server. The plan is organized by feature area and includes specific tasks that need to be completed.

## 1. Core Functionality

- ✅ Implement basic CRUD operations for Issuers, BadgeClasses, and Assertions
- ✅ Implement validation for OpenBadges entities
- ✅ Implement basic error handling
- ✅ Implement logging

## 2. Database Support

- ✅ Implement SQLite support for development and testing
- ✅ Implement PostgreSQL support for production
- ✅ Create database schema for Issuers, BadgeClasses, and Assertions
- ✅ Implement repository pattern for database access
- ✅ Implement database migrations
- ✅ Implement database connection pooling for PostgreSQL
- ✅ Implement database caching
- ✅ Implement database transaction support

### Database Support Finalization

- ✅ Examine and run existing migrations against a dev Postgres instance
  - ✅ Verified that migrations run successfully against PostgreSQL
  - ✅ Confirmed schema structure matches expected design

- ✅ Implement missing methods in PostgreSQL repositories
  - ✅ Completed all required methods in PostgreSQL repositories
  - ✅ Added proper error handling and transaction support
  - ✅ Implemented Data Mapper pattern with separate mapper classes

- ✅ `[Augment]` Refactor `src/infrastructure/db/DatabaseFactory.ts` to clearly select Postgres or SQLite based on ENV configuration.
  - ✅ Updated DatabaseFactory to use environment/config settings to determine the default database type
  - ✅ Added validation for supported database types
  - ✅ Added logging to indicate which database type is being used

- ✅ `[Augment]` Finalize SQLite repository implementations (remove stubs, ensure consistency with PG).
  - ✅ Created proper SQLite repository implementations for Issuer, BadgeClass, and Assertion
  - ✅ Implemented Data Mapper pattern with separate mapper classes
  - ✅ Integrated with type conversion utilities for consistent data handling
  - ✅ Updated RepositoryFactory to use the new SQLite repositories
  - ✅ Added basic tests for SQLite repository implementations

- ✅ Verify `.env` configuration for PostgreSQL
  - ✅ Ensure environment variables for PostgreSQL connection are properly defined
  - ✅ Document PostgreSQL configuration requirements

- ✅ Add basic tests for repository methods against Postgres
  - ✅ Create tests for all repository methods
  - ✅ Include tests for error cases and edge conditions
  - ✅ Ensure tests run against both PostgreSQL and SQLite

## 3. API Endpoints

- ✅ Implement RESTful API endpoints for Issuers, BadgeClasses, and Assertions
- ✅ Implement JSON-LD context for OpenBadges entities
- ✅ Implement content negotiation for different response formats
- ✅ Implement pagination for list endpoints
- ✅ Implement filtering for list endpoints
- ✅ Implement sorting for list endpoints
- ✅ Implement search for list endpoints

## 4. Authentication and Authorization

- ✅ Implement API key authentication
  - ✅ Create API key generation and validation
  - ✅ Implement API key storage and retrieval
  - ✅ Add middleware for API key validation

- ✅ Implement basic authorization (is this a good idea? Would JWT or OAuth Be better?)
  - ✅ Define roles and permissions
  - ✅ Implement role-based access control
  - ✅ Add middleware for authorization

## 5. Assertion Verification

- ✅ Implement assertion verification
  - ✅ Verify assertion signature
  - ✅ Verify assertion expiration
  - ✅ Verify assertion revocation status

- ✅ Implement assertion signing
  - ✅ Generate key pairs for signing
  - ✅ Sign assertions with private key
  - ✅ Verify assertions with public key

## 6. Documentation

- ✅ Create API documentation
- ✅ Create database schema documentation
- ⬜ Create deployment documentation
- ⬜ Create user guide

## 7. Testing

- ✅ Implement unit tests for core functionality
- ✅ Implement integration tests for API endpoints
- ⬜ Implement end-to-end tests
- ⬜ Implement performance tests

## 8. Deployment

- ⬜ Create Docker container for the server
- ⬜ Create Docker Compose configuration for local development
- ⬜ Create Kubernetes configuration for production deployment
- ⬜ Implement CI/CD pipeline

## 9. Monitoring and Logging

- ✅ Implement basic logging
- ⬜ Implement error tracking
- ⬜ Implement performance monitoring
- ⬜ Implement health checks

## Next Steps

After completing the MVP, the following features will be considered for future releases:

1. OAuth2 authentication
2. Social login integration
3. Webhook support for events
4. Advanced search capabilities
5. Batch operations for assertions
6. Integration with learning management systems
7. Multi-tenancy support (supporting multiple organizations with data isolation)
8. API versioning and backward compatibility
9. Advanced caching strategies
10. Pluggable storage backends (beyond PostgreSQL and SQLite)

### OpenBadges-Specific Enhancements

1. Enhanced verification options (multiple verification methods beyond basic hosted verification)
2. Backpack integration (allowing recipients to collect and store badges)
3. Endorsement support (allowing third parties to endorse badges)
4. Evidence handling improvements (better support for linking to evidence)
5. Revocation improvements (more sophisticated revocation mechanisms)
6. Badge expiration handling (better support for temporary badges)
7. Integration with credential ecosystems (Verifiable Credentials, etc.)
8. Improved cryptographic signing options
9. Batch issuance capabilities (issuing badges to many recipients at once)
10. Standards compliance testing (ensuring full compliance with the latest OpenBadges spec)
