import { it, expect, beforeEach, afterEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { SqliteDatabase } from '@/infrastructure/database/modules/sqlite/sqlite.database';
import { Shared } from 'openbadges-types';
import { describeSqlite as getDescribeSqlite } from '../../../../helpers/database-test-filter';

// Get the describe function for SQLite tests
const describeSqlite = await getDescribeSqlite();

describeSqlite('SQLiteDatabase Integration (in-memory)', () => {
  // Create a new database for each test to avoid connection issues
  let client: Database;
  let db: SqliteDatabase;

  // Helper function to create a fresh database for each test
  const setupDatabase = async () => {
    // Create a new in-memory database
    client = new Database(':memory:');

    // Apply SQLite optimizations
    client.exec('PRAGMA journal_mode = WAL;');
    client.exec('PRAGMA busy_timeout = 5000;');
    client.exec('PRAGMA synchronous = NORMAL;');
    client.exec('PRAGMA cache_size = 10000;');
    client.exec('PRAGMA foreign_keys = ON;');
    client.exec('PRAGMA temp_store = MEMORY;');

    // Create tables
    client.exec(`
      DROP TABLE IF EXISTS assertions;
      DROP TABLE IF EXISTS badge_classes;
      DROP TABLE IF EXISTS issuers;

      CREATE TABLE issuers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        email TEXT,
        description TEXT,
        image TEXT,
        public_key TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        additional_fields TEXT
      );
      CREATE TABLE badge_classes (
        id TEXT PRIMARY KEY,
        issuer_id TEXT NOT NULL REFERENCES issuers(id),
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        image TEXT NOT NULL,
        criteria TEXT NOT NULL,
        alignment TEXT,
        tags TEXT,
        version TEXT,
        previous_version TEXT REFERENCES badge_classes(id),
        related TEXT,
        endorsement TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        additional_fields TEXT
      );
      CREATE TABLE assertions (
        id TEXT PRIMARY KEY,
        badge_class_id TEXT NOT NULL REFERENCES badge_classes(id),
        issuer_id TEXT REFERENCES issuers(id),
        recipient TEXT NOT NULL,
        issued_on INTEGER NOT NULL,
        expires INTEGER,
        evidence TEXT,
        verification TEXT,
        revoked INTEGER,
        revocation_reason TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        additional_fields TEXT
      );
    `);

    // Create SqliteDatabase with client and configuration
    db = new SqliteDatabase(client, {
      maxConnectionAttempts: 3,
      connectionRetryDelayMs: 1000,
    });

    // Connect the database properly
    await db.connect();
  };

  beforeEach(async () => {
    // Setup a fresh database for each test
    await setupDatabase();
  });

  afterEach(async () => {
    // Clean up after each test
    if (db && db.isConnected()) {
      await db.disconnect();
    }
    if (client) {
      try {
        client.close();
      } catch {
        // Ignore errors on close
      }
    }
  });

  it('should check connection status', async () => {
    expect(db.isConnected()).toBe(true);
  });

  it.skip('should handle connection retry logic', async () => {
    // This test is skipped because bun:sqlite Database instances cannot be reopened once closed.
    // The connection retry logic is tested in the connection manager unit tests instead.
    // In real applications, a new Database instance would be created for reconnection.
    expect(db.isConnected()).toBe(true);
  });

  it('should CRUD Issuer correctly', async () => {
    const issuerData = {
      name: 'Test University',
      url: 'https://test.edu' as Shared.IRI,
      email: 'hello@test.edu',
      description: 'Desc',
      image: 'https://test.edu/logo.png' as Shared.IRI,
    };
    // Create
    const created = await db.createIssuer(issuerData);
    expect(created.id).toBeDefined();
    expect(created.name).toBe(issuerData.name);

    // Read
    const fetched = await db.getIssuerById(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe(created.id);
    expect(fetched!.url).toBe(issuerData.url);

    // Update
    const updated = await db.updateIssuer(created.id, { name: 'Updated Univ' });
    expect(updated).not.toBeNull();
    expect(updated!.name).toBe('Updated Univ');
    // Unchanged field
    expect(updated!.url).toBe(issuerData.url);

    // Delete
    const deleted = await db.deleteIssuer(created.id);
    expect(deleted).toBe(true);
    const afterDel = await db.getIssuerById(created.id);
    expect(afterDel).toBeNull();
  });

  it('should CRUD BadgeClass correctly', async () => {
    // First create an issuer
    const baseIssuer = await db.createIssuer({
      name: 'Issuer',
      url: 'https://i',
      email: 'e@i',
      description: '',
      image: 'https://i.png' as Shared.IRI,
    });
    const badgeData = {
      issuer: baseIssuer.id,
      name: 'Test Badge',
      description: 'B Desc',
      image: 'https://b.png' as Shared.IRI,
      criteria: {},
      alignment: [],
      tags: ['a', 'b'],
    };
    // Create
    const created = await db.createBadgeClass(badgeData);
    expect(created.id).toBeDefined();
    expect(created.name).toBe(badgeData.name);

    // Read by ID
    const fetched = await db.getBadgeClassById(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.issuer).toBe(baseIssuer.id);

    // Read by issuer
    const list = await db.getBadgeClassesByIssuer(baseIssuer.id);
    expect(list.length).toBe(1);

    // Update
    const updated = await db.updateBadgeClass(created.id, {
      description: 'New Desc',
    });
    expect(updated).not.toBeNull();
    expect(updated!.description).toBe('New Desc');

    // Delete
    const deleted = await db.deleteBadgeClass(created.id);
    expect(deleted).toBe(true);
    const after = await db.getBadgeClassById(created.id);
    expect(after).toBeNull();
  });

  it('should CRUD Assertion correctly', async () => {
    // Create issuer & badge
    const issuer = await db.createIssuer({
      name: 'Iss',
      url: 'https://i',
      email: 'e',
      description: '',
      image: 'https://i.png' as Shared.IRI,
    });
    const badge = await db.createBadgeClass({
      issuer: issuer.id,
      name: 'B',
      description: 'D',
      image: 'https://b.png' as Shared.IRI,
      criteria: {},
      alignment: [],
      tags: [],
    });
    const assertionData = {
      badgeClass: badge.id,
      recipient: { type: 'email', identity: 'foo@bar.com' },
      issuedOn: new Date().toISOString(),
      expires: new Date(Date.now() + 1000).toISOString(),
      evidence: [],
      verification: undefined,
      revoked: false,
    };
    // Create
    const created = await db.createAssertion(assertionData);
    expect(created.id).toBeDefined();
    expect(created.badgeClass).toBe(badge.id);

    // Read by ID
    const fetched = await db.getAssertionById(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.recipient).toEqual(assertionData.recipient);

    // Read by badgeClass
    const byBadge = await db.getAssertionsByBadgeClass(badge.id);
    expect(byBadge.length).toBe(1);

    // Read by recipient
    const byRec = await db.getAssertionsByRecipient(
      assertionData.recipient.identity as Shared.IRI
    );
    expect(byRec.length).toBe(1);

    // Update
    const updated = await db.updateAssertion(created.id, {
      revoked: true,
      revocationReason: 'mistake',
    });
    expect(updated).not.toBeNull();
    expect(updated!.revoked).toBe(true);
    expect(updated!.revocationReason).toBe('mistake');

    // Delete
    const deleted = await db.deleteAssertion(created.id);
    expect(deleted).toBe(true);
    const after = await db.getAssertionById(created.id);
    expect(after).toBeNull();
  });
});
