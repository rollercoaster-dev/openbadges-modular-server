/**
 * Service Factory for creating and wiring up services
 * 
 * This factory handles the creation and dependency injection of services,
 * ensuring proper integration between different components.
 */

import { RepositoryFactory } from '../infrastructure/repository.factory';
import { StatusListService } from './status-list.service';
import { AssertionService } from '../domains/assertion/assertion.service';
import { AssertionController } from '../api/controllers/assertion.controller';
import { StatusListController } from '../api/controllers/status-list.controller';
import { logger } from '../utils/logging/logger.service';

// Module-level singleton instances
let statusListService: StatusListService | null = null;
let assertionService: AssertionService | null = null;

/**
 * Creates or returns the singleton StatusListService instance
 *
 * @returns Promise that resolves to the StatusListService instance
 * @throws Error if service creation fails
 *
 * @example
 * ```typescript
 * import { createStatusListService } from './service.factory';
 *
 * const statusListService = await createStatusListService();
 * const statusList = await statusListService.createStatusList({
 *   issuerId: 'https://example.com/issuer/1',
 *   purpose: 'revocation'
 * });
 * ```
 */
export async function createStatusListService(): Promise<StatusListService> {
  if (!statusListService) {
    try {
      logger.info('Creating StatusListService');

      // Create repositories
      const statusListRepository = await RepositoryFactory.createStatusListRepository();
      const credentialStatusEntryRepository = await RepositoryFactory.createCredentialStatusEntryRepository();

      // Create the service
      statusListService = new StatusListService(
        statusListRepository,
        credentialStatusEntryRepository
      );

      logger.info('StatusListService created successfully');
    } catch (error) {
      logger.error('Failed to create StatusListService', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  return statusListService;
}

/**
 * Creates or returns the singleton AssertionService instance
 *
 * @returns Promise that resolves to the AssertionService instance
 * @throws Error if service creation fails
 *
 * @example
 * ```typescript
 * import { createAssertionService } from './service.factory';
 *
 * const assertionService = await createAssertionService();
 * const assertion = await assertionService.createAssertion({
 *   recipient: 'https://example.com/user/1',
 *   badgeClassId: 'https://example.com/badge/1'
 * });
 * ```
 */
export async function createAssertionService(): Promise<AssertionService> {
  if (!assertionService) {
    try {
      logger.info('Creating AssertionService');

      // Create repositories
      const assertionRepository = await RepositoryFactory.createAssertionRepository();
      const badgeClassRepository = await RepositoryFactory.createBadgeClassRepository();
      const issuerRepository = await RepositoryFactory.createIssuerRepository();

      // Create StatusListService
      const statusListServiceInstance = await createStatusListService();

      // Create the service
      assertionService = new AssertionService(
        assertionRepository,
        badgeClassRepository,
        issuerRepository,
        statusListServiceInstance
      );

      logger.info('AssertionService created successfully');
    } catch (error) {
      logger.error('Failed to create AssertionService', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  return assertionService;
}

/**
 * Creates an AssertionController with StatusList integration
 *
 * @returns Promise that resolves to the AssertionController instance
 * @throws Error if controller creation fails
 *
 * @example
 * ```typescript
 * import { createAssertionController } from './service.factory';
 *
 * const controller = await createAssertionController();
 * // Controller is ready to handle assertion requests with status list support
 * ```
 */
export async function createAssertionController(): Promise<AssertionController> {
  try {
    logger.info('Creating AssertionController with StatusList integration');

    // Create repositories
    const assertionRepository = await RepositoryFactory.createAssertionRepository();
    const badgeClassRepository = await RepositoryFactory.createBadgeClassRepository();
    const issuerRepository = await RepositoryFactory.createIssuerRepository();

    // Create AssertionService
    const assertionServiceInstance = await createAssertionService();

    // Create the controller
    const controller = new AssertionController(
      assertionRepository,
      badgeClassRepository,
      issuerRepository,
      assertionServiceInstance
    );

    logger.info('AssertionController created successfully with StatusList integration');
    return controller;
  } catch (error) {
    logger.error('Failed to create AssertionController', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Creates a StatusListController
 */
export async function createStatusListController(): Promise<StatusListController> {
  try {
    logger.info('Creating StatusListController');

    // Create StatusListService
    const statusListServiceInstance = await createStatusListService();

    // Create the controller
    const controller = new StatusListController(statusListServiceInstance);

    logger.info('StatusListController created successfully');
    return controller;
  } catch (error) {
    logger.error('Failed to create StatusListController', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Creates a legacy AssertionController without StatusList integration
 * (for backward compatibility)
 */
export async function createLegacyAssertionController(): Promise<AssertionController> {
  try {
    logger.info('Creating legacy AssertionController without StatusList integration');

    // Create repositories
    const assertionRepository = await RepositoryFactory.createAssertionRepository();
    const badgeClassRepository = await RepositoryFactory.createBadgeClassRepository();
    const issuerRepository = await RepositoryFactory.createIssuerRepository();

    // Create the controller without AssertionService
    const controller = new AssertionController(
      assertionRepository,
      badgeClassRepository,
      issuerRepository
      // No assertionService parameter
    );

    logger.info('Legacy AssertionController created successfully');
    return controller;
  } catch (error) {
    logger.error('Failed to create legacy AssertionController', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Resets all singleton instances (useful for testing)
 */
export function reset(): void {
  statusListService = null;
  assertionService = null;
  logger.info('ServiceFactory reset - all singleton instances cleared');
}

/**
 * Checks if StatusList functionality is available
 */
export function isStatusListAvailable(): boolean {
  return statusListService !== null;
}

/**
 * Gets the current StatusListService instance (if available)
 */
export function getStatusListService(): StatusListService | null {
  return statusListService;
}

/**
 * Gets the current AssertionService instance (if available)
 */
export function getAssertionService(): AssertionService | null {
  return assertionService;
}
