/**
 * Logger service using @rollercoaster-dev/rd-logger
 *
 * This provides a wrapper around the Rollercoaster.dev logger package,
 * exposing the standard logging interface used throughout the application.
 */
import {
  Logger as RdLogger,
  LogLevel,
  SensitiveValue,
  containsSensitiveData,
  redactSensitiveData
} from '@rollercoaster-dev/rd-logger';
import { config } from '../../config/config';

// Initialize the RdLogger with configuration from our app config
const rdLogger = new RdLogger({
  // Map configuration settings
  level: config.logging.level as LogLevel,
  prettyPrint: config.logging.prettyPrint || false,
  colorize: true,
  includeStackTrace: config.logging.includeStackTrace || false,
  use24HourFormat: true,
  useRelativeTime: true,
  // Add file logging if configured
  logToFile: config.logging.logToFile || false,
  logFilePath: config.logging.logFilePath || './logs/app.log',
});

// Define a type for context objects to avoid using 'any'
type LogContext = Record<string, unknown>;

// Define a type for sensitive data approval
interface SensitiveDataApproval {
  reason: string;
  approvedBy: string;
  expiresAt?: Date;
}

// Provide the same interface as before but use the new logger
export const logger = {
  debug(msg: string, ctx?: LogContext): void { rdLogger.debug(msg, ctx); },
  info(msg: string, ctx?: LogContext): void { rdLogger.info(msg, ctx); },
  warn(msg: string, ctx?: LogContext): void { rdLogger.warn(msg, ctx); },
  error(msg: string, ctx?: LogContext): void { rdLogger.error(msg, ctx); },
  fatal(msg: string, ctx?: LogContext): void { rdLogger.fatal(msg, ctx); },

  // Log an error object directly
  logError(msg: string, error: Error, additionalContext: LogContext = {}): void {
    // Call the adapter's error method so spies work
    logger.error(msg, { ...additionalContext, error });
  },

  // New methods for sensitive data handling
  SensitiveValue,
  containsSensitiveData,
  redactSensitiveData,

  // Log sensitive data with explicit approval
  logSensitiveData(level: LogLevel, msg: string, data: LogContext, approval: SensitiveDataApproval): void {
    rdLogger.logWithSensitiveData(level, msg, data, approval);
  },

  // Configure the logger dynamically
  configure(options: Partial<LogContext>): void {
    rdLogger.configure(options);
  },

  // Set the log level dynamically
  setLevel(level: LogLevel): void {
    rdLogger.setLevel(level);
  },

  // Clean up resources
  cleanup(): void {
    rdLogger.cleanup();
  }
};
