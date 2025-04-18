import { AssetStorageInterface } from '../interfaces/asset-storage.interface';
import { AssetResolver } from '../interfaces/asset-resolver.interface';
import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

const UPLOADS_DIR = process.env.ASSETS_LOCAL_DIR || path.resolve(process.cwd(), 'uploads');

export class LocalAssetStorageAdapter implements AssetStorageInterface, AssetResolver {
  constructor() {
    if (!existsSync(UPLOADS_DIR)) {
      fs.mkdir(UPLOADS_DIR, { recursive: true });
    }
  }

  async store(fileBuffer: Buffer, filename: string, mimetype: string): Promise<string> {
    const ext = path.extname(filename) || '';
    const safeName = `${uuidv4()}${ext}`;
    const filePath = path.join(UPLOADS_DIR, safeName);
    await fs.writeFile(filePath, fileBuffer);
    return safeName;
  }

  async delete(keyOrUrl: string): Promise<boolean> {
    const filePath = path.join(UPLOADS_DIR, keyOrUrl);
    try {
      await fs.unlink(filePath);
      return true;
    } catch (e) {
      return false;
    }
  }

  resolve(keyOrReference: string): string {
    // Assumes static middleware will serve /uploads
    return `/uploads/${keyOrReference}`;
  }
}
