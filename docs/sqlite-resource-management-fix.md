# SQLite Resource Management Fix

## Overview

This document describes the implementation of proper SQLite resource management in the RepositoryFactory to address resource leaks and inconsistent connection patterns.

## Problem Statement

The original recommendation highlighted a valid concern about SQLite resource cleanup, but incorrectly assumed the existence of a static `sqliteConnectionManager` property. The actual issues were:

### 1. **Mixed Architecture Patterns**
- **New Pattern**: Issuer, BadgeClass, Assertion repositories used `SqliteConnectionManager`
- **Old Pattern**: ApiKey, Platform, PlatformUser, UserAssertion, User repositories used raw `Database` clients

### 2. **Resource Leaks**
- Multiple `Database` instances created without centralized tracking
- No cleanup mechanism for SQLite connections in the `close()` method
- Each repository creation spawned new connection managers

### 3. **Inconsistent Resource Management**
- PostgreSQL had centralized client management
- SQLite had distributed, untracked connection creation

## Solution Implementation

### 1. **Centralized Connection Management**

Added a static `sqliteConnectionManager` property to `RepositoryFactory`:

```typescript
private static sqliteConnectionManager:
  | import('./database/modules/sqlite/connection/sqlite-connection.manager').SqliteConnectionManager
  | null = null;

// Promise to track ongoing initialization
private static initializationPromise: Promise<void> | null = null;
```

### 2. **Shared Connection Manager Creation with Mutex Pattern**

Modified the `initialize()` method to use a Promise-based mutex pattern to prevent concurrent initializations:

```typescript
// At the beginning of initialize() method
// Check if initialization is already in progress
if (RepositoryFactory.initializationPromise) {
  // Wait for ongoing initialization to complete
  await RepositoryFactory.initializationPromise;
  return; // Initialization already completed by another call
}

// Prevent multiple initializations if already initialized
if (RepositoryFactory.isInitialized) {
  logger.warn(
    'RepositoryFactory already initialized. Skipping redundant initialization.'
  );
  return;
}

// Create and store the initialization promise
RepositoryFactory.initializationPromise = (async () => {
  try {
    RepositoryFactory.dbType = config.type;

    if (RepositoryFactory.dbType === 'postgresql') {
      // PostgreSQL initialization (unchanged)
      // ...
    } else if (RepositoryFactory.dbType === 'sqlite') {
      // Only initialize if not already initialized
      if (!RepositoryFactory.sqliteConnectionManager) {
        // Create shared SQLite connection manager for resource management
        const { Database } = await import('bun:sqlite');
        const { SqliteConnectionManager } = await import(
          './database/modules/sqlite/connection/sqlite-connection.manager'
        );
        
        const sqliteFile = config.sqliteFile || ':memory:';
        const client = new Database(sqliteFile);
        
        RepositoryFactory.sqliteConnectionManager = new SqliteConnectionManager(client, {
          maxConnectionAttempts: 3,
          connectionRetryDelayMs: 1000,
          sqliteBusyTimeout: config.sqliteBusyTimeout,
          sqliteSyncMode: config.sqliteSyncMode as | 'OFF' | 'NORMAL' | 'FULL' | undefined,
          sqliteCacheSize: config.sqliteCacheSize,
        });
        
        // Connect the shared connection manager
        await RepositoryFactory.sqliteConnectionManager.connect();
        logger.info('SQLite connection manager initialized successfully');
      }
    } else {
      throw new Error(`Unsupported database type: ${RepositoryFactory.dbType}`);
    }

    // Mark as initialized
    RepositoryFactory.isInitialized = true;
    logger.info(
      `Repository factory initialized with ${RepositoryFactory.dbType} database`
    );
  } catch (error) {
    logger.error('Failed to initialize RepositoryFactory', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
})();

// Wait for initialization to complete
await RepositoryFactory.initializationPromise;
```

### 3. **Standardized Repository Creation**

Updated all SQLite repository creation methods to use the shared connection manager:

**For repositories using SqliteConnectionManager directly:**
```typescript
// Use the shared SQLite connection manager
if (!RepositoryFactory.sqliteConnectionManager) {
  throw new Error('SQLite connection manager not initialized');
}

// Create the base repository using the shared connection manager
const baseRepository = new SqliteIssuerRepository(RepositoryFactory.sqliteConnectionManager);
```

**For repositories using raw Database clients:**
```typescript
// Use the shared SQLite connection manager
if (!RepositoryFactory.sqliteConnectionManager) {
  throw new Error('SQLite connection manager not initialized');
}

// Create the repository using the raw client from the shared connection manager
return new SqliteApiKeyRepository(RepositoryFactory.sqliteConnectionManager.getClient());
```

### 4. **Proper Resource Cleanup**

Enhanced the `close()` method to properly disconnect the SQLite connection manager and reset the initialization state:

```typescript
/**
 * Closes the database connection
 */
static async close(): Promise<void> {
  // Wait for any ongoing initialization to complete before attempting to close
  if (RepositoryFactory.initializationPromise) {
    try {
      await RepositoryFactory.initializationPromise;
    } catch (error) {
      // If initialization failed, log and continue with cleanup
      logger.warn('Initialization was in progress but failed during close', {
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (!RepositoryFactory.isInitialized) {
    logger.warn('RepositoryFactory not initialized. Nothing to close.');
    return;
  }

  if (RepositoryFactory.dbType === 'postgresql' && RepositoryFactory.client) {
    try {
      await RepositoryFactory.client.end();
      logger.info('PostgreSQL client closed successfully');
    } catch (e) {
      logger.warn('Failed to close PostgreSQL client', {
        errorMessage: e instanceof Error ? e.message : String(e),
      });
    }
    RepositoryFactory.client = null;
  } else if (
    RepositoryFactory.dbType === 'sqlite' &&
    RepositoryFactory.sqliteConnectionManager
  ) {
    // Properly disconnect the shared SQLite connection manager
    try {
      await RepositoryFactory.sqliteConnectionManager.disconnect();
      RepositoryFactory.sqliteConnectionManager = null;
      logger.info('SQLite connection manager disconnected successfully');
    } catch (error) {
      logger.warn('Failed to disconnect SQLite connection manager', {
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Reset initialization state
  RepositoryFactory.isInitialized = false;
  // Reset initialization promise
  RepositoryFactory.initializationPromise = null;
  logger.info('Repository factory closed');
}
```

## Benefits

### 1. **Resource Efficiency**
- Single SQLite connection per application instance
- Eliminates multiple Database instance creation
- Proper connection pooling and management
- Thread-safe initialization prevents duplicate connections

### 2. **Concurrency Protection**
- Promise-based mutex pattern prevents race conditions
- Ensures only one initialization process runs at a time
- Subsequent calls wait for the first initialization to complete
- Prevents resource duplication in high-load environments

### 3. **Consistent Architecture**
- All repositories now use the same connection management pattern
- Centralized resource tracking and cleanup
- Matches PostgreSQL's centralized client management

### 4. **Improved Reliability**
- Proper connection state management
- Graceful error handling during cleanup
- Prevention of resource leaks

### 5. **Better Testing**
- Predictable resource lifecycle
- Easier test isolation
- Comprehensive test coverage for resource management

## Testing

Created comprehensive tests in `tests/infrastructure/repository.factory.resource-management.test.ts` covering:

- ✅ Proper initialization and cleanup
- ✅ Multiple initialization handling
- ✅ Error handling for uninitialized state
- ✅ Graceful close() when not initialized
- ✅ Connection manager reuse across repositories

## Verification

- ✅ Build passes successfully
- ✅ Existing SQLite repository tests pass
- ✅ E2E tests pass with new resource management
- ✅ No TypeScript errors or linting issues
- ✅ Resource management tests pass

## Migration Impact

### **Backward Compatibility**: ✅ Maintained
- All existing repository interfaces remain unchanged
- No breaking changes to public APIs
- Existing tests continue to pass

### **Performance**: ✅ Improved
- Reduced memory usage from fewer Database instances
- Better connection reuse
- Faster repository creation (reuses existing connection)

### **Maintainability**: ✅ Enhanced
- Consistent patterns across all repositories
- Centralized resource management
- Clear separation of concerns

## Conclusion

The SQLite resource management fix successfully addresses the original recommendation's concerns while providing a robust, scalable solution that:

1. **Eliminates resource leaks** through proper connection management
2. **Standardizes architecture** across all SQLite repositories  
3. **Maintains backward compatibility** with existing code
4. **Improves performance** through connection reuse
5. **Enhances testability** with predictable resource lifecycle

The implementation follows established patterns from the PostgreSQL implementation and provides a solid foundation for future SQLite-related development.
