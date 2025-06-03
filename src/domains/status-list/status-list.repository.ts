/**
 * Repository interface for StatusList operations
 * 
 * This interface defines the contract for StatusList data access operations
 * across different database implementations.
 */

import { StatusList } from './status-list.entity';
import {
  StatusPurpose,
  StatusListQueryParams,
  CredentialStatusEntryData,
  UpdateCredentialStatusParams,
  StatusUpdateResult
} from './status-list.types';
import { Shared } from 'openbadges-types';

/**
 * StatusList repository interface
 */
export interface StatusListRepository {
  /**
   * Creates a new status list
   * @param statusList StatusList entity to create
   * @returns Created StatusList entity
   */
  create(statusList: StatusList): Promise<StatusList>;

  /**
   * Finds a status list by ID
   * @param id Status list ID
   * @returns StatusList entity or null if not found
   */
  findById(id: string): Promise<StatusList | null>;

  /**
   * Finds status lists matching the given criteria
   * @param params Query parameters
   * @returns Array of matching StatusList entities
   */
  findMany(params: StatusListQueryParams): Promise<StatusList[]>;

  /**
   * Finds a status list with available capacity for the given issuer and purpose
   * @param issuerId Issuer ID
   * @param purpose Status purpose
   * @param statusSize Status size in bits
   * @returns StatusList entity with available capacity or null
   */
  findAvailableStatusList(
    issuerId: string,
    purpose: StatusPurpose,
    statusSize: number
  ): Promise<StatusList | null>;

  /**
   * Updates a status list
   * @param statusList StatusList entity to update
   * @returns Updated StatusList entity
   */
  update(statusList: StatusList): Promise<StatusList>;

  /**
   * Deletes a status list by ID
   * @param id Status list ID
   * @returns True if deleted, false if not found
   */
  delete(id: string): Promise<boolean>;

  /**
   * Creates a credential status entry
   * @param entry Credential status entry data
   * @returns Created credential status entry
   */
  createStatusEntry(entry: Omit<CredentialStatusEntryData, 'id' | 'createdAt' | 'updatedAt'>): Promise<CredentialStatusEntryData>;

  /**
   * Finds a credential status entry by credential ID and purpose
   * @param credentialId Credential ID
   * @param purpose Status purpose
   * @returns Credential status entry or null if not found
   */
  findStatusEntry(credentialId: string, purpose: StatusPurpose): Promise<CredentialStatusEntryData | null>;

  /**
   * Finds all status entries for a status list
   * @param statusListId Status list ID
   * @returns Array of credential status entries
   */
  findStatusEntriesByList(statusListId: string): Promise<CredentialStatusEntryData[]>;

  /**
   * Updates a credential status entry
   * @param entry Credential status entry data to update
   * @returns Updated credential status entry
   */
  updateStatusEntry(entry: CredentialStatusEntryData): Promise<CredentialStatusEntryData>;

  /**
   * Updates credential status atomically (both status entry and status list)
   * @param params Update parameters
   * @returns Result of the status update operation
   */
  updateCredentialStatus(params: UpdateCredentialStatusParams): Promise<StatusUpdateResult>;

  /**
   * Deletes a credential status entry
   * @param id Status entry ID
   * @returns True if deleted, false if not found
   */
  deleteStatusEntry(id: string): Promise<boolean>;

  /**
   * Gets the count of used entries in a status list
   * @param statusListId Status list ID
   * @returns Number of used entries
   */
  getUsedEntriesCount(statusListId: string): Promise<number>;

  /**
   * Finds status lists by issuer
   * @param issuerId Issuer ID
   * @returns Array of status lists for the issuer
   */
  findByIssuer(issuerId: string): Promise<StatusList[]>;

  /**
   * Finds status lists by purpose
   * @param purpose Status purpose
   * @returns Array of status lists with the given purpose
   */
  findByPurpose(purpose: StatusPurpose): Promise<StatusList[]>;

  /**
   * Checks if a credential has a status entry for the given purpose
   * @param credentialId Credential ID
   * @param purpose Status purpose
   * @returns True if status entry exists
   */
  hasStatusEntry(credentialId: string, purpose: StatusPurpose): Promise<boolean>;

  /**
   * Gets status statistics for a status list
   * @param statusListId Status list ID
   * @returns Status statistics
   */
  getStatusListStats(statusListId: string): Promise<{
    totalEntries: number;
    usedEntries: number;
    availableEntries: number;
    utilizationPercent: number;
  }>;

  /**
   * Finds credentials that need status list assignment
   * @param issuerId Issuer ID
   * @param purpose Status purpose
   * @param limit Maximum number of credentials to return
   * @returns Array of credential IDs that need status assignment
   */
  findCredentialsNeedingStatus(
    issuerId: string,
    purpose: StatusPurpose,
    limit?: number
  ): Promise<string[]>;
}
