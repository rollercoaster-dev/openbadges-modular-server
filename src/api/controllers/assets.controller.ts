import { createAssetProvider } from '../../infrastructure/assets/asset-storage.factory';
import { logger } from '../../utils/logging/logger.service';
import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { z } from 'zod';

// Initialize asset storage provider
const assetStorage = createAssetProvider();

// Default maximum file size: 5MB in bytes
// Using a more readable format for better maintainability
const DEFAULT_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_FILE_SIZE = parseInt(process.env['ASSETS_MAX_FILE_SIZE'] || String(DEFAULT_MAX_FILE_SIZE_BYTES), 10);

// Allowed MIME types for security and compatibility
// Note: If additional file types are needed in the future, extend this list
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/svg+xml',
  'image/webp',
  'application/pdf'
];

// Define response schemas for OpenAPI documentation
const SuccessResponseSchema = z.object({
  url: z.string().describe('Public URL of the uploaded asset')
});

const ErrorResponseSchema = z.object({
  error: z.string().describe('Error message'),
  allowedTypes: z.array(z.string()).optional().describe('List of allowed MIME types'),
  maxSize: z.string().optional().describe('Maximum allowed file size')
});

export class AssetsController {
  public router: OpenAPIHono;

  constructor() {
    this.router = new OpenAPIHono();

    // Define the file upload route with OpenAPI documentation
    const uploadRoute = createRoute({
      method: 'post',
      path: '/v1/assets',
      summary: 'Upload asset',
      description: 'Upload a badge image or issuer logo. Returns public URL.',
      tags: ['Assets'],
      request: {
        // Note: File uploads are handled differently in OpenAPI
        // We're defining the content type but actual validation happens in the handler
        body: {
          content: {
            'multipart/form-data': {
              schema: z.object({
                file: z.any().describe('File to upload')
              })
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Asset uploaded successfully',
          content: {
            'application/json': {
              schema: SuccessResponseSchema
            }
          }
        },
        400: {
          description: 'Invalid request',
          content: {
            'application/json': {
              schema: ErrorResponseSchema
            }
          }
        },
        403: {
          description: 'Permission denied',
          content: {
            'application/json': {
              schema: ErrorResponseSchema
            }
          }
        },
        500: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: ErrorResponseSchema
            }
          }
        }
      }
    });

    // Register the route with proper type handling
    // @ts-expect-error - Type mismatch between OpenAPIHono and Hono handler types
    this.router.openapi(uploadRoute, async (c) => {
      try {
        // For logging correlation
        const requestId = 'unknown';

        // Parse the multipart form data
        const body = await c.req.parseBody();
        const file = body.file;

        // Cross-runtime compatible file validation
        if (!file) {
          logger.warn('Missing file upload', { requestId });
          return c.json({ error: 'Missing file upload' }, 400);
        }

        // Ensure file is a File object
        if (!(file instanceof File)) {
          logger.warn('Invalid file upload - not a File object', { requestId });
          return c.json({ error: 'Invalid file upload' }, 400);
        }

        // Now TypeScript knows file is a File object
        const fileName = file.name || 'unknown';
        const fileType = file.type || 'application/octet-stream';

        // Log file upload attempt
        logger.debug('File upload attempt', {
          filename: fileName,
          type: fileType,
          requestId
        });

        // Validate file type
        if (!ALLOWED_MIME_TYPES.includes(fileType)) {
          logger.warn('Invalid file type rejected', {
            filename: fileName,
            type: fileType,
            allowedTypes: ALLOWED_MIME_TYPES,
            requestId
          });
          return c.json({
            error: 'Invalid file type',
            allowedTypes: ALLOWED_MIME_TYPES
          }, 400);
        }

        // Get file buffer and check size
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (buffer.length > MAX_FILE_SIZE) {
          logger.warn('File too large rejected', {
            filename: fileName,
            size: buffer.length,
            maxSize: MAX_FILE_SIZE,
            requestId
          });
          return c.json({
            error: 'File too large',
            maxSize: `${MAX_FILE_SIZE / 1024 / 1024}MB`
          }, 400);
        }

        // Sanitize filename to prevent path traversal and other security issues
        const sanitizedFilename = fileName.replace(/[^\w\s.-]/g, '_');

        // Store the file
        const key = await assetStorage.store(buffer, sanitizedFilename, fileType);
        const url = assetStorage.resolve(key);

        logger.info('Asset uploaded successfully', {
          filename: sanitizedFilename,
          originalFilename: fileName,
          size: buffer.length,
          type: fileType,
          url,
          requestId
        });

        return c.json({ url });
      } catch (error) {
        // Enhanced error logging with more context
        logger.error('Error uploading asset', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });

        // More specific error handling based on error type
        if (error instanceof Error) {
          // Storage-related errors
          if (error.message.includes('storage') || error.message.includes('write') || error.message.includes('disk')) {
            return c.json({ error: 'Storage error: Unable to save file' }, 500);
          }

          // Permission-related errors
          if (error.message.includes('permission') || error.message.includes('access')) {
            return c.json({ error: 'Permission denied: Unable to save file' }, 403);
          }

          // Format-related errors
          if (error.message.includes('format') || error.message.includes('corrupt')) {
            return c.json({ error: 'Invalid file format: File appears to be corrupted' }, 400);
          }
        }

        // Generic error fallback
        return c.json({ error: 'Internal server error' }, 500);
      }
    });
  }
}
