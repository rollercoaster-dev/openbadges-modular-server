/**
 * Unit tests for the LocalAssetStorageAdapter
 */

import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import { LocalAssetStorageAdapter } from '../../../src/infrastructure/assets/local/local-storage.adapter';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';

// Test directory for uploads
const TEST_UPLOADS_DIR = path.resolve(process.cwd(), 'test-uploads');

// Set environment variable for test
process.env.ASSETS_LOCAL_DIR = TEST_UPLOADS_DIR;

describe('LocalAssetStorageAdapter', () => {
  let adapter: LocalAssetStorageAdapter;
  let testFilePath: string;

  // Create test directory before tests
  beforeAll(async () => {
    if (existsSync(TEST_UPLOADS_DIR)) {
      await fs.rm(TEST_UPLOADS_DIR, { recursive: true, force: true });
    }
    adapter = new LocalAssetStorageAdapter();
  });

  // Clean up test directory after tests
  afterAll(async () => {
    if (existsSync(TEST_UPLOADS_DIR)) {
      await fs.rm(TEST_UPLOADS_DIR, { recursive: true, force: true });
    }
  });

  it('should create uploads directory if it does not exist', async () => {
    expect(existsSync(TEST_UPLOADS_DIR)).toBe(true);
  });

  it('should store a file and return a reference key', async () => {
    // Create a test buffer
    const buffer = Buffer.from('test file content');
    const filename = 'test-image.png';
    const mimetype = 'image/png';

    // Store the file
    const key = await adapter.store(buffer, filename, mimetype);
    
    // Verify the key is a string and contains the file extension
    expect(typeof key).toBe('string');
    expect(key.endsWith('.png')).toBe(true);
    
    // Verify the file exists
    testFilePath = path.join(TEST_UPLOADS_DIR, key);
    expect(existsSync(testFilePath)).toBe(true);
    
    // Verify the file content
    const fileContent = await fs.readFile(testFilePath);
    expect(fileContent.toString()).toBe('test file content');
  });

  it('should resolve a URL from a key', () => {
    // Create a test key
    const key = 'test-file.jpg';
    
    // Resolve the URL
    const url = adapter.resolve(key);
    
    // Verify the URL format
    expect(url).toBe(`/uploads/${key}`);
  });

  it('should delete a file by key', async () => {
    // Verify the test file exists
    expect(existsSync(testFilePath)).toBe(true);
    
    // Get the filename from the path
    const filename = path.basename(testFilePath);
    
    // Delete the file
    const result = await adapter.delete(filename);
    
    // Verify the result is true
    expect(result).toBe(true);
    
    // Verify the file no longer exists
    expect(existsSync(testFilePath)).toBe(false);
  });

  it('should return false when deleting a non-existent file', async () => {
    // Try to delete a non-existent file
    const result = await adapter.delete('non-existent-file.jpg');
    
    // Verify the result is false
    expect(result).toBe(false);
  });
});
