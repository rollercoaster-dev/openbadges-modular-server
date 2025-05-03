/**
 * Type definitions for health check related structures
 * 
 * These types are used in the health check service to provide
 * type safety for database clients, metrics, and results.
 */

/**
 * Database client interface for health checks
 */
export interface DatabaseClient {
  session?: {
    client?: {
      prepare?: (query: string) => {
        get: () => Record<string, unknown>;
        all: () => Array<Record<string, unknown>>;
        run: (params?: unknown) => { changes?: number };
      };
      close?: () => void;
    };
  };
  client?: {
    options?: {
      max?: number;
      idle_timeout?: number;
      connect_timeout?: number;
    };
  };
  db?: {
    session?: {
      client?: unknown;
    };
  };
  isConnected: () => boolean;
  connect: () => Promise<void>;
}

/**
 * Database metrics interface
 */
export interface DatabaseMetrics {
  [key: string]: string | number | boolean | Record<string, unknown> | Array<Record<string, unknown>> | undefined;
}

/**
 * Health check result interface
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
    metrics?: DatabaseMetrics;
  };
  cache?: {
    enabled: boolean;
    stats?: Record<string, unknown>;
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
  checks?: Record<string, unknown>;
}

/**
 * Table information interface
 */
export interface TableInfo {
  name: string;
  columnCount: number;
}

/**
 * Query result interface
 */
export interface QueryResult {
  [key: string]: unknown;
}
