import { describe, expect, it } from 'bun:test';
import drizzleConfig from '../../drizzle.config';

describe('Drizzle Configuration', () => {
  it('should export a valid drizzle configuration', () => {
    expect(drizzleConfig).toBeDefined();
    expect(drizzleConfig.dialect).toBeDefined();
    expect(drizzleConfig.schema).toBeDefined();
    expect(drizzleConfig.out).toBeDefined();
    // dbCredentials is added at runtime, not in the type
    expect((drizzleConfig as any).dbCredentials).toBeDefined();
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
    expect(((drizzleConfig as any).dbCredentials as any).url).toBeDefined();
  });

  it('should have strict mode enabled', () => {
    expect(drizzleConfig.strict).toBe(true);
  });
});
