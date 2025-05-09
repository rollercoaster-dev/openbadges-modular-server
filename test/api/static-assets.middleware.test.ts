/**
 * Tests for static assets middleware
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Hono } from 'hono';
import { createStaticAssetsRouter } from '../../src/api/static-assets.middleware';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs and path modules
vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

vi.mock('path', () => ({
  normalize: vi.fn((p) => p),
  join: vi.fn((dir, file) => `${dir}/${file}`),
  extname: vi.fn((p) => '.jpg'),
  resolve: vi.fn(),
  sep: '/',
}));

describe('Static Assets Middleware', () => {
  let app: Hono;
  const mockUploadsDir = '/mock/uploads/';

  beforeEach(() => {
    // Reset environment
    process.env['ASSETS_LOCAL_DIR'] = mockUploadsDir;
    
    // Create app with static assets router
    app = new Hono();
    const staticAssetsRouter = createStaticAssetsRouter();
    app.route('/assets', staticAssetsRouter);
    
    // Mock implementations
    vi.mocked(fs.existsSync).mockImplementation(() => true);
    vi.mocked(path.join).mockImplementation((dir, file) => `${dir}${file}`);
    vi.mocked(path.normalize).mockImplementation((p) => p);
    
    // Mock readFile to return a buffer
    const mockBuffer = Buffer.from('test image data');
    vi.mocked(require('fs/promises').readFile).mockResolvedValue(mockBuffer);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should serve valid files', async () => {
    const res = await app.request('/assets/test-image.jpg');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/jpeg');
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=86400');
    expect(await res.arrayBuffer()).toBeTruthy();
  });

  it('should return 404 for non-existent files', async () => {
    vi.mocked(fs.existsSync).mockImplementation(() => false);
    const res = await app.request('/assets/non-existent.jpg');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('File not found');
  });

  it('should prevent directory traversal attacks', async () => {
    const res = await app.request('/assets/../../../etc/passwd');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid filename format');
  });

  it('should reject invalid filenames', async () => {
    const res = await app.request('/assets/<script>alert("xss")</script>.jpg');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid filename format');
  });

  it('should set the correct content type based on file extension', async () => {
    vi.mocked(path.extname).mockReturnValue('.pdf');
    const res = await app.request('/assets/document.pdf');
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
  });
});
