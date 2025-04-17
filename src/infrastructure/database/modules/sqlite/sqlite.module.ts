import { DatabaseModuleInterface } from '../../interfaces/database-module.interface';
import { DatabaseInterface } from '../../interfaces/database.interface';
import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { SqliteDatabase } from './sqlite.database';
import { sql } from 'drizzle-orm';

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

    // Apply SQLite optimizations
    this.applySqliteOptimizations(client, config);

    // Initialize Drizzle ORM over SQLite (bun:sqlite adapter)
    const db = drizzle(client);

    // Wrap in our DatabaseInterface implementation
    const sqliteDb = new SqliteDatabase(db);
    await sqliteDb.connect();
    return sqliteDb;
  }

  /**
   * Applies performance optimizations to SQLite database
   * @param client The SQLite database client
   * @param config Configuration options
   */
  private applySqliteOptimizations(client: Database, config: Record<string, any>): void {
    // Use WAL mode for better concurrency and performance
    // This allows reads and writes to happen concurrently
    client.exec('PRAGMA journal_mode = WAL;');

    // Set busy timeout to avoid SQLITE_BUSY errors
    // This is the time in ms that SQLite will wait if the database is locked
    const busyTimeout = config.sqliteBusyTimeout || 5000;
    client.exec(`PRAGMA busy_timeout = ${busyTimeout};`);

    // Set synchronous mode to NORMAL for better performance
    // FULL is safer but slower, OFF is fastest but risks corruption on power loss
    const syncMode = config.sqliteSyncMode || 'NORMAL';
    client.exec(`PRAGMA synchronous = ${syncMode};`);

    // Increase cache size for better performance (default is 2000 pages)
    const cacheSize = config.sqliteCacheSize || 10000;
    client.exec(`PRAGMA cache_size = ${cacheSize};`);

    // Enable foreign keys (they're disabled by default in SQLite)
    client.exec('PRAGMA foreign_keys = ON;');

    // Set temp store to memory for better performance
    client.exec('PRAGMA temp_store = MEMORY;');

    // Create custom indexes for JSON fields (if not exists)
    this.createCustomIndexes(client);

    // Log optimizations in development mode
    if (process.env.NODE_ENV !== 'production') {
      console.log('SQLite optimizations applied:', {
        journalMode: 'WAL',
        busyTimeout,
        syncMode,
        cacheSize,
        foreignKeys: 'ON',
        tempStore: 'MEMORY',
        customIndexes: true
      });
    }
  }

  /**
   * Creates custom indexes for JSON fields and other complex queries
   * @param client The SQLite database client
   */
  private createCustomIndexes(client: Database): void {
    try {
      // Create index for recipient email in assertions table
      // This allows for efficient lookups by recipient email
      client.exec(`
        CREATE INDEX IF NOT EXISTS assertion_recipient_email_idx
        ON assertions (json_extract(recipient, '$.email'));
      `);

      // Create index for recipient identity in assertions table
      // This allows for efficient lookups by recipient identity
      client.exec(`
        CREATE INDEX IF NOT EXISTS assertion_recipient_identity_idx
        ON assertions (json_extract(recipient, '$.identity'));
      `);

      // Create index for recipient type in assertions table
      // This allows for efficient lookups by recipient type
      client.exec(`
        CREATE INDEX IF NOT EXISTS assertion_recipient_type_idx
        ON assertions (json_extract(recipient, '$.type'));
      `);

      // Create index for badge class tags
      // This allows for efficient lookups by tags
      client.exec(`
        CREATE INDEX IF NOT EXISTS badge_class_tags_idx
        ON badge_classes (tags);
      `);
    } catch (error) {
      // Log error but don't fail initialization
      console.warn('Error creating custom indexes:', error);
    }
  }
}