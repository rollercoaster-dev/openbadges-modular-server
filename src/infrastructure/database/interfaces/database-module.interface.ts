/**
 * Database Module Interface for Open Badges API
 *
 * This interface defines the contract for database module factories.
 * Each database module must provide a factory that implements this interface.
 */

import { DatabaseInterface } from './database.interface';

export interface DatabaseModuleInterface {
  /**
   * Creates and returns a database instance that implements the DatabaseInterface
   * @param config Configuration options for the database connection
   * @returns A promise that resolves to a DatabaseInterface implementation
   */
  createDatabase(config: Record<string, unknown>): Promise<DatabaseInterface>;

  /**
   * Returns the name of the database module
   * @returns The name of the database module (e.g., "postgresql", "mongodb")
   */
  getModuleName(): string;
}
