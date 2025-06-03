/**
 * StatusList Controller
 *
 * This controller provides endpoints for managing Bitstring Status Lists
 * according to the W3C Bitstring Status List v1.0 specification.
 */

import { StatusListService } from '../../core/status-list.service';
import { StatusListRepository } from '../../domains/status-list/status-list.repository';
import {
  StatusPurpose,
  CreateStatusListParams,
  UpdateCredentialStatusParams,
  StatusListQueryParams
} from '../../domains/status-list/status-list.types';
import {
  CreateStatusListDto,
  UpdateCredentialStatusDto,
  BatchUpdateCredentialStatusDto,
  StatusListQueryDto,
  StatusListResponseDto,
  CredentialStatusEntryResponseDto,
  StatusUpdateResponseDto,
  BatchStatusUpdateResponseDto,
  StatusListStatsResponseDto,
  BitstringStatusListCredentialResponseDto,
  StatusListValidationResponseDto,
  StatusListSearchDto,
  PaginatedStatusListResponseDto
} from '../dtos/status-list.dto';
import { logger } from '../../utils/logging/logger.service';
import { BadRequestError, NotFoundError, InternalServerError } from '../../utils/errors/api.errors';

/**
 * Controller for status list-related endpoints
 */
export class StatusListController {
  private readonly statusListService: StatusListService;
  private readonly statusListRepository: StatusListRepository;

  constructor(statusListRepository: StatusListRepository) {
    this.statusListRepository = statusListRepository;
    this.statusListService = new StatusListService(statusListRepository);
  }

  /**
   * Creates a new status list
   * @param data The status list creation data
   * @param issuerId The ID of the issuer creating the status list
   * @returns The created status list
   */
  async createStatusList(
    data: CreateStatusListDto,
    issuerId: string
  ): Promise<StatusListResponseDto> {
    try {
      logger.info('Creating status list', {
        issuerId,
        purpose: data.purpose,
        statusSize: data.statusSize
      });

      // Validate input
      if (!Object.values(StatusPurpose).includes(data.purpose)) {
        throw new BadRequestError(`Invalid status purpose: ${data.purpose}`);
      }

      if (data.statusSize && ![1, 2, 4, 8].includes(data.statusSize)) {
        throw new BadRequestError('Status size must be 1, 2, 4, or 8 bits');
      }

      if (data.totalEntries && data.totalEntries < 131072) {
        throw new BadRequestError('Total entries must be at least 131,072');
      }

      const params: CreateStatusListParams = {
        issuerId,
        purpose: data.purpose,
        statusSize: data.statusSize,
        totalEntries: data.totalEntries,
        ttl: data.ttl,
        metadata: data.metadata
      };

      const statusList = await this.statusListService.createStatusList(params);

      return this.toStatusListResponseDto(statusList);
    } catch (error) {
      logger.error('Failed to create status list', {
        error: error instanceof Error ? error.message : String(error),
        issuerId,
        data
      });

      if (error instanceof BadRequestError) {
        throw error;
      }

      throw new InternalServerError('Failed to create status list');
    }
  }

  /**
   * Gets a status list by ID
   * @param id The status list ID
   * @returns The status list or null if not found
   */
  async getStatusListById(id: string): Promise<StatusListResponseDto | null> {
    try {
      logger.debug('Retrieving status list', { id });

      const statusList = await this.statusListService.getStatusList(id);
      if (!statusList) {
        return null;
      }

      return this.toStatusListResponseDto(statusList);
    } catch (error) {
      logger.error('Failed to retrieve status list', {
        error: error instanceof Error ? error.message : String(error),
        id
      });

      throw new InternalServerError('Failed to retrieve status list');
    }
  }

  /**
   * Gets a status list as a Bitstring Status List Credential
   * @param id The status list ID
   * @param issuerData Issuer information for the credential
   * @returns The status list credential or null if not found
   */
  async getStatusListCredential(
    id: string,
    issuerData: { id: string; name?: string; url?: string }
  ): Promise<BitstringStatusListCredentialResponseDto | null> {
    try {
      logger.debug('Retrieving status list credential', { id, issuerId: issuerData.id });

      const statusList = await this.statusListService.getStatusList(id);
      if (!statusList) {
        return null;
      }

      return this.statusListService.toStatusListCredential(statusList, issuerData);
    } catch (error) {
      logger.error('Failed to retrieve status list credential', {
        error: error instanceof Error ? error.message : String(error),
        id,
        issuerId: issuerData.id
      });

      throw new InternalServerError('Failed to retrieve status list credential');
    }
  }

  /**
   * Finds status lists matching the given criteria
   * @param params Query parameters
   * @returns Array of matching status lists
   */
  async findStatusLists(params: StatusListQueryDto): Promise<StatusListResponseDto[]> {
    try {
      logger.debug('Finding status lists', params);

      const queryParams: StatusListQueryParams = {
        issuerId: params.issuerId,
        purpose: params.purpose,
        statusSize: params.statusSize,
        hasCapacity: params.hasCapacity,
        limit: params.limit,
        offset: params.offset
      };

      const statusLists = await this.statusListService.findStatusLists(queryParams);

      return statusLists.map(statusList => this.toStatusListResponseDto(statusList));
    } catch (error) {
      logger.error('Failed to find status lists', {
        error: error instanceof Error ? error.message : String(error),
        params
      });

      throw new InternalServerError('Failed to find status lists');
    }
  }

  /**
   * Updates a credential's status
   * @param credentialId The credential ID
   * @param data The status update data
   * @returns The result of the status update operation
   */
  async updateCredentialStatus(
    credentialId: string,
    data: UpdateCredentialStatusDto
  ): Promise<StatusUpdateResponseDto> {
    try {
      logger.info('Updating credential status', {
        credentialId,
        status: data.status,
        purpose: data.purpose,
        reason: data.reason
      });

      // Validate input
      if (!Object.values(StatusPurpose).includes(data.purpose)) {
        throw new BadRequestError(`Invalid status purpose: ${data.purpose}`);
      }

      if (data.status < 0) {
        throw new BadRequestError('Status value must be non-negative');
      }

      const params: UpdateCredentialStatusParams = {
        credentialId,
        status: data.status,
        reason: data.reason,
        purpose: data.purpose
      };

      const result = await this.statusListService.updateCredentialStatus(params);

      return {
        success: result.success,
        statusEntry: result.statusEntry ? this.toCredentialStatusEntryResponseDto(result.statusEntry) : undefined,
        error: result.error,
        details: result.details
      };
    } catch (error) {
      logger.error('Failed to update credential status', {
        error: error instanceof Error ? error.message : String(error),
        credentialId,
        data
      });

      if (error instanceof BadRequestError) {
        throw error;
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Gets statistics for a status list
   * @param id The status list ID
   * @returns Status list statistics
   */
  async getStatusListStats(id: string): Promise<StatusListStatsResponseDto> {
    try {
      logger.debug('Getting status list statistics', { id });

      const stats = await this.statusListRepository.getStatusListStats(id);

      return {
        statusListId: id,
        totalEntries: stats.totalEntries,
        usedEntries: stats.usedEntries,
        availableEntries: stats.availableEntries,
        utilizationPercent: stats.utilizationPercent,
        statusBreakdown: {} // TODO: Implement status breakdown
      };
    } catch (error) {
      logger.error('Failed to get status list statistics', {
        error: error instanceof Error ? error.message : String(error),
        id
      });

      throw new InternalServerError('Failed to get status list statistics');
    }
  }

  /**
   * Validates a status list credential
   * @param credential The credential to validate
   * @returns Validation result
   */
  async validateStatusListCredential(
    credential: any
  ): Promise<StatusListValidationResponseDto> {
    try {
      logger.debug('Validating status list credential', {
        credentialId: credential.id
      });

      const isValid = this.statusListService.validateStatusListCredential(credential);

      return {
        isValid,
        errors: [],
        warnings: [],
        details: {}
      };
    } catch (error) {
      logger.error('Status list credential validation failed', {
        error: error instanceof Error ? error.message : String(error),
        credentialId: credential.id
      });

      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        details: {}
      };
    }
  }

  /**
   * Converts a StatusList entity to a response DTO
   */
  private toStatusListResponseDto(statusList: any): StatusListResponseDto {
    const utilizationPercent = (statusList.usedEntries / statusList.totalEntries) * 100;
    const availableEntries = statusList.totalEntries - statusList.usedEntries;

    return {
      id: statusList.id,
      issuerId: statusList.issuerId,
      purpose: statusList.purpose,
      statusSize: statusList.statusSize,
      totalEntries: statusList.totalEntries,
      usedEntries: statusList.usedEntries,
      ttl: statusList.ttl,
      createdAt: statusList.createdAt.toISOString(),
      updatedAt: statusList.updatedAt.toISOString(),
      metadata: statusList.metadata,
      utilizationPercent: Math.round(utilizationPercent * 100) / 100,
      availableEntries
    };
  }

  /**
   * Converts a CredentialStatusEntry to a response DTO
   */
  private toCredentialStatusEntryResponseDto(entry: any): CredentialStatusEntryResponseDto {
    return {
      id: entry.id,
      credentialId: entry.credentialId,
      statusListId: entry.statusListId,
      statusListIndex: entry.statusListIndex,
      statusSize: entry.statusSize,
      purpose: entry.purpose,
      currentStatus: entry.currentStatus,
      statusReason: entry.statusReason,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString()
    };
  }
}
