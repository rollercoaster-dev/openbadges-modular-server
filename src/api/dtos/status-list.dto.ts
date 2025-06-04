/**
 * DTOs for StatusList-related API endpoints
 *
 * These DTOs define the expected request and response structures for status list operations.
 * They provide type safety and validation for the API.
 */

import {
  StatusPurpose,
  BitstringStatusListCredential,
  BitstringStatusListEntry,
} from '../../domains/status-list/status-list.types';

/**
 * DTO for creating a new status list
 */
export interface CreateStatusListDto {
  /** Purpose of the status list */
  purpose: StatusPurpose;

  /** Size of each status entry in bits (1, 2, 4, or 8) */
  statusSize?: number;

  /** Total number of entries (minimum 131,072) */
  totalEntries?: number;

  /** Time-to-live in milliseconds */
  ttl?: number;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * DTO for updating credential status
 */
export interface UpdateCredentialStatusDto {
  /** New status value */
  status: number;

  /** Reason for the status change */
  reason?: string;

  /** Purpose of the status update */
  purpose: StatusPurpose;
}

/**
 * DTO for batch updating credential statuses
 */
export interface BatchUpdateCredentialStatusDto {
  /** Array of credential status updates */
  updates: Array<{
    /** Credential ID */
    id: string;

    /** New status value - should be string enum values */
    status: 'active' | 'suspended' | 'revoked';

    /** Reason for the status change */
    reason?: string;

    /** Purpose of the status update */
    purpose: StatusPurpose;
  }>;
}

/**
 * DTO for status list query parameters
 */
export interface StatusListQueryDto {
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

/**
 * Response DTO for status list operations
 */
export interface StatusListResponseDto {
  /** Status list ID */
  id: string;

  /** ID of the issuer who owns this status list */
  issuerId: string;

  /** Purpose of this status list */
  purpose: StatusPurpose;

  /** Size of each status entry in bits */
  statusSize: number;

  /** Total number of entries in the bitstring */
  totalEntries: number;

  /** Number of currently used entries */
  usedEntries: number;

  /** Time-to-live in milliseconds */
  ttl?: number;

  /** Creation timestamp */
  createdAt: string;

  /** Last update timestamp */
  updatedAt: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;

  /** Utilization percentage */
  utilizationPercent?: number;

  /** Available capacity */
  availableEntries?: number;
}

/**
 * Response DTO for credential status entry operations
 */
export interface CredentialStatusEntryResponseDto {
  /** Status entry ID */
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

  /** Reason for the current status */
  statusReason?: string;

  /** Creation timestamp */
  createdAt: string;

  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Response DTO for status update operations
 */
export interface StatusUpdateResponseDto {
  /** Whether the update was successful */
  success: boolean;

  /** Updated status entry data */
  statusEntry?: CredentialStatusEntryResponseDto;

  /** Error message if update failed */
  error?: string;

  /** Additional details */
  details?: Record<string, unknown>;
}

/**
 * Response DTO for batch status update operations
 */
export interface BatchStatusUpdateResponseDto {
  /** Number of successful updates */
  successCount: number;

  /** Number of failed updates */
  failureCount: number;

  /** Array of individual update results */
  results: Array<{
    /** Credential ID */
    credentialId: string;

    /** Whether this update was successful */
    success: boolean;

    /** Error message if update failed */
    error?: string;

    /** Updated status entry data */
    statusEntry?: CredentialStatusEntryResponseDto;
  }>;
}

/**
 * Response DTO for status list statistics
 */
export interface StatusListStatsResponseDto {
  /** Status list ID */
  statusListId: string;

  /** Total number of entries */
  totalEntries: number;

  /** Number of used entries */
  usedEntries: number;

  /** Number of available entries */
  availableEntries: number;

  /** Utilization percentage */
  utilizationPercent: number;

  /** Breakdown by status value */
  statusBreakdown: Record<string, number>;
}

/**
 * Type alias for BitstringStatusListCredential response
 */
export type BitstringStatusListCredentialResponseDto =
  BitstringStatusListCredential;

/**
 * Type alias for BitstringStatusListEntry response
 */
export type BitstringStatusListEntryResponseDto = BitstringStatusListEntry;

/**
 * Response DTO for status list validation
 */
export interface StatusListValidationResponseDto {
  /** Whether the status list is valid */
  isValid: boolean;

  /** Validation errors if any */
  errors?: string[];

  /** Validation warnings if any */
  warnings?: string[];

  /** Additional validation details */
  details?: Record<string, unknown>;
}

/**
 * DTO for status list search parameters
 */
export interface StatusListSearchDto {
  /** Search query */
  query?: string;

  /** Filter by issuer ID */
  issuerId?: string;

  /** Filter by purpose */
  purpose?: StatusPurpose;

  /** Filter by status size */
  statusSize?: number;

  /** Include only lists with available capacity */
  hasCapacity?: boolean;

  /** Minimum utilization percentage */
  minUtilization?: number;

  /** Maximum utilization percentage */
  maxUtilization?: number;

  /** Sort field */
  sortBy?: 'createdAt' | 'updatedAt' | 'utilizationPercent' | 'usedEntries';

  /** Sort order */
  sortOrder?: 'asc' | 'desc';

  /** Page number (1-based) */
  page?: number;

  /** Page size */
  pageSize?: number;
}

/**
 * Response DTO for paginated status list results
 */
export interface PaginatedStatusListResponseDto {
  /** Array of status lists */
  data: StatusListResponseDto[];

  /** Pagination metadata */
  pagination: {
    /** Current page number (1-based) */
    page: number;

    /** Page size */
    pageSize: number;

    /** Total number of items */
    total: number;

    /** Total number of pages */
    totalPages: number;

    /** Whether there is a next page */
    hasNext: boolean;

    /** Whether there is a previous page */
    hasPrevious: boolean;
  };
}
