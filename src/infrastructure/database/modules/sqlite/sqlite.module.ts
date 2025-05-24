import { DatabaseModuleInterface } from '../../interfaces/database-module.interface';
import { DatabaseInterface } from '../../interfaces/database.interface';
import { Database } from 'bun:sqlite';
import { SqliteDatabase } from './sqlite.database';
import { logger } from '../../../../utils/logging/logger.service';
import { resolve } from 'path';
import { sanitizeObject } from '../../../../utils/security/sanitize';
import { SqlitePragmaManager } from './utils/sqlite-pragma.manager';
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
      sqliteSyncMode: config.sqliteSyncMode ?? ('NORMAL' as const),

      // OPTIONAL performance settings (won't halt initialization if they fail)
      sqliteCacheSize:
        typeof config.sqliteCacheSize === 'number'
          ? config.sqliteCacheSize
          : 10_000,
    };
    const sqliteDb = new SqliteDatabase(client, connectionConfig);
    await sqliteDb.connect();
    return sqliteDb;
  }

  /**
   * Applies performance optimizations to SQLite database
   *
   * Uses the centralized SqlitePragmaManager for consistent PRAGMA application.
   * Also creates custom indexes for better query performance.
   *
   * @param client The SQLite database client
   * @param config Configuration options
   */
  private applySqliteOptimizations(
    client: Database,
    config: Partial<SqliteModuleConfig>
  ): void {
    try {
      // Extract only PRAGMA-related properties for the PRAGMA manager
      const pragmaConfig = {
        sqliteBusyTimeout: Math.max(100, config.sqliteBusyTimeout ?? 5000),
        sqliteSyncMode: config.sqliteSyncMode ?? ('NORMAL' as const),
        sqliteCacheSize: Math.max(1000, config.sqliteCacheSize ?? 10000),
      };

      // Use centralized PRAGMA manager for consistent application
      try {
        const result = SqlitePragmaManager.applyPragmas(client, pragmaConfig);

        // Log successful application in development mode only
        // (Failures are already logged by the PRAGMA manager in both dev and production)
        if (process.env.NODE_ENV !== 'production') {
          logger.info(
            'SQLite initial optimizations applied via PRAGMA manager',
            {
              appliedSettings: result.appliedSettings,
              criticalSettingsApplied: result.criticalSettingsApplied,
              failedSettingsCount: result.failedSettings.length,
            }
          );
        }
      } catch (error) {
        // Log error but allow initialization to continue
        // The connection manager will apply critical settings again
        logger.warn(
          'Some SQLite PRAGMA settings failed during initial optimization',
          {
            error: error instanceof Error ? error.message : String(error),
            note: 'Connection manager will retry critical settings',
          }
        );
      }

      // Note: Custom indexes are NOT created during initial optimization
      // They should be created after migrations using createIndexesAfterMigrations()
      // This prevents silent no-ops when migrations haven't run yet
      if (process.env.NODE_ENV !== 'production') {
        logger.info(
          'SQLite initial optimizations complete. Custom indexes should be created after migrations.'
        );
      }
    } catch (error) {
      // Log unexpected errors but allow initialization to continue
      // The connection manager will apply critical settings again
      logger.error('Unexpected error during SQLite optimization', {
        error: sanitizeObject({
          error: error instanceof Error ? error.stack : String(error),
          message: error instanceof Error ? error.message : String(error),
        }),
      });
    }
  }

  /**
   * Creates custom indexes after migrations have run
   * This method can be called externally to ensure indexes are created after table creation
   * @param client The SQLite database client
   */
  createIndexesAfterMigrations(client: Database): void {
    this.createCustomIndexes(client);
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
        .all() as Array<{ name: string }>;
      const tableNames: string[] = tables.map((t) => t.name);

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
        error: sanitizeObject({
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        }),
      });
    }
  }
}
