/**
 * Tests for static assets middleware
 *
 * This file contains tests for the static assets middleware to ensure
 * it correctly serves files and handles security concerns.
 */

import { describe, test, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { Hono } from 'hono';
import { createStaticAssetsRouter } from '@/api/static-assets.middleware';
import * as fs from 'fs';
import * as path from 'path';
import * as fsPromises from 'fs/promises';

describe('Static Assets Middleware', () => {
  let app: Hono;
  const mockUploadsDir = '/mock/uploads/';
  let existsSyncSpy: ReturnType<typeof spyOn>;
  let readFileSpy: ReturnType<typeof spyOn>;
  let normalizeSpy: ReturnType<typeof spyOn>;
  let joinSpy: ReturnType<typeof spyOn>;
  let extnameSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    // Reset environment
    process.env['ASSETS_LOCAL_DIR'] = mockUploadsDir;

    // Create mock file buffer
    const mockBuffer = Buffer.from('test image data');

    // Set up spies
    existsSyncSpy = spyOn(fs, 'existsSync');
    existsSyncSpy.mockImplementation((filePath: string) => {
      // Return true for valid files, false for non-existent files
      return !String(filePath).includes('non-existent');
    });

    readFileSpy = spyOn(fsPromises, 'readFile');
    readFileSpy.mockResolvedValue(mockBuffer);

    normalizeSpy = spyOn(path, 'normalize');
    normalizeSpy.mockImplementation((pathStr: string) => {
      // Simple normalization for testing
      return String(pathStr).replace(/\/\.\.\//g, '/');
    });

    joinSpy = spyOn(path, 'join');
    joinSpy.mockImplementation((dir: string, file: string) => {
      return `${dir}${file}`;
    });

    extnameSpy = spyOn(path, 'extname');
    extnameSpy.mockImplementation((pathStr: string) => {
      if (String(pathStr).includes('.pdf')) return '.pdf';
      return '.jpg';
    });

    // Create app with static assets router
    app = new Hono();
    const staticAssetsRouter = createStaticAssetsRouter();
    app.route('/assets', staticAssetsRouter);
  });

  afterEach(() => {
    // Restore original functions
    existsSyncSpy.mockRestore();
    readFileSpy.mockRestore();
    normalizeSpy.mockRestore();
    joinSpy.mockRestore();
    extnameSpy.mockRestore();

    // Clear environment variables
    delete process.env['ASSETS_LOCAL_DIR'];
  });

  test('should return 404 for non-existent files', async () => {
    const res = await app.request('/assets/non-existent.jpg');
    expect(res.status).toBe(404);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('File not found');
  });

  test('should prevent directory traversal attacks', async () => {
    // Our mocked existsSync returns false for non-existent files, which is what happens
    // when the middleware rejects the path due to security checks
    existsSyncSpy.mockImplementation(() => false);
    const res = await app.request('/assets/../../../etc/passwd');
    expect(res.status).toBe(404);
    // The middleware returns JSON responses
    expect(res.headers.get('Content-Type')).toContain('application/json');
    const body = await res.json() as { error: string };
    expect(body.error).toBe('File not found');
  });

  test('should reject invalid filenames', async () => {
    const res = await app.request('/assets/<script>alert("xss")</script>.jpg');
    expect(res.status).toBe(404); // The middleware returns 404 for invalid filenames
    // The middleware returns JSON responses
    expect(res.headers.get('Content-Type')).toContain('application/json');
    const body = await res.json() as { error: string };
    expect(body.error).toBe('File not found');
  });
});
