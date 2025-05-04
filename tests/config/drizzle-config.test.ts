import { describe, expect, it } from 'bun:test';
import drizzleConfig from '../../drizzle.config';

// Temporarily augment config type to include runtime-only credentials
interface DrizzleConfigWithCreds {
  dbCredentials: {
    url?: string;
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
  };
}

describe('Drizzle Configuration', () => {
  it('should export a valid drizzle configuration', () => {
    expect(drizzleConfig).toBeDefined();
    expect(drizzleConfig.dialect).toBeDefined();
    expect(drizzleConfig.schema).toBeDefined();
    expect(drizzleConfig.out).toBeDefined();
    // dbCredentials is added at runtime, not in the static type
    const creds = (drizzleConfig as DrizzleConfigWithCreds).dbCredentials;
    expect(creds).toBeDefined();

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

    const creds = (drizzleConfig as DrizzleConfigWithCreds).dbCredentials;
    expect(creds).toBeDefined();
    expect(creds.url).toBeDefined();
  });

  it('should have strict mode enabled', () => {
    expect(drizzleConfig.strict).toBe(true);
  });
});
