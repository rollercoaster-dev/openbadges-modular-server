import { Database } from 'bun:sqlite';
import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from './src/utils/logging/logger.service';

// TypeScript interfaces for SQLite PRAGMA responses
interface PragmaTableInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

interface PragmaForeignKeyInfo {
  id: number;
  seq: number;
  table: string;
  from: string;
  to: string;
  on_update: string;
  on_delete: string;
  match: string;
}

interface PragmaIndexInfo {
  seq: number;
  name: string;
  unique: number;
  origin: string;
  partial: number;
}

interface CountResult {
  count: number;
}

interface AssertionRecord {
  id: string;
  badge_class_id: string;
  issuer_id: string | null;
  recipient: string;
  issued_on: number;
  expires: number | null;
  evidence: string | null;
  verification: string | null;
  revoked: number | null;
  revocation_reason: string | null;
  created_at: number;
  updated_at: number;
  additional_fields: string | null;
}