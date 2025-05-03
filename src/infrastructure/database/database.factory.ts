/**
 * Database Factory for Open Badges API
 *
 * This factory is responsible for creating database instances based on configuration.
 * It supports dynamic loading of database modules and provides a unified interface
 * for accessing the database regardless of the underlying implementation.
 */

import { DatabaseInterface } from './interfaces/database.interface';
import { DatabaseModuleInterface } from './interfaces/database-module.interface';
import { SqliteModule } from './modules/sqlite/sqlite.module';
import { PostgresqlModule } from './modules/postgresql/postgresql.module';
import { config } from '@/config/config';
import { logger } from '@utils/logging/logger.service';

export class DatabaseFactory {
  private static modules: Map<string, DatabaseModuleInterface> = new Map();
  private static defaultModule: string | null = null;

  /**
   * Registers a database module with the factory
   * @param module The database module to register
   * @param isDefault Whether this module should be the default
   */
  static registerModule(module: DatabaseModuleInterface, isDefault: boolean = false): void {
    const moduleName = module.getModuleName();
    this.modules.set(moduleName, module);

    if (isDefault || this.defaultModule === null) {
      this.defaultModule = moduleName;
    }
  }

  /**
   * Creates a database instance using the specified module
   * @param moduleName The name of the module to use (optional, uses default if not specified)
   * @param config Configuration options for the database connection
   * @returns A promise that resolves to a DatabaseInterface implementation
   * @throws Error if the specified module is not registered
   */
  static async createDatabase(
    moduleName?: string,
    config: Record<string, unknown> = {}
  ): Promise<DatabaseInterface> {
    const moduleToUse = moduleName || this.defaultModule;

    if (!moduleToUse || !this.modules.has(moduleToUse)) {
      throw new Error(`Database module "${moduleToUse}" is not registered`);
    }

    const module = this.modules.get(moduleToUse)!;
    return module.createDatabase(config);
  }

  /**
   * Gets the list of registered module names
   * @returns Array of registered module names
   */
  static getRegisteredModules(): string[] {
    return Array.from(this.modules.keys());
  }

  /**
   * Gets the default module name
   * @returns The name of the default module, or null if none is set
   */
  static getDefaultModule(): string | null {
    return this.defaultModule;
  }
}

// Get database type from environment/config
let dbType = process.env.DB_TYPE || config.database.type || 'sqlite';

// Validate database type
const supportedDbTypes = ['postgresql', 'sqlite'];
if (!supportedDbTypes.includes(dbType)) {
  logger.error(`Unsupported database type: ${dbType}. Using default (sqlite).`);
  // Explicitly default to 'sqlite' for unsupported types
  dbType = 'sqlite';
}

// Register supported modules
if (dbType === 'postgresql') {
  // Register PostgreSQL as default if configured
  DatabaseFactory.registerModule(new PostgresqlModule(), true);
  DatabaseFactory.registerModule(new SqliteModule());
  logger.info('Using PostgreSQL as the default database');
} else {
  // Register SQLite as default
  DatabaseFactory.registerModule(new SqliteModule(), true);
  DatabaseFactory.registerModule(new PostgresqlModule());
  logger.info('Using SQLite as the default database');
}
