/**
 * Assertion Service for handling assertion business logic
 * 
 * This service handles the business logic for assertions, including integration
 * with StatusList2021 for credential status management.
 */

import { Shared } from 'openbadges-types';
import { Assertion } from './assertion.entity';
import { AssertionRepository } from './assertion.repository';
import { BadgeClassRepository } from '../badgeClass/badgeClass.repository';
import { IssuerRepository } from '../issuer/issuer.repository';
import { StatusListService } from '../../core/status-list.service';
import { 
  StatusList2021Entry,
  CredentialStatus,
  StatusPurpose
} from '../../core/types/status-list.types';
import { logger } from '../../utils/logging/logger.service';
import { BadRequestError } from '../../infrastructure/errors/bad-request.error';
import { NotFoundError } from '../../infrastructure/errors/not-found.error';

/**
 * Service for assertion business logic
 */
export class AssertionService {
  constructor(
    private readonly assertionRepository: AssertionRepository,
    private readonly badgeClassRepository: BadgeClassRepository,
    private readonly issuerRepository: IssuerRepository,
    private readonly statusListService: StatusListService
  ) {}

  /**
   * Creates a new assertion with proper StatusList2021 integration
   */
  async createAssertion(assertionData: Partial<Assertion>): Promise<Assertion> {
    try {
      logger.info('Creating assertion with StatusList integration', {
        badgeClass: assertionData.badgeClass,
        recipient: assertionData.recipient
      });

      // Validate that the badge class exists
      if (!assertionData.badgeClass) {
        throw new BadRequestError('Badge class ID is required');
      }

      const badgeClass = await this.badgeClassRepository.findById(assertionData.badgeClass);
      if (!badgeClass) {
        throw new NotFoundError(`Badge class with ID ${assertionData.badgeClass} does not exist`);
      }

      // Get the issuer
      const issuerId = typeof badgeClass.issuer === 'string' 
        ? badgeClass.issuer 
        : badgeClass.issuer.id;
      
      const issuer = await this.issuerRepository.findById(issuerId);
      if (!issuer) {
        throw new NotFoundError(`Issuer with ID ${issuerId} does not exist`);
      }

      // Create the assertion entity
      const assertion = Assertion.create(assertionData);

      // Assign the assertion to a status list for revocation tracking
      const statusEntry = await this.statusListService.assignCredentialToStatusList(
        assertion.id,
        issuerId,
        'revocation' as StatusPurpose
      );

      // Get the status list to create the proper credentialStatus
      const statusList = await this.statusListService.getStatusList(statusEntry.statusListId);
      if (!statusList) {
        throw new Error(`Status list ${statusEntry.statusListId} not found`);
      }

      // Create the StatusList2021Entry for the assertion
      const credentialStatus = this.statusListService.createStatusList2021Entry(
        assertion.id,
        statusEntry,
        statusList
      );

      // Update the assertion with the proper credentialStatus
      assertion.credentialStatus = credentialStatus;

      // Save the assertion
      const createdAssertion = await this.assertionRepository.create(assertion);

      logger.info('Assertion created successfully with StatusList integration', {
        assertionId: createdAssertion.id,
        statusListId: statusEntry.statusListId,
        statusListIndex: statusEntry.statusListIndex
      });

      return createdAssertion;
    } catch (error) {
      logger.error('Failed to create assertion with StatusList integration', {
        error: error instanceof Error ? error.message : String(error),
        badgeClass: assertionData.badgeClass
      });
      throw error;
    }
  }

  /**
   * Revokes an assertion using StatusList2021
   */
  async revokeAssertion(assertionId: Shared.IRI, reason: string): Promise<Assertion | null> {
    try {
      logger.info('Revoking assertion using StatusList', {
        assertionId,
        reason
      });

      // Get the assertion
      const assertion = await this.assertionRepository.findById(assertionId);
      if (!assertion) {
        throw new NotFoundError(`Assertion with ID ${assertionId} not found`);
      }

      // Update the credential status in the status list
      await this.statusListService.updateCredentialStatus(assertionId, {
        status: CredentialStatus.REVOKED_OR_SUSPENDED,
        reason
      });

      // Update the assertion entity
      const updatedAssertion = await this.assertionRepository.update(assertionId, {
        revoked: true,
        revocationReason: reason
      });

      if (!updatedAssertion) {
        throw new Error(`Failed to update assertion ${assertionId}`);
      }

      logger.info('Assertion revoked successfully', {
        assertionId,
        reason
      });

      return updatedAssertion;
    } catch (error) {
      logger.error('Failed to revoke assertion', {
        error: error instanceof Error ? error.message : String(error),
        assertionId,
        reason
      });
      throw error;
    }
  }

  /**
   * Reinstates a revoked assertion
   */
  async reinstateAssertion(assertionId: Shared.IRI): Promise<Assertion | null> {
    try {
      logger.info('Reinstating assertion using StatusList', {
        assertionId
      });

      // Get the assertion
      const assertion = await this.assertionRepository.findById(assertionId);
      if (!assertion) {
        throw new NotFoundError(`Assertion with ID ${assertionId} not found`);
      }

      // Update the credential status in the status list
      await this.statusListService.updateCredentialStatus(assertionId, {
        status: CredentialStatus.VALID,
        reason: 'Reinstated'
      });

      // Update the assertion entity
      const updatedAssertion = await this.assertionRepository.update(assertionId, {
        revoked: false,
        revocationReason: undefined
      });

      if (!updatedAssertion) {
        throw new Error(`Failed to update assertion ${assertionId}`);
      }

      logger.info('Assertion reinstated successfully', {
        assertionId
      });

      return updatedAssertion;
    } catch (error) {
      logger.error('Failed to reinstate assertion', {
        error: error instanceof Error ? error.message : String(error),
        assertionId
      });
      throw error;
    }
  }

  /**
   * Gets an assertion with its current status from the status list
   */
  async getAssertionWithStatus(assertionId: Shared.IRI): Promise<Assertion | null> {
    try {
      const assertion = await this.assertionRepository.findById(assertionId);
      if (!assertion) {
        return null;
      }

      // Get the current status from the status list
      const statusEntry = await this.statusListService.getCredentialStatus(assertionId);
      if (statusEntry) {
        // Update the assertion's revoked status based on the status list
        assertion.revoked = statusEntry.status === CredentialStatus.REVOKED_OR_SUSPENDED;
        if (statusEntry.reason) {
          assertion.revocationReason = statusEntry.reason;
        }
      }

      return assertion;
    } catch (error) {
      logger.error('Failed to get assertion with status', {
        error: error instanceof Error ? error.message : String(error),
        assertionId
      });
      throw error;
    }
  }

  /**
   * Verifies an assertion's status against the status list
   */
  async verifyAssertionStatus(assertionId: Shared.IRI): Promise<{
    isValid: boolean;
    reason?: string;
    statusListEntry?: any;
  }> {
    try {
      // Get the assertion
      const assertion = await this.assertionRepository.findById(assertionId);
      if (!assertion) {
        return {
          isValid: false,
          reason: 'Assertion not found'
        };
      }

      // Check the status list
      const statusEntry = await this.statusListService.getCredentialStatus(assertionId);
      if (!statusEntry) {
        // If no status entry exists, assume the assertion is valid
        return {
          isValid: true
        };
      }

      const isValid = statusEntry.status === CredentialStatus.VALID;
      
      return {
        isValid,
        reason: isValid ? undefined : (statusEntry.reason || 'Credential has been revoked or suspended'),
        statusListEntry: statusEntry
      };
    } catch (error) {
      logger.error('Failed to verify assertion status', {
        error: error instanceof Error ? error.message : String(error),
        assertionId
      });
      return {
        isValid: false,
        reason: 'Error verifying status'
      };
    }
  }

  /**
   * Updates an assertion's credentialStatus to reflect current status list information
   */
  async updateAssertionCredentialStatus(assertionId: Shared.IRI): Promise<Assertion | null> {
    try {
      const assertion = await this.assertionRepository.findById(assertionId);
      if (!assertion) {
        return null;
      }

      // Get the current status entry
      const statusEntry = await this.statusListService.getCredentialStatus(assertionId);
      if (!statusEntry) {
        return assertion; // No status entry, return as-is
      }

      // Get the status list
      const statusList = await this.statusListService.getStatusList(statusEntry.statusListId);
      if (!statusList) {
        return assertion; // No status list, return as-is
      }

      // Create the updated credentialStatus
      const credentialStatus = this.statusListService.createStatusList2021Entry(
        assertion.id,
        statusEntry,
        statusList
      );

      // Update the assertion
      const updatedAssertion = await this.assertionRepository.update(assertionId, {
        credentialStatus,
        revoked: statusEntry.status === CredentialStatus.REVOKED_OR_SUSPENDED,
        revocationReason: statusEntry.reason
      });

      return updatedAssertion;
    } catch (error) {
      logger.error('Failed to update assertion credential status', {
        error: error instanceof Error ? error.message : String(error),
        assertionId
      });
      throw error;
    }
  }
}
