import { DatabaseModuleInterface } from '../../interfaces/database-module.interface';
import { DatabaseInterface } from '../../interfaces/database.interface';
import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { SqliteDatabase } from './sqlite.database';

export class SqliteModule implements DatabaseModuleInterface {
  /**
   * Returns the name of this database module
   */
  getModuleName(): string {
    return 'sqlite';
  }

  /**
   * Creates and returns a DatabaseInterface instance for SQLite using bun:sqlite
   */
  async createDatabase(config: Record<string, any>): Promise<DatabaseInterface> {
    // Open SQLite database (file or in-memory)
    const filePath = config.sqliteFile || ':memory:';
    const client = new Database(filePath);

    // Initialize Drizzle ORM over SQLite (bun:sqlite adapter)
    const db = drizzle(client);

    // Wrap in our DatabaseInterface implementation
    const sqliteDb = new SqliteDatabase(db);
    await sqliteDb.connect();
    return sqliteDb;
  }
} 