import { AssetStorageInterface } from '../interfaces/asset-storage.interface';
import { AssetResolver } from '../interfaces/asset-resolver.interface';
import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import { logger } from '../../../utils/logging/logger.service';
import { isValidFilePath, sanitizeFilePath, generateSecureFilename } from '../../../utils/security/path-validation';

const UPLOADS_DIR = process.env['ASSETS_LOCAL_DIR'] || path.resolve(process.cwd(), 'uploads');

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
        logger.error('Failed to create uploads directory', { error });
      }
    }
  }

  async store(fileBuffer: Buffer, filename: string, _mimetype: string): Promise<string> {
    // Generate a secure filename to prevent path traversal attacks
    const safeName = generateSecureFilename(filename);
    const filePath = path.join(UPLOADS_DIR, safeName);

    // Write the file
    await fs.writeFile(filePath, fileBuffer);
    return safeName;
  }

  async delete(keyOrUrl: string): Promise<boolean> {
    // Sanitize the file path to prevent path traversal attacks
    const sanitizedKey = sanitizeFilePath(keyOrUrl);
    const filePath = path.join(UPLOADS_DIR, sanitizedKey);

    // Validate the file path to ensure it's within the uploads directory
    if (!isValidFilePath(filePath, UPLOADS_DIR)) {
      logger.warn('Attempted path traversal attack detected', { keyOrUrl, sanitizedKey, filePath });
      return false;
    }

    // Check if file exists before attempting to delete
    if (!existsSync(filePath)) {
      return false;
    }

    try {
      // Use fs.promises.unlink to delete the file
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      logger.error(`Error deleting file`, { filePath, error });
      return false;
    }
  }

  /**
   * Returns the URL for a given asset key or filename
   */
  public getUrl(keyOrReference: string): string {
    // Sanitize the key to prevent path traversal attacks
    const sanitizedKey = sanitizeFilePath(keyOrReference);

    // Assumes static middleware will serve /uploads
    return `/uploads/${sanitizedKey}`;
  }

  resolve(keyOrReference: string): string {
    // Sanitize the key to prevent path traversal attacks
    const sanitizedKey = sanitizeFilePath(keyOrReference);

    // Assumes static middleware will serve /uploads
    return `/uploads/${sanitizedKey}`;
  }
}
