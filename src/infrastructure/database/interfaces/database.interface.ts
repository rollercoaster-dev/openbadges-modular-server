/**
 * Database Interface for Open Badges API
 *
 * This interface defines the contract that all database modules must implement.
 * It provides methods for CRUD operations on the core domain entities: Issuer, BadgeClass, and Assertion.
 */

import { Issuer } from '../../../domains/issuer/issuer.entity';
import { BadgeClass } from '../../../domains/badgeClass/badgeClass.entity';
import { Assertion } from '../../../domains/assertion/assertion.entity';
import { Shared } from 'openbadges-types';

export interface DatabaseInterface {
  // Issuer operations
  createIssuer(issuer: Omit<Issuer, 'id'>): Promise<Issuer>;
  getIssuerById(id: Shared.IRI): Promise<Issuer | null>;
  updateIssuer(id: Shared.IRI, issuer: Partial<Issuer>): Promise<Issuer | null>;
  deleteIssuer(id: Shared.IRI): Promise<boolean>;

  // BadgeClass operations
  createBadgeClass(badgeClass: Omit<BadgeClass, 'id'>): Promise<BadgeClass>;
  getBadgeClassById(id: Shared.IRI): Promise<BadgeClass | null>;
  getBadgeClassesByIssuer(issuerId: Shared.IRI): Promise<BadgeClass[]>;
  updateBadgeClass(id: Shared.IRI, badgeClass: Partial<BadgeClass>): Promise<BadgeClass | null>;
  deleteBadgeClass(id: Shared.IRI): Promise<boolean>;

  // Assertion operations
  createAssertion(assertion: Omit<Assertion, 'id'>): Promise<Assertion>;
  getAssertionById(id: Shared.IRI): Promise<Assertion | null>;
  getAssertionsByBadgeClass(badgeClassId: Shared.IRI): Promise<Assertion[]>;
  getAssertionsByRecipient(recipientId: string): Promise<Assertion[]>;
  updateAssertion(id: Shared.IRI, assertion: Partial<Assertion>): Promise<Assertion | null>;
  deleteAssertion(id: Shared.IRI): Promise<boolean>;

  // Database connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}
