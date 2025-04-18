import { Elysia } from 'elysia';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import { logger } from '../utils/logging/logger.service';

const UPLOADS_DIR = process.env.ASSETS_LOCAL_DIR || path.resolve(process.cwd(), 'uploads');

// Map of common file extensions to MIME types
const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf'
};

export function staticAssetsMiddleware(router: Elysia) {
  router.get('/uploads/:filename', async ({ params, set }) => {
    try {
      // Validate filename to prevent directory traversal attacks
      const normalizedPath = path.normalize(path.join(UPLOADS_DIR, params.filename));
      if (!normalizedPath.startsWith(UPLOADS_DIR)) {
        set.status = 400;
        return { error: 'Invalid file path' };
      }
      const filePath = normalizedPath;

      if (!existsSync(filePath)) {
        set.status = 404;
        return { error: 'File not found' };
      }

      const fileBuffer = await readFile(filePath);

      // Determine content type based on file extension
      const ext = path.extname(params.filename).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      // Set response headers
      const headers = {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        'ETag': Buffer.from(params.filename).toString('base64').substring(0, 16) // Simple ETag
      };

      return new Response(fileBuffer, { headers });
    } catch (error) {
      logger.error('Error serving static asset', {
        filename: params.filename,
        error: error instanceof Error ? error.message : String(error)
      });
      set.status = 500;
      return { error: 'Internal server error' };
    }
  });
}
