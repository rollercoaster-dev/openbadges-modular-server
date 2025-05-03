/**
 * Logger service using @rollercoaster-dev/rd-logger
 * 
 * This provides a wrapper around the Rollercoaster.dev logger package,
 * exposing the standard logging interface used throughout the application.
 */
import { Logger as RdLogger, LogLevel } from '@rollercoaster-dev/rd-logger';
import { config } from '../../config/config';

// Initialize the RdLogger with configuration from our app config
const rdLogger = new RdLogger({
  // Map configuration settings
  level: config.logging.level as LogLevel,
  prettyPrint: config.logging.prettyPrint || false,
  // Add other configuration options from RdLogger as needed
});

// Provide the same interface as before but use the new logger
export const logger = {
  debug(msg: string, ctx?: Record<string, any>) { rdLogger.debug(msg, ctx); },
  info(msg: string, ctx?: Record<string, any>) { rdLogger.info(msg, ctx); },
  warn(msg: string, ctx?: Record<string, any>) { rdLogger.warn(msg, ctx); },
  error(msg: string, ctx?: Record<string, any>) { rdLogger.error(msg, ctx); },
  fatal(msg: string, ctx?: Record<string, any>) { rdLogger.error(msg, ctx); }, // Note: RdLogger might not have 'fatal', so using 'error'

  // Log an error object directly
  logError(msg: string, error: Error, additionalContext: Record<string, any> = {}) {
    // Call the adapter's error method so spies work
    logger.error(msg, { ...additionalContext, error });
  }
};
