/**
 * Credential Status Service
 *
 * This service handles the integration between credential creation and status list assignment.
 * It provides automatic status list assignment and BitstringStatusListEntry generation.
 */

import { StatusListService } from './status-list.service';
import {
  StatusPurpose,
  BitstringStatusListEntry,
  CredentialStatusEntryData,
} from '../domains/status-list/status-list.types';
import { logger } from '../utils/logging/logger.service';
import { Shared } from 'openbadges-types';

/**
 * Parameters for assigning credential status
 */
export interface AssignCredentialStatusParams {
  /** ID of the credential */
  credentialId: string;

  /** ID of the issuer */
  issuerId: string;

  /** Purpose of the status (default: revocation) */
  purpose?: StatusPurpose;

  /** Size of the status entry in bits (default: 1) */
  statusSize?: number;

  /** Initial status value (default: 0 for active) */
  initialStatus?: number;
}

/**
 * Result of credential status assignment
 */
export interface CredentialStatusAssignmentResult {
  /** Whether the assignment was successful */
  success: boolean;

  /** The generated BitstringStatusListEntry */
  credentialStatus?: BitstringStatusListEntry;

  /** The created status entry data */
  statusEntry?: CredentialStatusEntryData;

  /** Error message if assignment failed */
  error?: string;
}

/**
 * Service for managing credential status integration
 */
export class CredentialStatusService {
  private statusListService: StatusListService;

  constructor(statusListService: StatusListService) {
    this.statusListService = statusListService;
  }

  /**
   * Assigns a status list entry to a credential during creation
   * @param params Assignment parameters
   * @returns Assignment result with BitstringStatusListEntry
   */
  async assignCredentialStatus(
    params: AssignCredentialStatusParams
  ): Promise<CredentialStatusAssignmentResult> {
    try {
      logger.debug('Assigning credential status', {
        credentialId: params.credentialId,
        issuerId: params.issuerId,
        purpose: params.purpose || StatusPurpose.REVOCATION,
      });

      const purpose = params.purpose || StatusPurpose.REVOCATION;
      const statusSize = params.statusSize || 1;
      const initialStatus = params.initialStatus || 0;

      // Find or create a status list for this issuer and purpose
      const statusList = await this.statusListService.findOrCreateStatusList(
        params.issuerId,
        purpose,
        statusSize
      );

      // Find the next available index in the status list
      const nextIndex = await this.statusListService.getNextAvailableIndex(
        statusList.id
      );

      if (nextIndex === null) {
        throw new Error('No available slots in status list');
      }

      // Create the status entry
      const statusEntry = await this.statusListService.createStatusEntry({
        credentialId: params.credentialId,
        statusListId: statusList.id,
        statusListIndex: nextIndex,
        statusSize,
        purpose,
        currentStatus: initialStatus,
      });

      // Generate the BitstringStatusListEntry for the credential
      const credentialStatus: BitstringStatusListEntry = {
        type: 'BitstringStatusListEntry',
        statusPurpose: purpose,
        statusListIndex: nextIndex.toString(),
        statusListCredential: this.generateStatusListCredentialUrl(
          statusList.id
        ),
        statusSize,
      };

      logger.info('Credential status assigned successfully', {
        credentialId: params.credentialId,
        statusListId: statusList.id,
        statusListIndex: nextIndex,
        purpose,
      });

      return {
        success: true,
        credentialStatus,
        statusEntry,
      };
    } catch (error) {
      logger.error('Failed to assign credential status', {
        error: error instanceof Error ? error.message : String(error),
        credentialId: params.credentialId,
        issuerId: params.issuerId,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Updates an existing credential's status
   * @param credentialId The credential ID
   * @param status The new status value
   * @param reason Optional reason for the status change
   * @param purpose Status purpose (default: revocation)
   * @returns Update result
   */
  async updateCredentialStatus(
    credentialId: string,
    status: number,
    reason?: string,
    purpose: StatusPurpose = StatusPurpose.REVOCATION
  ): Promise<CredentialStatusAssignmentResult> {
    try {
      logger.debug('Updating credential status', {
        credentialId,
        status,
        reason,
        purpose,
      });

      const result = await this.statusListService.updateCredentialStatus({
        credentialId,
        status,
        reason,
        purpose,
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to update credential status',
        };
      }

      return {
        success: true,
        statusEntry: result.statusEntry,
      };
    } catch (error) {
      logger.error('Failed to update credential status', {
        error: error instanceof Error ? error.message : String(error),
        credentialId,
        status,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generates the URL for a status list credential
   * @param statusListId The status list ID
   * @returns The status list credential URL
   */
  private generateStatusListCredentialUrl(statusListId: string): Shared.IRI {
    // This should be configurable based on the server's base URL
    const baseUrl = process.env.BASE_URL || 'https://localhost:3000';
    return `${baseUrl}/v3/status-lists/${statusListId}` as Shared.IRI;
  }

  /**
   * Creates a BitstringStatusListEntry from existing status entry data
   * @param statusEntry The status entry data
   * @returns BitstringStatusListEntry
   */
  createBitstringStatusListEntry(
    statusEntry: CredentialStatusEntryData
  ): BitstringStatusListEntry {
    return {
      type: 'BitstringStatusListEntry',
      statusPurpose: statusEntry.purpose,
      statusListIndex: statusEntry.statusListIndex.toString(),
      statusListCredential: this.generateStatusListCredentialUrl(
        statusEntry.statusListId
      ),
      statusSize: statusEntry.statusSize,
    };
  }

  /**
   * Checks if a credential has an assigned status
   * @param credentialId The credential ID
   * @param purpose Status purpose (default: revocation)
   * @returns True if the credential has an assigned status
   */
  async hasAssignedStatus(
    credentialId: string,
    purpose: StatusPurpose = StatusPurpose.REVOCATION
  ): Promise<boolean> {
    try {
      const statusEntry = await this.statusListService.getStatusEntry(
        credentialId,
        purpose
      );
      return statusEntry !== null;
    } catch (error) {
      logger.error('Failed to check credential status assignment', {
        error: error instanceof Error ? error.message : String(error),
        credentialId,
        purpose,
      });
      return false;
    }
  }

  /**
   * Gets the current status entry for a credential
   * @param credentialId The credential ID
   * @param purpose Status purpose (default: revocation)
   * @returns Status entry data or null if not found
   */
  async getCredentialStatusEntry(
    credentialId: string,
    purpose: StatusPurpose = StatusPurpose.REVOCATION
  ): Promise<CredentialStatusEntryData | null> {
    try {
      return await this.statusListService.getStatusEntry(credentialId, purpose);
    } catch (error) {
      logger.error('Failed to get credential status entry', {
        error: error instanceof Error ? error.message : String(error),
        credentialId,
        purpose,
      });
      return null;
    }
  }

  /**
   * Gets the BitstringStatusListEntry for a credential
   * @param credentialId The credential ID
   * @param purpose Status purpose (default: revocation)
   * @returns BitstringStatusListEntry or null if not found
   */
  async getCredentialStatusListEntry(
    credentialId: string,
    purpose: StatusPurpose = StatusPurpose.REVOCATION
  ): Promise<BitstringStatusListEntry | null> {
    try {
      const statusEntry = await this.getCredentialStatusEntry(
        credentialId,
        purpose
      );

      if (!statusEntry) {
        return null;
      }

      return this.createBitstringStatusListEntry(statusEntry);
    } catch (error) {
      logger.error('Failed to get credential status list entry', {
        error: error instanceof Error ? error.message : String(error),
        credentialId,
        purpose,
      });
      return null;
    }
  }
}
