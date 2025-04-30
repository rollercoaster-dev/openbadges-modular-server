/**
 * Examples of using the updated rd-logger (v0.2.0)
 *
 * This file contains examples of how to use the new features in rd-logger v0.2.0.
 * It is not meant to be run directly, but rather to serve as a reference.
 */

import { logger } from '../../src/utils/logging/logger.service';

// Basic logging (unchanged)
logger.debug('Debug message');
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message');
logger.fatal('Fatal message');

// Logging with context (unchanged)
logger.info('User logged in', { userId: '123', username: 'john.doe' });

// Logging errors (unchanged)
try {
  throw new Error('Something went wrong');
} catch (error) {
  logger.logError('Failed to process request', error as Error, { requestId: '456' });
}

// NEW: Sensitive data handling
// Create a sensitive value
const apiKey = new logger.SensitiveValue('my-secret-api-key');
console.log(apiKey.toString()); // Outputs: [SENSITIVE]

// Check if an object contains sensitive data
const userData = {
  username: 'john.doe',
  password: new logger.SensitiveValue('password123'),
  email: 'john.doe@example.com'
};

// Type assertion to match the expected parameter type
const hasSensitive = logger.containsSensitiveData(JSON.stringify(userData));
console.log('Contains sensitive data:', hasSensitive); // Outputs: true

// Redact sensitive data before logging
const safeData = logger.redactSensitiveData(JSON.stringify(userData));
console.log(safeData);
// Outputs: { username: 'john.doe', password: '[REDACTED]', email: 'john.doe@example.com' }

// Log sensitive data with explicit approval
logger.logSensitiveData('info', 'User credentials', userData, {
  reason: 'Debugging authentication issue',
  approvedBy: 'admin',
  expiresAt: new Date(Date.now() + 3600000) // Expires in 1 hour
});

// NEW: Dynamic configuration
// Update configuration
logger.configure({
  level: 'debug',
  prettyPrint: true,
  includeStackTrace: true
});

// Set log level
logger.setLevel('debug');

// NEW: Resource management
// Clean up resources when shutting down
process.on('SIGTERM', () => {
  logger.cleanup();
  process.exit(0);
});
