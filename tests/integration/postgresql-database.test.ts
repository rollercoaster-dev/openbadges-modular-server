/**
 * Integration test for PostgreSQL database
 */
import { it, expect, beforeAll, afterAll } from 'bun:test';
import { PostgresqlDatabase } from '@/infrastructure/database/modules/postgresql/postgresql.database';
import { logger } from '@/utils/logging/logger.service';
import { databaseAwareDescribe } from './test-utils/database-check';
import postgres from 'postgres';
import * as path from 'path';
import * as fs from 'fs';
import { Shared } from 'openbadges-types';

// Database instance for tests
let pgDb: PostgresqlDatabase | null = null;
let pgClient: postgres.Sql | null = null;

// Connection string for PostgreSQL
const CONNECTION_STRING = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/openbadges_test';
const MIGRATIONS_FOLDER = path.join(process.cwd(), 'drizzle', 'pg-migrations');

// Check if migrations folder exists
if (!fs.existsSync(MIGRATIONS_FOLDER)) {
  logger.warn(`Migrations folder not found: ${MIGRATIONS_FOLDER}`);
}

// Check if PostgreSQL is available
// This variable is not used directly but is kept for future use
let _pgAvailable = false;

// Use database-aware describe to handle database availability
databaseAwareDescribe('PostgreSQL Database Integration Tests', (describeTest) => {
  // Skip tests if PostgreSQL is not available
  const testFn = process.env.DB_TYPE === 'postgresql' ? describeTest : describeTest.skip;

  testFn('PostgreSQL Database', () => {
    beforeAll(async () => {
      try {
        // Create PostgreSQL client
        pgClient = postgres(CONNECTION_STRING, {
          max: 10,
          idle_timeout: 20,
          connect_timeout: 10
        });

        // Apply migrations
        try {
          // Find the migration SQL file
          const migrationFiles = fs.readdirSync(MIGRATIONS_FOLDER).filter(file => file.endsWith('.sql'));

          if (migrationFiles.length === 0) {
            logger.warn('No migration SQL files found');
          } else {
            // Apply each migration file
            for (const file of migrationFiles) {
              const filePath = path.join(MIGRATIONS_FOLDER, file);
              const sql = fs.readFileSync(filePath, 'utf8');

              try {
                await pgClient.unsafe(sql);
                logger.info(`Applied migration: ${file}`);
              } catch (error) {
                // If tables already exist, that's fine
                if (error.message && error.message.includes('already exists')) {
                  logger.info(`Tables already exist, skipping migration: ${file}`);
                } else {
                  logger.error(`Error applying migration: ${file}`, {
                    error: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined
                  });
                  throw error;
                }
              }
            }
          }
        } catch (error) {
          logger.error('Error applying PostgreSQL migrations', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          });
          throw error;
        }

        // Create PostgreSQL database instance
        pgDb = new PostgresqlDatabase({
          connectionString: CONNECTION_STRING
        });
        await pgDb.connect();

        logger.info('PostgreSQL database connected successfully');
      } catch (error) {
        logger.error('Error setting up PostgreSQL database', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
      }
    });

    afterAll(async () => {
      try {
        // Disconnect from database
        if (pgDb) {
          await pgDb.disconnect();
        }

        // Close PostgreSQL client
        if (pgClient) {
          await pgClient.end();
        }

        logger.info('PostgreSQL database disconnected successfully');
      } catch (error) {
        logger.error('Error disconnecting from PostgreSQL database', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
      }
    });

    it('should connect to PostgreSQL database', () => {
      expect(pgDb).not.toBeNull();
      expect(pgDb?.isConnected()).toBe(true);
    });

    it('should create and retrieve an issuer', async () => {
      if (!pgDb) {
        throw new Error('PostgreSQL database not initialized');
      }

      // Create issuer
      const issuer = await pgDb.createIssuer({
        name: 'Test Issuer',
        url: 'https://example.com' as unknown as Shared.IRI,
        email: 'test@example.com',
        description: 'Test issuer for integration tests',
        image: 'https://example.com/image.png' as unknown as Shared.IRI
      });

      // Verify issuer was created
      expect(issuer).toBeDefined();
      expect(issuer.id).toBeDefined();
      expect(issuer.name).toBe('Test Issuer');

      // Retrieve issuer
      const retrievedIssuer = await pgDb.getIssuerById(issuer.id);

      // Verify issuer was retrieved
      expect(retrievedIssuer).toBeDefined();
      expect(retrievedIssuer?.id).toBe(issuer.id);
      expect(retrievedIssuer?.name).toBe('Test Issuer');

      // Clean up
      await pgDb.deleteIssuer(issuer.id);
    });
  });
});
