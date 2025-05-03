/**
 * Type definitions for badge-related data structures
 * 
 * These types are used across the application for badge serialization,
 * JSON-LD context handling, and API responses.
 */

import { Shared } from 'openbadges-types';

/**
 * Common data structure for issuers
 */
export interface IssuerData extends Record<string, unknown> {
  id: Shared.IRI;
  name: string;
  url: Shared.IRI;
  email?: string;
  description?: string;
  image?: Shared.IRI | string;
  publicKey?: unknown;
  type?: string;
}

/**
 * Common data structure for badge classes
 */
export interface BadgeClassData extends Record<string, unknown> {
  id: Shared.IRI;
  issuer: Shared.IRI;
  name: string;
  description: string;
  image: Shared.IRI | string;
  criteria: unknown;
  alignment?: unknown[];
  tags?: string[];
  type?: string;
}

/**
 * Common data structure for assertions
 */
export interface AssertionData extends Record<string, unknown> {
  id: Shared.IRI;
  badgeClass: Shared.IRI;
  recipient: RecipientData;
  issuedOn: string;
  expires?: string;
  evidence?: unknown;
  verification?: VerificationData;
  revoked?: boolean;
  revocationReason?: string;
  type?: string;
}

/**
 * Data structure for recipients
 */
export interface RecipientData {
  identity: string;
  type: string;
  hashed: boolean;
  salt?: string;
}

/**
 * Data structure for verification
 */
export interface VerificationData {
  type: string;
  creator?: string;
  created?: string;
  signatureValue?: string;
}

/**
 * Data structure for verifiable credentials
 */
export interface VerifiableCredentialData {
  '@context': string[];
  id: Shared.IRI;
  type: string[];
  issuer: Partial<IssuerData>;
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: {
    id: string;
    type: string;
    achievement: {
      id: Shared.IRI;
      type: string;
      name: string;
      description: string;
      image: Shared.IRI | string;
      criteria: unknown;
      alignments?: unknown[];
      tags?: string[];
    };
  };
  evidence?: unknown;
  proof?: {
    type: string;
    created: string;
    verificationMethod: string;
    proofPurpose: string;
    proofValue: string;
  };
  credentialStatus?: {
    id: Shared.IRI;
    type: string;
    statusPurpose: string;
    statusListIndex: string;
    statusListCredential: Shared.IRI;
  };
}
