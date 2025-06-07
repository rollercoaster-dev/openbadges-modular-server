/**
 * PostgreSQL Database Types
 *
 * Type definitions for PostgreSQL database operations, connections, and configurations.
 */

import type { drizzle } from 'drizzle-orm/postgres-js';
import type postgres from 'postgres';
import { Shared } from 'openbadges-types';

/**
 * PostgreSQL database client wrapper
 */
export interface PostgresDatabaseClient {
  db: ReturnType<typeof drizzle>;
  client: postgres.Sql;
}

/**
 * PostgreSQL connection configuration
 */
export interface PostgresConnectionConfig {
  connectionString: string;
  maxConnections?: number;
  idleTimeout?: number;
  connectTimeout?: number;
  maxLifetime?: number;
  ssl?: boolean | postgres.Options<{}>['ssl'];
}

/**
 * PostgreSQL connection state
 */
export type PostgresConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'closed';

/**
 * PostgreSQL operation context for logging and monitoring
 */
export interface PostgresOperationContext {
  operation: string;
  entityType: PostgresEntityType;
  entityId?: Shared.IRI;
  startTime: number;
}

/**
 * PostgreSQL entity types
 */
export type PostgresEntityType =
  | 'issuer'
  | 'badgeClass'
  | 'assertion'
  | 'user'
  | 'apiKey'
  | 'platform'
  | 'platformUser'
  | 'userAssertion'
  | 'statusList';

/**
 * PostgreSQL query metrics
 */
export interface PostgresQueryMetrics {
  duration: number;
  rowsAffected: number;
  queryType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'UNKNOWN';
  tableName: string;
}

/**
 * PostgreSQL database health information
 */
export interface PostgresDatabaseHealth {
  connected: boolean;
  responseTime: number;
  uptime: number;
  connectionAttempts: number;
  lastError?: Error;
  configuration: {
    maxConnections?: number;
    activeConnections?: number;
    idleConnections?: number;
    version?: string;
  };
}

/**
 * PostgreSQL connection error
 */
export interface PostgresConnectionError extends Error {
  code?: string;
  detail?: string;
  hint?: string;
  position?: string;
  internalPosition?: string;
  internalQuery?: string;
  where?: string;
  schema?: string;
  table?: string;
  column?: string;
  dataType?: string;
  constraint?: string;
}

/**
 * PostgreSQL pagination parameters
 */
export interface PostgresPaginationParams {
  limit?: number;
  offset?: number;
}

/**
 * Default pagination settings
 */
export const DEFAULT_POSTGRES_PAGINATION = {
  limit: 50,
  offset: 0,
} as const;

/**
 * Maximum pagination limit to prevent memory issues
 */
export const MAX_POSTGRES_PAGINATION_LIMIT = 1000;

/**
 * PostgreSQL transaction type
 */
export type PostgresTransaction = Parameters<
  Parameters<ReturnType<typeof drizzle>['transaction']>[0]
>[0];

/**
 * Factory function to create PostgreSQL connection config with defaults
 */
export function createPostgresConnectionConfig(
  input: Partial<PostgresConnectionConfig> & { connectionString: string }
): PostgresConnectionConfig {
  return {
    connectionString: input.connectionString,
    maxConnections: input.maxConnections ?? 20,
    idleTimeout: input.idleTimeout ?? 30,
    connectTimeout: input.connectTimeout ?? 10,
    maxLifetime: input.maxLifetime ?? 3600, // 1 hour
    ssl: input.ssl ?? false,
  };
}
