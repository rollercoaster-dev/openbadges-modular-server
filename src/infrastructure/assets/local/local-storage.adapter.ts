import { AssetStorageInterface } from '../interfaces/asset-storage.interface';
import { AssetResolver } from '../interfaces/asset-resolver.interface';
import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

const UPLOADS_DIR = process.env.ASSETS_LOCAL_DIR || path.resolve(process.cwd(), 'uploads');

export class LocalAssetStorageAdapter implements AssetStorageInterface, AssetResolver {
  /**
   * Creates a new LocalAssetStorageAdapter
   * Initializes the uploads directory synchronously to ensure it exists
   */
  constructor() {
    // Use synchronous mkdir to ensure directory exists immediately
    if (!existsSync(UPLOADS_DIR)) {
      try {
        // Use Node.js built-in fs module for synchronous operation
        require('fs').mkdirSync(UPLOADS_DIR, { recursive: true });
      } catch (error) {
        console.error('Failed to create uploads directory:', error);
      }
    }
  }

  async store(fileBuffer: Buffer, filename: string, _mimetype: string): Promise<string> {
    const ext = path.extname(filename) || '';
    const safeName = `${uuidv4()}${ext}`;
    const filePath = path.join(UPLOADS_DIR, safeName);
    await fs.writeFile(filePath, fileBuffer);
    return safeName;
  }

  async delete(keyOrUrl: string): Promise<boolean> {
    const filePath = path.join(UPLOADS_DIR, keyOrUrl);

    // Check if file exists before attempting to delete
    if (!existsSync(filePath)) {
      return false;
    }

    try {
      // Use fs.promises.unlink to delete the file
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error(`Error deleting file ${filePath}:`, error);
      return false;
    }
  }

  /**
   * Returns the URL for a given asset key or filename
   */
  public getUrl(keyOrReference: string): string {
    // Assumes static middleware will serve /uploads
    return `/uploads/${keyOrReference}`;
  }

  resolve(keyOrReference: string): string {
    // Assumes static middleware will serve /uploads
    return `/uploads/${keyOrReference}`;
  }
}
