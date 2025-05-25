/**
 * Database Interface for Open Badges API
 *
 * This interface defines the contract that all database modules must implement.
 * It provides methods for CRUD operations on the core domain entities: Issuer, BadgeClass, and Assertion.
 * Enhanced with health monitoring, transaction support, and configuration management.
 */

import { Issuer } from '../../../domains/issuer/issuer.entity';
import { BadgeClass } from '../../../domains/badgeClass/badgeClass.entity';
import { Assertion } from '../../../domains/assertion/assertion.entity';
import { Shared } from 'openbadges-types';

/**
 * Serializable error information for database health
 */
export interface DatabaseHealthError {
  message: string;
  stack?: string;
}

/**
 * Database health information
 *
 * Note: uptime is measured in milliseconds since connection was established
 */
export interface DatabaseHealth {
  connected: boolean;
  responseTime: number;
  uptime: number; // Uptime in milliseconds since connection established
  connectionAttempts: number;
  lastError?: DatabaseHealthError; // Serializable error format instead of Error object
  configuration: Record<string, unknown>;
}

/**
 * Database transaction context
 */
export interface DatabaseTransaction {
  id: string;
  startTime: number;
  operations: string[];
}

/**
 * Database pagination parameters
 */
export interface DatabasePaginationParams {
  limit?: number;
  offset?: number;
}

/**
 * Database query options
 */
export interface DatabaseQueryOptions {
  pagination?: DatabasePaginationParams;
  includeMetadata?: boolean;
}

export interface DatabaseInterface {
  // Issuer operations
  createIssuer(issuer: Omit<Issuer, 'id'>): Promise<Issuer>;
  getIssuerById(id: Shared.IRI): Promise<Issuer | null>;
  getAllIssuers(options?: DatabaseQueryOptions): Promise<Issuer[]>;
  updateIssuer(id: Shared.IRI, issuer: Partial<Issuer>): Promise<Issuer | null>;
  deleteIssuer(id: Shared.IRI): Promise<boolean>;

  // BadgeClass operations
  createBadgeClass(badgeClass: Omit<BadgeClass, 'id'>): Promise<BadgeClass>;
  getBadgeClassById(id: Shared.IRI): Promise<BadgeClass | null>;
  getAllBadgeClasses(options?: DatabaseQueryOptions): Promise<BadgeClass[]>;
  getBadgeClassesByIssuer(
    issuerId: Shared.IRI,
    options?: DatabaseQueryOptions
  ): Promise<BadgeClass[]>;
  updateBadgeClass(
    id: Shared.IRI,
    badgeClass: Partial<BadgeClass>
  ): Promise<BadgeClass | null>;
  deleteBadgeClass(id: Shared.IRI): Promise<boolean>;

  // Assertion operations
  createAssertion(assertion: Omit<Assertion, 'id'>): Promise<Assertion>;
  getAssertionById(id: Shared.IRI): Promise<Assertion | null>;
  getAllAssertions(options?: DatabaseQueryOptions): Promise<Assertion[]>;
  getAssertionsByBadgeClass(
    badgeClassId: Shared.IRI,
    options?: DatabaseQueryOptions
  ): Promise<Assertion[]>;
  getAssertionsByRecipient(
    recipientId: string,
    options?: DatabaseQueryOptions
  ): Promise<Assertion[]>;
  updateAssertion(
    id: Shared.IRI,
    assertion: Partial<Assertion>
  ): Promise<Assertion | null>;
  deleteAssertion(id: Shared.IRI): Promise<boolean>;

  // Database connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  close(): Promise<void>;
  isConnected(): boolean;

  // Health monitoring and diagnostics
  getHealth(): Promise<DatabaseHealth>;
  getConfiguration(): Record<string, unknown>;

  // Transaction support (optional - not all databases may support this)
  beginTransaction?(): Promise<DatabaseTransaction>;
  commitTransaction?(transaction: DatabaseTransaction): Promise<void>;
  rollbackTransaction?(transaction: DatabaseTransaction): Promise<void>;

  // Utility methods
  validateConnection(): Promise<boolean>;
  getModuleName(): string;
}
