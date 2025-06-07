# Task: Improve GitHub Actions CI Setup for Database Testing

## Background
The current CI setup has several issues with database handling, particularly with PostgreSQL and SQLite. Tests are passing locally but failing in CI, suggesting configuration issues. The project needs a more reliable and efficient approach to database testing in GitHub Actions.

## Current Issues
- Tests passing locally but failing in CI pipeline
- Complex setup for PostgreSQL in GitHub Actions
- Inconsistent database configuration between local and CI environments
- Multiple workflow files with overlapping responsibilities
- Excessive Docker container usage for database testing
- Lack of clear separation between SQLite and PostgreSQL tests

## Research Findings

### Best Practices for PostgreSQL in GitHub Actions
1. **Use GitHub's service containers** - GitHub Actions provides built-in support for PostgreSQL service containers
2. **Health checks** - Implement proper health checks to ensure the database is ready before tests run
3. **Connection verification** - Verify database connections before running tests
4. **Environment variables** - Use consistent environment variables across local and CI environments
5. **Port mapping** - Properly map ports for service containers
6. **Simplify configuration** - Minimize custom Docker setup in favor of GitHub's service containers

### Best Practices for SQLite in GitHub Actions
1. **In-memory databases** - Use in-memory SQLite databases for faster tests
2. **File permissions** - Ensure proper file permissions for SQLite database files
3. **Path consistency** - Use consistent paths for SQLite files
4. **Avoid Docker for SQLite** - SQLite doesn't require Docker containers, simplifying the setup

### General CI Best Practices
1. **Matrix testing** - Use GitHub Actions matrix to test against multiple database configurations
2. **Caching** - Implement proper caching for dependencies
3. **Workflow organization** - Organize workflows by purpose rather than technology
4. **Fail fast** - Configure tests to fail fast when issues are detected
5. **Clear error reporting** - Improve error reporting for database connection issues

## Improvement Plan

### 1. Consolidate Workflow Files
- Merge overlapping workflow files into a single, well-organized workflow
- Use job dependencies to ensure proper execution order
- Implement matrix testing for different database configurations

### 2. Improve PostgreSQL Service Container Setup
- Use GitHub's built-in PostgreSQL service container
- Implement proper health checks
- Verify database connection before running tests
- Use consistent environment variables

### 3. Optimize SQLite Testing
- Use in-memory SQLite for unit and integration tests
- Ensure proper file permissions for file-based SQLite tests
- Implement consistent path handling

### 4. Implement Database-Agnostic Testing
- Refactor tests to be database-agnostic where possible
- Use environment variables to control database configuration
- Skip PostgreSQL-specific tests when PostgreSQL is not available

### 5. Improve Error Handling and Reporting
- Add better error reporting for database connection issues
- Implement proper logging for database operations
- Add debugging information for CI failures

## Implementation Tasks

### Phase 1: Consolidate and Simplify Workflows
1. Create a new unified workflow file
2. Implement matrix testing for different Node.js versions and database types
3. Remove redundant workflow files

### Phase 2: Optimize PostgreSQL Setup
1. Configure PostgreSQL service container with proper health checks
2. Implement connection verification
3. Standardize environment variables

### Phase 3: Optimize SQLite Setup
1. Configure in-memory SQLite for unit and integration tests
2. Implement proper file handling for E2E tests
3. Ensure consistent path handling

### Phase 4: Improve Test Organization
1. Separate tests by type (unit, integration, E2E)
2. Implement database-specific test filtering
3. Add proper test reporting

### Phase 5: Documentation and Maintenance
1. Document the new CI setup
2. Add comments to workflow files
3. Create a database testing guide for contributors

## Success Criteria
- All tests pass consistently in CI
- Clear separation between SQLite and PostgreSQL tests
- Simplified workflow configuration
- Faster CI execution time
- Better error reporting for database issues

## Resources
- [GitHub Actions PostgreSQL Service Containers](https://docs.github.com/en/actions/use-cases-and-examples/using-containerized-services/creating-postgresql-service-containers)
- [GitHub Actions Matrix Testing](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstrategymatrix)
- [SQLite In-Memory Database](https://www.sqlite.org/inmemorydb.html)
