# Database Synchronization in Testing

## Problem Statement

Using `setTimeout` to wait for database commits is a code smell that indicates potential race conditions. This approach is fragile and can lead to flaky tests because:

1. **Arbitrary Timing**: Fixed delays don't account for varying system performance
2. **Race Conditions**: No guarantee that operations have actually completed
3. **Flaky Tests**: Tests may pass or fail based on system load
4. **Poor Performance**: Either too short (unreliable) or too long (slow tests)

## Solution Overview

The `database-sync.helper.ts` provides robust alternatives to `setTimeout` for ensuring database operations are committed before proceeding with dependent operations.

## Key Features

### 1. Entity Verification (`ensureDatabaseSync`)

Verifies that specific entities exist and are readable from the database:

```typescript
import { ensureDatabaseSync } from './helpers/database-sync.helper';

// Replace this fragile approach:
await new Promise((resolve) => setTimeout(resolve, 100));

// With this robust verification:
await ensureDatabaseSync([testUser.id, testIssuer.id, testBadgeClass.id]);
```

**Benefits:**
- Verifies actual data persistence
- Fails fast if data is not available
- Configurable timeout and polling intervals
- Detailed logging for debugging

### 2. Transaction Commit Verification (`ensureTransactionCommitted`)

Ensures database transactions are committed without requiring specific entity IDs:

```typescript
import { ensureTransactionCommitted } from './helpers/database-sync.helper';

// After bulk operations or when you don't have specific IDs to verify
await ensureTransactionCommitted();
```

### 3. Database-Specific Synchronization

Provides database-specific optimizations:

```typescript
import { ensureSqliteSync, ensurePostgresSync } from './helpers/database-sync.helper';

// SQLite-specific synchronization
await ensureSqliteSync();

// PostgreSQL-specific synchronization  
await ensurePostgresSync();
```

### 4. Retry Mechanism with Exponential Backoff

For operations that might fail due to timing issues:

```typescript
import { retryWithBackoff } from './helpers/database-sync.helper';

const result = await retryWithBackoff(async () => {
  return await someOperationThatMightFail();
}, 3, 100); // 3 retries, starting with 100ms delay
```

### 5. Condition Polling

Wait for specific conditions to be met:

```typescript
import { pollUntilCondition } from './helpers/database-sync.helper';

await pollUntilCondition(async () => {
  const statusList = await getStatusList(statusListId);
  return statusList.encodedList !== initialEncodedList;
});
```

## Configuration Options

All synchronization functions accept optional configuration:

```typescript
interface DatabaseSyncConfig {
  maxWaitMs: number;      // Maximum wait time (default: 5000ms)
  pollIntervalMs: number; // Polling interval (default: 50ms)
  maxAttempts: number;    // Maximum attempts (default: 100)
}

// Custom configuration example
await ensureDatabaseSync(entityIds, {
  maxWaitMs: 10000,     // Wait up to 10 seconds
  pollIntervalMs: 100,  // Poll every 100ms
  maxAttempts: 50       // Maximum 50 attempts
});
```

## Implementation Details

### Entity Verification Strategy

The `ensureDatabaseSync` function:

1. **Multi-Repository Search**: Attempts to find entities across different repository types
2. **Graceful Degradation**: Continues searching even if one repository fails
3. **Detailed Logging**: Provides comprehensive debugging information
4. **Type Safety**: Maintains TypeScript type safety throughout

### Error Handling

- **Timeout Protection**: Prevents infinite waiting
- **Attempt Limiting**: Bounds the number of retry attempts
- **Detailed Logging**: Provides context for debugging failures
- **Graceful Failure**: Clear error messages with timing information

### Performance Considerations

- **Efficient Polling**: Short intervals (50ms) for responsiveness
- **Early Exit**: Stops as soon as conditions are met
- **Minimal Overhead**: Lightweight database queries for verification
- **Configurable Limits**: Adjustable timeouts and intervals

## Usage Examples

### Basic Entity Synchronization

```typescript
beforeEach(async () => {
  // Create test entities
  await userRepository.create(testUser);
  await issuerRepository.create(testIssuer);
  await badgeClassRepository.create(testBadgeClass);

  // Ensure all entities are committed and readable
  await ensureDatabaseSync([testUser.id, testIssuer.id, testBadgeClass.id]);
  
  // Now safe to proceed with HTTP requests
});
```

### Transaction-Based Synchronization

```typescript
it('should handle complex operations', async () => {
  // Perform multiple database operations
  await performBulkOperations();
  
  // Ensure all transactions are committed
  await ensureTransactionCommitted();
  
  // Proceed with verification
  const result = await app.request('/api/endpoint');
  expect(result.status).toBe(200);
});
```

### Condition-Based Waiting

```typescript
it('should update status list', async () => {
  const initialStatusList = await getStatusList(statusListId);
  
  // Perform status update
  await updateCredentialStatus(credentialId, 1);
  
  // Wait for status list to be updated
  await pollUntilCondition(async () => {
    const updatedStatusList = await getStatusList(statusListId);
    return updatedStatusList.encodedList !== initialStatusList.encodedList;
  });
  
  // Verify the change
  const finalStatusList = await getStatusList(statusListId);
  expect(finalStatusList.encodedList).not.toBe(initialStatusList.encodedList);
});
```

## Migration Guide

### Before (Fragile)

```typescript
// Create entities
await userRepository.create(testUser);
await issuerRepository.create(testIssuer);

// Fragile timing-based wait
await new Promise((resolve) => setTimeout(resolve, 100));

// Proceed with HTTP requests
const response = await app.request('/api/endpoint');
```

### After (Robust)

```typescript
// Create entities
await userRepository.create(testUser);
await issuerRepository.create(testIssuer);

// Robust verification-based wait
await ensureDatabaseSync([testUser.id, testIssuer.id]);

// Proceed with HTTP requests
const response = await app.request('/api/endpoint');
```

## Benefits

1. **Reliability**: Eliminates race conditions and timing-dependent failures
2. **Performance**: Faster than fixed delays in most cases
3. **Debugging**: Detailed logging helps identify issues quickly
4. **Flexibility**: Configurable timeouts and polling intervals
5. **Type Safety**: Full TypeScript support with proper error handling
6. **Database Agnostic**: Works with both SQLite and PostgreSQL
7. **Maintainability**: Clear, self-documenting code

## Best Practices

1. **Use Entity Verification**: When you have specific entities to verify
2. **Use Transaction Verification**: For bulk operations without specific IDs
3. **Configure Timeouts**: Adjust based on your system's performance characteristics
4. **Monitor Logs**: Use debug logs to optimize polling intervals
5. **Fail Fast**: Don't use excessively long timeouts in CI environments
6. **Test Both Paths**: Verify both success and timeout scenarios

This approach transforms fragile, timing-dependent tests into robust, verification-based tests that are both faster and more reliable.
