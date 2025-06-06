/**
 * StatusList Service for managing Bitstring Status Lists
 *
 * This service handles the creation, management, and updating of status lists
 * according to the W3C Bitstring Status List v1.0 specification.
 */

import { StatusList } from '../domains/status-list/status-list.entity';
import { StatusListRepository } from '../domains/status-list/status-list.repository';
import {
  StatusPurpose,
  CreateStatusListParams,
  UpdateCredentialStatusParams,
  StatusUpdateResult,
  StatusListQueryParams,
  BitstringStatusListEntry,
  BitstringStatusListCredential,
  CredentialStatusEntryData,
} from '../domains/status-list/status-list.types';
import { BitstringUtils } from '../utils/bitstring/bitstring.utils';
import { logger } from '../utils/logging/logger.service';
import { Shared } from 'openbadges-types';

/**
 * StatusList Service class
 */
export class StatusListService {
  private readonly repository: StatusListRepository;

  constructor(repository: StatusListRepository) {
    this.repository = repository;
  }

  /**
   * Creates a new status list for an issuer
   * @param params Parameters for creating the status list
   * @returns Created StatusList entity
   */
  async createStatusList(params: CreateStatusListParams): Promise<StatusList> {
    try {
      logger.info('Creating new status list', {
        issuerId: params.issuerId,
        purpose: params.purpose,
        statusSize: params.statusSize,
        totalEntries: params.totalEntries,
      });

      // Validate parameters
      StatusList.validateParams(params);

      // Create the status list entity
      const statusList = await StatusList.create(params);

      // Save to repository
      const savedStatusList = await this.repository.create(statusList);

      logger.info('Status list created successfully', {
        id: savedStatusList.id,
        issuerId: savedStatusList.issuerId,
        purpose: savedStatusList.purpose,
        totalEntries: savedStatusList.totalEntries,
      });

      return savedStatusList;
    } catch (error) {
      logger.error('Failed to create status list', {
        error: error instanceof Error ? error.message : String(error),
        params,
      });
      throw error;
    }
  }

  /**
   * Retrieves a status list by ID
   * @param id Status list ID
   * @returns StatusList entity or null if not found
   */
  async getStatusList(id: string): Promise<StatusList | null> {
    try {
      logger.debug('Retrieving status list', { id });

      return await this.repository.findById(id);
    } catch (error) {
      logger.error('Failed to retrieve status list', {
        error: error instanceof Error ? error.message : String(error),
        id,
      });
      throw error;
    }
  }

  /**
   * Finds status lists matching the given criteria
   * @param params Query parameters
   * @returns Array of matching StatusList entities
   */
  async findStatusLists(params: StatusListQueryParams): Promise<StatusList[]> {
    try {
      logger.debug('Finding status lists', { ...params });

      return await this.repository.findMany(params);
    } catch (error) {
      logger.error('Failed to find status lists', {
        error: error instanceof Error ? error.message : String(error),
        params,
      });
      throw error;
    }
  }

  /**
   * Finds or creates a status list for the given issuer and purpose
   * @param issuerId Issuer ID
   * @param purpose Status purpose
   * @param statusSize Status size in bits (default: 1)
   * @returns StatusList entity
   */
  async findOrCreateStatusList(
    issuerId: string,
    purpose: StatusPurpose,
    statusSize: number = 1
  ): Promise<StatusList> {
    try {
      logger.debug('Finding or creating status list', {
        issuerId,
        purpose,
        statusSize,
      });

      // Try to find an existing status list with available capacity
      const existingStatusList = await this.repository.findAvailableStatusList(
        issuerId,
        purpose,
        statusSize
      );

      if (existingStatusList) {
        logger.info('Found existing status list with capacity', {
          id: existingStatusList.id,
          usedEntries: existingStatusList.usedEntries,
          totalEntries: existingStatusList.totalEntries,
        });
        return existingStatusList;
      }

      // Create a new status list if none found
      const newStatusList = await this.createStatusList({
        issuerId,
        purpose,
        statusSize,
      });

      logger.info('Created new status list', {
        id: newStatusList.id,
        issuerId,
        purpose,
        statusSize,
      });

      return newStatusList;
    } catch (error) {
      logger.error('Failed to find or create status list', {
        error: error instanceof Error ? error.message : String(error),
        issuerId,
        purpose,
        statusSize,
      });
      throw error;
    }
  }

  /**
   * Generates a compressed bitstring from status entries
   * @param entries Array of status entries with their values
   * @param totalEntries Total number of entries in the bitstring
   * @param statusSize Size of each status entry in bits
   * @returns Encoded bitstring
   */
  static async generateBitstring(
    entries: Array<{ index: number; value: number }>,
    totalEntries: number = 131072,
    statusSize: number = 1
  ): Promise<string> {
    try {
      logger.debug('Generating bitstring', {
        entriesCount: entries.length,
        totalEntries,
        statusSize,
      });

      // Validate parameters
      BitstringUtils.validateBitstringParams(totalEntries, statusSize);

      // Create empty bitstring
      let bitstring = BitstringUtils.createEmptyBitstring(
        totalEntries,
        statusSize
      );

      // Set status values for each entry
      for (const entry of entries) {
        bitstring = BitstringUtils.setStatusAtIndex(
          bitstring,
          entry.index,
          entry.value,
          statusSize
        );
      }

      // Encode the bitstring
      const encodedList = await BitstringUtils.encodeBitstring(bitstring);

      logger.info('Bitstring generated successfully', {
        entriesCount: entries.length,
        totalEntries,
        statusSize,
        encodedLength: encodedList.length,
      });

      return encodedList;
    } catch (error) {
      logger.error('Failed to generate bitstring', {
        error: error instanceof Error ? error.message : String(error),
        entriesCount: entries.length,
        totalEntries,
        statusSize,
      });
      throw error;
    }
  }

  /**
   * Expands an encoded bitstring to access individual status values
   * @param encodedList Encoded bitstring
   * @param statusSize Size of each status entry in bits
   * @returns Decoded bitstring
   */
  static async expandBitstring(
    encodedList: string,
    statusSize: number = 1
  ): Promise<Uint8Array> {
    try {
      logger.debug('Expanding bitstring', {
        encodedLength: encodedList.length,
        statusSize,
      });

      const bitstring = await BitstringUtils.decodeBitstring(encodedList);

      logger.debug('Bitstring expanded successfully', {
        encodedLength: encodedList.length,
        decodedSize: bitstring.length,
        capacity: BitstringUtils.getBitstringCapacity(bitstring, statusSize),
      });

      return bitstring;
    } catch (error) {
      logger.error('Failed to expand bitstring', {
        error: error instanceof Error ? error.message : String(error),
        encodedLength: encodedList.length,
        statusSize,
      });
      throw error;
    }
  }

  /**
   * Updates a credential's status in its corresponding bitstring
   * @param params Parameters for the status update
   * @returns Result of the status update operation
   */
  async updateCredentialStatus(
    params: UpdateCredentialStatusParams
  ): Promise<StatusUpdateResult> {
    try {
      logger.info('Updating credential status', {
        credentialId: params.credentialId,
        status: params.status,
        purpose: params.purpose,
        reason: params.reason,
      });

      return await this.repository.updateCredentialStatus(params);
    } catch (error) {
      logger.error('Failed to update credential status', {
        error: error instanceof Error ? error.message : String(error),
        params,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Creates a BitstringStatusListEntry for a credential
   * @param credentialId ID of the credential
   * @param statusList The status list to reference
   * @param index Index in the status list
   * @returns BitstringStatusListEntry object
   */
  createStatusListEntry(
    credentialId: string,
    statusList: StatusList,
    index: number
  ): BitstringStatusListEntry {
    try {
      logger.debug('Creating status list entry', {
        credentialId,
        statusListId: statusList.id,
        index,
        purpose: statusList.purpose,
      });

      const entry: BitstringStatusListEntry = {
        id: `${credentialId}#status-${statusList.purpose}` as Shared.IRI,
        type: 'BitstringStatusListEntry',
        statusPurpose: statusList.purpose,
        statusListIndex: index.toString(),
        statusListCredential: statusList.id as Shared.IRI,
      };

      // Add optional fields if applicable
      if (statusList.statusSize > 1) {
        entry.statusSize = statusList.statusSize;
        entry.statusMessage = statusList.generateDefaultStatusMessages();
      }

      logger.debug('Status list entry created', {
        credentialId,
        entryId: entry.id,
        statusListIndex: entry.statusListIndex,
      });

      return entry;
    } catch (error) {
      logger.error('Failed to create status list entry', {
        error: error instanceof Error ? error.message : String(error),
        credentialId,
        statusListId: statusList.id,
        index,
      });
      throw error;
    }
  }

  /**
   * Converts a StatusList entity to a BitstringStatusListCredential
   * @param statusList The status list entity
   * @param issuerData Issuer information
   * @returns BitstringStatusListCredential object
   */
  toStatusListCredential(
    statusList: StatusList,
    issuerData: { id: string; name?: string; url?: string }
  ): BitstringStatusListCredential {
    try {
      logger.debug('Converting to status list credential', {
        statusListId: statusList.id,
        issuerId: issuerData.id,
      });

      const credential = statusList.toBitstringStatusListCredential(issuerData);

      logger.debug('Status list credential created', {
        credentialId: credential.id,
        issuerId: credential.issuer,
        purpose: credential.credentialSubject.statusPurpose,
      });

      return credential;
    } catch (error) {
      logger.error('Failed to convert to status list credential', {
        error: error instanceof Error ? error.message : String(error),
        statusListId: statusList.id,
        issuerId: issuerData.id,
      });
      throw error;
    }
  }

  /**
   * Gets the next available index in a status list
   * @param statusListId The status list ID
   * @returns The next available index or null if no slots available
   */
  async getNextAvailableIndex(statusListId: string): Promise<number | null> {
    try {
      logger.debug('Getting next available index', { statusListId });

      const statusList = await this.repository.findById(statusListId);
      if (!statusList) {
        throw new Error('Status list not found');
      }

      // Check if there's capacity
      if (statusList.usedEntries >= statusList.totalEntries) {
        logger.warn('Status list is at capacity', {
          statusListId,
          usedEntries: statusList.usedEntries,
          totalEntries: statusList.totalEntries,
        });
        return null;
      }

      // Get the next available index (simple sequential allocation)
      const nextIndex = statusList.usedEntries;

      logger.debug('Next available index found', {
        statusListId,
        nextIndex,
        usedEntries: statusList.usedEntries,
      });

      return nextIndex;
    } catch (error) {
      logger.error('Failed to get next available index', {
        error: error instanceof Error ? error.message : String(error),
        statusListId,
      });
      throw error;
    }
  }

  /**
   * Creates a status entry for a credential
   * @param params Status entry parameters
   * @returns Created status entry
   */
  async createStatusEntry(params: {
    credentialId: string;
    statusListId: string;
    statusListIndex: number;
    statusSize: number;
    purpose: StatusPurpose;
    currentStatus: number;
  }): Promise<CredentialStatusEntryData> {
    try {
      logger.debug('Creating status entry', params);

      const statusEntry = await this.repository.createStatusEntry({
        credentialId: params.credentialId,
        statusListId: params.statusListId,
        statusListIndex: params.statusListIndex,
        statusSize: params.statusSize,
        purpose: params.purpose,
        currentStatus: params.currentStatus,
      });

      // Update the status list's used entries count
      const statusList = await this.repository.findById(params.statusListId);
      if (statusList) {
        statusList.usedEntries += 1;
        await this.repository.update(statusList);
      }

      logger.info('Status entry created successfully', {
        entryId: statusEntry.id,
        credentialId: params.credentialId,
        statusListId: params.statusListId,
        statusListIndex: params.statusListIndex,
      });

      return statusEntry;
    } catch (error) {
      logger.error('Failed to create status entry', {
        error: error instanceof Error ? error.message : String(error),
        params,
      });
      throw error;
    }
  }

  /**
   * Gets a status entry for a credential
   * @param credentialId The credential ID
   * @param purpose The status purpose
   * @returns Status entry or null if not found
   */
  async getStatusEntry(
    credentialId: string,
    purpose: StatusPurpose
  ): Promise<CredentialStatusEntryData | null> {
    try {
      logger.debug('Getting status entry', { credentialId, purpose });

      const statusEntry = await this.repository.findStatusEntry(
        credentialId,
        purpose
      );

      if (statusEntry) {
        logger.debug('Status entry found', {
          entryId: statusEntry.id,
          credentialId,
          statusListIndex: statusEntry.statusListIndex,
        });
      } else {
        logger.debug('No status entry found', { credentialId, purpose });
      }

      return statusEntry;
    } catch (error) {
      logger.error('Failed to get status entry', {
        error: error instanceof Error ? error.message : String(error),
        credentialId,
        purpose,
      });
      throw error;
    }
  }

  /**
   * Validates a status list credential format
   * @param credential The credential to validate
   * @returns True if valid, throws error if invalid
   */
  async validateStatusListCredential(
    credential: BitstringStatusListCredential
  ): Promise<boolean> {
    try {
      // Validate required fields
      if (!credential.id) {
        throw new Error('Status list credential must have an id');
      }

      if (
        !Array.isArray(credential.type) ||
        !credential.type.includes('BitstringStatusListCredential')
      ) {
        throw new Error(
          'Status list credential must have type BitstringStatusListCredential'
        );
      }

      if (!credential.issuer) {
        throw new Error('Status list credential must have an issuer');
      }

      if (!credential.validFrom) {
        throw new Error('Status list credential must have validFrom');
      }

      if (!credential.credentialSubject) {
        throw new Error('Status list credential must have credentialSubject');
      }

      const subject = credential.credentialSubject;
      if (subject.type !== 'BitstringStatusList') {
        throw new Error(
          'Credential subject must have type BitstringStatusList'
        );
      }

      if (!subject.statusPurpose) {
        throw new Error('Status list must have statusPurpose');
      }

      if (!subject.encodedList) {
        throw new Error('Status list must have encodedList');
      }

      // Validate encoded list format
      await BitstringUtils.decodeBitstring(subject.encodedList);

      logger.debug('Status list credential validation passed', {
        credentialId: credential.id,
        purpose: subject.statusPurpose,
      });

      return true;
    } catch (error) {
      logger.error('Status list credential validation failed', {
        error: error instanceof Error ? error.message : String(error),
        credentialId: credential.id,
      });
      throw error;
    }
  }
}
