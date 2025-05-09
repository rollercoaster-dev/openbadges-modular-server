import { Hono } from 'hono';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import { logger } from '../utils/logging/logger.service';

// Ensure UPLOADS_DIR has a trailing separator for secure path comparison
let UPLOADS_DIR = process.env['ASSETS_LOCAL_DIR'] || path.resolve(process.cwd(), 'uploads');
// Normalize and ensure trailing separator
UPLOADS_DIR = path.normalize(UPLOADS_DIR);
if (!UPLOADS_DIR.endsWith(path.sep)) {
  UPLOADS_DIR = UPLOADS_DIR + path.sep;
}

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

export function createStaticAssetsRouter(): Hono {
  const router = new Hono();

  router.get('/uploads/:filename', async (c) => {
    try {
      // Validate filename to prevent directory traversal attacks
      // First, sanitize the filename to remove any path traversal attempts and disallow special characters
      const filename = c.req.param('filename');
      // Only allow alphanumeric characters, hyphens, underscores, and periods
      if (!/^[a-zA-Z0-9_\-\.]+$/.test(filename)) {
        return c.json({ error: 'Invalid filename format' }, 400);
      }
      const sanitizedFilename = filename;

      // Normalize the path and ensure it's within the uploads directory
      const normalizedPath = path.normalize(path.join(UPLOADS_DIR, sanitizedFilename));

      // Check if the normalized path is within the uploads directory
      if (!normalizedPath.startsWith(UPLOADS_DIR)) {
        return c.json({ error: 'Invalid file path' }, 400);
      }
      const filePath = normalizedPath;

      if (!existsSync(filePath)) {
        return c.json({ error: 'File not found' }, 404);
      }

      const fileBuffer = await readFile(filePath);

      // Determine content type based on file extension
      const ext = path.extname(c.req.param('filename')).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      // Set response headers
      const headers = {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        'ETag': Buffer.from(c.req.param('filename')).toString('base64').substring(0, 16) // Simple ETag
      };

      return new Response(fileBuffer, { headers });
    } catch (error) {
      logger.error('Error serving static asset', {
        filename: c.req.param('filename'),
        error: error instanceof Error ? error.message : String(error)
      });
      return c.json({ error: 'Internal server error' }, 500);
    }
  });

  return router;
}
