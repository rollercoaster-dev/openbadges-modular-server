/**
 * StatusList entity for managing Bitstring Status Lists
 *
 * This entity represents a status list that can contain the status of multiple
 * verifiable credentials using a compressed bitstring format.
 */

import { Shared } from 'openbadges-types';
import {
  StatusPurpose,
  StatusListData,
  BitstringStatusList,
  BitstringStatusListCredential,
  CreateStatusListParams,
  StatusMessage,
} from './status-list.types';
import { createOrGenerateIRI } from '../../utils/types/type-utils';
import { logger } from '../../utils/logging/logger.service';

/**
 * StatusList entity class
 */
export class StatusList {
  id: string;
  issuerId: string;
  purpose: StatusPurpose;
  statusSize: number;
  encodedList: string;
  ttl?: number;
  totalEntries: number;
  usedEntries: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;

  /**
   * Private constructor to enforce creation through factory method
   */
  private constructor(data: StatusListData) {
    this.id = data.id;
    this.issuerId = data.issuerId;
    this.purpose = data.purpose;
    this.statusSize = data.statusSize;
    this.encodedList = data.encodedList;
    this.ttl = data.ttl;
    this.totalEntries = data.totalEntries;
    this.usedEntries = data.usedEntries;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.metadata = data.metadata;
  }

  /**
   * Factory method to create a new StatusList instance
   */
  static async create(params: CreateStatusListParams): Promise<StatusList> {
    const now = new Date();
    const id = createOrGenerateIRI();

    // Default values according to specification
    const statusSize = params.statusSize || 1;
    const totalEntries = params.totalEntries || 131072; // 16KB default

    // Generate initial empty bitstring
    const initialBitstring = new Uint8Array(
      Math.ceil((totalEntries * statusSize) / 8)
    );
    const encodedList = await StatusList.encodeBitstring(initialBitstring);

    const data: StatusListData = {
      id,
      issuerId: params.issuerId,
      purpose: params.purpose,
      statusSize,
      encodedList,
      ttl: params.ttl,
      totalEntries,
      usedEntries: 0,
      createdAt: now,
      updatedAt: now,
      metadata: params.metadata,
    };

    logger.info('Created new StatusList', {
      id,
      issuerId: params.issuerId,
      purpose: params.purpose,
      statusSize,
      totalEntries,
    });

    return new StatusList(data);
  }

  /**
   * Factory method to create StatusList from database data
   */
  static fromData(data: StatusListData): StatusList {
    return new StatusList(data);
  }

  /**
   * Updates the encoded bitstring
   */
  updateEncodedList(encodedList: string): void {
    this.encodedList = encodedList;
    this.updatedAt = new Date();
  }

  /**
   * Increments the used entries count
   */
  incrementUsedEntries(): void {
    this.usedEntries++;
    this.updatedAt = new Date();
  }

  /**
   * Checks if the status list has available capacity
   */
  hasCapacity(): boolean {
    return this.usedEntries < this.totalEntries;
  }

  /**
   * Gets the next available index in the status list
   */
  getNextAvailableIndex(): number {
    if (!this.hasCapacity()) {
      throw new Error('Status list is at full capacity');
    }
    return this.usedEntries;
  }

  /**
   * Converts to BitstringStatusList format for credential subject
   */
  toBitstringStatusList(): BitstringStatusList {
    const statusList: BitstringStatusList = {
      id: this.id as Shared.IRI,
      type: 'BitstringStatusList',
      statusPurpose: this.purpose,
      encodedList: this.encodedList,
    };

    if (this.ttl !== undefined) {
      statusList.ttl = this.ttl;
    }

    if (this.statusSize > 1) {
      statusList.statusSize = this.statusSize;
      // Add default status messages for different values
      statusList.statusMessages = this.generateDefaultStatusMessagesInternal();
    }

    return statusList;
  }

  /**
   * Converts to BitstringStatusListCredential format
   */
  toBitstringStatusListCredential(issuerData: {
    id: string;
    name?: string;
    url?: string;
  }): BitstringStatusListCredential {
    const credential: BitstringStatusListCredential = {
      '@context': ['https://www.w3.org/ns/credentials/v2'],
      id: this.id as Shared.IRI,
      type: ['VerifiableCredential', 'BitstringStatusListCredential'],
      issuer: issuerData.id as Shared.IRI,
      validFrom: this.createdAt.toISOString(),
      credentialSubject: this.toBitstringStatusList(),
    };

    if (this.ttl) {
      // Calculate validUntil based on TTL
      const validUntil = new Date(this.createdAt.getTime() + this.ttl);
      credential.validUntil = validUntil.toISOString();
    }

    return credential;
  }

  /**
   * Generates default status messages for multi-bit status entries
   */
  private generateDefaultStatusMessagesInternal(): StatusMessage[] {
    const maxValues = Math.pow(2, this.statusSize);
    const messages: StatusMessage[] = [];

    for (let i = 0; i < maxValues; i++) {
      const hexValue = `0x${i.toString(16).toUpperCase()}`;
      let message: string;

      switch (this.purpose) {
        case StatusPurpose.REVOCATION:
          message = i === 0 ? 'not_revoked' : 'revoked';
          break;
        case StatusPurpose.SUSPENSION:
          message = i === 0 ? 'not_suspended' : 'suspended';
          break;
        case StatusPurpose.REFRESH:
          message = i === 0 ? 'no_refresh_needed' : 'refresh_available';
          break;
        case StatusPurpose.MESSAGE:
          message = i === 0 ? 'no_message' : `message_${i}`;
          break;
        default:
          message = i === 0 ? 'unset' : 'set';
      }

      messages.push({
        status: hexValue,
        message,
      });
    }

    return messages;
  }

  /**
   * Encodes a bitstring using GZIP compression and base64url encoding
   */
  static async encodeBitstring(bitstring: Uint8Array): Promise<string> {
    const { BitstringUtils } = await import('@/utils/bitstring/bitstring.utils');
    return BitstringUtils.encodeBitstring(bitstring);
  }

  /**
   * Decodes a bitstring from the encoded format
   */
  static async decodeBitstring(encodedList: string): Promise<Uint8Array> {
    const { BitstringUtils } = await import('@/utils/bitstring/bitstring.utils');
    return BitstringUtils.decodeBitstring(encodedList);
  }

  /**
   * Validates status list parameters
   */
  static validateParams(params: CreateStatusListParams): void {
    if (!params.issuerId) {
      throw new Error('issuerId is required');
    }

    if (!Object.values(StatusPurpose).includes(params.purpose)) {
      throw new Error(`Invalid status purpose: ${params.purpose}`);
    }

    if (params.statusSize && (params.statusSize < 1 || params.statusSize > 8)) {
      throw new Error('statusSize must be between 1 and 8 bits');
    }

    if (params.totalEntries && params.totalEntries < 131072) {
      throw new Error('totalEntries must be at least 131,072 for privacy');
    }

    if (params.ttl && params.ttl < 0) {
      throw new Error('ttl must be non-negative');
    }
  }

  /**
   * Generates default status messages for multi-bit status entries (public method)
   */
  generateDefaultStatusMessages(): StatusMessage[] {
    return this.generateDefaultStatusMessagesInternal();
  }

  /**
   * Converts to database data format
   */
  toData(): StatusListData {
    return {
      id: this.id,
      issuerId: this.issuerId,
      purpose: this.purpose,
      statusSize: this.statusSize,
      encodedList: this.encodedList,
      ttl: this.ttl,
      totalEntries: this.totalEntries,
      usedEntries: this.usedEntries,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      metadata: this.metadata,
    };
  }
}
