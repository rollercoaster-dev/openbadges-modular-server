/**
 * SQLite Database Type Definitions
 *
 * This file provides strict type definitions for the SQLite database implementation,
 * ensuring type safety throughout the database layer.
 */

import { Shared, OB2, OB3 } from 'openbadges-types';
import { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import type { Database } from 'bun:sqlite';

/**
 * SQLite database client wrapper with type safety
 */
export interface SqliteDatabaseClient {
  db: BunSQLiteDatabase<Record<string, unknown>>;
  client: Database;
}

/**
 * Configuration for SQLite database connections
 */
export interface SqliteConnectionConfig {
  /**
   * Maximum number of connection attempts before failing
   * @default 3
   */
  maxConnectionAttempts: number;

  /**
   * Delay in milliseconds between connection retry attempts
   * @default 1000
   */
  connectionRetryDelayMs: number;

  /**
   * CRITICAL SETTING: SQLite busy timeout in milliseconds
   * Controls how long SQLite will wait when a database is locked before returning SQLITE_BUSY
   * Critical for handling concurrent connections properly
   */
  sqliteBusyTimeout: number;

  /**
   * CRITICAL SETTING: SQLite synchronous mode
   * Controls how aggressively SQLite writes data to disk
   * - 'OFF': Fastest but risks data corruption if power is lost
   * - 'NORMAL': Good balance of safety and performance (recommended)
   * - 'FULL': Safest but slowest option
   */
  sqliteSyncMode: 'OFF' | 'NORMAL' | 'FULL';

  /**
   * OPTIONAL SETTING: SQLite cache size in pages
   * Affects performance but not critical for operation
   * @default 10000
   */
  sqliteCacheSize?: number;
}

/**
 * Partial configuration for SQLite database connections with defaults
 */
export interface SqliteConnectionConfigInput {
  /**
   * Maximum number of connection attempts before failing
   * @default 3
   */
  maxConnectionAttempts?: number;

  /**
   * Delay in milliseconds between connection retry attempts
   * @default 1000
   */
  connectionRetryDelayMs?: number;

  /**
   * CRITICAL SETTING: SQLite busy timeout in milliseconds
   * Controls how long SQLite will wait when a database is locked before returning SQLITE_BUSY
   * Critical for handling concurrent connections properly
   * @default 5000
   */
  sqliteBusyTimeout?: number;

  /**
   * CRITICAL SETTING: SQLite synchronous mode
   * Controls how aggressively SQLite writes data to disk
   * - 'OFF': Fastest but risks data corruption if power is lost
   * - 'NORMAL': Good balance of safety and performance (recommended)
   * - 'FULL': Safest but slowest option
   * @default 'NORMAL'
   */
  sqliteSyncMode?: 'OFF' | 'NORMAL' | 'FULL';

  /**
   * OPTIONAL SETTING: SQLite cache size in pages
   * Affects performance but not critical for operation
   * @default 10000
   */
  sqliteCacheSize?: number;
}

/**
 * Creates a complete SQLite connection config with validated defaults
 */
export function createSqliteConnectionConfig(
  input: SqliteConnectionConfigInput = {}
): SqliteConnectionConfig {
  return {
    maxConnectionAttempts: Math.max(1, input.maxConnectionAttempts ?? 3),
    connectionRetryDelayMs: Math.max(100, input.connectionRetryDelayMs ?? 1000),
    sqliteBusyTimeout: Math.max(1000, input.sqliteBusyTimeout ?? 5000),
    sqliteSyncMode: input.sqliteSyncMode ?? 'NORMAL',
    sqliteCacheSize: input.sqliteCacheSize,
  };
}

/**
 * Database health check information with detailed configuration status
 */
export interface SqliteDatabaseHealth {
  connected: boolean;
  responseTime: number;
  lastError?: Error;
  connectionAttempts: number;
  uptime: number;

  // SQLite configuration status information
  configuration?: {
    busyTimeout?: number;
    syncMode?: string;
    cacheSize?: number;
    journalMode?: string;
    foreignKeys?: boolean;
    memoryUsage?: number;
    appliedSettings: {
      busyTimeout: boolean;
      syncMode: boolean;
      cacheSize: boolean;
      foreignKeys: boolean;
      tempStore: boolean;
    };
  };
}

/**
 * Connection state management
 */
export type SqliteConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'closed';

/**
 * Database record types that match the schema exactly
 */
export interface SqliteIssuerRecord {
  id: string;
  name: string;
  url: string;
  email: string | null;
  description: string | null;
  image: string | null;
  publicKey: string | null;
  createdAt: number;
  updatedAt: number;
  additionalFields: string | null;
}

export interface SqliteBadgeClassRecord {
  id: string;
  issuerId: string;
  name: string;
  description: string;
  image: string;
  criteria: string;
  alignment: string | null;
  tags: string | null;
  createdAt: number;
  updatedAt: number;
  additionalFields: string | null;
}

export interface SqliteAssertionRecord {
  id: string;
  badgeClassId: string;
  recipient: string;
  issuedOn: number;
  expires: number | null;
  evidence: string | null;
  verification: string | null;
  revoked: number | null;
  revocationReason: string | null;
  createdAt: number;
  updatedAt: number;
  additionalFields: string | null;
}

/**
 * Type conversion result wrapper for safe operations
 */
export interface TypeConversionResult<T> {
  success: boolean;
  data: T | null;
  error?: string;
}

/**
 * Query performance metrics
 */
export interface SqliteQueryMetrics {
  duration: number;
  rowsAffected: number;
  queryType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  tableName?: string;
}

/**
 * Query result wrapper with metadata
 */
export interface SqliteQueryResult<T> {
  data: T[];
  metrics: SqliteQueryMetrics;
}

/**
 * Image type union for OpenBadges compatibility
 */
export type OpenBadgesImageType =
  | Shared.IRI
  | Shared.OB3ImageObject
  | OB2.Image
  | string;

/**
 * Recipient type union for OpenBadges compatibility
 */
export type OpenBadgesRecipientType =
  | OB2.IdentityObject
  | OB3.CredentialSubject;

/**
 * Verification type union for OpenBadges compatibility
 */
export type OpenBadgesVerificationType = OB2.VerificationObject | OB3.Proof;

/**
 * Evidence type union for OpenBadges compatibility
 */
export type OpenBadgesEvidenceType = OB2.Evidence[] | OB3.Evidence[];

/**
 * Criteria type union for OpenBadges compatibility
 */
export type OpenBadgesCriteriaType = OB2.Criteria | OB3.Criteria;

/**
 * Alignment type union for OpenBadges compatibility
 */
export type OpenBadgesAlignmentType = OB2.AlignmentObject[] | OB3.Alignment[];

/**
 * Database operation context for logging and debugging
 */
export interface SqliteOperationContext {
  operation: string;
  entityType: 'issuer' | 'badgeClass' | 'assertion';
  entityId?: Shared.IRI;
  startTime: number;
  metadata?: Record<string, unknown>;
}

/**
 * Error types specific to SQLite operations
 */
export class SqliteConnectionError extends Error {
  constructor(message: string, public readonly attempts: number) {
    super(message);
    this.name = 'SqliteConnectionError';
  }
}

export class SqliteTypeConversionError extends Error {
  constructor(
    message: string,
    public readonly value: unknown,
    public readonly targetType: string
  ) {
    super(message);
    this.name = 'SqliteTypeConversionError';
  }
}

export class SqliteValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: unknown
  ) {
    super(message);
    this.name = 'SqliteValidationError';
  }
}

/**
 * Repository operation result wrapper
 */
export interface RepositoryOperationResult<T> {
  success: boolean;
  data: T | null;
  error?: Error;
  metrics?: SqliteQueryMetrics;
}

/**
 * Batch operation configuration
 */
export interface SqliteBatchOperationConfig {
  batchSize: number;
  maxConcurrency: number;
  continueOnError: boolean;
}

/**
 * Transaction context for coordinated operations
 */
export interface SqliteTransactionContext {
  id: string;
  startTime: number;
  operations: SqliteOperationContext[];
  rollbackOnError: boolean;
}

/**
 * Configuration for database monitoring
 */
export interface SqliteMonitoringConfig {
  enableQueryLogging: boolean;
  enablePerformanceMetrics: boolean;
  slowQueryThreshold: number;
  maxLoggedQueries: number;
}

/**
 * Type for Drizzle transactions - uses the actual SQLite transaction type
 * This ensures compatibility with the real Drizzle transaction objects
 */
export type DrizzleTransaction = Parameters<
  Parameters<BunSQLiteDatabase<Record<string, unknown>>['transaction']>[0]
>[0];
