# RD-Logger Update (v0.2.0)

This document outlines the changes and new features introduced in the update from `@rollercoaster-dev/rd-logger` v0.1.0 to v0.2.0.

## New Features

### 1. Sensitive Data Handling

The logger now includes features to help prevent accidental logging of sensitive information:

```typescript
// Mark sensitive data
const apiKey = new logger.SensitiveValue('my-secret-api-key');

// Check if an object contains sensitive data
const hasSensitive = logger.containsSensitiveData(data);

// Redact sensitive data before logging
const safeData = logger.redactSensitiveData(data);

// Log sensitive data with explicit approval
logger.logSensitiveData('info', 'User credentials', data, {
  reason: 'Debugging authentication issue',
  approvedBy: 'admin',
  expiresAt: new Date(Date.now() + 3600000) // Expires in 1 hour
});
```

### 2. Dynamic Configuration

The logger can now be configured dynamically at runtime:

```typescript
// Update configuration
logger.configure({
  level: 'debug',
  prettyPrint: true,
  includeStackTrace: true
});

// Set log level
logger.setLevel('debug');
```

### 3. Resource Management

The logger now includes a cleanup method to properly release resources:

```typescript
// Clean up resources when shutting down
process.on('SIGTERM', () => {
  logger.cleanup();
  process.exit(0);
});
```

## Configuration Options

The logger now supports additional configuration options:

```typescript
{
  // Log level: 'debug', 'info', 'warn', 'error', 'fatal'
  level: 'info',
  
  // Whether to pretty-print logs
  prettyPrint: true,
  
  // Whether to colorize logs
  colorize: true,
  
  // Whether to include stack traces in error logs
  includeStackTrace: true,
  
  // Whether to log to a file
  logToFile: false,
  
  // Log file path
  logFilePath: './logs/app.log',
  
  // Whether to use 24-hour time format (vs 12-hour with AM/PM)
  use24HourFormat: true,
  
  // Whether to use relative time for recent events (e.g., "just now", "2 minutes ago")
  useRelativeTime: true
}
```

## Implementation Details

The logger implementation has been updated to expose the new features while maintaining backward compatibility with existing code. The main changes are:

1. Added new methods for sensitive data handling
2. Added methods for dynamic configuration
3. Added cleanup method for resource management

See `src/utils/logging/logger.service.ts` for the full implementation.
