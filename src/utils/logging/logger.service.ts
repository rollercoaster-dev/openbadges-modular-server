/**
 * Logger service using @rollercoaster-dev/rd-logger
 *
 * This provides a wrapper around the Rollercoaster.dev logger package,
 * exposing the standard logging interface used throughout the application.
 */
import {
  Logger as RdLogger,
  LogLevel,
  QueryLogger as RdQueryLogger, // Renamed to avoid conflict
  DEFAULT_QUERY_LOGGER_CONFIG,
  type QueryLogEntry, // Import the type for return values
} from '@rollercoaster-dev/rd-logger';
import { config } from '../../config/config';

// Declare loggers but initialize lazily
let rdLogger: RdLogger | null = null;
let queryLoggerInstance: RdQueryLogger | null = null;

// Function to get or initialize the main logger instance
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

// Function to get or initialize the query logger instance
const getQueryLoggerInstance = (): RdQueryLogger => {
  if (!queryLoggerInstance) {
    const mainLogger = getLoggerInstance(); // Ensure main logger is initialized
    queryLoggerInstance = new RdQueryLogger(mainLogger, {
      // Use settings from main config
      // Note: rd-logger QueryLogger uses 'enabled' and 'maxLogs' which aren't in our main config yet
      // We'll use its defaults for now but could add them to config.ts if needed.
      slowQueryThreshold: config.database.slowQueryThreshold,
      logDebugQueries: config.logging.logDebugQueries,
      // Use defaults from rd-logger for other options:
      enabled: DEFAULT_QUERY_LOGGER_CONFIG.enabled,
      maxLogs: DEFAULT_QUERY_LOGGER_CONFIG.maxLogs,
    });
  }
  return queryLoggerInstance;
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

// Export the query logger instance
export const queryLogger = {
  // Provide methods that ensure the instance is created before use
  logQuery: (...args: Parameters<RdQueryLogger['logQuery']>): void => getQueryLoggerInstance().logQuery(...args),
  getLogs: (): QueryLogEntry[] => getQueryLoggerInstance().getLogs(),
  getSlowQueries: (...args: Parameters<RdQueryLogger['getSlowQueries']>): QueryLogEntry[] => getQueryLoggerInstance().getSlowQueries(...args),
  clearLogs: (): void => getQueryLoggerInstance().clearLogs(),
  configure: (...args: Parameters<RdQueryLogger['configure']>): void => getQueryLoggerInstance().configure(...args),
  getStats: (): {
    totalQueries: number;
    slowQueries: number;
    averageDuration: number;
    maxDuration: number;
    byDatabase: Record<string, { count: number; avgDuration: number }>;
  } => getQueryLoggerInstance().getStats(),
};
