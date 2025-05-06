/**
 * PostgreSQL module factory for Open Badges API
 *
 * This class implements the DatabaseModuleInterface for PostgreSQL.
 * It creates and configures PostgreSQL database instances.
 */

import { DatabaseInterface } from '../../interfaces/database.interface';
import { DatabaseModuleInterface } from '../../interfaces/database-module.interface';
import { PostgresqlDatabase } from './postgresql.database';
import { SensitiveValue } from '@rollercoaster-dev/rd-logger';

export class PostgresqlModule implements DatabaseModuleInterface {
  /**
   * Creates a PostgreSQL database instance
   * @param config Configuration options for the PostgreSQL connection
   * @returns A promise that resolves to a DatabaseInterface implementation
   */
  async createDatabase(config: Record<string, unknown>): Promise<DatabaseInterface> {
    // Set default configuration values if not provided
    // Use SensitiveValue for the default connection string to prevent password logging
    const defaultConnectionString = `postgres://postgres:${SensitiveValue.from('postgres')}@localhost:5432/openbadges`;
    const dbConfig = {
      connectionString: config.connectionString || process.env.DATABASE_URL || defaultConnectionString,
      ...config
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
