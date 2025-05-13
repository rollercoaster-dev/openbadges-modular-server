-- Fixed migration file that properly handles table creation order
-- This file is designed to be executed directly by SQLite to create all tables
-- in the correct order to avoid circular reference issues.

-- Create users table first (no foreign key dependencies)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  first_name TEXT,
  last_name TEXT,
  roles TEXT NOT NULL DEFAULT ('[]'),
  permissions TEXT NOT NULL DEFAULT ('[]'),
  is_active INTEGER NOT NULL DEFAULT 1,
  last_login INTEGER,
  metadata TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Create indexes for users table
CREATE INDEX IF NOT EXISTS user_username_idx ON users (username);
CREATE INDEX IF NOT EXISTS user_email_idx ON users (email);

-- Create roles table (no foreign key dependencies)
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Create indexes for roles table
CREATE INDEX IF NOT EXISTS role_name_idx ON roles (name);

-- Create issuers table (no foreign key dependencies)
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

-- Create indexes for issuers table
CREATE INDEX IF NOT EXISTS issuer_name_idx ON issuers (name);
CREATE INDEX IF NOT EXISTS issuer_url_idx ON issuers (url);
CREATE INDEX IF NOT EXISTS issuer_email_idx ON issuers (email);
CREATE INDEX IF NOT EXISTS issuer_created_at_idx ON issuers (created_at);

-- Create platforms table (no foreign key dependencies)
CREATE TABLE IF NOT EXISTS platforms (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  client_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  webhook_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Create indexes for platforms table
CREATE INDEX IF NOT EXISTS platform_name_idx ON platforms (name);
CREATE INDEX IF NOT EXISTS platform_client_id_idx ON platforms (client_id);

-- Create api_keys table (depends on users)
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY NOT NULL,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  user_id TEXT NOT NULL,
  description TEXT,
  permissions TEXT NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0,
  revoked_at INTEGER,
  last_used INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for api_keys table
CREATE INDEX IF NOT EXISTS api_key_key_idx ON api_keys (key);
CREATE INDEX IF NOT EXISTS api_key_user_id_idx ON api_keys (user_id);
CREATE INDEX IF NOT EXISTS api_key_revoked_idx ON api_keys (revoked);

-- Create badge_classes table (depends on issuers)
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

-- Create indexes for badge_classes table
CREATE INDEX IF NOT EXISTS badge_class_issuer_idx ON badge_classes (issuer_id);
CREATE INDEX IF NOT EXISTS badge_class_name_idx ON badge_classes (name);
CREATE INDEX IF NOT EXISTS badge_class_created_at_idx ON badge_classes (created_at);

-- Create assertions table (depends on badge_classes)
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

-- Create indexes for assertions table
CREATE INDEX IF NOT EXISTS assertion_badge_class_idx ON assertions (badge_class_id);
CREATE INDEX IF NOT EXISTS assertion_issued_on_idx ON assertions (issued_on);
CREATE INDEX IF NOT EXISTS assertion_revoked_idx ON assertions (revoked);
CREATE INDEX IF NOT EXISTS assertion_expires_idx ON assertions (expires);

-- Create platform_users table (depends on platforms)
CREATE TABLE IF NOT EXISTS platform_users (
  id TEXT PRIMARY KEY NOT NULL,
  platform_id TEXT NOT NULL,
  external_user_id TEXT NOT NULL,
  display_name TEXT,
  email TEXT,
  metadata TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE CASCADE
);

-- Create indexes for platform_users table
CREATE INDEX IF NOT EXISTS platform_user_idx ON platform_users (platform_id, external_user_id);
CREATE INDEX IF NOT EXISTS platform_user_email_idx ON platform_users (email);

-- Create user_roles table (depends on users and roles)
CREATE TABLE IF NOT EXISTS user_roles (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- Create indexes for user_roles table
CREATE INDEX IF NOT EXISTS user_role_user_id_idx ON user_roles (user_id);
CREATE INDEX IF NOT EXISTS user_role_role_id_idx ON user_roles (role_id);
CREATE INDEX IF NOT EXISTS user_role_user_id_role_id_idx ON user_roles (user_id, role_id);

-- Create user_assertions table (depends on platform_users and assertions)
CREATE TABLE IF NOT EXISTS user_assertions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  assertion_id TEXT NOT NULL,
  added_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  metadata TEXT,
  FOREIGN KEY (user_id) REFERENCES platform_users(id) ON DELETE CASCADE,
  FOREIGN KEY (assertion_id) REFERENCES assertions(id) ON DELETE CASCADE
);

-- Create indexes for user_assertions table
CREATE INDEX IF NOT EXISTS user_assertion_idx ON user_assertions (user_id, assertion_id);
CREATE INDEX IF NOT EXISTS user_assertion_added_at_idx ON user_assertions (added_at);
