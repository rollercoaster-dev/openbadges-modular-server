# Optimize Database Access

> _Intended for: [x] Internal Task  [x] GitHub Issue  [ ] Pull Request_

## 1. Goal & Context
- **Objective:** Improve database performance and resource utilization by implementing connection pooling, caching for frequently accessed data, and optimizing critical queries.
- **Branch:** `feat/optimize-database`
- **Energy Level:** [Medium] 🔋
- **Focus Strategy:** [Performance Analysis Tools, Benchmarking]
- **Status:** [🟡 In Progress]

### Background
The code review suggested optimizing database access as a potential improvement area. Efficient database interaction is key to application scalability and responsiveness, especially under load. This task focuses on connection pooling, caching, and query optimization. (Ref: `code-review.md`)

## 2. Resources & Dependencies
- **Prerequisites:** Understanding of database performance concepts, familiarity with Drizzle ORM, PostgreSQL, and SQLite
- **Key Files/Tools:**
    - Database factory (`src/infrastructure/database/database.factory.ts`)
    - Database modules (`src/infrastructure/database/modules/postgresql/postgresql.module.ts`, `src/infrastructure/database/modules/sqlite/sqlite.module.ts`)
    - Database implementations (`src/infrastructure/database/modules/postgresql/postgresql.database.ts`, `src/infrastructure/database/modules/sqlite/sqlite.database.ts`)
    - Schema definitions (`src/infrastructure/database/modules/postgresql/schema.ts`, `src/infrastructure/database/modules/sqlite/schema.ts`)
    - Configuration (`src/config/config.ts`)
    - Caching library (node-cache or keyv)
    - Database migration tools (drizzle-kit)
- **Additional Needs:** Load testing tools (autocannon or k6), monitoring setup

## 3. Planning & Steps

### Current State Analysis
After reviewing the codebase, I found:
- SQLite is the default database with PostgreSQL as an alternative (per user's preferences)
- Drizzle ORM is used for database operations
- Connection pooling is not explicitly configured for PostgreSQL (postgres.js has basic pooling but needs tuning)
- No caching mechanism is implemented
- No database migrations system is fully set up (drizzle-kit is installed but not configured)
- No indexes beyond primary keys and foreign keys
- No health checks or connection monitoring
- The PostgreSQL client is created in `postgresql.database.ts` but doesn't have optimal settings
- SQLite implementation uses Bun's built-in SQLite adapter
- Docker Compose setup exists but needs production-specific configurations

### Quick Wins
- [ ] Configure SQLite optimizations (WAL mode, busy timeout, etc.) (30 min)
- [ ] Add appropriate indexes to frequently queried fields in SQLite schema (30 min)
- [ ] Implement database health check endpoint (30 min)

### Major Steps

1. **Implement Connection Pooling & Resilience** (2-3 hours) 🎯
   - [ ] Optimize SQLite connection handling in `sqlite.database.ts`:
     ```typescript
     // Example implementation
     // Use WAL mode for better concurrency
     client.exec('PRAGMA journal_mode = WAL;');
     // Set busy timeout to avoid SQLITE_BUSY errors
     client.exec('PRAGMA busy_timeout = 5000;');
     // Other performance optimizations
     client.exec('PRAGMA synchronous = NORMAL;');
     client.exec('PRAGMA cache_size = 10000;');
     ```
   - [ ] Configure proper connection pooling for PostgreSQL client in `postgresql.database.ts`:
     ```typescript
     this.client = postgres(this.config.connectionString, {
       max: 20, // Maximum connections in pool
       idle_timeout: 30, // Close idle connections after 30 seconds
       connect_timeout: 10, // Connection timeout in seconds
       max_lifetime: 60 * 60, // Max connection lifetime in seconds
     });
     ```
   - [ ] Implement connection retry logic with exponential backoff in both database implementations
   - [ ] Add graceful shutdown handler in `src/index.ts` to properly close database connections
   - [ ] Create database health check endpoint in API router

2. **Set Up Database Migrations** (2-3 hours) 🎯
   - [ ] Create `drizzle.config.ts` in project root:
     ```typescript
     import type { Config } from 'drizzle-kit';

     export default {
       schema: './src/infrastructure/database/modules/sqlite/schema.ts',
       out: './drizzle/migrations',
       driver: 'better-sqlite',
       dbCredentials: {
         url: process.env.SQLITE_FILE || 'sqlite.db',
       },
       // Also configure PostgreSQL migrations
       postgres: {
         schema: './src/infrastructure/database/modules/postgresql/schema.ts',
         out: './drizzle/pg-migrations',
         dbCredentials: {
           connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/openbadges',
         },
       }
     } satisfies Config;
     ```
   - [ ] Create initial migration from existing schema: `bun drizzle-kit generate:sqlite`
   - [ ] Add migration scripts to package.json:
     ```json
     "db:generate:sqlite": "drizzle-kit generate:sqlite",
     "db:generate:pg": "drizzle-kit generate:pg",
     "db:migrate": "bun run src/infrastructure/database/migrations/run.ts",
     "db:studio": "drizzle-kit studio"
     ```
   - [ ] Create migration runner in `src/infrastructure/database/migrations/run.ts`
   - [ ] Update Dockerfile to run migrations before starting the app
   - [ ] Document migration process in README.md

3. **Optimize Schema & Add Indexes** (2-3 hours) 🎯
   - [ ] Analyze query patterns in existing code (focus on repository implementations)
   - [ ] Update SQLite schema with indexes in `src/infrastructure/database/modules/sqlite/schema.ts`:
     ```typescript
     // Add to assertions table definition
     badgeClassId: text('badge_class_id')
       .notNull()
       .references(() => badgeClasses.id)
       .index(), // Add index here

     // Add to badgeClasses table definition
     issuerId: text('issuer_id')
       .notNull()
       .references(() => issuers.id)
       .index(), // Add index here
     ```
   - [ ] Add indexes to PostgreSQL schema as well for compatibility
   - [ ] Add composite indexes for frequently queried combinations
   - [ ] Optimize text fields that store JSON data in SQLite:
     ```typescript
     // Example for creating an index on a JSON property in SQLite
     // This requires a custom SQL statement since SQLite doesn't have native JSON indexing
     sql`CREATE INDEX IF NOT EXISTS recipient_email_idx ON assertions (json_extract(recipient, '$.email'));`
     ```
   - [ ] Add database-level constraints for data integrity (e.g., CHECK constraints)

4. **Implement Caching Strategy** (3-4 hours) 🎯
   - [ ] Select and integrate caching library (node-cache or keyv)
   - [ ] Implement cache wrapper service
   - [ ] Cache frequently accessed read-heavy data:
     - [ ] Issuer profiles
     - [ ] Badge class definitions
     - [ ] Public verification keys
   - [ ] Implement cache invalidation on write operations
   - [ ] Add cache statistics and monitoring

5. **Query Optimization & Performance Testing** (3-4 hours) 🎯
   - [ ] Set up query logging for slow queries
   - [ ] Use EXPLAIN ANALYZE to identify inefficient queries
   - [ ] Refactor critical database operations for better performance
   - [ ] Create load testing scripts
   - [ ] Benchmark before and after optimizations

6. **Production Readiness** (2-3 hours) 🎯
   - [ ] Update Docker Compose for production environment
   - [ ] Add separate test database configuration
   - [ ] Implement database credential management (secrets)
   - [ ] Document backup and restore procedures
   - [ ] Add database monitoring integration points

### Testing & Definition of Done
- [ ] Connection pooling is configured and tested under load
- [ ] Migrations successfully run in both development and CI environments
- [ ] Caching shows measurable performance improvement (>30% faster for cached operations)
- [ ] Load tests show the system can handle at least 100 concurrent users
- [ ] Database connections properly close on application shutdown
- [ ] All database operations have appropriate error handling and retry logic
- [ ] Documentation is updated with database optimization details

## 4. Execution & Progress

### Implementation Plan with Commits

#### Phase 1: SQLite Optimizations
1. ✅ **Commit**: "feat(db): Add SQLite performance optimizations" (e88c626)
   - Implemented WAL mode, busy timeout, and other SQLite performance settings
   - Added connection retry logic with exponential backoff
   - Added graceful shutdown handling
   - Created health check endpoint
   - Updated tests to verify optimizations
   - Set SQLite as the default database type in config

2. ✅ **Commit**: "feat(db): Add indexes to SQLite schema" (fd42f4b)
   - Added indexes to frequently queried fields in SQLite schema
   - Added custom indexes for JSON fields using SQLite's json_extract
   - Added indexes for common query patterns (sorting, filtering)

3. ✅ **Commit**: "feat(db): Implement database health check endpoint" (8db476b)
   - Created dedicated health check service with detailed metrics
   - Added basic and deep health check endpoints
   - Added database metrics collection
   - Fixed custom index creation for empty databases

#### Phase 2: Database Migrations
4. ✅ **Commit**: "feat(db): Configure Drizzle Kit for migrations with environment variable support" (fbe5244)
   - Created drizzle.config.ts with environment variable support for both database types
   - Set up migration directory structure and scripts
   - Added comprehensive migration documentation

5. **Commit**: "feat(db): Generate initial database migrations"
   - Generate initial SQLite migrations
   - Generate initial PostgreSQL migrations
   - Create migration runner script

6. **Commit**: "feat(db): Update Docker setup for migrations"
   - Update Dockerfile to run migrations before starting the app
   - Update docker-compose.yml with migration configuration
   - Add documentation for migration process

#### Phase 3: Caching Implementation
7. **Commit**: "feat(db): Add cache service implementation"
   - Add node-cache library
   - Create cache wrapper service
   - Add cache configuration options

8. **Commit**: "feat(db): Implement entity caching"
   - Add caching for Issuer entities
   - Add caching for BadgeClass entities
   - Add cache invalidation on write operations

9. **Commit**: "feat(db): Add cache monitoring and metrics"
   - Add cache hit/miss statistics
   - Add cache size monitoring
   - Add cache performance metrics

#### Phase 4: Query Optimization & Production Readiness
10. **Commit**: "feat(db): Optimize database queries"
    - Add query logging for slow queries
    - Refactor critical database operations
    - Add prepared statements for frequent queries

11. **Commit**: "feat(db): Add graceful shutdown handling"
    - Implement proper database connection closing
    - Add signal handlers for graceful shutdown
    - Update tests to verify proper shutdown

12. **Commit**: "feat(db): Update production configuration"
    - Update Docker Compose for production environment
    - Add database credential management
    - Document backup and restore procedures

**Context Resume Point:**
_Last worked on:_ Configured Drizzle Kit for migrations (commit fbe5244)
_Next action:_ Generate initial database migrations
_Blockers:_ None

### Progress Summary

#### Completed
- ✅ Set SQLite as the default database in configuration
- ✅ Implemented SQLite performance optimizations (WAL mode, busy timeout, etc.)
- ✅ Added connection retry logic with exponential backoff
- ✅ Added graceful shutdown handling for database connections
- ✅ Created health check endpoint in API router
- ✅ Updated tests to verify optimizations
- ✅ Added indexes to SQLite schema for better query performance
- ✅ Added custom JSON field indexes for recipient lookup
- ✅ Created dedicated health check service with detailed metrics
- ✅ Added database metrics collection
- ✅ Configured Drizzle Kit for migrations with environment variable support
- ✅ Added migration scripts and documentation

#### In Progress
- 🔄 Generating initial database migrations

#### Pending
- ⏳ Implement caching strategy
- ⏳ Optimize database queries
- ⏳ Update production configuration

## 5. Reflection & Learning
- **Decision Log:**
  - Decision: Use node-cache for in-memory caching instead of Redis
  - Reasoning: Simpler setup for initial implementation, can be replaced with Redis later if needed
  - Alternatives: Redis, Memcached, or distributed caching solutions

- **Learnings:**
  - The postgres.js library used by Drizzle ORM has some connection pooling built-in but needs explicit configuration
  - Drizzle ORM supports prepared statements which can improve query performance

- **Friction Points:**
  - Need to ensure cache invalidation is properly handled to prevent stale data
  - SQLite and PostgreSQL have different indexing capabilities

- **Flow Moments:**
  - Identifying clear patterns where caching will provide significant benefits

- **Celebration Notes:** 🎉

## 6. Parking Lot (Tangential Ideas)
- Explore read replicas for scaling read operations
- Implement more sophisticated caching strategies (e.g., layered caching)
- Consider implementing a query result cache at the ORM level
- Evaluate PostgreSQL-specific optimizations like materialized views
- Explore Neon serverless PostgreSQL for better scaling (@neondatabase/serverless is already a dependency)

## 7. References & Links
- [`code-review.md`](./code-review.md)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [postgres.js Documentation](https://github.com/porsager/postgres)
- [node-cache Documentation](https://github.com/node-cache/node-cache)
- [Drizzle Kit Migration Guide](https://orm.drizzle.team/kit-docs/overview)

---

**Accessibility/UX Considerations:**
Database performance directly impacts application responsiveness, which affects all users but especially those with slower connections or assistive technologies that may time out during long operations.