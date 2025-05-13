-- Fixed migration file that properly handles table creation order for PostgreSQL
-- This file is designed to be executed directly by PostgreSQL to create all tables
-- in the correct order to avoid circular reference issues.

-- Create users table first (no foreign key dependencies)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT,
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  roles JSONB NOT NULL DEFAULT '[]',
  permissions JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for users table
CREATE INDEX IF NOT EXISTS user_username_idx ON users (username);
CREATE INDEX IF NOT EXISTS user_email_idx ON users (email);

-- Create roles table (no foreign key dependencies)
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for roles table
CREATE INDEX IF NOT EXISTS role_name_idx ON roles (name);

-- Create issuers table (no foreign key dependencies)
CREATE TABLE IF NOT EXISTS issuers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  email TEXT,
  description TEXT,
  image TEXT,
  public_key JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  additional_fields JSONB
);

-- Create indexes for issuers table
CREATE INDEX IF NOT EXISTS issuer_name_idx ON issuers (name);
CREATE INDEX IF NOT EXISTS issuer_url_idx ON issuers (url);
CREATE INDEX IF NOT EXISTS issuer_email_idx ON issuers (email);
CREATE INDEX IF NOT EXISTS issuer_created_at_idx ON issuers (created_at);

-- Create platforms table (no foreign key dependencies)
CREATE TABLE IF NOT EXISTS platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  client_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  webhook_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for platforms table
CREATE INDEX IF NOT EXISTS platform_name_idx ON platforms (name);
CREATE INDEX IF NOT EXISTS platform_client_id_idx ON platforms (client_id);

-- Create api_keys table (depends on users)
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  user_id UUID NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  revoked_at TIMESTAMP,
  last_used TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for api_keys table
CREATE INDEX IF NOT EXISTS api_key_key_idx ON api_keys (key);
CREATE INDEX IF NOT EXISTS api_key_user_id_idx ON api_keys (user_id);
CREATE INDEX IF NOT EXISTS api_key_revoked_idx ON api_keys (revoked);

-- Create badge_classes table (depends on issuers)
CREATE TABLE IF NOT EXISTS badge_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  image TEXT NOT NULL,
  criteria JSONB NOT NULL,
  alignment JSONB,
  tags JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  additional_fields JSONB,
  FOREIGN KEY (issuer_id) REFERENCES issuers(id) ON DELETE CASCADE
);

-- Create indexes for badge_classes table
CREATE INDEX IF NOT EXISTS badge_class_issuer_idx ON badge_classes (issuer_id);
CREATE INDEX IF NOT EXISTS badge_class_name_idx ON badge_classes (name);
CREATE INDEX IF NOT EXISTS badge_class_created_at_idx ON badge_classes (created_at);

-- Create assertions table (depends on badge_classes)
CREATE TABLE IF NOT EXISTS assertions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_class_id UUID NOT NULL,
  recipient JSONB NOT NULL,
  issued_on TIMESTAMP NOT NULL,
  expires TIMESTAMP,
  evidence JSONB,
  verification JSONB,
  revoked BOOLEAN,
  revocation_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  additional_fields JSONB,
  FOREIGN KEY (badge_class_id) REFERENCES badge_classes(id) ON DELETE CASCADE
);

-- Create indexes for assertions table
CREATE INDEX IF NOT EXISTS assertion_badge_class_idx ON assertions (badge_class_id);
CREATE INDEX IF NOT EXISTS assertion_issued_on_idx ON assertions (issued_on);
CREATE INDEX IF NOT EXISTS assertion_revoked_idx ON assertions (revoked);
CREATE INDEX IF NOT EXISTS assertion_expires_idx ON assertions (expires);

-- Create platform_users table (depends on platforms)
CREATE TABLE IF NOT EXISTS platform_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id UUID NOT NULL,
  external_user_id TEXT NOT NULL,
  display_name TEXT,
  email TEXT,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE CASCADE
);

-- Create indexes for platform_users table
CREATE INDEX IF NOT EXISTS platform_user_idx ON platform_users (platform_id, external_user_id);
CREATE INDEX IF NOT EXISTS platform_user_email_idx ON platform_users (email);

-- Create user_roles table (depends on users and roles)
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role_id UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- Create indexes for user_roles table
CREATE INDEX IF NOT EXISTS user_role_user_id_idx ON user_roles (user_id);
CREATE INDEX IF NOT EXISTS user_role_role_id_idx ON user_roles (role_id);
CREATE INDEX IF NOT EXISTS user_role_user_id_role_id_idx ON user_roles (user_id, role_id);

-- Create user_assertions table (depends on platform_users and assertions)
CREATE TABLE IF NOT EXISTS user_assertions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  assertion_id UUID NOT NULL,
  added_at TIMESTAMP NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB,
  FOREIGN KEY (user_id) REFERENCES platform_users(id) ON DELETE CASCADE,
  FOREIGN KEY (assertion_id) REFERENCES assertions(id) ON DELETE CASCADE
);

-- Create indexes for user_assertions table
CREATE INDEX IF NOT EXISTS user_assertion_idx ON user_assertions (user_id, assertion_id);
CREATE INDEX IF NOT EXISTS user_assertion_added_at_idx ON user_assertions (added_at);
