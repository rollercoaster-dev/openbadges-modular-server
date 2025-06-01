/**
 * StatusList Controller for StatusList2021 API endpoints
 * 
 * This controller handles HTTP requests for StatusList2021 operations,
 * implementing the W3C StatusList2021 specification for Open Badges v3.0 compliance.
 */

import { Context } from 'hono';
import { Shared } from 'openbadges-types';
import { StatusListService } from '../../core/status-list.service';
import { 
  StatusList2021Credential,
  UpdateCredentialStatusRequest,
  UpdateCredentialStatusResponse,
  CredentialStatus
} from '../../core/types/status-list.types';
import { logger } from '../../utils/logging/logger.service';
import { BadRequestError } from '../../infrastructure/errors/bad-request.error';
import { NotFoundError } from '../../infrastructure/errors/not-found.error';

/**
 * StatusList Controller
 */
export class StatusListController {
  constructor(private readonly statusListService: StatusListService) {}

  /**
   * Gets a status list credential by ID
   * GET /v3/status-lists/:id
   */
  async getStatusList(c: Context): Promise<Response> {
    try {
      const id = c.req.param('id') as Shared.IRI;
      
      if (!id) {
        throw new BadRequestError('Status list ID is required');
      }

      logger.info('Getting status list credential', { statusListId: id });

      const statusListCredential = await this.statusListService.getStatusListCredential(id);
      
      if (!statusListCredential) {
        throw new NotFoundError(`Status list not found: ${id}`);
      }

      logger.info('Status list credential retrieved successfully', { 
        statusListId: id,
        purpose: statusListCredential.credentialSubject.statusPurpose
      });

      return c.json(statusListCredential);
    } catch (error) {
      logger.error('Failed to get status list credential', {
        error: error instanceof Error ? error.message : String(error),
        statusListId: c.req.param('id')
      });

      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        throw error;
      }

      throw new Error(`Failed to get status list: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Updates a credential's status
   * POST /v3/credentials/:id/status
   */
  async updateCredentialStatus(c: Context): Promise<Response> {
    try {
      const credentialId = c.req.param('id') as Shared.IRI;
      
      if (!credentialId) {
        throw new BadRequestError('Credential ID is required');
      }

      const body = await c.req.json();
      
      // Validate request body
      if (!body || typeof body !== 'object') {
        throw new BadRequestError('Request body is required');
      }

      if (!('status' in body) || typeof body.status !== 'number') {
        throw new BadRequestError('Status field is required and must be a number');
      }

      if (body.status !== CredentialStatus.VALID && body.status !== CredentialStatus.REVOKED_OR_SUSPENDED) {
        throw new BadRequestError('Status must be 0 (valid) or 1 (revoked/suspended)');
      }

      const request: UpdateCredentialStatusRequest = {
        status: body.status as CredentialStatus,
        reason: body.reason ? String(body.reason) : undefined
      };

      logger.info('Updating credential status', { 
        credentialId,
        newStatus: request.status,
        reason: request.reason
      });

      const response = await this.statusListService.updateCredentialStatus(credentialId, request);

      logger.info('Credential status updated successfully', {
        credentialId,
        statusListId: response.statusListId,
        statusListIndex: response.statusListIndex,
        newStatus: response.status
      });

      return c.json(response);
    } catch (error) {
      logger.error('Failed to update credential status', {
        error: error instanceof Error ? error.message : String(error),
        credentialId: c.req.param('id')
      });

      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        throw error;
      }

      throw new Error(`Failed to update credential status: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Gets a credential's current status
   * GET /v3/credentials/:id/status
   */
  async getCredentialStatus(c: Context): Promise<Response> {
    try {
      const credentialId = c.req.param('id') as Shared.IRI;
      
      if (!credentialId) {
        throw new BadRequestError('Credential ID is required');
      }

      logger.info('Getting credential status', { credentialId });

      const statusEntry = await this.statusListService.getCredentialStatus(credentialId);
      
      if (!statusEntry) {
        throw new NotFoundError(`No status entry found for credential: ${credentialId}`);
      }

      logger.info('Credential status retrieved successfully', {
        credentialId,
        statusListId: statusEntry.statusListId,
        statusListIndex: statusEntry.statusListIndex,
        status: statusEntry.status
      });

      return c.json({
        credentialId: statusEntry.credentialId,
        statusListId: statusEntry.statusListId,
        statusListIndex: statusEntry.statusListIndex,
        status: statusEntry.status,
        reason: statusEntry.reason,
        updatedAt: statusEntry.updatedAt
      });
    } catch (error) {
      logger.error('Failed to get credential status', {
        error: error instanceof Error ? error.message : String(error),
        credentialId: c.req.param('id')
      });

      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        throw error;
      }

      throw new Error(`Failed to get credential status: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Creates a status list for an issuer and purpose
   * POST /v3/status-lists
   */
  async createStatusList(c: Context): Promise<Response> {
    try {
      const body = await c.req.json();
      
      // Validate request body
      if (!body || typeof body !== 'object') {
        throw new BadRequestError('Request body is required');
      }

      if (!body.issuerId || typeof body.issuerId !== 'string') {
        throw new BadRequestError('issuerId field is required and must be a string');
      }

      if (!body.purpose || typeof body.purpose !== 'string') {
        throw new BadRequestError('purpose field is required and must be a string');
      }

      if (body.purpose !== 'revocation' && body.purpose !== 'suspension') {
        throw new BadRequestError('purpose must be "revocation" or "suspension"');
      }

      const options = {
        issuerId: body.issuerId as Shared.IRI,
        purpose: body.purpose as 'revocation' | 'suspension',
        size: body.size && typeof body.size === 'number' ? body.size : undefined
      };

      logger.info('Creating status list', options);

      const statusList = await this.statusListService.createStatusList(options);

      logger.info('Status list created successfully', {
        statusListId: statusList.id,
        issuerId: statusList.issuerId,
        purpose: statusList.purpose,
        size: statusList.size
      });

      return c.json(statusList, 201);
    } catch (error) {
      logger.error('Failed to create status list', {
        error: error instanceof Error ? error.message : String(error)
      });

      if (error instanceof BadRequestError) {
        throw error;
      }

      throw new Error(`Failed to create status list: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Assigns a credential to a status list
   * POST /v3/credentials/:id/assign-status
   */
  async assignCredentialToStatusList(c: Context): Promise<Response> {
    try {
      const credentialId = c.req.param('id') as Shared.IRI;
      
      if (!credentialId) {
        throw new BadRequestError('Credential ID is required');
      }

      const body = await c.req.json();
      
      // Validate request body
      if (!body || typeof body !== 'object') {
        throw new BadRequestError('Request body is required');
      }

      if (!body.issuerId || typeof body.issuerId !== 'string') {
        throw new BadRequestError('issuerId field is required and must be a string');
      }

      if (!body.purpose || typeof body.purpose !== 'string') {
        throw new BadRequestError('purpose field is required and must be a string');
      }

      if (body.purpose !== 'revocation' && body.purpose !== 'suspension') {
        throw new BadRequestError('purpose must be "revocation" or "suspension"');
      }

      logger.info('Assigning credential to status list', {
        credentialId,
        issuerId: body.issuerId,
        purpose: body.purpose
      });

      const statusEntry = await this.statusListService.assignCredentialToStatusList(
        credentialId,
        body.issuerId as Shared.IRI,
        body.purpose as 'revocation' | 'suspension'
      );

      logger.info('Credential assigned to status list successfully', {
        credentialId,
        statusListId: statusEntry.statusListId,
        statusListIndex: statusEntry.statusListIndex,
        statusEntryId: statusEntry.id
      });

      return c.json(statusEntry, 201);
    } catch (error) {
      logger.error('Failed to assign credential to status list', {
        error: error instanceof Error ? error.message : String(error),
        credentialId: c.req.param('id')
      });

      if (error instanceof BadRequestError) {
        throw error;
      }

      throw new Error(`Failed to assign credential to status list: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
