# SQLite Connection Management Pattern

## Overview

This document outlines the recommended pattern for SQLite database connections in the OpenBadges Modular Server application. Following this pattern ensures proper resource management, type safety, and transaction support.

## Key Components

### 1. SqliteConnectionManager

The `SqliteConnectionManager` class is the central component for SQLite connection management:

```typescript
export class SqliteConnectionManager {
  constructor(client: Database, config: SqliteConnectionConfig) {
    this.client = client;
    this.db = drizzle(client);
    this.config = config;
  }

  // Get database with connection validation
  getDatabase(): ReturnType<typeof drizzle> {
    this.ensureConnected();
    return this.db;
  }
  
  // Connection management methods
  async connect(): Promise<void> { ... }
  async disconnect(): Promise<void> { ... }
  isConnected(): boolean { ... }
  ensureConnected(): void { ... }
}
```

### 2. Repository Pattern

All SQLite repositories should follow this standard pattern:

```typescript
export class SqliteExampleRepository implements ExampleRepository {
  // Constructor takes connection manager
  constructor(private readonly connectionManager: SqliteConnectionManager) {
    this.mapper = new SqliteExampleMapper();
  }
  
  // Get database with connection validation
  private getDatabase() {
    this.connectionManager.ensureConnected();
    return this.connectionManager.getDatabase();
  }
  
  // Public mapper access
  getMapper(): SqliteExampleMapper {
    return this.mapper;
  }
  
  // Repository methods using getDatabase()
  async findById(id: Shared.IRI): Promise<Example | null> {
    const db = this.getDatabase();
    // Use db for operations...
  }
}
```

### 3. RepositoryFactory

The `RepositoryFactory` manages a single shared `SqliteConnectionManager`:

```typescript
export class RepositoryFactory {
  private static sqliteConnectionManager: SqliteConnectionManager | null = null;
  
  static async initialize(config: {...}): Promise<void> {
    // Initialize the shared connection manager
    RepositoryFactory.sqliteConnectionManager = new SqliteConnectionManager(client, {
      maxConnectionAttempts: 3,
      connectionRetryDelayMs: 1000,
    });
    
    await RepositoryFactory.sqliteConnectionManager.connect();
  }
  
  static async createExampleRepository(): Promise<ExampleRepository> {
    if (!RepositoryFactory.sqliteConnectionManager) {
      throw new Error('SQLite connection manager not initialized');
    }
    
    // Pass the connection manager to the repository
    return new SqliteExampleRepository(RepositoryFactory.sqliteConnectionManager);
  }
  
  static async close(): Promise<void> {
    if (RepositoryFactory.sqliteConnectionManager) {
      await RepositoryFactory.sqliteConnectionManager.disconnect();
      RepositoryFactory.sqliteConnectionManager = null;
    }
  }
}
```

## Best Practices

1. **Connection Management**:
   - Always use `SqliteConnectionManager` for database access
   - Never create Drizzle instances directly in repositories
   - Always validate connection state with `ensureConnected()`

2. **Transaction Handling**:
   - Use Drizzle's transaction API for multi-step operations
   - Pass transaction context (`tx`) to nested methods when needed
   - Ensure proper error handling within transactions

3. **Type Safety**:
   - Use explicit type annotations for database records
   - Avoid unsafe type casting with `as string`
   - Use type converters for complex types like IRI values

4. **Resource Cleanup**:
   - Always clean up resources in a finally block
   - Use the `close()` method from RepositoryFactory for cleanup
   - Implement proper shutdown hooks in the application

## Migration Guide

For repositories still using direct Database access, update them to follow this pattern:

### Before:

```typescript
export class OldStyleRepository implements Repository {
  private db: ReturnType<typeof drizzle>;
  
  constructor(client: Database) {
    this.db = drizzle(client);
  }
  
  async findById(id: string): Promise<Entity | null> {
    const result = await this.db.select()...
  }
}
```

### After:

```typescript
export class NewStyleRepository implements Repository {
  constructor(private readonly connectionManager: SqliteConnectionManager) {}
  
  private getDatabase() {
    this.connectionManager.ensureConnected();
    return this.connectionManager.getDatabase();
  }
  
  async findById(id: string): Promise<Entity | null> {
    const db = this.getDatabase();
    const result = await db.select()...
  }
}
```

## Related Documentation

- [SQLite Resource Management Fix](./sqlite-resource-management-fix.md)
- [Database Module Guide](./database-module-guide.md)
- [Entity Type Safety](./entity-type-safety.md)