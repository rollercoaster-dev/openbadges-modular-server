import { describe, it, expect, afterAll } from 'bun:test';
import { LocalAssetStorageAdapter } from '@/infrastructure/assets/local/local-storage.adapter';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('LocalAssetStorageAdapter', () => {
  const adapter = new LocalAssetStorageAdapter();
  const UPLOADS_DIR = process.env.ASSETS_LOCAL_DIR || path.resolve(process.cwd(), 'uploads');
  let storedFilePath: string | null = null;
  const createdFiles: string[] = [];

  afterAll(async () => {
    for (const filePath of createdFiles) {
      try {
        await fs.unlink(filePath);
      } catch (_err) {
        // Ignore errors if file already deleted
      }
    }
  });

  it('should store a file and return a safe path', async () => {
    const buffer = Buffer.from('test image data');
    const filename = 'test.png';
    const mimetype = 'image/png';
    const assetPath = await adapter.store(buffer, filename, mimetype);
    storedFilePath = path.join(UPLOADS_DIR, path.basename(assetPath));
    createdFiles.push(storedFilePath);
    // File should exist
    const stat = await fs.stat(storedFilePath);
    expect(stat.isFile()).toBe(true);
  });

  it('should get a URL for the stored asset', () => {
    const assetPath = 'somefile.png';
    const url = adapter.getUrl(assetPath);
    expect(typeof url).toBe('string');
    expect(url).toContain(assetPath);
  });

  it('should delete a stored asset', async () => {
    if (!storedFilePath) return;
    await adapter.delete(path.basename(storedFilePath));
    await expect(fs.stat(storedFilePath)).rejects.toThrow();
  });
});
