# Logging System Documentation

## Overview

The Open Badges API uses a neuro-friendly structured logging system designed to provide clear, readable logs with consistent formatting and contextual information. The logging system is built to be accessible and easy to understand, with visual cues and proper spacing to improve readability.

## Features

- **Multiple log levels**: debug, info, warn, error, fatal
- **Neuro-friendly formatting**: Color-coded levels, icons, and proper spacing
- **Human-readable timestamps**: Supports multiple formats:
  - Relative time for recent events: `just now`, `2 minutes ago`
  - 24-hour format: `Apr 18, 14:16:29.893`
  - 12-hour format: `Apr 18, 2:16:29.893 PM`
- **Structured context**: Support for adding structured data to log entries
- **Environment-specific configuration**: Different logging behavior based on environment
- **Request context propagation**: Automatic inclusion of request IDs
- **Stack trace formatting**: Improved readability for error stack traces
- **File output support**: Optional logging to files (with ISO timestamps for machine readability)
- **Error object handling**: Special handling for Error objects

## Log Levels

The logger supports the following log levels (in order of increasing severity):

| Level | Icon | Color | Usage |
|-------|------|-------|-------|
| debug | 🔍 | Blue | Detailed information for debugging purposes |
| info | 🟢 | Green | General information about application operation |
| warn | 🟡 | Yellow | Warning conditions that don't prevent operation |
| error | 🔴 | Red | Error conditions that may impact functionality |
| fatal | 💀 | Magenta | Critical errors that prevent application operation |

## Configuration

Logging behavior can be configured through environment variables:

| Environment Variable | Description | Default |
|---------------------|-------------|---------|
| LOG_LEVEL | Minimum log level to display | 'debug' in development, 'info' in production |
| LOG_INCLUDE_TIMESTAMP | Whether to include timestamps in logs | true |
| LOG_COLORIZE | Whether to colorize logs | true |
| LOG_INCLUDE_REQUEST_ID | Whether to include request IDs in logs | true |
| LOG_INCLUDE_STACK_TRACE | Whether to include stack traces in error logs | true |
| LOG_TO_FILE | Whether to log to a file | false |
| LOG_FILE_PATH | Path to log file | './logs/app.log' |
| LOG_USE_24_HOUR_FORMAT | Whether to use 24-hour time format | true |
| LOG_USE_RELATIVE_TIME | Whether to use relative time for recent events | true |

## Setup Guide

### 1. Configuration

The logger is configured through environment variables. You can set these in your `.env` file or directly in your environment:

```bash
# Set log level (debug, info, warn, error, fatal)
LOG_LEVEL=debug

# Enable 24-hour time format (default is true)
LOG_USE_24_HOUR_FORMAT=true

# Enable relative time for recent events (default is true)
LOG_USE_RELATIVE_TIME=true
```

### 2. Basic Usage

```typescript
import { logger } from './utils/logging/logger.service';

// Simple info log
logger.info('User logged in');

// Log with context
logger.info('User action performed', {
  userId: '123',
  action: 'update-profile'
});

// Log an error
try {
  // Some operation that might fail
  throw new Error('Database connection failed');
} catch (error) {
  logger.logError('Failed to connect to database', error, {
    retryCount: 3,
    database: 'users'
  });
}
```

### 3. Output Examples

With the current configuration, you'll see logs with:

1. **Relative time for recent events**:
   ```
   🟢  INFO  just now
     ➤ User logged in
   ────────────────────────────────────

   🟢  INFO  2 minutes ago
     ➤ User action performed
     • userId: 123
     • action: update-profile
   ────────────────────────────────────
   ```

2. **24-hour time format for older events**:
   ```
   🔴  ERROR  Apr 18, 14:25:36.789
     ➤ Failed to connect to database
     • message: Database connection failed
     • stack: Error: Database connection failed
         at Object.<anonymous> (/app/src/index.ts:15:9)
         ...
     • retryCount: 3
     • database: users
   ────────────────────────────────────
   ```

### 4. Customizing Time Format

If you prefer 12-hour time format instead of 24-hour:

```bash
# Use 12-hour time format with AM/PM
LOG_USE_24_HOUR_FORMAT=false
```

This will show timestamps like:
```
🟢  INFO  Apr 18, 2:25:36.789 PM
  ➤ User logged in
────────────────────────────────────
```

### 5. Disabling Relative Time

If you prefer to always see the full timestamp instead of relative time:

```bash
# Disable relative time
LOG_USE_RELATIVE_TIME=false
```

This will always show the full timestamp, even for recent events:
```
🟢  INFO  Apr 18, 14:25:36.789
  ➤ User logged in
────────────────────────────────────
```

### 6. File Logging

To enable logging to a file (in addition to console):

```bash
# Enable file logging
LOG_TO_FILE=true

# Specify log file path (optional)
LOG_FILE_PATH=./logs/application.log
```

Note that file logs always use ISO format timestamps for better machine readability, regardless of your console formatting preferences.

## Usage Examples

### Basic Logging

```typescript
import { logger } from '../utils/logging/logger.service';

// Simple info log
logger.info('User registered successfully');

// Log with context
logger.info('User logged in', {
  userId: '123',
  email: 'user@example.com'
});

// Warning log
logger.warn('Rate limit approaching', {
  currentRate: '80%',
  userId: '123'
});

// Error log
logger.error('Failed to process payment', {
  orderId: 'ORD-123',
  errorCode: 'PAYMENT-001'
});

// Debug log (only shown in development or when LOG_LEVEL is 'debug')
logger.debug('Processing request payload', {
  payload: { items: [1, 2, 3] }
});

// Fatal log
logger.fatal('Database connection lost', {
  connectionId: 'db-1',
  retryCount: 5
});
```

### Logging Errors

```typescript
try {
  // Some operation that might fail
  throw new Error('Something went wrong');
} catch (error) {
  // Log the error with the special helper method
  logger.logError('Failed to perform operation', error, {
    additionalContext: 'Some additional information'
  });
}
```

## Request Context

The application automatically adds a unique request ID to each incoming request and makes it available throughout the request lifecycle. This ID is included in logs to help correlate log entries with specific requests.

```typescript
import { getRequestId } from '../utils/logging/request-context.middleware';

// In a controller or middleware
function someHandler(context) {
  const requestId = getRequestId(context);

  // Use the request ID in logs
  logger.info('Processing request', { requestId });
}
```

## Best Practices

1. **Use appropriate log levels**: Choose the right level based on the severity and importance of the information.
2. **Include relevant context**: Add structured context to logs to make them more useful for debugging.
3. **Be consistent**: Use similar log messages for similar events across the application.
4. **Avoid sensitive information**: Never log sensitive data like passwords, tokens, or personal information.
5. **Use request IDs**: Include request IDs in logs to correlate entries across a request lifecycle.
6. **Log at boundaries**: Log at system boundaries (API calls, database operations, external service calls).
7. **Use debug level for verbose logs**: Keep detailed debugging information at the debug level.

## Implementation Details

The logging system is implemented in `src/utils/logging/logger.service.ts` and uses the following components:

- **logger.service.ts**: Core logging functionality
- **request-context.middleware.ts**: Request context propagation
- **error-handler.middleware.ts**: Global error handling and logging

The system is designed to be extensible and can be enhanced with additional features like log aggregation or external logging services in the future.

## Operational Startup Metadata

The root route (`/`) returns basic metadata including the running version resolved by `getAppVersion()`, and links to the OpenAPI specs and Swagger UI.

Example response:

```json
{
  "name": "Open Badges API",
  "version": "1.x.y",
  "specification": "Open Badges 3.0",
  "documentation": {
    "swagger": "/swagger",
    "swaggerUI": "/docs"
  }
}
```
