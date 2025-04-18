import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { config } from '../../config/config';

/**
 * Enhanced neuro-friendly logger with spaced entries, icons, and colored levels
 * Features:
 * - Multiple log levels (debug, info, warn, error, fatal)
 * - Environment-specific configuration
 * - Optional file output
 * - Stack trace formatting for errors
 * - Context object support with proper handling of complex objects
 */

// Define log levels and their priority (lower number = higher priority)
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4
};

// Define colors for each log level
const levelColors: Record<LogLevel, (text: string) => string> = {
  debug: chalk.blue,
  info: chalk.green,
  warn: chalk.yellow,
  error: chalk.red,
  fatal: chalk.magenta
};

// Define icons for each log level
const levelIcons: Record<LogLevel, string> = {
  debug: '🔍',
  info: '🟢',
  warn: '🟡',
  error: '🔴',
  fatal: '💀'
};

/**
 * Safely stringify objects for logging, handling circular references
 * @param obj Object to stringify
 * @returns String representation of the object
 */
function safeStringify(obj: any): string {
  const seen = new Set();
  return JSON.stringify(obj, (_key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  }, 2);
}

/**
 * Format error objects for logging, including stack traces if configured
 * @param error Error object
 * @returns Formatted error context
 */
function formatError(error: Error): Record<string, string> {
  const errorContext: Record<string, string> = {
    message: error.message
  };

  if (config.logging.includeStackTrace && error.stack) {
    // Format stack trace for better readability
    errorContext.stack = error.stack
      .split('\n')
      .slice(1) // Remove the first line (error message)
      .map(line => line.trim())
      .join('\n');
  }

  return errorContext;
}

/**
 * Ensure directory exists for log file
 */
function ensureLogDirectoryExists(): void {
  if (config.logging.logToFile) {
    const logDir = path.dirname(config.logging.logFilePath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }
}

/**
 * Write log entry to file if configured
 * @param entry Log entry string
 */
function writeToLogFile(entry: string): void {
  if (config.logging.logToFile) {
    try {
      ensureLogDirectoryExists();
      fs.appendFileSync(config.logging.logFilePath, entry + '\n');
    } catch (error) {
      console.error(`Failed to write to log file: ${error.message}`);
    }
  }
}

/**
 * Get a relative time string (e.g., "just now", "2 minutes ago")
 * @param date Date to format
 * @returns Relative time string or null if the time difference is too large
 */
function getRelativeTimeString(date: Date): string | null {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  // Only show relative time for recent events (within the last hour)
  if (diffSeconds < 5) {
    return 'just now';
  } else if (diffSeconds < 60) {
    return `${diffSeconds} seconds ago`;
  } else if (diffSeconds < 3600) {
    const minutes = Math.floor(diffSeconds / 60);
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  }

  return null; // Not recent enough for relative time
}

/**
 * Format a date in a human-readable format
 * @param date Date to format
 * @param use24HourFormat Whether to use 24-hour format
 * @param useRelativeTime Whether to use relative time for recent events
 * @returns Formatted date string
 */
function formatDate(date: Date, use24HourFormat = true, useRelativeTime = true): string {
  // Try relative time first if enabled
  if (useRelativeTime) {
    const relativeTime = getRelativeTimeString(date);
    if (relativeTime) {
      return relativeTime;
    }
  }

  // Otherwise, format as date and time
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const milliseconds = date.getMilliseconds().toString().padStart(3, '0');

  if (use24HourFormat) {
    // 24-hour format
    return `${month} ${day}, ${hours.toString().padStart(2, '0')}:${minutes}:${seconds}.${milliseconds}`;
  } else {
    // 12-hour format with AM/PM
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${month} ${day}, ${hour12}:${minutes}:${seconds}.${milliseconds} ${ampm}`;
  }
}

/**
 * Main logging function with neuro-friendly formatting
 * @param level Log level
 * @param message Log message
 * @param context Additional context (optional)
 */
export function neuroLog(
  level: LogLevel,
  message: string,
  context: Record<string, any> = {}
): void {
  // Check if this log level should be shown based on configuration
  const configuredLevel = config.logging.level as LogLevel;
  if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[configuredLevel]) {
    return;
  }

  const icon = levelIcons[level];
  const now = new Date();
  const isoTimestamp = now.toISOString(); // Keep ISO format for file logs
  const readableTimestamp = formatDate(
    now,
    config.logging.use24HourFormat,
    config.logging.useRelativeTime
  );
  const timestamp = config.logging.prettyPrint ? readableTimestamp : isoTimestamp;
  const colorizedTimestamp = config.logging.colorize ? chalk.gray(timestamp) : timestamp;
  const colorizedLevel = config.logging.colorize ? levelColors[level](level.toUpperCase()) : level.toUpperCase();
  const colorizedMessage = config.logging.colorize ? chalk.whiteBright(message) : message;

  // Process context - handle errors specially
  let processedContext = { ...context };
  if (context.error instanceof Error) {
    processedContext = {
      ...processedContext,
      ...formatError(context.error)
    };
    delete processedContext.error;
  }

  // Create console output with neuro-friendly formatting
  console.log();
  console.log(`${icon}  ${colorizedLevel}  ${colorizedTimestamp}`);
  console.log(`  ➤ ${colorizedMessage}`);

  if (Object.keys(processedContext).length) {
    for (const [key, value] of Object.entries(processedContext)) {
      const formattedValue = typeof value === 'object' && value !== null
        ? safeStringify(value)
        : String(value);

      const colorizedKey = config.logging.colorize ? chalk.gray(key) : key;
      const colorizedValue = config.logging.colorize ? chalk.cyan(formattedValue) : formattedValue;

      console.log(`    • ${colorizedKey}: ${colorizedValue}`);
    }
  }

  const divider = config.logging.colorize ? chalk.dim('────────────────────────────────────') : '────────────────────────────────────';
  console.log(divider);

  // Write to log file if configured
  if (config.logging.logToFile) {
    // Create a plain text version for the file - always use ISO format for machine readability
    let fileEntry = `[${isoTimestamp}] ${level.toUpperCase()}: ${message}`;

    if (Object.keys(processedContext).length) {
      fileEntry += ` | ${safeStringify(processedContext)}`;
    }

    writeToLogFile(fileEntry);
  }
}

// Convenience wrappers
export const logger = {
  debug: (msg: string, ctx?: Record<string, any>) => neuroLog('debug', msg, ctx),
  info: (msg: string, ctx?: Record<string, any>) => neuroLog('info', msg, ctx),
  warn: (msg: string, ctx?: Record<string, any>) => neuroLog('warn', msg, ctx),
  error: (msg: string, ctx?: Record<string, any>) => neuroLog('error', msg, ctx),
  fatal: (msg: string, ctx?: Record<string, any>) => neuroLog('fatal', msg, ctx),

  // Log an error object directly
  logError: (msg: string, error: Error, additionalContext: Record<string, any> = {}) => {
    neuroLog('error', msg, { ...additionalContext, error });
  }
};
