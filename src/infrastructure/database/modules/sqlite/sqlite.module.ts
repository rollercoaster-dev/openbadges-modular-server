import { DatabaseModuleInterface } from '../../interfaces/database-module.interface';
import { DatabaseInterface } from '../../interfaces/database.interface';
import { Database } from 'bun:sqlite';
import { SqliteDatabase } from './sqlite.database';
import { logger } from '../../../../utils/logging/logger.service';
import { resolve } from 'path';
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
    config: Partial<SqliteModuleConfig> = {}
  ): Promise<DatabaseInterface> {
    // Open SQLite database (file or in-memory)
    // Resolve to absolute path to avoid multiple handles from different relative paths
    const raw = config.sqliteFile?.trim() ?? '';
    const filePath =
      raw === '' || raw === ':memory:' ? ':memory:' : resolve(raw);
    const client = new Database(filePath);

    // Apply SQLite optimizations
    this.applySqliteOptimizations(client, config);

    // Wrap in our DatabaseInterface implementation with configuration
    // Pass through all SQLite configuration parameters with clear categorization
    const connectionConfig = {
      // Connection retry settings
      maxConnectionAttempts: config.maxConnectionAttempts ?? 3,
      connectionRetryDelayMs: config.connectionRetryDelayMs ?? 1000,
      
      // CRITICAL SQLite settings (important for data integrity and concurrency)
      sqliteBusyTimeout: config.sqliteBusyTimeout ?? 5000,
      sqliteSyncMode: config.sqliteSyncMode ?? 'NORMAL' as const,
      
      // OPTIONAL performance settings (won't halt initialization if they fail)
      sqliteCacheSize: config.sqliteCacheSize,
    };
    const sqliteDb = new SqliteDatabase(client, connectionConfig);
    await sqliteDb.connect();
    return sqliteDb;
  }

  /**
   * Applies performance optimizations to SQLite database
   * 
   * IMPORTANT: This method applies initial connection optimizations,
   * while the connection manager handles ongoing PRAGMA settings.
   * 
   * Some settings are applied here AND passed to the connection manager
   * to ensure they're consistently applied even after connection resets.
   * 
   * @param client The SQLite database client
   * @param config Configuration options
   */
  private applySqliteOptimizations(
    client: Database,
    config: Partial<SqliteModuleConfig>
  ): void {
    try {
      // Track settings for better error reporting
      const appliedSettings: Record<string, any> = {};
      const failedSettings: Array<{ setting: string; error: string }> = [];
      
      // Set journal mode to WAL for better concurrency (CRITICAL)
      try {
        client.exec('PRAGMA journal_mode = WAL;');
        appliedSettings.journalMode = 'WAL';
      } catch (error) {
        const errorMsg = `Failed to set journal_mode to WAL: ${error instanceof Error ? error.message : String(error)}`;
        logger.error(errorMsg);
        failedSettings.push({ setting: 'journal_mode', error: errorMsg });
        // Allow initialization to continue despite this error, as connection manager 
        // will apply critical settings again
      }

      // Set busy timeout (CRITICAL - also passed to connection manager)
      // Ensure minimum timeout of 100ms to prevent immediate failures
      const busyTimeout = Math.max(
        100,
        config.sqliteBusyTimeout && config.sqliteBusyTimeout > 0
          ? config.sqliteBusyTimeout
          : 5000
      );
      try {
        client.exec(`PRAGMA busy_timeout = ${busyTimeout};`);
        appliedSettings.busyTimeout = busyTimeout;
      } catch (error) {
        const errorMsg = `Failed to set busy_timeout: ${error instanceof Error ? error.message : String(error)}`;
        logger.error(errorMsg);
        failedSettings.push({ setting: 'busy_timeout', error: errorMsg });
        // Allow initialization to continue as connection manager will apply this critical setting again
      }

      // Set synchronous mode (CRITICAL - also passed to connection manager)
      // FULL is safer but slower, OFF is fastest but risks corruption on power loss
      const allowedSync = ['OFF', 'NORMAL', 'FULL'] as const;
      const syncModeRaw = (config.sqliteSyncMode ?? 'NORMAL')
        .toUpperCase() as (typeof allowedSync)[number];
      const syncMode = allowedSync.includes(syncModeRaw) ? syncModeRaw : 'NORMAL';
      try {
        client.exec(`PRAGMA synchronous = ${syncMode};`);
        appliedSettings.syncMode = syncMode;
      } catch (error) {
        const errorMsg = `Failed to set synchronous mode: ${error instanceof Error ? error.message : String(error)}`;
        logger.error(errorMsg);
        failedSettings.push({ setting: 'synchronous', error: errorMsg });
        // Allow initialization to continue as connection manager will apply this critical setting again
      }

      // Increase cache size (OPTIONAL - also passed to connection manager)
      // Ensure minimum cache size of 1000 pages to prevent performance degradation
      const cacheSize = Math.max(
        1000,
        config.sqliteCacheSize && config.sqliteCacheSize > 0
          ? config.sqliteCacheSize
          : 10000
      );
      try {
        client.exec(`PRAGMA cache_size = ${cacheSize};`);
        appliedSettings.cacheSize = cacheSize;
      } catch (error) {
        const errorMsg = `Failed to set cache_size: ${error instanceof Error ? error.message : String(error)}`;
        logger.warn(errorMsg);
        failedSettings.push({ setting: 'cache_size', error: errorMsg });
        // Non-critical - continue initialization
      }

      // Enable foreign keys (they're disabled by default in SQLite)
      try {
        client.exec('PRAGMA foreign_keys = ON;');
        appliedSettings.foreignKeys = 'ON';
      } catch (error) {
        const errorMsg = `Failed to enable foreign_keys: ${error instanceof Error ? error.message : String(error)}`;
        logger.warn(errorMsg);
        failedSettings.push({ setting: 'foreign_keys', error: errorMsg });
        // Non-critical - continue initialization
      }

      // Set temp store to memory for better performance (OPTIONAL)
      try {
        client.exec('PRAGMA temp_store = MEMORY;');
        appliedSettings.tempStore = 'MEMORY';
      } catch (error) {
        const errorMsg = `Failed to set temp_store to MEMORY: ${error instanceof Error ? error.message : String(error)}`;
        logger.warn(errorMsg);
        failedSettings.push({ setting: 'temp_store', error: errorMsg });
        // Non-critical - continue initialization
      }

      // Create custom indexes for JSON fields (if not exists)
      try {
        this.createCustomIndexes(client);
        appliedSettings.customIndexes = true;
      } catch (error) {
        const errorMsg = `Failed to create custom indexes: ${error instanceof Error ? error.message : String(error)}`;
        logger.warn(errorMsg);
        failedSettings.push({ setting: 'customIndexes', error: errorMsg });
        // Non-critical - continue initialization
      }

      // Log optimizations in development mode
      if (process.env.NODE_ENV !== 'production') {
        logger.info('SQLite initial optimizations applied:', appliedSettings);
        
        if (failedSettings.length > 0) {
          logger.warn(`${failedSettings.length} SQLite settings failed to apply during initialization`, {
            failedSettings
          });
        }
      }
    } catch (error) {
      // Log unexpected errors but allow initialization to continue
      // The connection manager will apply critical settings again
      logger.error('Unexpected error during SQLite optimization', {
        error: error instanceof Error ? error.stack : String(error)
      });
    }
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
