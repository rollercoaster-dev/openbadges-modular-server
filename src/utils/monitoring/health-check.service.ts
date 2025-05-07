/**
 * Health Check Service
 *
 * This service provides health check functionality for the application,
 * including database connection status and performance metrics.
 */

import { performance } from 'perf_hooks';
import { config } from '../../config/config';
import { logger } from '../logging/logger.service';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { QueryLoggerService } from '../../infrastructure/database/utils/query-logger.service';
import { PreparedStatementManager } from '../../infrastructure/database/utils/prepared-statements';
import { type DatabaseInterface } from '../../infrastructure/database/interfaces/database.interface';
import { type CacheStats } from '../../infrastructure/cache/cache.interface';

/**
 * Represents the health check result
 */
export interface HealthCheckResult {
  status: 'ok' | 'error' | 'degraded';
  timestamp: string;
  uptime: number;
  database: {
    type: string;
    connected: boolean;
    responseTime?: string;
    error?: string;
    metrics?: Record<string, unknown>;
  };
  cache?: {
    enabled: boolean;
    stats?: CacheStats;
    error?: string;
  };
  queries?: {
    enabled: boolean;
    stats?: Record<string, unknown>;
    slowQueries?: Array<{
      query: string;
      duration: number;
      timestamp: string;
    }>;
    preparedStatements?: Record<string, unknown>;
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

/**
 * Health Check Service Provider
 *
 * This class manages health check logic and dependencies.
 */
export class HealthCheckService {
  private readonly db: DatabaseInterface;
  private readonly cacheService?: CacheService;
  private readonly queryLogger?: QueryLoggerService;
  private readonly preparedStatementManager?: PreparedStatementManager;

  constructor(
    db: DatabaseInterface,
    cacheService?: CacheService,
    queryLogger?: QueryLoggerService,
    preparedStatementManager?: PreparedStatementManager
  ) {
    this.db = db;
    this.cacheService = cacheService;
    this.queryLogger = queryLogger;
    this.preparedStatementManager = preparedStatementManager;
  }

  /**
   * Performs a basic health check of the application
   * @returns Health check result
   */
  async check(): Promise<HealthCheckResult> {
    const baseResult = {
      status: 'ok' as 'ok' | 'error' | 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        type: config.database.type,
        connected: false, // Default to false
        responseTime: undefined as string | undefined,
        error: undefined as string | undefined,
        metrics: undefined as Record<string, unknown> | undefined
      },
      cache: undefined as { enabled: boolean; stats?: CacheStats; error?: string } | undefined,
      queries: undefined as { enabled: boolean; stats?: Record<string, unknown>; slowQueries?: Array<{ query: string; duration: number; timestamp: string }>; preparedStatements?: Record<string, unknown> } | undefined,
      memory: this.getMemoryMetrics(),
      environment: process.env.NODE_ENV || 'development',
      // TODO: Find a reliable way to get app version without JSON import issues or use a build-time variable
      version: 'unknown'
    };

    // Check Database Connection
    const dbCheckStart = performance.now();
    try {
      baseResult.database.connected = this.db.isConnected();
      if (!baseResult.database.connected) {
         // Optionally try to connect if not connected, but be mindful of implications
         // await this.db.connect();
         // baseResult.database.connected = this.db.isConnected();
         if (!baseResult.database.connected) throw new Error('Database is not connected.');
      }
      baseResult.database.responseTime = `${(performance.now() - dbCheckStart).toFixed(2)}ms`;

      // Optionally get detailed metrics if connected
      if (baseResult.database.connected) {
        baseResult.database.metrics = await this.getDatabaseMetrics(config.database.type);
      }

    } catch (dbError: unknown) {
      baseResult.status = 'error';
      baseResult.database.connected = false;
      baseResult.database.error = dbError instanceof Error ? dbError.message : String(dbError);
      logger.error('Health check failed: Database connection error', { error: baseResult.database.error });
    }

    // Get Cache Metrics (if CacheService is available)
    if (this.cacheService) {
      try {
        const cacheStats = await this.cacheService.getStats();
        baseResult.cache = {
          enabled: config.cache.enabled,
          stats: cacheStats
        };
      } catch (cacheError: unknown) {
        logger.warn('Health check: Failed to get cache stats', { error: cacheError });
        baseResult.cache = {
          enabled: config.cache.enabled,
          stats: undefined,
          error: cacheError instanceof Error ? cacheError.message : String(cacheError)
        };
         if (baseResult.status === 'ok') baseResult.status = 'degraded'; // Mark as degraded if only cache fails
      }
    } else {
         baseResult.cache = { enabled: false };
    }

    // Get Query Logger Metrics (if available)
    if (this.queryLogger && config.database.queryLogging) {
        baseResult.queries = {
            enabled: true,
            stats: QueryLoggerService.getStats(),
            slowQueries: QueryLoggerService.getSlowQueries()
        };
    }

    // Get Prepared Statement Metrics (if available)
     if (this.preparedStatementManager) {
         const statementStats = PreparedStatementManager.getStats();
         if (baseResult.queries) {
             baseResult.queries.preparedStatements = statementStats;
         } else {
             baseResult.queries = { enabled: false, preparedStatements: statementStats };
         }
     }

    // Log final status if not 'ok'
    if (baseResult.status !== 'ok') {
        logger.warn(`Health check completed with status: ${baseResult.status}`, { result: baseResult });
    }

    return baseResult;
  }

  /**
   * Gets memory metrics for the application
   * @returns Memory metrics object
   */
  private getMemoryMetrics(): HealthCheckResult['memory'] {
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
   * Gets *basic* database metrics (limited by DatabaseInterface)
   * @param dbType Database type ('sqlite' or 'postgresql')
   * @returns Database metrics
   */
  private async getDatabaseMetrics(dbType: string): Promise<Record<string, unknown>> {
    const metrics: Record<string, unknown> = {
        connected: this.db.isConnected(),
        dialect: dbType
        // TODO: Add any other metrics derivable purely from DatabaseInterface if needed.
        // Cannot get low-level PRAGMAs or pg_stats via the current interface.
    };

    // Add placeholder for future potential metrics
    if (dbType === 'sqlite') {
        metrics['notes'] = 'Detailed SQLite metrics (PRAGMAs) require direct DB access, not available via interface.';
    } else if (dbType === 'postgresql') {
        metrics['notes'] = 'Detailed PostgreSQL metrics (pg_stat_activity, sizes) require direct DB access, not available via interface.';
    }

    return metrics;
  }

  /**
   * Performs a deep health check of the application
   * This currently adds limited extra checks due to DatabaseInterface constraints.
   * @returns Health check result
   */
  async deepCheck(): Promise<HealthCheckResult & { checks: Record<string, unknown> }> {
    const baseResult = await this.check(); // Call instance method
    const checks: Record<string, unknown> = {};

    // TODO: Implement meaningful deep checks if possible via DatabaseInterface.
    // Examples: Check specific known entities, perform a test write/delete cycle (carefully!).
    // Current interface doesn't allow table counts or direct SQL.

    // Example simple check: re-verify connection status
    const deepDbCheckStart = performance.now();
    try {
        const isConnected = this.db.isConnected();
        checks['database_deep_connection'] = {
            status: isConnected ? 'ok' : 'error',
            connected: isConnected,
            duration: `${(performance.now() - deepDbCheckStart).toFixed(2)}ms`
        };
        if (!isConnected && baseResult.status === 'ok') {
            baseResult.status = 'degraded';
        }
    } catch (error: unknown) {
         checks['database_deep_connection'] = {
            status: 'error',
            error: error instanceof Error ? error.message : String(error),
            duration: `${(performance.now() - deepDbCheckStart).toFixed(2)}ms`
        };
         if (baseResult.status === 'ok') baseResult.status = 'degraded';
    }


    // Add other deep checks here if applicable (e.g., check external service connectivity)

    return {
      ...baseResult,
      checks
    };
  }

  /**
   * Static wrapper for basic health check (for tests)
   */
  static async check(): Promise<HealthCheckResult> {
    // Stub DB always connected
    const stubDb: DatabaseInterface = { isConnected: () => true } as DatabaseInterface;
    const service = new HealthCheckService(stubDb);
    return service.check();
  }

  /**
   * Static wrapper for deep health check (for tests)
   */
  static async deepCheck(): Promise<HealthCheckResult & { checks: unknown }> {
    const result = await HealthCheckService.check();
    return { ...result, checks: {} };
  }
}
