import { describe, expect, it } from 'bun:test';
import drizzleConfig from '../../drizzle.config';

// Define a proper type for the drizzle config with credentials
interface DrizzleConfigWithCreds {
  dialect: string;
  schema: string | string[];
  out: string;
  strict?: boolean;
  dbCredentials: {
    url?: string;
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
  };
}

/**
 * Helper function to check database credentials
 * @param config The drizzle config object
 * @returns The credentials object with proper typing
 */
function getDbCredentials(config: unknown): DrizzleConfigWithCreds['dbCredentials'] {
  const typedConfig = config as DrizzleConfigWithCreds;
  expect(typedConfig.dbCredentials).toBeDefined();
  return typedConfig.dbCredentials;
}

describe('Drizzle Configuration', () => {
  it('should export a valid drizzle configuration', () => {
    expect(drizzleConfig).toBeDefined();
    expect(drizzleConfig.dialect).toBeDefined();
    expect(drizzleConfig.schema).toBeDefined();
    expect(drizzleConfig.out).toBeDefined();
    // Get database credentials using our helper function
    const creds = getDbCredentials(drizzleConfig);

    // Check for either SQLite URL or PostgreSQL connection details
    const hasSqliteUrl = creds.url !== undefined;
    const hasPostgresDetails = creds.host !== undefined &&
                              creds.port !== undefined &&
                              creds.user !== undefined &&
                              creds.database !== undefined;

    expect(hasSqliteUrl || hasPostgresDetails).toBe(true);
  });

  it('should have the correct configuration for SQLite by default', () => {
    // This test assumes DB_TYPE is not set in the environment
    // If DB_TYPE is set, this test may fail
    if (process.env.DB_TYPE === 'postgresql') {
      // Skip test if PostgreSQL is configured
      return;
    }

    expect(drizzleConfig.dialect).toBe('sqlite');
    expect(drizzleConfig.schema).toContain('sqlite/schema.ts');
    expect(drizzleConfig.out).toContain('drizzle/migrations');

    const creds = getDbCredentials(drizzleConfig);
    expect(creds.url).toBeDefined();
  });

  it('should have strict mode enabled', () => {
    expect(drizzleConfig.strict).toBe(true);
  });
});
