/**
 * Integration tests for the error handler middleware
 */

import { describe, test, expect, spyOn, beforeEach, afterEach } from 'bun:test';
import { logger } from '../../../src/utils/logging/logger.service';

describe('Error Handler Middleware', () => {
  let loggerSpy: any;

  beforeEach(() => {
    // Set up logger spy
    loggerSpy = spyOn(logger, 'logError');
  });

  afterEach(() => {
    // Restore logger
    loggerSpy.mockRestore();
  });

  test('should log errors with the correct context', () => {
    // Create a test error
    const testError = new Error('Test error');

    // Create a mock context
    const mockContext = {
      error: testError,
      request: {
        url: 'http://localhost/test-error',
        method: 'GET'
      },
      set: {
        status: 0
      },
      store: {}
    };

    // Call the error handler directly
    // Access the handler function using require to bypass TypeScript restrictions
    const handler = require('../../../src/utils/errors/error-handler.middleware');
    const errorHandler = handler.errorHandlerMiddleware.hooks.error[0];
    const result = errorHandler(mockContext);

    // Verify logger was called with correct context
    expect(loggerSpy).toHaveBeenCalled();
    expect(loggerSpy.mock.calls[0][0]).toBe('Unhandled Exception');
    expect(loggerSpy.mock.calls[0][1]).toBe(testError);

    // Verify status was set to 500
    expect(mockContext.set.status).toBe(500);

    // Verify response body contains error information
    expect(result.error).toBeDefined();
    expect(result.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(result.error.status).toBe(500);
  });

  test('should mask error details in production mode', () => {
    // Save original NODE_ENV
    const originalNodeEnv = process.env.NODE_ENV;

    try {
      // Set production mode
      process.env.NODE_ENV = 'production';

      // Create a test error with sensitive details
      const testError = new Error('Sensitive error details');

      // Create a mock context
      const mockContext = {
        error: testError,
        request: {
          url: 'http://localhost/test-error',
          method: 'GET'
        },
        set: {
          status: 0
        },
        store: {}
      };

      // Call the error handler directly
      const handler = require('../../../src/utils/errors/error-handler.middleware');
      const errorHandler = handler.errorHandlerMiddleware.hooks.error[0];
      const result = errorHandler(mockContext);

      // Verify response body masks error details
      expect(result.error.message).toBe('Internal Server Error');
      expect(result.error.message).not.toContain('Sensitive error details');
    } finally {
      // Restore original NODE_ENV
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  test('should include error details in development mode', () => {
    // Save original NODE_ENV
    const originalNodeEnv = process.env.NODE_ENV;

    try {
      // Set development mode
      process.env.NODE_ENV = 'development';

      // Create a test error with detailed message
      const testError = new Error('Detailed error message');

      // Create a mock context
      const mockContext = {
        error: testError,
        request: {
          url: 'http://localhost/test-error',
          method: 'GET'
        },
        set: {
          status: 0
        },
        store: {}
      };

      // Call the error handler directly
      const handler = require('../../../src/utils/errors/error-handler.middleware');
      const errorHandler = handler.errorHandlerMiddleware.hooks.error[0];
      const result = errorHandler(mockContext);

      // Verify response body includes error details
      expect(result.error.message).toBe('Detailed error message');
    } finally {
      // Restore original NODE_ENV
      process.env.NODE_ENV = originalNodeEnv;
    }
  });
});
