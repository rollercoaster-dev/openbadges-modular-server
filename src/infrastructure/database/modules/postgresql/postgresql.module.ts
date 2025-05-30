/**
 * PostgreSQL module factory for Open Badges API
 *
 * This class implements the DatabaseModuleInterface for PostgreSQL.
 * It creates and configures PostgreSQL database instances.
 */

import { DatabaseInterface } from '../../interfaces/database.interface';
import { DatabaseModuleInterface } from '../../interfaces/database-module.interface';
import { PostgresqlDatabase } from './postgresql.database';

export class PostgresqlModule implements DatabaseModuleInterface {
  /**
   * Creates a PostgreSQL database instance
   * @param config Configuration options for the PostgreSQL connection
   * @returns A promise that resolves to a DatabaseInterface implementation
   */
  async createDatabase(
    config: Record<string, unknown>
  ): Promise<DatabaseInterface> {
    // Build connection string from environment variables with secure defaults
    const dbUser = process.env.POSTGRES_USER || 'postgres';
    const dbPassword = process.env.POSTGRES_PASSWORD || '';
    const dbHost = process.env.POSTGRES_HOST || 'localhost';
    const dbPort = process.env.POSTGRES_PORT || '5432';
    const dbName = process.env.POSTGRES_DB || 'openbadges_dev';

    // Construct default connection string from environment variables
    const defaultConnectionString = `postgres://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;

    // Use type-safe config access with runtime guards
    const connectionString =
      (typeof config.connectionString === 'string'
        ? config.connectionString
        : process.env.DATABASE_URL) || defaultConnectionString;

    const dbConfig = {
      connectionString,
      ...config,
    };

    const database = new PostgresqlDatabase(dbConfig);
    await database.connect();
    return database;
  }

  /**
   * Returns the name of this database module
   * @returns The string "postgresql"
   */
  getModuleName(): string {
    return 'postgresql';
  }
}
