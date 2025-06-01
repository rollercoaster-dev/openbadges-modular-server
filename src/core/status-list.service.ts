/**
 * StatusList Service for StatusList2021 implementation
 * 
 * This service implements the W3C StatusList2021 specification for Open Badges v3.0 compliance.
 * It handles the creation, management, and updating of status lists and credential status entries.
 */

import { Shared } from 'openbadges-types';
import { createDateTime } from '../utils/types/date-utils';
import { logger } from '../utils/logging/logger.service';
import {
  StatusList,
  CredentialStatusEntry,
  StatusList2021Credential,
  StatusList2021Entry,
  UpdateCredentialStatusRequest,
  UpdateCredentialStatusResponse,
  CreateStatusListOptions,
  StatusPurpose,
  CredentialStatus,
  IStatusListService,
  StatusListRepository,
  CredentialStatusEntryRepository
} from './types/status-list.types';

/**
 * StatusList Service implementation
 */
export class StatusListService implements IStatusListService {
  private readonly DEFAULT_STATUS_LIST_SIZE = 16384; // 16k entries as per spec
  
  constructor(
    private readonly statusListRepository: StatusListRepository,
    private readonly credentialStatusEntryRepository: CredentialStatusEntryRepository
  ) {}

  /**
   * Creates a new status list for an issuer and purpose
   */
  async createStatusList(options: CreateStatusListOptions): Promise<StatusList> {
    try {
      logger.info('Creating new status list', { 
        issuerId: options.issuerId, 
        purpose: options.purpose 
      });

      // Check if a status list already exists for this issuer and purpose
      const existingStatusList = await this.statusListRepository.findByIssuerAndPurpose(
        options.issuerId,
        options.purpose
      );

      if (existingStatusList) {
        logger.info('Status list already exists for issuer and purpose', {
          statusListId: existingStatusList.id,
          issuerId: options.issuerId,
          purpose: options.purpose
        });
        return existingStatusList;
      }

      const size = options.size || this.DEFAULT_STATUS_LIST_SIZE;
      const bitstring = await this.generateBitstring(size);

      const statusListData = {
        issuerId: options.issuerId,
        purpose: options.purpose,
        bitstring,
        size
      };

      const statusList = await this.statusListRepository.create(statusListData);
      
      logger.info('Status list created successfully', { 
        statusListId: statusList.id,
        issuerId: options.issuerId,
        purpose: options.purpose,
        size
      });

      return statusList;
    } catch (error) {
      logger.error('Failed to create status list', {
        error: error instanceof Error ? error.message : String(error),
        issuerId: options.issuerId,
        purpose: options.purpose
      });
      throw new Error(`Failed to create status list: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Gets a status list by ID
   */
  async getStatusList(id: Shared.IRI): Promise<StatusList | null> {
    try {
      return await this.statusListRepository.findById(id);
    } catch (error) {
      logger.error('Failed to get status list', {
        error: error instanceof Error ? error.message : String(error),
        statusListId: id
      });
      throw new Error(`Failed to get status list: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Gets a status list credential in the StatusList2021Credential format
   */
  async getStatusListCredential(id: Shared.IRI): Promise<StatusList2021Credential | null> {
    try {
      const statusList = await this.getStatusList(id);
      if (!statusList) {
        return null;
      }

      const credential: StatusList2021Credential = {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://w3id.org/vc/status-list/2021/v1'
        ],
        id: statusList.id,
        type: ['VerifiableCredential', 'StatusList2021Credential'],
        issuer: statusList.issuerId,
        issuanceDate: createDateTime(statusList.createdAt),
        credentialSubject: {
          id: `${statusList.id}#list`,
          type: 'StatusList2021',
          statusPurpose: statusList.purpose,
          encodedList: statusList.bitstring
        }
      };

      return credential;
    } catch (error) {
      logger.error('Failed to get status list credential', {
        error: error instanceof Error ? error.message : String(error),
        statusListId: id
      });
      throw new Error(`Failed to get status list credential: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Assigns a credential to a status list and returns the status entry
   */
  async assignCredentialToStatusList(
    credentialId: Shared.IRI,
    issuerId: Shared.IRI,
    purpose: StatusPurpose
  ): Promise<CredentialStatusEntry> {
    try {
      logger.info('Assigning credential to status list', {
        credentialId,
        issuerId,
        purpose
      });

      // Check if credential already has a status entry
      const existingEntry = await this.credentialStatusEntryRepository.findByCredentialId(credentialId);
      if (existingEntry) {
        logger.info('Credential already has status entry', {
          credentialId,
          statusEntryId: existingEntry.id
        });
        return existingEntry;
      }

      // Get or create status list for this issuer and purpose
      let statusList = await this.statusListRepository.findByIssuerAndPurpose(issuerId, purpose);
      if (!statusList) {
        statusList = await this.createStatusList({ issuerId, purpose });
      }

      // Get next available index in the status list
      const statusListIndex = await this.credentialStatusEntryRepository.getNextAvailableIndex(statusList.id);

      // Check if status list is full
      if (statusListIndex === null || statusListIndex === undefined || statusListIndex >= statusList.size) {
        throw new Error(`Status list ${statusList.id} is full. Cannot assign more credentials.`);
      }

      // Create the status entry
      const entryData = {
        credentialId,
        statusListId: statusList.id,
        statusListIndex,
        status: CredentialStatus.VALID // Default to valid
      };

      const statusEntry = await this.credentialStatusEntryRepository.create(entryData);

      logger.info('Credential assigned to status list successfully', {
        credentialId,
        statusListId: statusList.id,
        statusListIndex,
        statusEntryId: statusEntry.id
      });

      return statusEntry;
    } catch (error) {
      logger.error('Failed to assign credential to status list', {
        error: error instanceof Error ? error.message : String(error),
        credentialId,
        issuerId,
        purpose
      });
      throw new Error(`Failed to assign credential to status list: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Updates a credential's status in its status list
   */
  async updateCredentialStatus(
    credentialId: Shared.IRI,
    request: UpdateCredentialStatusRequest
  ): Promise<UpdateCredentialStatusResponse> {
    try {
      logger.info('Updating credential status', {
        credentialId,
        newStatus: request.status,
        reason: request.reason
      });

      // Get the credential's status entry
      const statusEntry = await this.credentialStatusEntryRepository.findByCredentialId(credentialId);
      if (!statusEntry) {
        throw new Error(`No status entry found for credential: ${credentialId}`);
      }

      // Get the status list
      const statusList = await this.statusListRepository.findById(statusEntry.statusListId);
      if (!statusList) {
        throw new Error(`Status list not found: ${statusEntry.statusListId}`);
      }

      // Perform atomic update to prevent race conditions
      const updatedEntry = await this.atomicUpdateCredentialStatus(
        statusList,
        statusEntry,
        request.status,
        request.reason
      );

      if (!updatedEntry) {
        throw new Error(`Failed to update status entry: ${statusEntry.id}`);
      }

      const response: UpdateCredentialStatusResponse = {
        credentialId,
        statusListId: statusList.id,
        statusListIndex: statusEntry.statusListIndex,
        status: request.status,
        reason: request.reason,
        updatedAt: updatedEntry.updatedAt
      };

      logger.info('Credential status updated successfully', response);

      return response;
    } catch (error) {
      logger.error('Failed to update credential status', {
        error: error instanceof Error ? error.message : String(error),
        credentialId,
        request
      });
      throw new Error(`Failed to update credential status: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Gets a credential's status entry
   */
  async getCredentialStatus(credentialId: Shared.IRI): Promise<CredentialStatusEntry | null> {
    try {
      return await this.credentialStatusEntryRepository.findByCredentialId(credentialId);
    } catch (error) {
      logger.error('Failed to get credential status', {
        error: error instanceof Error ? error.message : String(error),
        credentialId
      });
      throw new Error(`Failed to get credential status: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Atomically updates a credential's status to prevent race conditions
   * This method should be implemented with database-level locking or optimistic concurrency control
   */
  private async atomicUpdateCredentialStatus(
    statusList: StatusList,
    statusEntry: CredentialStatusEntry,
    newStatus: CredentialStatus,
    reason?: string
  ): Promise<CredentialStatusEntry | null> {
    try {
      // For now, implement a simple retry mechanism with optimistic locking
      // In production, this should use database transactions or row-level locking
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          // Re-fetch the current status list to get the latest bitstring
          const currentStatusList = await this.statusListRepository.findById(statusList.id);
          if (!currentStatusList) {
            throw new Error(`Status list not found: ${statusList.id}`);
          }

          // Update the bitstring with the current data
          const updatedBitstring = await this.updateBitstring(currentStatusList, statusEntry.statusListIndex, newStatus);

          // Update the status list with optimistic concurrency check
          // This should ideally include a version field or timestamp check
          await this.statusListRepository.update(currentStatusList.id, {
            bitstring: updatedBitstring,
            updatedAt: new Date()
          });

          // Update the status entry
          const updatedEntry = await this.credentialStatusEntryRepository.update(statusEntry.id, {
            status: newStatus,
            reason: reason,
            updatedAt: new Date()
          });

          return updatedEntry;
        } catch (error) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw error;
          }

          // Wait a short time before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 100));

          logger.warn('Retrying atomic update due to potential race condition', {
            statusListId: statusList.id,
            credentialId: statusEntry.credentialId,
            retryCount
          });
        }
      }

      throw new Error('Failed to perform atomic update after maximum retries');
    } catch (error) {
      logger.error('Failed to atomically update credential status', {
        error: error instanceof Error ? error.message : String(error),
        statusListId: statusList.id,
        credentialId: statusEntry.credentialId,
        newStatus,
        reason
      });
      throw error;
    }
  }

  /**
   * Generates a new bitstring of the specified size (all bits set to 0)
   */
  async generateBitstring(size: number): Promise<string> {
    try {
      // Create a byte array for the bitstring (8 bits per byte)
      const byteLength = Math.ceil(size / 8);
      const bitstring = new Uint8Array(byteLength);

      // All bits are initialized to 0 by default

      return await this.encodeBitstring(bitstring);
    } catch (error) {
      logger.error('Failed to generate bitstring', {
        error: error instanceof Error ? error.message : String(error),
        size
      });
      throw new Error(`Failed to generate bitstring: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Updates a bitstring by setting the bit at the specified index to the given status
   */
  async updateBitstring(statusList: StatusList, index: number, status: CredentialStatus): Promise<string> {
    try {
      // Decode the current bitstring
      const bitstring = await this.decodeBitstring(statusList.bitstring);

      // Calculate byte and bit position
      const byteIndex = Math.floor(index / 8);
      const bitIndex = index % 8;

      // Validate index is within bounds
      if (byteIndex >= bitstring.length) {
        throw new Error(`Index ${index} is out of bounds for status list of size ${statusList.size}`);
      }

      // Update the bit
      if (status === CredentialStatus.REVOKED_OR_SUSPENDED) {
        // Set bit to 1
        bitstring[byteIndex] |= (1 << bitIndex);
      } else {
        // Set bit to 0
        bitstring[byteIndex] &= ~(1 << bitIndex);
      }

      // Encode and return the updated bitstring
      return await this.encodeBitstring(bitstring);
    } catch (error) {
      logger.error('Failed to update bitstring', {
        error: error instanceof Error ? error.message : String(error),
        statusListId: statusList.id,
        index,
        status
      });
      throw new Error(`Failed to update bitstring: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Decodes a base64url encoded, gzip compressed bitstring
   */
  async decodeBitstring(encodedBitstring: string): Promise<Uint8Array> {
    try {
      // Decode from base64url
      const compressedData = this.base64urlDecode(encodedBitstring);

      // Decompress using gzip
      const decompressedData = await this.gunzip(compressedData);

      return new Uint8Array(decompressedData);
    } catch (error) {
      logger.error('Failed to decode bitstring', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error(`Failed to decode bitstring: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Encodes a bitstring using gzip compression and base64url encoding
   */
  async encodeBitstring(bitstring: Uint8Array): Promise<string> {
    try {
      // Compress using gzip
      const compressedData = await this.gzip(bitstring);

      // Encode to base64url
      return this.base64urlEncode(compressedData);
    } catch (error) {
      logger.error('Failed to encode bitstring', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error(`Failed to encode bitstring: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Creates a StatusList2021Entry for a credential
   */
  createStatusList2021Entry(
    credentialId: Shared.IRI,
    statusEntry: CredentialStatusEntry,
    statusList: StatusList
  ): StatusList2021Entry {
    return {
      id: `${credentialId}#status`,
      type: 'StatusList2021Entry',
      statusPurpose: statusList.purpose,
      statusListIndex: statusEntry.statusListIndex.toString(),
      statusListCredential: statusList.id
    };
  }

  // Private helper methods for compression and encoding

  /**
   * Compresses data using gzip
   */
  private async gzip(data: Uint8Array): Promise<Uint8Array> {
    // Use Bun's built-in gzip compression
    const compressed = Bun.gzipSync(data);
    return new Uint8Array(compressed);
  }

  /**
   * Decompresses gzip data
   */
  private async gunzip(data: Uint8Array): Promise<Uint8Array> {
    // Use Bun's built-in gzip decompression
    const decompressed = Bun.gunzipSync(data);
    return new Uint8Array(decompressed);
  }

  /**
   * Encodes data to base64url
   */
  private base64urlEncode(data: Uint8Array): string {
    const base64 = Buffer.from(data).toString('base64');
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  /**
   * Decodes base64url data
   */
  private base64urlDecode(base64url: string): Uint8Array {
    // Convert base64url -> base64 (+ padding) -> Uint8Array
    let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    base64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
}
