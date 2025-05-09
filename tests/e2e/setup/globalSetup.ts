// test/e2e/setup/globalSetup.ts
import { setupApp } from '@/index';
import type { Hono } from 'hono';
import { logger } from '@/utils/logging/logger.service';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.test
function loadEnvFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      const envContent = fs.readFileSync(filePath, 'utf8');
      const envVars = envContent.split('\n');

      for (const line of envVars) {
        // Skip comments and empty lines
        if (line.trim().startsWith('#') || !line.trim()) continue;

        // Parse key=value pairs
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          let value = match[2].trim();

          // Remove quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith('\'') && value.endsWith('\'')))
          {
            value = value.substring(1, value.length - 1);
          }

          // Only set if not already defined
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }

      logger.info(`Loaded environment variables from ${filePath}`);
    } else {
      logger.warn(`Environment file ${filePath} not found`);
    }
  } catch (error) {
    logger.error(`Error loading environment file ${filePath}`, {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

export let runningApp: Hono | null = null;

export default async (): Promise<void> => {
  try {
    // Load environment variables from .env.test
    const envTestPath = path.resolve(process.cwd(), '.env.test');
    loadEnvFile(envTestPath);

    // Set environment variables for the test server
    process.env['PORT'] = process.env['PORT'] || '3001';
    process.env['NODE_ENV'] = 'test';

    logger.info('Global E2E setup: Starting server on port ' + process.env['PORT']);
    runningApp = await setupApp();
    logger.info('Global E2E setup: Server started successfully.');
    // Wait for a brief moment to ensure the server is fully ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (error) {
    logger.error('Global E2E setup: Failed to start server', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1); // Exit if setup fails
  }
};
