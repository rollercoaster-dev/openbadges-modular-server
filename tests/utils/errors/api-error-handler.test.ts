/**
 * Tests for the centralized API error handling utility
 */

import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import {
  sendApiError,
  sendNotFoundError,
} from '@/utils/errors/api-error-handler';
import { BadRequestError } from '@/infrastructure/errors/bad-request.error';
import { ValidationError } from '@/utils/errors/validation.errors';

describe('API Error Handler', () => {
  describe('sendApiError', () => {
    it('should handle permission errors with 403 status', async () => {
      const app = new Hono();

      app.get('/test', async (c) => {
        const error = new Error(
          'User does not have permission to access this resource'
        );
        return sendApiError(c, error, { endpoint: 'GET /test' });
      });

      const response = await app.request('/test');
      expect(response.status).toBe(403);

      const body = (await response.json()) as {
        error: string;
        message: string;
      };
      expect(body.error).toBe('Forbidden');
      expect(body.message).toBe(
        'User does not have permission to access this resource'
      );
    });

    it('should handle Invalid IRI errors with 400 status', async () => {
      const app = new Hono();

      app.get('/test', async (c) => {
        const error = new Error('Invalid IRI format for issuer');
        return sendApiError(c, error, { endpoint: 'GET /test' });
      });

      const response = await app.request('/test');
      expect(response.status).toBe(400);

      const body = (await response.json()) as {
        error: string;
        message: string;
      };
      expect(body.error).toBe('Bad Request');
      expect(body.message).toBe('Invalid issuer ID');
    });

    it('should handle BadRequestError with 400 status', async () => {
      const app = new Hono();

      app.get('/test', async (c) => {
        const error = new BadRequestError('Invalid input data');
        return sendApiError(c, error, { endpoint: 'GET /test' });
      });

      const response = await app.request('/test');
      expect(response.status).toBe(400);

      const body = (await response.json()) as {
        error: string;
        message: string;
      };
      expect(body.error).toBe('Bad Request');
      expect(body.message).toBe('Invalid input data');
    });

    it('should handle ValidationError with 400 status', async () => {
      const app = new Hono();

      app.get('/test', async (c) => {
        const error = new ValidationError('Validation failed');
        return sendApiError(c, error, { endpoint: 'GET /test' });
      });

      const response = await app.request('/test');
      expect(response.status).toBe(400);

      const body = (await response.json()) as {
        error: string;
        message: string;
      };
      expect(body.error).toBe('Bad Request');
      expect(body.message).toBe('Validation failed');
    });

    it('should handle generic errors with 500 status', async () => {
      const app = new Hono();

      app.get('/test', async (c) => {
        const error = new Error('Database connection failed');
        return sendApiError(c, error, { endpoint: 'GET /test' });
      });

      const response = await app.request('/test');
      expect(response.status).toBe(500);

      const body = (await response.json()) as {
        error: string;
        message: string;
      };
      expect(body.error).toBe('Internal Server Error');
      expect(body.message).toBe('Database connection failed');
    });

    it('should handle string errors', async () => {
      const app = new Hono();

      app.get('/test', async (c) => {
        return sendApiError(c, 'Something went wrong', {
          endpoint: 'GET /test',
        });
      });

      const response = await app.request('/test');
      expect(response.status).toBe(500);

      const body = (await response.json()) as {
        error: string;
        message: string;
      };
      expect(body.error).toBe('Internal Server Error');
      expect(body.message).toBe('Something went wrong');
    });
  });

  describe('sendNotFoundError', () => {
    it('should return 404 with proper message', async () => {
      const app = new Hono();

      app.get('/test', async (c) => {
        return sendNotFoundError(c, 'Issuer', {
          endpoint: 'GET /test',
          id: 'test-id',
        });
      });

      const response = await app.request('/test');
      expect(response.status).toBe(404);

      const body = (await response.json()) as {
        error: string;
        message: string;
      };
      expect(body.error).toBe('Not Found');
      expect(body.message).toBe('Issuer not found');
    });

    it('should handle different resource types', async () => {
      const app = new Hono();

      app.get('/test', async (c) => {
        return sendNotFoundError(c, 'Badge class', {
          endpoint: 'GET /test',
          id: 'test-id',
        });
      });

      const response = await app.request('/test');
      expect(response.status).toBe(404);

      const body = (await response.json()) as {
        error: string;
        message: string;
      };
      expect(body.error).toBe('Not Found');
      expect(body.message).toBe('Badge class not found');
    });
  });
});
