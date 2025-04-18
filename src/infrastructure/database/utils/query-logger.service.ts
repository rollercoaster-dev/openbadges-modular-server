/**
 * Query Logger Service
 *
 * This service provides logging for database queries, with a focus on identifying
 * slow queries for performance optimization.
 */

import { config } from '../../../config/config';
import { logger } from '../../../utils/logging/logger.service';

export interface QueryLogEntry {
  query: string;
  params?: any[];
  duration: number;
  timestamp: string;
  database: string;
}

export class QueryLoggerService {
  private static logs: QueryLogEntry[] = [];
  private static slowQueryThreshold: number = config.database.slowQueryThreshold || 100; // ms
  private static enabled: boolean = config.database.queryLogging !== false;
  private static maxLogs: number = config.database.maxQueryLogs || 1000;

  /**
   * Logs a query execution
   * @param query The SQL query string
   * @param params Query parameters (optional)
   * @param duration Query execution duration in milliseconds
   * @param database Database type (e.g., 'sqlite', 'postgresql')
   */
  static logQuery(query: string, params: any[] | undefined, duration: number, database: string): void {
    if (!this.enabled) return;

    const entry: QueryLogEntry = {
      query,
      params,
      duration,
      timestamp: new Date().toISOString(),
      database
    };

    // Add to logs (with size limit)
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Remove oldest entry
    }

    // Log slow queries using structured logger
    if (duration >= this.slowQueryThreshold) {
      logger.warn(`Slow query detected`, {
        duration: `${duration}ms`,
        database,
        query,
        params: params ? JSON.stringify(params) : undefined
      });
    }

    // Log all queries in development mode
    if (process.env.NODE_ENV === 'development' && process.env.DEBUG_QUERIES === 'true') {
      logger.debug(`Database query executed`, {
        duration: `${duration}ms`,
        database,
        query,
        params: params ? JSON.stringify(params) : undefined
      });
    }
  }

  /**
   * Gets all logged queries
   * @returns Array of query log entries
   */
  static getLogs(): QueryLogEntry[] {
    return this.logs;
  }

  /**
   * Gets slow queries (queries that took longer than the threshold)
   * @param threshold Optional custom threshold in milliseconds
   * @returns Array of slow query log entries
   */
  static getSlowQueries(threshold?: number): QueryLogEntry[] {
    const actualThreshold = threshold || this.slowQueryThreshold;
    return this.logs.filter(log => log.duration >= actualThreshold);
  }

  /**
   * Clears all logs
   */
  static clearLogs(): void {
    this.logs = [];
  }

  /**
   * Sets the slow query threshold
   * @param threshold Threshold in milliseconds
   */
  static setSlowQueryThreshold(threshold: number): void {
    this.slowQueryThreshold = threshold;
  }

  /**
   * Enables or disables query logging
   * @param enabled Whether to enable query logging
   */
  static setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Gets query statistics
   * @returns Query statistics
   */
  static getStats(): {
    totalQueries: number;
    slowQueries: number;
    averageDuration: number;
    maxDuration: number;
    byDatabase: Record<string, { count: number; avgDuration: number }>;
  } {
    if (this.logs.length === 0) {
      return {
        totalQueries: 0,
        slowQueries: 0,
        averageDuration: 0,
        maxDuration: 0,
        byDatabase: {}
      };
    }

    const totalDuration = this.logs.reduce((sum, log) => sum + log.duration, 0);
    const maxDuration = Math.max(...this.logs.map(log => log.duration));
    const slowQueries = this.logs.filter(log => log.duration >= this.slowQueryThreshold).length;

    // Group by database
    const byDatabase: Record<string, { count: number; totalDuration: number }> = {};
    for (const log of this.logs) {
      if (!byDatabase[log.database]) {
        byDatabase[log.database] = { count: 0, totalDuration: 0 };
      }
      byDatabase[log.database].count++;
      byDatabase[log.database].totalDuration += log.duration;
    }

    // Calculate average duration by database
    const byDatabaseStats: Record<string, { count: number; avgDuration: number }> = {};
    for (const [db, stats] of Object.entries(byDatabase)) {
      byDatabaseStats[db] = {
        count: stats.count,
        avgDuration: stats.totalDuration / stats.count
      };
    }

    return {
      totalQueries: this.logs.length,
      slowQueries,
      averageDuration: totalDuration / this.logs.length,
      maxDuration,
      byDatabase: byDatabaseStats
    };
  }
}
