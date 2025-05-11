/**
 * Integration test for SQLite database
 */
import { it, expect, beforeAll, afterAll } from 'bun:test';
import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { SqliteDatabase } from '@/infrastructure/database/modules/sqlite/sqlite.database';
import { logger } from '@/utils/logging/logger.service';
import { databaseAwareDescribe } from './test-utils/database-check';
import * as path from 'path';
import * as fs from 'fs';

// Database instance for tests
let sqliteDb: SqliteDatabase | null = null;
let sqliteClient: Database | null = null;

// Path to SQLite database file
const SQLITE_FILE = process.env.SQLITE_FILE || ':memory:';
const MIGRATIONS_FOLDER = path.join(process.cwd(), 'drizzle', 'migrations');

// Check if migrations folder exists
if (!fs.existsSync(MIGRATIONS_FOLDER)) {
  logger.warn(`Migrations folder not found: ${MIGRATIONS_FOLDER}`);
}

// Use database-aware describe to handle database availability
databaseAwareDescribe('SQLite Database Integration Tests', (describeTest) => {
  describeTest('SQLite Database', () => {
    beforeAll(async () => {
      try {
        // Create SQLite database
        sqliteClient = new Database(SQLITE_FILE);
        
        // Apply SQLite optimizations
        sqliteClient.exec('PRAGMA journal_mode = WAL;');
        sqliteClient.exec('PRAGMA busy_timeout = 5000;');
        sqliteClient.exec('PRAGMA synchronous = NORMAL;');
        sqliteClient.exec('PRAGMA cache_size = 10000;');
        sqliteClient.exec('PRAGMA foreign_keys = ON;');
        sqliteClient.exec('PRAGMA temp_store = MEMORY;');
        
        // Apply migrations
        const db = drizzle(sqliteClient);
        
        try {
          migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
          logger.info('SQLite migrations applied successfully');
        } catch (error) {
          logger.error('Error applying SQLite migrations', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          });
          throw error;
        }
        
        // Create SQLite database instance
        sqliteDb = new SqliteDatabase(db);
        await sqliteDb.connect();
        
        logger.info('SQLite database connected successfully');
      } catch (error) {
        logger.error('Error setting up SQLite database', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
      }
    });
    
    afterAll(async () => {
      try {
        // Disconnect from database
        if (sqliteDb) {
          await sqliteDb.disconnect();
        }
        
        // Close SQLite client
        if (sqliteClient) {
          sqliteClient.close();
        }
        
        logger.info('SQLite database disconnected successfully');
      } catch (error) {
        logger.error('Error disconnecting from SQLite database', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
      }
    });
    
    it('should connect to SQLite database', () => {
      expect(sqliteDb).not.toBeNull();
      expect(sqliteDb?.isConnected()).toBe(true);
    });
    
    it('should create and retrieve an issuer', async () => {
      if (!sqliteDb) {
        throw new Error('SQLite database not initialized');
      }
      
      // Create issuer
      const issuer = await sqliteDb.createIssuer({
        name: 'Test Issuer',
        url: 'https://example.com' as any,
        email: 'test@example.com',
        description: 'Test issuer for integration tests',
        image: 'https://example.com/image.png' as any
      });
      
      // Verify issuer was created
      expect(issuer).toBeDefined();
      expect(issuer.id).toBeDefined();
      expect(issuer.name).toBe('Test Issuer');
      
      // Retrieve issuer
      const retrievedIssuer = await sqliteDb.getIssuerById(issuer.id);
      
      // Verify issuer was retrieved
      expect(retrievedIssuer).toBeDefined();
      expect(retrievedIssuer?.id).toBe(issuer.id);
      expect(retrievedIssuer?.name).toBe('Test Issuer');
      
      // Clean up
      await sqliteDb.deleteIssuer(issuer.id);
    });
  });
});
