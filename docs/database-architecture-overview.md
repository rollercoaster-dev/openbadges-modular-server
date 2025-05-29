# Database Architecture Overview

This document provides a comprehensive overview of the OpenBadges Modular Server database architecture, designed to help developers understand the sophisticated multi-database system and its key patterns.

## Table of Contents

1. [Architecture Summary](#architecture-summary)
2. [Core Components](#core-components)
3. [Database Modules](#database-modules)
4. [Repository Pattern](#repository-pattern)
5. [Connection Management](#connection-management)
6. [Transaction Handling](#transaction-handling)
7. [Data Flow](#data-flow)
8. [Configuration](#configuration)
9. [Development Patterns](#development-patterns)

## Architecture Summary

The OpenBadges Modular Server implements a **dual-database architecture** supporting both SQLite and PostgreSQL through a unified interface. The system uses sophisticated patterns to ensure:

- **Database Agnosticism**: Applications work identically with either database
- **Type Safety**: Full TypeScript support with zero `any` types
- **Performance**: Optimized connection management and query patterns
- **Maintainability**: 60% code reduction through base repository patterns
- **Extensibility**: Easy addition of new database types

### Key Design Principles

1. **Unified Interface**: All databases implement the same `DatabaseInterface`
2. **Factory Pattern**: Dynamic database selection based on configuration
3. **Repository Pattern**: Domain-driven data access with base classes
4. **Connection Pooling**: Efficient resource management per database type
5. **Health Monitoring**: Built-in diagnostics and monitoring capabilities

## Core Components

```text
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
├─────────────────────────────────────────────────────────────┤
│                  Repository Factory                         │
│              (Creates repositories)                         │
├─────────────────────────────────────────────────────────────┤
│                  Database Factory                           │
│              (Selects database module)                      │
├─────────────────────────────────────────────────────────────┤
│    SQLite Module           │         PostgreSQL Module      │
│  ┌─────────────────────┐   │   ┌─────────────────────────┐   │
│  │ SQLite Database     │   │   │ PostgreSQL Database     │   │
│  │ Connection Manager  │   │   │ Connection Manager      │   │
│  │ Base Repository     │   │   │ Base Repository         │   │
│  │ Specific Repos      │   │   │ Specific Repos          │   │
│  └─────────────────────┘   │   └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

- **Database Factory**: Registers and creates database modules based on environment
- **Repository Factory**: Creates domain-specific repositories with caching support
- **Database Modules**: Implement database-specific connection and operation logic
- **Base Repositories**: Provide common functionality (logging, error handling, transactions)
- **Connection Managers**: Handle database connections, health monitoring, and resource cleanup

## Database Modules

### SQLite Module (`src/infrastructure/database/modules/sqlite/`)

**Characteristics:**
- File-based or in-memory database
- JSON stored as text, timestamps as integers
- Single connection with transaction support
- Ideal for development and small deployments

**Key Components:**
- `SqliteConnectionManager`: Manages connection lifecycle and health
- `SqlitePragmaManager`: Centralized PRAGMA configuration
- `BaseSqliteRepository`: Abstract base with common SQLite patterns
- `SqliteDatabase`: Main database interface implementation

### PostgreSQL Module (`src/infrastructure/database/modules/postgresql/`)

**Characteristics:**
- Network-based relational database
- Native UUID, JSONB, and timestamp support
- Connection pooling with health monitoring
- Production-ready with advanced features

**Key Components:**
- `PostgresConnectionManager`: Connection pooling and state management
- `PostgresConfigManager`: Session-level configuration management
- `BasePostgresRepository`: Abstract base with PostgreSQL patterns
- `PostgresqlDatabase`: Main database interface implementation

## Repository Pattern

### Base Repository Architecture

Both database types implement base repository classes that provide:

```typescript
// Common functionality across all repositories
abstract class BaseRepository {
  // Error handling and logging
  protected handleError(error: Error, context: OperationContext): void
  
  // Query execution with metrics
  protected executeQuery<T>(query: Query): Promise<T>
  
  // Transaction support
  protected withTransaction<T>(operation: (tx: Transaction) => Promise<T>): Promise<T>
  
  // Health monitoring
  protected createOperationContext(operation: string): OperationContext
}
```

### Repository Hierarchy

```text
BaseRepository (Abstract)
├── BaseSqliteRepository
│   ├── SqliteIssuerRepository
│   ├── SqliteBadgeClassRepository
│   └── SqliteAssertionRepository
└── BasePostgresRepository
    ├── PostgresIssuerRepository
    ├── PostgresBadgeClassRepository
    └── PostgresAssertionRepository
```

### Benefits of Base Repositories

- **60% Code Reduction**: Eliminates duplication across repositories
- **Consistent Error Handling**: Standardized error processing and logging
- **Transaction Support**: Unified transaction patterns
- **Performance Monitoring**: Built-in query metrics and logging
- **Type Safety**: Full TypeScript support with proper typing

## Connection Management

### SQLite Connection Management

```typescript
class SqliteConnectionManager {
  // Single connection with state tracking
  private client: Database | null = null;
  private connectionState: SqliteConnectionState;
  
  // Health monitoring
  async getHealth(): Promise<SqliteDatabaseHealth>
  
  // Resource management
  async connect(): Promise<void>
  async disconnect(): Promise<void>
  async reconnect(): Promise<void>
}
```

**Features:**
- Single connection per manager instance
- Automatic reconnection with exponential backoff
- PRAGMA configuration management
- Resource cleanup and health monitoring

### PostgreSQL Connection Management

```typescript
class PostgresConnectionManager {
  // Connection pooling
  private client: postgres.Sql;
  private connectionState: PostgresConnectionState;
  
  // Pool management
  async getPoolStatus(): Promise<PoolStatus>
  
  // Health monitoring
  async getHealth(): Promise<PostgresDatabaseHealth>
}
```

**Features:**
- Connection pooling with configurable limits
- Advanced health monitoring and diagnostics
- Session-level configuration management
- Automatic connection recovery

## Transaction Handling

### Unified Transaction Interface

```typescript
interface DatabaseTransaction {
  id: string;
  startTime: number;
  operations: string[];
}

// Usage pattern
await database.withTransaction(async (tx) => {
  const issuer = await tx.createIssuer(issuerData);
  const badgeClass = await tx.createBadgeClass(badgeClassData);
  const assertion = await tx.createAssertion(assertionData);
  return { issuer, badgeClass, assertion };
});
```

### Database-Specific Implementation

**SQLite Transactions:**
- Uses Drizzle's transaction helper
- Automatic rollback on errors
- Nested transaction support

**PostgreSQL Transactions:**
- Connection pool-aware transactions
- Advanced isolation level support
- Distributed transaction capabilities

## Data Flow

### Typical Operation Flow

1. **Request Arrives**: Application receives API request
2. **Repository Creation**: Repository Factory creates appropriate repository
3. **Database Selection**: Database Factory selects configured database module
4. **Connection Management**: Connection manager provides database connection
5. **Query Execution**: Base repository executes query with error handling
6. **Result Processing**: Data mappers convert between domain and persistence formats
7. **Response**: Processed data returned to application

### Error Handling Flow

1. **Error Occurs**: Database operation fails
2. **Error Capture**: Base repository captures and logs error
3. **Context Addition**: Operation context added for debugging
4. **Error Classification**: Error type determined (connection, validation, etc.)
5. **Recovery Attempt**: Automatic retry for transient errors
6. **Graceful Degradation**: Fallback behavior or error response

## Configuration

### Environment-Based Selection

```bash
# SQLite Configuration
DB_TYPE=sqlite
SQLITE_FILE=./data/openbadges.sqlite

# PostgreSQL Configuration  
DB_TYPE=postgresql
DATABASE_URL=postgres://user:pass@host:5432/db
```

### Factory Registration

```typescript
// Automatic registration based on DB_TYPE
if (dbType === 'postgresql') {
  DatabaseFactory.registerModule(new PostgresqlModule(), true);
  DatabaseFactory.registerModule(new SqliteModule());
} else {
  DatabaseFactory.registerModule(new SqliteModule(), true);
  DatabaseFactory.registerModule(new PostgresqlModule());
}
```

## Development Patterns

### Adding New Repositories

1. **Create Repository Interface**: Define domain operations
2. **Extend Base Repository**: Inherit from database-specific base class
3. **Implement Operations**: Use base class utilities for common tasks
4. **Add to Factory**: Register in Repository Factory
5. **Write Tests**: Create database-agnostic tests

### Database-Agnostic Development

```typescript
// Always use the repository interface, never concrete implementations
const issuerRepo: IssuerRepository = await RepositoryFactory.createIssuerRepository();

// Operations work identically regardless of database
const issuer = await issuerRepo.create(issuerData);
const found = await issuerRepo.findById(issuer.id);
```

### Best Practices

1. **Use Repository Interfaces**: Never depend on concrete repository implementations
2. **Leverage Base Classes**: Extend base repositories for common functionality
3. **Handle Errors Gracefully**: Use base repository error handling patterns
4. **Monitor Performance**: Utilize built-in query metrics and logging
5. **Test Both Databases**: Ensure compatibility across database types

---

**Related Documentation**: 
- [UUID Conversion Guide](./uuid-conversion-guide.md) *(if available)*
- Repository Implementation Guide *(planned)*
- Connection Manager Deep Dive *(planned)*

**See Also**:
- [Database Refactor Plan](../.cursor/working/tasks/archive/database-refactoring/db-system-refactor.md)
- [Project Status Summary](../.cursor/working/tasks/project-status-summary.md)
