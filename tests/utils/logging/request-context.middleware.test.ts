/**
 * Functional tests for the request context middleware
 */

import { describe, test, expect, spyOn, beforeEach, afterEach, mock } from 'bun:test';
import { getRequestId } from '../../../src/utils/logging/request-context.middleware';
import { logger } from '../../../src/utils/logging/logger.service';
import { config } from '../../../src/config/config';

describe('Request Context Middleware', () => {
  let infoSpy: any;
  let debugSpy: any;
  let originalConfig: any;

  beforeEach(() => {
    // Save original config
    originalConfig = { ...config.logging };

    // Set up logger spies
    infoSpy = spyOn(logger, 'info');
    debugSpy = spyOn(logger, 'debug');
  });

  afterEach(() => {
    // Restore logger
    infoSpy.mockRestore();
    debugSpy.mockRestore();

    // Restore original config
    config.logging = originalConfig;
  });

  test('should add request ID to context', () => {
    // Create a mock context
    const mockContext = {
      request: {
        headers: {
          get: () => null
        },
        method: 'GET',
        url: 'http://localhost/test'
      },
      store: {},
      set: {
        headers: {}
      }
    };

    // Mock randomUUID to return a predictable value
    const mockUUID = 'mock-uuid-123';
    mock.module('crypto', () => ({
      randomUUID: () => mockUUID
    }));

    // Import the middleware function directly to test it
    const { requestContextMiddleware } = require('../../../src/utils/logging/request-context.middleware');

    // Call the onRequest handler
    const onRequestHandler = requestContextMiddleware.hooks.onRequest[0];
    onRequestHandler(mockContext);

    // Verify request ID was added to context and headers
    expect((mockContext.store as any).requestId).toBe(mockUUID);
    expect(mockContext.set.headers['x-request-id']).toBe(mockUUID);
  });

  test('should use existing request ID from headers', () => {
    // Create a mock context with an existing request ID
    const customRequestId = 'test-request-id-123';
    const mockContext = {
      request: {
        headers: {
          get: (name: string) => name === 'x-request-id' ? customRequestId : null
        },
        method: 'GET',
        url: 'http://localhost/test'
      },
      store: {},
      set: {
        headers: {}
      }
    };

    // Import the middleware function directly to test it
    const { requestContextMiddleware } = require('../../../src/utils/logging/request-context.middleware');

    // Call the onRequest handler
    const onRequestHandler = requestContextMiddleware.hooks.onRequest[0];
    onRequestHandler(mockContext);

    // Verify the custom request ID was used
    expect((mockContext.store as any).requestId).toBe(customRequestId);
    expect(mockContext.set.headers['x-request-id']).toBe(customRequestId);
  });

  test('should log completed requests', () => {
    // Create a mock context
    const mockRequestId = 'test-request-id';
    const mockContext = {
      request: {
        method: 'GET',
        url: 'http://localhost/test-logging'
      },
      store: {
        requestId: mockRequestId,
        requestStartTime: Date.now() - 100 // 100ms ago
      },
      set: {
        status: 200,
        headers: {}
      }
    };

    // Import the middleware function directly to test it
    const { requestContextMiddleware } = require('../../../src/utils/logging/request-context.middleware');

    // Call the afterHandle handler
    const afterHandleHandler = requestContextMiddleware.hooks.afterHandle[0];
    afterHandleHandler(mockContext);

    // Verify logger.info was called for the completed request
    expect(infoSpy).toHaveBeenCalled();
    expect(infoSpy.mock.calls.some((call: any[]) =>
      call[0] === 'Request completed' &&
      call[1].path === '/test-logging' &&
      call[1].method === 'GET' &&
      call[1].status === 200 &&
      call[1].requestId === mockRequestId
    )).toBe(true);
  });

  test('should log incoming requests in debug mode', () => {
    // Set log level to debug
    config.logging.level = 'debug';

    // Create a mock context
    const mockRequestId = 'test-request-id';
    const mockContext = {
      request: {
        headers: {
          get: () => null
        },
        method: 'GET',
        url: 'http://localhost/test-debug'
      },
      store: {},
      set: {
        headers: {}
      }
    };

    // Mock randomUUID
    mock.module('crypto', () => ({
      randomUUID: () => mockRequestId
    }));

    // Import the middleware function directly to test it
    const { requestContextMiddleware } = require('../../../src/utils/logging/request-context.middleware');

    // Call the onRequest handler
    const onRequestHandler = requestContextMiddleware.hooks.onRequest[0];
    onRequestHandler(mockContext);

    // Verify logger.debug was called for the incoming request
    expect(debugSpy).toHaveBeenCalled();
    expect(debugSpy.mock.calls.some((call: any[]) =>
      call[0] === 'Incoming request' &&
      call[1].path === '/test-debug' &&
      call[1].method === 'GET' &&
      call[1].requestId === mockRequestId
    )).toBe(true);
  });

  test('getRequestId should return request ID from context', () => {
    // Create a mock context
    const mockContext = {
      store: {
        requestId: 'test-id-123'
      }
    };

    // Get request ID
    const requestId = getRequestId(mockContext);

    // Verify correct ID is returned
    expect(requestId).toBe('test-id-123');
  });

  test('getRequestId should return "unknown" if context is invalid', () => {
    // Test with undefined context
    expect(getRequestId(undefined)).toBe('unknown');

    // Test with null context
    expect(getRequestId(null)).toBe('unknown');

    // Test with empty context
    expect(getRequestId({})).toBe('unknown');

    // Test with context missing store
    expect(getRequestId({ request: {} })).toBe('unknown');

    // Test with context missing requestId
    expect(getRequestId({ store: {} })).toBe('unknown');
  });
});
