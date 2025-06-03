/**
 * Type definitions for StatusList2021 (Bitstring Status List) implementation
 * 
 * Based on W3C Bitstring Status List v1.0 specification
 * https://www.w3.org/TR/vc-bitstring-status-list/
 */

import { Shared } from 'openbadges-types';

/**
 * Status purposes as defined in the Bitstring Status List specification
 */
export enum StatusPurpose {
  /** Used to cancel the validity of a verifiable credential. This status is not reversible. */
  REVOCATION = 'revocation',
  
  /** Used to temporarily prevent the acceptance of a verifiable credential. This status is reversible. */
  SUSPENSION = 'suspension',
  
  /** Used to signal that an updated verifiable credential is available via the credential's refresh service feature. */
  REFRESH = 'refresh',
  
  /** Used to convey an arbitrary message related to the status of the verifiable credential. */
  MESSAGE = 'message'
}

/**
 * Status values for different purposes
 */
export enum StatusValue {
  /** Status is not set (default) */
  UNSET = 0,
  
  /** Status is set (revoked, suspended, etc.) */
  SET = 1
}

/**
 * Status message definition for complex status entries
 */
export interface StatusMessage {
  /** Hexadecimal value of the status prefixed with '0x' */
  status: string;
  
  /** Human-readable message for debugging (should not be displayed to end users) */
  message: string;
  
  /** Additional properties may be added by implementers */
  [key: string]: unknown;
}

/**
 * Bitstring Status List Entry (embedded in credentials)
 */
export interface BitstringStatusListEntry {
  /** Optional identifier for the status list entry */
  id?: Shared.IRI;
  
  /** Must be 'BitstringStatusListEntry' */
  type: 'BitstringStatusListEntry';
  
  /** Purpose of the status entry */
  statusPurpose: StatusPurpose;
  
  /** Position of the status in the bitstring (0-based index) */
  statusListIndex: string;
  
  /** URL to the verifiable credential containing the status list */
  statusListCredential: Shared.IRI;
  
  /** Size of the status entry in bits (default: 1) */
  statusSize?: number;
  
  /** Array of status messages (required if statusSize > 1) */
  statusMessage?: StatusMessage[];
  
  /** URL or array of URLs with material related to the status */
  statusReference?: Shared.IRI | Shared.IRI[];
}

/**
 * Bitstring Status List (credential subject in status list credentials)
 */
export interface BitstringStatusList {
  /** Identifier for the status list */
  id: Shared.IRI;
  
  /** Must be 'BitstringStatusList' */
  type: 'BitstringStatusList';
  
  /** Purpose(s) of the status list */
  statusPurpose: StatusPurpose | StatusPurpose[];
  
  /** GZIP-compressed, base64url-encoded bitstring */
  encodedList: string;
  
  /** Optional time-to-live in milliseconds */
  ttl?: number;
  
  /** Status size for entries in this list (default: 1) */
  statusSize?: number;
  
  /** Status messages for complex status entries */
  statusMessages?: StatusMessage[];
}

/**
 * Bitstring Status List Credential (complete verifiable credential)
 */
export interface BitstringStatusListCredential {
  /** JSON-LD context */
  '@context': string | string[];
  
  /** Credential identifier */
  id: Shared.IRI;
  
  /** Must include 'VerifiableCredential' and 'BitstringStatusListCredential' */
  type: string[];
  
  /** Issuer of the status list credential */
  issuer: Shared.IRI | object;
  
  /** Earliest point in time at which the status list is valid */
  validFrom: string;
  
  /** Latest point in time at which the status list is valid */
  validUntil?: string;
  
  /** The status list as credential subject */
  credentialSubject: BitstringStatusList;
  
  /** Proof for the status list credential */
  proof?: object;
}

/**
 * Database entity for status lists
 */
export interface StatusListData {
  /** Unique identifier for the status list */
  id: string;
  
  /** ID of the issuer who owns this status list */
  issuerId: string;
  
  /** Purpose of this status list */
  purpose: StatusPurpose;
  
  /** Size of each status entry in bits */
  statusSize: number;
  
  /** GZIP-compressed, base64url-encoded bitstring */
  encodedList: string;
  
  /** Time-to-live in milliseconds */
  ttl?: number;
  
  /** Total number of entries in the bitstring */
  totalEntries: number;
  
  /** Number of currently used entries */
  usedEntries: number;
  
  /** Creation timestamp */
  createdAt: Date;
  
  /** Last update timestamp */
  updatedAt: Date;
  
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Database entity for credential status entries
 */
export interface CredentialStatusEntryData {
  /** Unique identifier for the status entry */
  id: string;
  
  /** ID of the credential this status entry belongs to */
  credentialId: string;
  
  /** ID of the status list containing this entry */
  statusListId: string;
  
  /** Index position in the bitstring */
  statusListIndex: number;
  
  /** Size of this status entry in bits */
  statusSize: number;
  
  /** Purpose of this status entry */
  purpose: StatusPurpose;
  
  /** Current status value */
  currentStatus: number;
  
  /** Reason for the current status (if applicable) */
  statusReason?: string;
  
  /** Creation timestamp */
  createdAt: Date;
  
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Parameters for creating a new status list
 */
export interface CreateStatusListParams {
  /** ID of the issuer */
  issuerId: string;
  
  /** Purpose of the status list */
  purpose: StatusPurpose;
  
  /** Size of each status entry in bits (default: 1) */
  statusSize?: number;
  
  /** Total number of entries (default: 131072) */
  totalEntries?: number;
  
  /** Time-to-live in milliseconds */
  ttl?: number;
  
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Parameters for updating credential status
 */
export interface UpdateCredentialStatusParams {
  /** ID of the credential */
  credentialId: string;
  
  /** New status value */
  status: number;
  
  /** Reason for the status change */
  reason?: string;
  
  /** Purpose of the status update */
  purpose: StatusPurpose;
}

/**
 * Result of a status update operation
 */
export interface StatusUpdateResult {
  /** Whether the update was successful */
  success: boolean;
  
  /** Updated status entry data */
  statusEntry?: CredentialStatusEntryData;
  
  /** Error message if update failed */
  error?: string;
  
  /** Additional details */
  details?: Record<string, unknown>;
}

/**
 * Query parameters for finding status lists
 */
export interface StatusListQueryParams {
  /** Filter by issuer ID */
  issuerId?: string;
  
  /** Filter by purpose */
  purpose?: StatusPurpose;
  
  /** Filter by status size */
  statusSize?: number;
  
  /** Include only lists with available capacity */
  hasCapacity?: boolean;
  
  /** Limit number of results */
  limit?: number;
  
  /** Offset for pagination */
  offset?: number;
}
