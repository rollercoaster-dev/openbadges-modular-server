 
import { describe, it, expect } from 'bun:test';
import { join } from 'path';
import { existsSync } from 'fs';

describe('Database Migrations', () => {
  // This test verifies that the migration directory structure is correct
  it('should have the correct migration directory structure', () => {
    const sqliteMigrationsDir = join(process.cwd(), 'drizzle', 'migrations');
    const pgMigrationsDir = join(process.cwd(), 'drizzle', 'pg-migrations');

    // Check that the directories exist using Node's fs module
    expect(existsSync(sqliteMigrationsDir)).toBe(true);
    expect(existsSync(pgMigrationsDir)).toBe(true);
  });

  // This test verifies that the drizzle.config.ts file exists
  it('should have a drizzle.config.ts file', () => {
    const drizzleConfigPath = join(process.cwd(), 'drizzle.config.ts');
    expect(Bun.file(drizzleConfigPath).exists()).resolves.toBe(true);
  });

  // This test verifies that the migration runner script exists
  it('should have a migration runner script', () => {
    const migrationRunnerPath = join(process.cwd(), 'src', 'infrastructure', 'database', 'migrations', 'run.ts');
    expect(Bun.file(migrationRunnerPath).exists()).resolves.toBe(true);
  });
});
