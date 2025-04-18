/**
 * Health Check Service
 *
 * This service provides health check functionality for the application,
 * including database connection status and performance metrics.
 */

import { DatabaseFactory } from '../../infrastructure/database/database.factory';
import { CacheFactory } from '../../infrastructure/cache/cache.factory';
import { QueryLoggerService } from '../../infrastructure/database/utils/query-logger.service';
import { PreparedStatementManager } from '../../infrastructure/database/utils/prepared-statements';
import { config } from '../../config/config';

export interface HealthCheckResult {
  status: 'ok' | 'error' | 'degraded';
  timestamp: string;
  uptime: number;
  database: {
    type: string;
    connected: boolean;
    responseTime?: string;
    error?: string;
    metrics?: Record<string, any>;
  };
  cache?: {
    enabled: boolean;
    stats?: Record<string, any>;
  };
  queries?: {
    enabled: boolean;
    stats?: Record<string, any>;
    slowQueries?: Array<{
      query: string;
      duration: number;
      timestamp: string;
    }>;
    preparedStatements?: Record<string, any>;
  };
  memory: {
    rss: string;
    heapTotal: string;
    heapUsed: string;
    external?: string;
    arrayBuffers?: string;
  };
  environment: string;
  version: string;
}

export class HealthCheckService {
  /**
   * Performs a health check of the application
   * @returns Health check result
   */
  static async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const dbType = config.database.type;

    try {
      // Check database connection
      const db = await DatabaseFactory.createDatabase(dbType);
      const isConnected = db.isConnected();

      if (!isConnected) {
        await db.connect();
      }

      // Get database metrics
      const dbMetrics = await this.getDatabaseMetrics(db, dbType);
      const dbResponseTime = Date.now() - startTime;

      // Get cache metrics
      const cacheEnabled = config.cache?.enabled !== false;
      const cacheStats = cacheEnabled ? CacheFactory.getAllCacheStats() : {};

      // Get query metrics
      const queryLoggingEnabled = config.database.queryLogging !== false;
      const queryStats = queryLoggingEnabled ? QueryLoggerService.getStats() : {};
      const slowQueries = queryLoggingEnabled ? QueryLoggerService.getSlowQueries().slice(0, 10).map(q => ({
        query: q.query,
        duration: q.duration,
        timestamp: q.timestamp
      })) : [];
      const preparedStatementStats = queryLoggingEnabled ? PreparedStatementManager.getStats() : {};

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: {
          type: dbType,
          connected: db.isConnected(),
          responseTime: `${dbResponseTime}ms`,
          metrics: dbMetrics
        },
        cache: {
          enabled: cacheEnabled,
          stats: cacheStats
        },
        queries: {
          enabled: queryLoggingEnabled,
          stats: queryStats,
          slowQueries,
          preparedStatements: preparedStatementStats
        },
        memory: this.getMemoryMetrics(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '0.0.0'
      };
    } catch (error) {
      // Get cache metrics even if database connection fails
      const cacheEnabled = config.cache?.enabled !== false;
      const cacheStats = cacheEnabled ? CacheFactory.getAllCacheStats() : {};

      // Get query metrics even if database connection fails
      const queryLoggingEnabled = config.database.queryLogging !== false;
      const queryStats = queryLoggingEnabled ? QueryLoggerService.getStats() : {};
      const slowQueries = queryLoggingEnabled ? QueryLoggerService.getSlowQueries().slice(0, 10).map(q => ({
        query: q.query,
        duration: q.duration,
        timestamp: q.timestamp
      })) : [];
      const preparedStatementStats = queryLoggingEnabled ? PreparedStatementManager.getStats() : {};

      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        database: {
          type: dbType,
          connected: false,
          error: error.message
        },
        cache: {
          enabled: cacheEnabled,
          stats: cacheStats
        },
        queries: {
          enabled: queryLoggingEnabled,
          stats: queryStats,
          slowQueries,
          preparedStatements: preparedStatementStats
        },
        memory: this.getMemoryMetrics(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '0.0.0'
      };
    }
  }

  /**
   * Gets memory metrics for the application
   * @returns Memory metrics
   */
  private static getMemoryMetrics() {
    const memoryUsage = process.memoryUsage();
    return {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
      arrayBuffers: `${Math.round(memoryUsage.arrayBuffers / 1024 / 1024)}MB`
    };
  }

  /**
   * Gets database metrics
   * @param db Database instance
   * @param dbType Database type
   * @returns Database metrics
   */
  private static async getDatabaseMetrics(db: any, dbType: string): Promise<Record<string, any>> {
    const metrics: Record<string, any> = {};

    try {
      if (dbType === 'sqlite') {
        // Get SQLite metrics
        const client = (db as any).db?.session?.client;
        if (client) {
          // Get SQLite pragma values
          const pragmas = [
            'journal_mode',
            'synchronous',
            'cache_size',
            'page_size',
            'auto_vacuum',
            'busy_timeout',
            'foreign_keys',
            'temp_store'
          ];

          for (const pragma of pragmas) {
            try {
              const result = client.prepare(`PRAGMA ${pragma}`).get();
              metrics[pragma] = result[pragma] || result[Object.keys(result)[0]];
            } catch {
              metrics[pragma] = 'error';
            }
          }

          // Get table counts
          try {
            const tables = client.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
            const tableCounts: Record<string, number> = {};

            for (const table of tables) {
              const name = table.name;
              if (!name.startsWith('sqlite_')) {
                const count = client.prepare(`SELECT COUNT(*) as count FROM ${name}`).get();
                tableCounts[name] = count.count;
              }
            }

            metrics.tableCounts = tableCounts;
          } catch {
            metrics.tableCounts = 'error';
          }
        }
      } else if (dbType === 'postgresql') {
        // For PostgreSQL, we would add specific metrics here
        metrics.connectionPool = 'Not implemented';
      }

      return metrics;
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Performs a deep health check of the application
   * This is a more comprehensive check that includes database queries
   * @returns Health check result
   */
  static async deepCheck(): Promise<HealthCheckResult & { checks: Record<string, any> }> {
    const basicCheck = await this.check();
    const checks: Record<string, any> = {};

    try {
      const db = await DatabaseFactory.createDatabase(config.database.type);

      // Check if we can read from each table
      const tables = ['issuers', 'badge_classes', 'assertions'];
      for (const table of tables) {
        const startTime = Date.now();
        try {
          if (config.database.type === 'sqlite') {
            const client = (db as any).db?.session?.client;
            if (client) {
              client.prepare(`SELECT COUNT(*) FROM ${table}`).get();
              checks[`read_${table}`] = {
                status: 'ok',
                responseTime: `${Date.now() - startTime}ms`
              };
            }
          } else {
            // For PostgreSQL, we would use the pg client
            checks[`read_${table}`] = { status: 'not_implemented' };
          }
        } catch (error) {
          checks[`read_${table}`] = {
            status: 'error',
            error: error.message
          };
        }
      }

      return {
        ...basicCheck,
        checks
      };
    } catch (error) {
      return {
        ...basicCheck,
        checks: {
          error: error.message
        }
      };
    }
  }
}
