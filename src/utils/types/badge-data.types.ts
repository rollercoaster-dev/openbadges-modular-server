/**
 * Type definitions for badge-related data structures
 *
 * These types are used across the application for badge serialization,
 * JSON-LD context handling, and API responses.
 */

import { Shared, OB2 } from 'openbadges-types';
import { BitstringStatusListEntry } from '../../domains/status-list/status-list.types';

/**
 * Common data structure for issuers
 */
export interface IssuerData extends Record<string, unknown> {
  id: Shared.IRI;
  name: string | Shared.MultiLanguageString;
  url: Shared.IRI;
  email?: string;
  description?: string | Shared.MultiLanguageString;
  image?: Shared.IRI | string | Shared.OB3ImageObject | OB2.Image;
  telephone?: string;
  publicKey?: unknown;
  type?: string;
}

/**
 * Common data structure for badge classes
 */
export interface BadgeClassData extends Record<string, unknown> {
  id: Shared.IRI;
  issuer: Shared.IRI | Record<string, unknown>;
  name: string | Shared.MultiLanguageString;
  description: string | Shared.MultiLanguageString;
  image: Shared.IRI | string | Shared.OB3ImageObject;
  criteria: unknown;
  alignment?: unknown[];
  tags?: string[];
  type?: string;
  // Optional OBv3 Achievement properties
  achievementType?: string;
  creator?: Shared.IRI | Record<string, unknown>;
  resultDescriptions?: unknown[];
  // Achievement versioning fields (OB 3.0)
  version?: string;
  // Achievement relationship fields (OB 3.0)
  related?: unknown[];
  endorsement?: unknown[];
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
  credentialStatus?: BitstringStatusListEntry;
  revoked?: boolean;
  revocationReason?: string;
  type?: string | string[];
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
  '@context': string | string[];
  id: Shared.IRI;
  type: string | string[];
  issuer: Shared.IRI | Partial<IssuerData>;
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: {
    id: string;
    type: string | string[];
    achievement: {
      id: Shared.IRI;
      type: string | string[];
      name: string | Shared.MultiLanguageString;
      description: string | Shared.MultiLanguageString;
      image: Shared.IRI | string | Shared.OB3ImageObject;
      criteria: unknown;
      issuer: Shared.IRI; // Add issuer field for OBv3 compliance
      alignments?: unknown[];
      tags?: string[];
      // Optional OBv3 Achievement properties
      achievementType?: string;
      creator?: Shared.IRI | Record<string, unknown>;
      resultDescriptions?: unknown[];
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
  credentialStatus?: BitstringStatusListEntry;
}
