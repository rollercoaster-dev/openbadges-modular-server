/**
 * Simple script to create SQLite tables for testing
 */

import { Database } from 'bun:sqlite';
import { logger } from './src/utils/logging/logger.service';

async function createTables() {
  try {
    logger.info('Creating SQLite tables for testing...');
    
    // Create SQLite database connection
    const db = new Database('./sqlite.db');
    
    // Create users table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY NOT NULL,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT,
        first_name TEXT,
        last_name TEXT,
        roles TEXT NOT NULL DEFAULT '[]',
        permissions TEXT NOT NULL DEFAULT '[]',
        is_active INTEGER NOT NULL DEFAULT 1,
        last_login INTEGER,
        metadata TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS user_username_idx ON users (username);
      CREATE INDEX IF NOT EXISTS user_email_idx ON users (email);
    `);
    
    // Create issuers table
    db.exec(`
      CREATE TABLE IF NOT EXISTS issuers (
        id TEXT PRIMARY KEY NOT NULL,
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
      
      CREATE INDEX IF NOT EXISTS issuer_name_idx ON issuers (name);
      CREATE INDEX IF NOT EXISTS issuer_url_idx ON issuers (url);
      CREATE INDEX IF NOT EXISTS issuer_email_idx ON issuers (email);
      CREATE INDEX IF NOT EXISTS issuer_created_at_idx ON issuers (created_at);
    `);
    
    // Create badge_classes table
    db.exec(`
      CREATE TABLE IF NOT EXISTS badge_classes (
        id TEXT PRIMARY KEY NOT NULL,
        issuer_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        image TEXT NOT NULL,
        criteria TEXT NOT NULL,
        alignment TEXT,
        tags TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        additional_fields TEXT,
        FOREIGN KEY (issuer_id) REFERENCES issuers(id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS badge_class_issuer_idx ON badge_classes (issuer_id);
      CREATE INDEX IF NOT EXISTS badge_class_name_idx ON badge_classes (name);
      CREATE INDEX IF NOT EXISTS badge_class_created_at_idx ON badge_classes (created_at);
    `);
    
    // Create assertions table
    db.exec(`
      CREATE TABLE IF NOT EXISTS assertions (
        id TEXT PRIMARY KEY NOT NULL,
        badge_class_id TEXT NOT NULL,
        recipient TEXT NOT NULL,
        issued_on INTEGER NOT NULL,
        expires INTEGER,
        evidence TEXT,
        verification TEXT,
        revoked INTEGER,
        revocation_reason TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        additional_fields TEXT,
        FOREIGN KEY (badge_class_id) REFERENCES badge_classes(id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS assertion_badge_class_idx ON assertions (badge_class_id);
      CREATE INDEX IF NOT EXISTS assertion_issued_on_idx ON assertions (issued_on);
      CREATE INDEX IF NOT EXISTS assertion_revoked_idx ON assertions (revoked);
      CREATE INDEX IF NOT EXISTS assertion_expires_idx ON assertions (expires);
    `);
    
    logger.info('SQLite tables created successfully');
    
    // Close database connection
    db.close();
  } catch (error) {
    logger.error('Error creating SQLite tables', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
}

// Run the function
createTables();
