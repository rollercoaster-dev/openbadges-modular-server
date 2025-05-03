/**
 * Logger service using @rollercoaster-dev/rd-logger
 *
 * This provides a wrapper around the Rollercoaster.dev logger package,
 * exposing the standard logging interface used throughout the application.
 */
import { Logger as RdLogger, LogLevel } from '@rollercoaster-dev/rd-logger';
import { config } from '../../config/config';

// Declare rdLogger but initialize lazily
let rdLogger: RdLogger | null = null;

// Function to get or initialize the logger instance
const getLoggerInstance = (): RdLogger => {
  if (!rdLogger) {
    rdLogger = new RdLogger({
      // Map configuration settings
      level: config.logging.level as LogLevel,
      prettyPrint: config.logging.prettyPrint || false,
      // Add other configuration options from RdLogger as needed
    });
  }
  return rdLogger;
};

// Define a type for context objects
export type LogContext = Record<string, unknown>;

// Provide the same interface as before but use the new logger
export const logger = {
  debug(msg: string, ctx?: LogContext): void { getLoggerInstance().debug(msg, ctx); },
  info(msg: string, ctx?: LogContext): void { getLoggerInstance().info(msg, ctx); },
  warn(msg: string, ctx?: LogContext): void { getLoggerInstance().warn(msg, ctx); },
  error(msg: string, ctx?: LogContext): void { getLoggerInstance().error(msg, ctx); },
  fatal(msg: string, ctx?: LogContext): void { getLoggerInstance().error(msg, ctx); }, // Note: RdLogger might not have 'fatal', so using 'error'

  // Log an error object directly
  logError(msg: string, error: Error, additionalContext: LogContext = {}): void {
    // Call the adapter's error method so spies work
    logger.error(msg, { ...additionalContext, error });
  }
};
