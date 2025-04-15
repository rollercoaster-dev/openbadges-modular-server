/**
 * Database Interface for Open Badges API
 * 
 * This interface defines the contract that all database modules must implement.
 * It provides methods for CRUD operations on the core domain entities: Issuer, BadgeClass, and Assertion.
 */

import { Issuer, BadgeClass, Assertion } from 'openbadges-types';

export interface DatabaseInterface {
  // Issuer operations
  createIssuer(issuer: Omit<Issuer, 'id'>): Promise<Issuer>;
  getIssuerById(id: string): Promise<Issuer | null>;
  updateIssuer(id: string, issuer: Partial<Issuer>): Promise<Issuer | null>;
  deleteIssuer(id: string): Promise<boolean>;
  
  // BadgeClass operations
  createBadgeClass(badgeClass: Omit<BadgeClass, 'id'>): Promise<BadgeClass>;
  getBadgeClassById(id: string): Promise<BadgeClass | null>;
  getBadgeClassesByIssuer(issuerId: string): Promise<BadgeClass[]>;
  updateBadgeClass(id: string, badgeClass: Partial<BadgeClass>): Promise<BadgeClass | null>;
  deleteBadgeClass(id: string): Promise<boolean>;
  
  // Assertion operations
  createAssertion(assertion: Omit<Assertion, 'id'>): Promise<Assertion>;
  getAssertionById(id: string): Promise<Assertion | null>;
  getAssertionsByBadgeClass(badgeClassId: string): Promise<Assertion[]>;
  getAssertionsByRecipient(recipientId: string): Promise<Assertion[]>;
  updateAssertion(id: string, assertion: Partial<Assertion>): Promise<Assertion | null>;
  deleteAssertion(id: string): Promise<boolean>;
  
  // Database connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}
