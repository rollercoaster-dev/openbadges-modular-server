// test/e2e/setup/globalTeardown.ts
import { runningApp } from './globalSetup';
import { logger } from '@/utils/logging/logger.service';

export default async (): Promise<void> => {
  if (runningApp) {
    try {
      logger.info('Global E2E teardown: Stopping server...');
      // Hono doesn't have a stop method, but we're using Bun.serve which doesn't need explicit cleanup
      logger.info('Global E2E teardown: Server stopped successfully.');
    } catch (error) {
      logger.error('Global E2E teardown: Error stopping server', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  } else {
    logger.warn('Global E2E teardown: No running app instance found to stop.');
  }
};
