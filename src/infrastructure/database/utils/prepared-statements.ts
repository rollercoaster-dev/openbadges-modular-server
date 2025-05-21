/**
 * Prepared Statement Manager
 *
 * This utility manages prepared statements for database queries to improve performance.
 */

import { config } from '@/config/config';
import { QueryLoggerService } from './query-logger.service';
import { logger } from '@/utils/logging/logger.service';

// Database client types
type PostgresClient = {
  query: (sql: string, params?: unknown[]) => Promise<unknown>;
};

type SqliteStatement = {
  all: (...params: unknown[]) => unknown[];
  run: (...params: unknown[]) => { changes: number; lastInsertRowid?: number };
};

type SqliteClient = {
  prepare: (sql: string) => SqliteStatement;
};

// Type for prepared statement functions
export type PreparedStatementFn<T = unknown> = (
  ...args: unknown[]
) => Promise<T>;

// Interface for prepared statement cache
interface PreparedStatementCache {
  [key: string]: {
    fn: PreparedStatementFn;
    usageCount: number;
    lastUsed: number;
  };
}

export class PreparedStatementManager {
  private static cache: PreparedStatementCache = {};
  private static enabled: boolean =
    config.database.usePreparedStatements !== false;

  /**
   * Prepares a statement for PostgreSQL
   * @param client PostgreSQL client
   * @param name Statement name
   * @param query SQL query
   * @param types Parameter types (optional)
   * @returns Prepared statement function
   */
  static preparePostgres<T = unknown>(
    client: PostgresClient,
    name: string,
    query: string,
    // Types parameter is reserved for future use when implementing proper type handling
    _types?: unknown[]
  ): PreparedStatementFn<T> {
    if (!this.enabled) {
      // If prepared statements are disabled, just execute the query directly
      return async (...params: unknown[]) => {
        const startTime = Date.now();
        try {
          const result = await client.query(query, params);
          const duration = Date.now() - startTime;
          QueryLoggerService.logQuery(
            `DIRECT: ${query}`,
            params,
            duration,
            'postgresql'
          );
          return result as T;
        } catch (error) {
          const duration = Date.now() - startTime;
          QueryLoggerService.logQuery(
            `ERROR: ${query}`,
            params,
            duration,
            'postgresql'
          );
          throw error;
        }
      };
    }

    // Check if we already have this prepared statement
    if (this.cache[name]) {
      return this.cache[name].fn as PreparedStatementFn<T>;
    }

    // Prepare the statement
    try {
      // This is a simplified implementation - in a real application, you would
      // use the actual prepared statement API of your PostgreSQL client
      const preparedFn = async (...params: unknown[]) => {
        const startTime = Date.now();
        try {
          // In a real implementation, you would use the prepared statement
          // For now, we'll just execute the query directly
          const result = await client.query(query, params);
          const duration = Date.now() - startTime;
          QueryLoggerService.logQuery(
            `PREPARED ${name}: ${query}`,
            params,
            duration,
            'postgresql'
          );

          // Update usage statistics
          if (this.cache[name]) {
            this.cache[name].usageCount++;
            this.cache[name].lastUsed = Date.now();
          }

          return result;
        } catch (error) {
          const duration = Date.now() - startTime;
          QueryLoggerService.logQuery(
            `ERROR PREPARED ${name}: ${query}`,
            params,
            duration,
            'postgresql'
          );
          throw error;
        }
      };

      // Cache the prepared statement
      this.cache[name] = {
        fn: preparedFn,
        usageCount: 0,
        lastUsed: Date.now(),
      };

      return preparedFn as PreparedStatementFn<T>;
    } catch (error) {
      logger.logError(`Failed to prepare statement`, error, { name, query });

      // Fallback to direct query execution
      return async (...params: unknown[]) => {
        const startTime = Date.now();
        try {
          const result = await client.query(query, params);
          const duration = Date.now() - startTime;
          QueryLoggerService.logQuery(
            `FALLBACK ${name}: ${query}`,
            params,
            duration,
            'postgresql'
          );
          return result as T;
        } catch (error) {
          const duration = Date.now() - startTime;
          QueryLoggerService.logQuery(
            `ERROR FALLBACK ${name}: ${query}`,
            params,
            duration,
            'postgresql'
          );
          throw error;
        }
      };
    }
  }

  /**
   * Prepares a statement for SQLite
   * @param client SQLite client
   * @param name Statement name
   * @param query SQL query
   * @returns Prepared statement function
   */
  static prepareSqlite<T = unknown>(
    client: SqliteClient,
    name: string,
    query: string
  ): PreparedStatementFn<T> {
    if (!this.enabled) {
      // If prepared statements are disabled, just execute the query directly
      return async (...params: unknown[]) => {
        const startTime = Date.now();
        try {
          // For SQLite, we need to determine if this is a query or an execution
          let result;
          if (query.trim().toLowerCase().startsWith('select')) {
            result = client.prepare(query).all(...params);
          } else {
            result = client.prepare(query).run(...params);
          }
          const duration = Date.now() - startTime;
          QueryLoggerService.logQuery(query, params, duration, 'sqlite');
          return result as T;
        } catch (error) {
          const duration = Date.now() - startTime;
          QueryLoggerService.logQuery(
            `ERROR: ${query}`,
            params,
            duration,
            'sqlite'
          );
          throw error;
        }
      };
    }

    // Check if we already have this prepared statement
    if (this.cache[name]) {
      return this.cache[name].fn as PreparedStatementFn<T>;
    }

    // Prepare the statement
    try {
      // For SQLite, we can actually prepare the statement
      const stmt = client.prepare(query);

      const preparedFn = async (...params: unknown[]) => {
        const startTime = Date.now();
        try {
          // Determine if this is a query or an execution
          let result;
          if (query.trim().toLowerCase().startsWith('select')) {
            result = stmt.all(...params);
          } else {
            result = stmt.run(...params);
          }
          const duration = Date.now() - startTime;
          QueryLoggerService.logQuery(
            `PREPARED ${name}: ${query}`,
            params,
            duration,
            'sqlite'
          );

          // Update usage statistics
          if (this.cache[name]) {
            this.cache[name].usageCount++;
            this.cache[name].lastUsed = Date.now();
          }

          return result;
        } catch (error) {
          const duration = Date.now() - startTime;
          QueryLoggerService.logQuery(
            `ERROR PREPARED ${name}: ${query}`,
            params,
            duration,
            'sqlite'
          );
          throw error;
        }
      };

      // Cache the prepared statement
      this.cache[name] = {
        fn: preparedFn,
        usageCount: 0,
        lastUsed: Date.now(),
      };

      return preparedFn as PreparedStatementFn<T>;
    } catch (error) {
      logger.logError(`Failed to prepare statement`, error, { name, query });

      // Fallback to direct query execution
      return async (...params: unknown[]) => {
        const startTime = Date.now();
        try {
          // For SQLite, we need to determine if this is a query or an execution
          let result;
          if (query.trim().toLowerCase().startsWith('select')) {
            result = client.prepare(query).all(...params);
          } else {
            result = client.prepare(query).run(...params);
          }
          const duration = Date.now() - startTime;
          QueryLoggerService.logQuery(
            `FALLBACK ${name}: ${query}`,
            params,
            duration,
            'sqlite'
          );
          return result as T;
        } catch (error) {
          const duration = Date.now() - startTime;
          QueryLoggerService.logQuery(
            `ERROR FALLBACK ${name}: ${query}`,
            params,
            duration,
            'sqlite'
          );
          throw error;
        }
      };
    }
  }

  /**
   * Gets statistics about prepared statements
   * @returns Statistics about prepared statements
   */
  static getStats(): {
    totalPreparedStatements: number;
    totalUsageCount: number;
    mostUsed: { name: string; usageCount: number }[];
    leastUsed: { name: string; usageCount: number }[];
  } {
    const statements = Object.entries(this.cache).map(([name, info]) => ({
      name,
      usageCount: info.usageCount,
      lastUsed: info.lastUsed,
    }));

    const totalUsageCount = statements.reduce(
      (sum, stmt) => sum + stmt.usageCount,
      0
    );

    // Sort by usage count (descending)
    const sortedByUsage = [...statements].sort(
      (a, b) => b.usageCount - a.usageCount
    );

    return {
      totalPreparedStatements: statements.length,
      totalUsageCount,
      mostUsed: sortedByUsage
        .slice(0, 5)
        .map((stmt) => ({ name: stmt.name, usageCount: stmt.usageCount })),
      leastUsed: sortedByUsage
        .slice(-5)
        .map((stmt) => ({ name: stmt.name, usageCount: stmt.usageCount })),
    };
  }

  /**
   * Clears the prepared statement cache
   */
  static clearCache(): void {
    this.cache = {};
  }
}
