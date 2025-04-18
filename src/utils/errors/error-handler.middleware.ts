import { Elysia } from 'elysia';
import { logger } from '../logging/logger.service';

/**
 * Global error handler middleware
 */
export const errorHandlerMiddleware = new Elysia().onError((context) => {
  const { error, request, set } = context;
  const path = new URL(request.url).pathname;
  const requestId = request.headers.get('x-request-id') || 'unknown';

  logger.error('Unhandled Exception', {
    message: error instanceof Error ? error.message : String(error),
    path,
    requestId
  });

  set.status = 500;
  return {
    error: {
      message: 'Internal Server Error',
      code: 'INTERNAL_SERVER_ERROR',
      status: 500
    }
  };
});

/**
 * Not found handler middleware
 */
export const notFoundHandlerMiddleware = new Elysia().all('*', (context) => {
  const { request, set } = context;
  const path = new URL(request.url).pathname;
  const requestId = request.headers.get('x-request-id') || 'unknown';

  logger.warn('Route Not Found', {
    method: request.method,
    path,
    requestId
  });

  set.status = 404;
  return {
    error: {
      message: `Route not found: ${request.method} ${path}`,
      code: 'ROUTE_NOT_FOUND',
      status: 404
    }
  };
}); 