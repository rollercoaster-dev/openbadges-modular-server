import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { Database } from 'bun:sqlite';
import { sql } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Issuer Field Migration Integration Tests', () => {
  describe('PostgreSQL Migration', () => {
    let client: postgres.Sql;
    let db: ReturnType<typeof drizzle>;

    beforeEach(async () => {
      // Skip if PostgreSQL is not available
      if (!process.env.DATABASE_URL) {
        return;
      }

      // Create a test database connection
      client = postgres(process.env.DATABASE_URL, { max: 1 });
      db = drizzle(client);

      // Clean up any existing test data
      await db.execute(sql`DROP TABLE IF EXISTS assertions CASCADE`);
      await db.execute(sql`DROP TABLE IF EXISTS badge_classes CASCADE`);
      await db.execute(sql`DROP TABLE IF EXISTS issuers CASCADE`);

      // Create base tables for testing
      await db.execute(sql`
        CREATE TABLE issuers (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          name text NOT NULL,
          url text NOT NULL,
          created_at timestamp DEFAULT now(),
          updated_at timestamp DEFAULT now()
        )
      `);

      await db.execute(sql`
        CREATE TABLE badge_classes (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          issuer_id uuid NOT NULL REFERENCES issuers(id) ON DELETE CASCADE,
          name text NOT NULL,
          created_at timestamp DEFAULT now(),
          updated_at timestamp DEFAULT now()
        )
      `);

      await db.execute(sql`
        CREATE TABLE assertions (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          badge_class_id uuid NOT NULL REFERENCES badge_classes(id) ON DELETE CASCADE,
          recipient jsonb NOT NULL,
          issued_on timestamp DEFAULT now() NOT NULL,
          created_at timestamp DEFAULT now() NOT NULL,
          updated_at timestamp DEFAULT now() NOT NULL
        )
      `);
    });

    afterEach(async () => {
      if (client) {
        await client.end();
      }
    });

    it('should add issuer_id column to assertions table', async () => {
      if (!process.env.DATABASE_URL) {
        // Skip PostgreSQL test - DATABASE_URL not set
        return;
      }

      // Read and execute the first migration
      const migration1 = readFileSync(
        join(
          process.cwd(),
          'drizzle/pg-migrations/0001_add_issuer_id_to_assertions.sql'
        ),
        'utf-8'
      );

      await db.execute(sql.raw(migration1));

      // Check that the column was added
      const result = await db.execute(sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'assertions' AND column_name = 'issuer_id'
      `);

      expect(result.length).toBe(1);
      expect(result[0].column_name).toBe('issuer_id');
      expect(result[0].data_type).toBe('uuid');
      expect(result[0].is_nullable).toBe('YES');
    });

    it('should populate issuer_id from badge_classes', async () => {
      if (!process.env.DATABASE_URL) {
        // Skip PostgreSQL test - DATABASE_URL not set
        return;
      }

      // Insert test data
      await db.execute(sql`
        INSERT INTO issuers (id, name, url)
        VALUES ('11111111-1111-1111-1111-111111111111', 'Test Issuer', 'https://example.com')
      `);

      await db.execute(sql`
        INSERT INTO badge_classes (id, issuer_id, name)
        VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Test Badge')
      `);

      await db.execute(sql`
        INSERT INTO assertions (id, badge_class_id, recipient)
        VALUES ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '{"type": "email", "identity": "test@example.com"}')
      `);

      // Execute both migrations
      const migration1 = readFileSync(
        join(
          process.cwd(),
          'drizzle/pg-migrations/0001_add_issuer_id_to_assertions.sql'
        ),
        'utf-8'
      );
      const migration2 = readFileSync(
        join(
          process.cwd(),
          'drizzle/pg-migrations/0002_populate_assertion_issuer_ids.sql'
        ),
        'utf-8'
      );

      await db.execute(sql.raw(migration1));
      await db.execute(sql.raw(migration2));

      // Check that issuer_id was populated
      const result = await db.execute(sql`
        SELECT issuer_id
        FROM assertions
        WHERE id = '33333333-3333-3333-3333-333333333333'
      `);

      expect(result.length).toBe(1);
      expect(result[0].issuer_id).toBe('11111111-1111-1111-1111-111111111111');
    });
  });

  describe('SQLite Migration', () => {
    // let _db: ReturnType<typeof drizzleSqlite>;
    let sqlite: Database;

    beforeEach(() => {
      // Create in-memory SQLite database for testing
      sqlite = new Database(':memory:');
      // _db = drizzleSqlite(sqlite);

      // Create base tables for testing
      sqlite.run(`
        CREATE TABLE issuers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          url TEXT NOT NULL,
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        )
      `);

      sqlite.run(`
        CREATE TABLE badge_classes (
          id TEXT PRIMARY KEY,
          issuer_id TEXT NOT NULL REFERENCES issuers(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        )
      `);

      sqlite.run(`
        CREATE TABLE assertions (
          id TEXT PRIMARY KEY,
          badge_class_id TEXT NOT NULL REFERENCES badge_classes(id) ON DELETE CASCADE,
          recipient TEXT NOT NULL,
          issued_on INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
          created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
          updated_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
        )
      `);
    });

    afterEach(() => {
      sqlite.close();
    });

    it('should add issuer_id column to assertions table', () => {
      // Read and execute the first migration
      const migration1 = readFileSync(
        join(
          process.cwd(),
          'drizzle/migrations/0001_add_issuer_id_to_assertions.sql'
        ),
        'utf-8'
      );

      sqlite.run(migration1);

      // Check that the column was added
      const result = sqlite
        .prepare(
          `
        PRAGMA table_info(assertions)
      `
        )
        .all() as Array<{ name: string; type: string; notnull: number }>;

      const issuerIdColumn = result.find((col) => col.name === 'issuer_id');
      expect(issuerIdColumn).toBeDefined();
      expect(issuerIdColumn?.type).toBe('TEXT');
      expect(issuerIdColumn?.notnull).toBe(0); // nullable
    });

    it('should create index on issuer_id column', () => {
      // Execute the first migration
      const migration1 = readFileSync(
        join(
          process.cwd(),
          'drizzle/migrations/0001_add_issuer_id_to_assertions.sql'
        ),
        'utf-8'
      );

      sqlite.run(migration1);

      // Check that the index exists
      const result = sqlite
        .prepare(
          `
        SELECT name FROM sqlite_master
        WHERE type = 'index' AND name = 'assertion_issuer_idx'
      `
        )
        .all();

      expect(result.length).toBe(1);
    });

    it('should populate issuer_id from badge_classes', () => {
      // Insert test data
      sqlite
        .prepare(
          `
        INSERT INTO issuers (id, name, url)
        VALUES ('11111111-1111-1111-1111-111111111111', 'Test Issuer', 'https://example.com')
      `
        )
        .run();

      sqlite
        .prepare(
          `
        INSERT INTO badge_classes (id, issuer_id, name)
        VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Test Badge')
      `
        )
        .run();

      sqlite
        .prepare(
          `
        INSERT INTO assertions (id, badge_class_id, recipient)
        VALUES ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '{"type": "email", "identity": "test@example.com"}')
      `
        )
        .run();

      // Execute both migrations
      const migration1 = readFileSync(
        join(
          process.cwd(),
          'drizzle/migrations/0001_add_issuer_id_to_assertions.sql'
        ),
        'utf-8'
      );
      const migration2 = readFileSync(
        join(
          process.cwd(),
          'drizzle/migrations/0002_populate_assertion_issuer_ids.sql'
        ),
        'utf-8'
      );

      sqlite.run(migration1);
      sqlite.run(migration2);

      // Check that issuer_id was populated
      const result = sqlite
        .prepare(
          `
        SELECT issuer_id
        FROM assertions
        WHERE id = '33333333-3333-3333-3333-333333333333'
      `
        )
        .get() as { issuer_id: string };

      expect(result.issuer_id).toBe('11111111-1111-1111-1111-111111111111');
    });
  });
});
