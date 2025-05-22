import { DatabaseModuleInterface } from '../../interfaces/database-module.interface';
import { DatabaseInterface } from '../../interfaces/database.interface';
import { Database } from 'bun:sqlite';
import { SqliteDatabase } from './sqlite.database';
import { logger } from '../../../../utils/logging/logger.service';
// import { sql } from 'drizzle-orm';

/**
 * Configuration interface for SQLite module
 */
export interface SqliteModuleConfig {
  /**
   * Path to SQLite database file, or ":memory:" for in-memory database
   */
  sqliteFile: string;

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
   * Busy timeout in milliseconds
   * @default 5000
   */
  sqliteBusyTimeout: number;

  /**
   * Synchronous mode for SQLite ('OFF', 'NORMAL', 'FULL')
   * @default 'NORMAL'
   */
  sqliteSyncMode: 'OFF' | 'NORMAL' | 'FULL';

  /**
   * Cache size for SQLite in pages
   * @default 10000
   */
  sqliteCacheSize: number;
}

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
  async createDatabase(
    config: Partial<SqliteModuleConfig>
  ): Promise<DatabaseInterface> {
    // Open SQLite database (file or in-memory)
    const filePath = config.sqliteFile?.trim() || ':memory:'; // Default to in-memory if no valid path provided
    const client = new Database(filePath);

    // Apply SQLite optimizations
    this.applySqliteOptimizations(client, config);

    // Wrap in our DatabaseInterface implementation
    // Use the new configuration-based constructor with proper config
    const connectionConfig = {
      maxConnectionAttempts: config.maxConnectionAttempts ?? 3,
      connectionRetryDelayMs: config.connectionRetryDelayMs ?? 1000,
    };
    const sqliteDb = new SqliteDatabase(client, connectionConfig);
    await sqliteDb.connect();
    return sqliteDb;
  }

  /**
   * Applies performance optimizations to SQLite database
   * @param client The SQLite database client
   * @param config Configuration options
   */
  private applySqliteOptimizations(
    client: Database,
    config: Partial<SqliteModuleConfig>
  ): void {
    // Use WAL mode for better concurrency and performance
    // This allows reads and writes to happen concurrently
    client.exec('PRAGMA journal_mode = WAL;');

    // Set busy timeout to avoid SQLITE_BUSY errors
    // This is the time in ms that SQLite will wait if the database is locked
    const busyTimeout =
      config.sqliteBusyTimeout && config.sqliteBusyTimeout > 0
        ? config.sqliteBusyTimeout
        : 5000;
    client.exec(`PRAGMA busy_timeout = ${busyTimeout};`);

    // Set synchronous mode to NORMAL for better performance
    // FULL is safer but slower, OFF is fastest but risks corruption on power loss
    const syncMode = config.sqliteSyncMode || 'NORMAL';
    client.exec(`PRAGMA synchronous = ${syncMode};`);

    // Increase cache size for better performance (default is 2000 pages)
    const cacheSize =
      config.sqliteCacheSize && config.sqliteCacheSize > 0
        ? config.sqliteCacheSize
        : 10000;
    client.exec(`PRAGMA cache_size = ${cacheSize};`);

    // Enable foreign keys (they're disabled by default in SQLite)
    client.exec('PRAGMA foreign_keys = ON;');

    // Set temp store to memory for better performance
    client.exec('PRAGMA temp_store = MEMORY;');

    // Create custom indexes for JSON fields (if not exists)
    this.createCustomIndexes(client);

    // Log optimizations in development mode
    if (process.env.NODE_ENV !== 'production') {
      logger.info('SQLite optimizations applied:', {
        journalMode: 'WAL',
        busyTimeout,
        syncMode,
        cacheSize,
        foreignKeys: 'ON',
        tempStore: 'MEMORY',
        customIndexes: true,
      });
    }
  }

  /**
   * Creates custom indexes for JSON fields and other complex queries
   * @param client The SQLite database client
   */
  private createCustomIndexes(client: Database): void {
    try {
      // Check if tables exist before creating indexes
      const tables = client
        .query("SELECT name FROM sqlite_master WHERE type='table'")
        .all();
      const tableNames = tables.map((t: { name: string }) => t.name);

      // Only create indexes if tables exist
      if (tableNames.includes('assertions')) {
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
      }

      if (tableNames.includes('badge_classes')) {
        // Create index for badge class tags
        // This allows for efficient lookups by tags
        client.exec(`
          CREATE INDEX IF NOT EXISTS badge_class_tags_idx
          ON badge_classes (tags);
        `);
      }
    } catch (error) {
      // Log error but don't fail initialization
      logger.warn('Error creating custom indexes', {
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
