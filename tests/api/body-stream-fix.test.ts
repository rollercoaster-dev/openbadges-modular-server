/**
 * Test to verify that the "body stream already used" error is fixed
 *
 * This test ensures that validation middleware properly stores the parsed body
 * in the context so route handlers don't need to parse it again.
 */

import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { validateIssuerMiddleware } from '@/utils/validation/validation-middleware';

describe('Body Stream Fix', () => {
  it('should not cause "body stream already used" error when validation middleware is used', async () => {
    // Create a test app with validation middleware
    const app = new Hono();

    app.post('/test-issuer', validateIssuerMiddleware(), async (c) => {
      // Get the validated body from context (this should work without error)
      const body = (c as { get: (key: 'validatedBody') => unknown }).get(
        'validatedBody'
      );

      // Verify we got the body
      expect(body).toBeDefined();
      expect(typeof body).toBe('object');

      return c.json({ success: true, receivedBody: body });
    });

    // Create a valid issuer payload
    const validIssuerPayload = {
      name: 'Test Issuer',
      url: 'https://example.com',
      email: 'test@example.com',
    };

    // Make a request to the endpoint
    const request = new Request('http://localhost/test-issuer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validIssuerPayload),
    });

    // This should not throw a "body stream already used" error
    const response = await app.request(request);

    // Verify the response
    expect(response.status).toBe(200);

    const responseBody = (await response.json()) as {
      success: boolean;
      receivedBody: { name: string; url: string; email: string };
    };
    expect(responseBody.success).toBe(true);

    // The validation middleware may add additional fields like id and type
    // We just need to verify that our original fields are present
    expect(responseBody.receivedBody.name).toBe(validIssuerPayload.name);
    expect(responseBody.receivedBody.url).toBe(validIssuerPayload.url);
    expect(responseBody.receivedBody.email).toBe(validIssuerPayload.email);
  });

  it('should handle validation errors without body stream issues', async () => {
    // Create a test app with validation middleware
    const app = new Hono();

    app.post('/test-issuer-invalid', validateIssuerMiddleware(), async (c) => {
      // This handler should not be reached due to validation failure
      return c.json({ success: true });
    });

    // Create an invalid issuer payload (missing required fields)
    const invalidIssuerPayload = {
      email: 'test@example.com',
      // Missing name and url
    };

    // Make a request to the endpoint
    const request = new Request('http://localhost/test-issuer-invalid', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidIssuerPayload),
    });

    // This should return a validation error, not a body stream error
    const response = await app.request(request);

    // Verify the response is a validation error
    expect(response.status).toBe(400);

    const responseBody = (await response.json()) as {
      success: boolean;
      error: string;
      details: unknown;
    };
    expect(responseBody.success).toBe(false);
    expect(responseBody.error).toBe('Validation error');
    expect(responseBody.details).toBeDefined();
  });
});
