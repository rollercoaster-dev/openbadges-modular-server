import { Elysia, t } from 'elysia';
import { createAssetProvider } from '../../infrastructure/assets/asset-storage.factory';
import { logger } from '../../utils/logging/logger.service';

const assetStorage = createAssetProvider();

// Maximum file size (5MB by default)
const MAX_FILE_SIZE = parseInt(process.env['ASSETS_MAX_FILE_SIZE'] || '5242880', 10);

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/svg+xml',
  'image/webp',
  'application/pdf'
];

export class AssetsController {
  public router: Elysia;

  constructor() {
    this.router = new Elysia();
    this.router.post('/v1/assets', async (context: { body?: { file?: { data: { arrayBuffer(): Promise<ArrayBuffer> }, filename: string, mimetype: string } }, set: { status: number } }) => {
      try {
        const file = context.body?.file;

        // Validate file upload
        if (!file || !file.data || !file.filename || !file.mimetype) {
          context.set.status = 400;
          return { error: 'Missing file upload' };
        }

        // Validate file type
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          context.set.status = 400;
          return {
            error: 'Invalid file type',
            allowedTypes: ALLOWED_MIME_TYPES
          };
        }

        // Get file buffer and check size
        const arrayBuffer = await file.data.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (buffer.length > MAX_FILE_SIZE) {
          context.set.status = 400;
          return {
            error: 'File too large',
            maxSize: `${MAX_FILE_SIZE / 1024 / 1024}MB`
          };
        }

        // Store the file
        const key = await assetStorage.store(buffer, file.filename, file.mimetype);
        const url = assetStorage.resolve(key);

        logger.info('Asset uploaded successfully', {
          filename: file.filename,
          size: buffer.length,
          type: file.mimetype,
          url
        });

        return { url };
      } catch (error) {
        logger.error('Error uploading asset', {
          error: error instanceof Error ? error.message : String(error)
        });
        context.set.status = 500;
        return { error: 'Internal server error' };
      }
    }, {
      body: t.Object({
        file: t.File()
      }),
      detail: {
        summary: 'Upload asset',
        description: 'Upload a badge image or issuer logo. Returns public URL.',
        tags: ['Assets'],
        responses: {
          '200': {
            description: 'Asset uploaded successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    url: { type: 'string', description: 'Public URL of the uploaded asset' }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Invalid request',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: { type: 'string', description: 'Error message' }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
}
