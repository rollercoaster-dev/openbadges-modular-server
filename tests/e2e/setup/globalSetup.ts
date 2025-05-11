/**
 * Global Setup for E2E Tests
 *
 * This file is executed once before all E2E tests run.
 * It sets up the test environment, including:
 * - Loading environment variables
 * - Initializing the database
 * - Starting the server
 */

import { setupApp } from '@/index';
import { setupTestApp } from '../setup-test-app';
import type { Hono } from 'hono';
import { logger } from '@/utils/logging/logger.service';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '@/config/config';
import { DatabaseFactory } from '@/infrastructure/database/database.factory';
import { resetDatabase } from '../helpers/database-reset.helper';

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

// Export shared variables for tests
export let runningApp: Hono | null = null;
export let server: unknown = null;
export const TEST_PORT = parseInt(process.env.TEST_PORT || '3001');
export const API_URL = `http://${config.server.host}:${TEST_PORT}`;
export const API_KEY = process.env.AUTH_API_KEY_TEST?.split(':')[0] || 'verysecretkeye2e';

export default async (): Promise<void> => {
  try {
    // Load environment variables from .env.test
    const envTestPath = path.resolve(process.cwd(), '.env.test');
    loadEnvFile(envTestPath);

    // Set environment variables for the test server
    process.env['PORT'] = process.env['PORT'] || TEST_PORT.toString();
    process.env['NODE_ENV'] = 'test';
    process.env['TEST_PORT'] = TEST_PORT.toString();

    // Initialize database
    logger.info('Global E2E setup: Initializing database...');
    try {
      await DatabaseFactory.createDatabase(
        process.env.DB_TYPE || config.database.type,
        {
          connectionString: process.env.DATABASE_URL || config.database.connectionString,
          sqliteFile: process.env.SQLITE_DB_PATH || config.database.sqliteFile,
          sqliteBusyTimeout: config.database.sqliteBusyTimeout,
          sqliteSyncMode: config.database.sqliteSyncMode,
          sqliteCacheSize: config.database.sqliteCacheSize
        }
      );

      // Reset database to ensure clean state
      await resetDatabase();
      logger.info('Global E2E setup: Database initialized and reset successfully');
    } catch (error) {
      logger.error('Global E2E setup: Failed to initialize database', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      // Continue even if database initialization fails
      // Some tests might not require database access
    }

    // Start server
    logger.info(`Global E2E setup: Starting server on port ${TEST_PORT}`);
    try {
      const result = await setupTestApp();
      runningApp = result.app;
      server = result.server;
      logger.info('Global E2E setup: Server started successfully');

      // Wait for the server to be fully ready
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      logger.error('Global E2E setup: Failed to start server', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      process.exit(1); // Exit if server setup fails
    }
  } catch (error) {
    logger.error('Global E2E setup: Failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1); // Exit if setup fails
  }
};
