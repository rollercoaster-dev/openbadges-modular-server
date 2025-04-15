/**
 * Database Factory for Open Badges API
 * 
 * This factory is responsible for creating database instances based on configuration.
 * It supports dynamic loading of database modules and provides a unified interface
 * for accessing the database regardless of the underlying implementation.
 */

import { DatabaseInterface } from './interfaces/database.interface';
import { DatabaseModuleInterface } from './interfaces/database-module.interface';

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
    config: Record<string, any> = {}
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
