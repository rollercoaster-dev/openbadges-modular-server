// test/e2e/setup/globalSetup.ts
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
export const TEST_PORT = parseInt(process.env.TEST_PORT || '3000');
export const API_URL = `http://${process.env.HOST || '0.0.0.0'}:${TEST_PORT}`;
export const API_KEY = process.env.AUTH_API_KEY_TEST?.split(':')[0] || 'verysecretkeye2e';

export default async (): Promise<void> => {
  try {
    // Load environment variables from .env.test
    const envTestPath = path.resolve(process.cwd(), '.env.test');
    loadEnvFile(envTestPath);

    // Set environment variables for the test server
    process.env['PORT'] = process.env['PORT'] || '3000';
    process.env['NODE_ENV'] = 'test';

    // Set database configuration for tests
    process.env['DB_TYPE'] = 'sqlite';
    process.env['SQLITE_DB_PATH'] = ':memory:';

    // Disable caching for tests to avoid stale data issues
    process.env['CACHE_ENABLED'] = 'false';

    logger.info('Global E2E setup: Using existing server on port ' + process.env['PORT']);
    // Skip starting the server since we already have one running
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
