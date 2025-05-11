/**
 * Global Teardown for E2E Tests
 *
 * This file is executed once after all E2E tests run.
 * It cleans up the test environment, including:
 * - Stopping the server
 * - Closing database connections
 */

import { runningApp, server } from './globalSetup';
import { logger } from '@/utils/logging/logger.service';
import { stopTestServer } from '../setup-test-app';
import { resetDatabase } from '../helpers/database-reset.helper';

export default async (): Promise<void> => {
  // Clean up database
  try {
    logger.info('Global E2E teardown: Resetting database...');
    await resetDatabase();
    logger.info('Global E2E teardown: Database reset successfully');
  } catch (error) {
    logger.error('Global E2E teardown: Error resetting database', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  }

  // Stop server
  if (server) {
    try {
      logger.info('Global E2E teardown: Stopping server...');
      stopTestServer(server);
      logger.info('Global E2E teardown: Server stopped successfully');
    } catch (error) {
      logger.error('Global E2E teardown: Error stopping server', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  } else {
    logger.warn('Global E2E teardown: No server instance found to stop');
  }
};
