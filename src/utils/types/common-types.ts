/**
 * Common type definitions to replace 'any' types throughout the codebase
 */

import { DrizzleError } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';

/**
 * Database client types
 */
export type PostgresClient = PostgresJsDatabase;
export type SQLiteClient = BunSQLiteDatabase;
export type DatabaseClient = PostgresClient | SQLiteClient;

/**
 * Generic database record type
 */
export interface DatabaseRecord {
  [key: string]: unknown;
}

/**
 * Generic database table type that represents Drizzle table objects
 * This type is compatible with both SQLite and PostgreSQL Drizzle tables
 */
export type DatabaseTable = Record<string, unknown>;

/**
 * Generic database query result
 */
export type QueryResult<T = unknown> = T[];

/**
 * Generic database error
 */
export type DatabaseError = DrizzleError | Error;

/**
 * Generic key-value record
 */
export interface KeyValueRecord {
  [key: string]: unknown;
}

/**
 * Generic JSON object
 */
export interface JsonObject {
  [key: string]: JsonValue;
}

/**
 * Generic JSON value
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonObject
  | JsonValue[];

/**
 * HTTP context type
 */
export interface HttpContext {
  request: Request;
  headers: Record<string, string>;
  params: Record<string, string>;
  query: Record<string, string>;
  body?: unknown;
  [key: string]: unknown;
}

/**
 * Generic middleware handler
 */
export type MiddlewareHandler = (
  context: HttpContext
) => Promise<unknown> | unknown;

/**
 * Generic service response
 */
export interface ServiceResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Logger message type
 */
export type LogMessage = string | Error | object;

/**
 * Generic verification result
 */
export interface VerificationResult {
  valid: boolean;
  error?: string;
  details?: Record<string, unknown>;
}
