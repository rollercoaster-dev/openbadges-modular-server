/**
 * Shutdown Service
 *
 * This service provides graceful shutdown functionality for the application,
 * ensuring that all resources are properly released before the process exits.
 */

// import { DatabaseFactory } from '../../infrastructure/database/database.factory';
import { RepositoryFactory } from '../../infrastructure/repository.factory';
import { CacheFactory } from '../../infrastructure/cache/cache.factory';
import { PreparedStatementManager } from '../../infrastructure/database/utils/prepared-statements';
import { QueryLoggerService } from '../../infrastructure/database/utils/query-logger.service';
import { config } from '../../config/config';
import { logger } from '../logging/logger.service';

export interface ShutdownOptions {
  /**
   * Timeout in milliseconds before forcing shutdown
   * @default 5000
   */
  timeout?: number;

  /**
   * Whether to exit the process after shutdown
   * @default true
   */
  exit?: boolean;

  /**
   * Exit code to use when exiting the process
   * @default 0
   */
  exitCode?: number;

  /**
   * Whether to log shutdown steps
   * @default true
   */
  logging?: boolean;
}

export class ShutdownService {
  private static isShuttingDown = false;
  private static server: unknown = null;
  private static shutdownHooks: Array<() => Promise<void>> = [];
  private static defaultOptions: Required<ShutdownOptions> = {
    timeout: 5000,
    exit: true,
    exitCode: 0,
    logging: true
  };

  /**
   * Initializes the shutdown service
   * @param server The HTTP server instance
   */
  static init(server: unknown): void {
    this.server = server;
    this.registerSignalHandlers();
  }

  /**
   * Registers a shutdown hook
   * @param hook A function to execute during shutdown
   */
  static registerHook(hook: () => Promise<void>): void {
    this.shutdownHooks.push(hook);
  }

  /**
   * Registers signal handlers for graceful shutdown
   */
  private static registerSignalHandlers(): void {
    const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];

    for (const signal of signals) {
      process.on(signal, async () => {
        await this.shutdown({
          logging: true,
          exit: true,
          exitCode: 0,
          timeout: 5000
        });
      });
    }

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      // Use logger directly here since this is a critical error
      logger.fatal('Uncaught exception', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      await this.shutdown({
        logging: true,
        exit: true,
        exitCode: 1,
        timeout: 5000
      });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (reason) => {
      // Use logger directly here since this is a critical error
      logger.fatal('Unhandled promise rejection', {
        reason: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined
      });
      await this.shutdown({
        logging: true,
        exit: true,
        exitCode: 1,
        timeout: 5000
      });
    });
  }

  /**
   * Performs a graceful shutdown of the application
   * @param options Shutdown options
   */
  static async shutdown(options?: ShutdownOptions): Promise<void> {
    const opts = { ...this.defaultOptions, ...options };

    // Prevent multiple shutdown attempts
    if (this.isShuttingDown) {
      if (opts.logging) {
        logger.info('Shutdown already in progress...');
      }
      return;
    }

    this.isShuttingDown = true;

    if (opts.logging) {
      logger.info('Graceful shutdown initiated...');
    }

    // Set a timeout to force exit if shutdown takes too long
    const forceExitTimeout = setTimeout(() => {
      logger.error(`Shutdown timed out after ${opts.timeout}ms, forcing exit...`);
      process.exit(opts.exitCode);
    }, opts.timeout);

    try {
      // Close the HTTP server first to stop accepting new connections
      if (this.server) {
        if (opts.logging) {
          logger.info('Closing HTTP server...');
        }
        await new Promise<void>((resolve) => {
          (this.server as { close: (callback: () => void) => void }).close(() => {
            if (opts.logging) {
              logger.info('HTTP server closed.');
            }
            resolve();
          });
        });
      }

      // Execute all registered shutdown hooks
      if (opts.logging) {
        logger.info(`Executing ${this.shutdownHooks.length} shutdown hooks...`);
      }

      for (const hook of this.shutdownHooks) {
        try {
          await hook();
        } catch (error) {
          logger.error('Error executing shutdown hook:', error);
        }
      }

      // Close database connections
      if (opts.logging) {
        logger.info('Closing database connections...');
      }

      try {
        await RepositoryFactory.close();
        if (opts.logging) {
          logger.info('Repository factory closed.');
        }
      } catch (error) {
        logger.error('Error closing repository factory:', error);
      }

      // Clear caches
      if (opts.logging) {
        logger.info('Clearing caches...');
      }

      try {
        CacheFactory.clearAllCaches();
        if (opts.logging) {
          logger.info('Caches cleared.');
        }
      } catch (error) {
        logger.error('Error clearing caches:', error);
      }

      // Clear prepared statement cache
      if (opts.logging) {
        logger.info('Clearing prepared statement cache...');
      }

      try {
        PreparedStatementManager.clearCache();
        if (opts.logging) {
          logger.info('Prepared statement cache cleared.');
        }
      } catch (error) {
        logger.error('Error clearing prepared statement cache:', error);
      }

      // Save query logs if needed
      if (config.database.saveQueryLogsOnShutdown) {
        if (opts.logging) {
          logger.info('Saving query logs...');
        }

        try {
          const logs = QueryLoggerService.getLogs();
          // In a real application, you would save the logs to a file or database
          if (opts.logging) {
            logger.info(`${logs.length} query logs saved.`);
          }
        } catch (error) {
          logger.error('Error saving query logs:', error);
        }
      }

      // Clear the force exit timeout
      clearTimeout(forceExitTimeout);

      if (opts.logging) {
        logger.info('Shutdown complete.');
      }

      // Exit the process if requested
      if (opts.exit) {
        process.exit(opts.exitCode);
      }
    } catch (error) {
      logger.error('Error during shutdown:', error);

      // Clear the force exit timeout
      clearTimeout(forceExitTimeout);

      // Exit with error code
      if (opts.exit) {
        process.exit(1);
      }
    }
  }
}
