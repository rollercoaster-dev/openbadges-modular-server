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

/**
 * Service factory for creating and wiring up services
 */
export class ServiceFactory {
  private static statusListService: StatusListService | null = null;
  private static assertionService: AssertionService | null = null;

  /**
   * Creates or returns the singleton StatusListService instance
   */
  static async createStatusListService(): Promise<StatusListService> {
    if (!ServiceFactory.statusListService) {
      try {
        logger.info('Creating StatusListService');

        // Create repositories
        const statusListRepository = await RepositoryFactory.createStatusListRepository();
        const credentialStatusEntryRepository = await RepositoryFactory.createCredentialStatusEntryRepository();

        // Create the service
        ServiceFactory.statusListService = new StatusListService(
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

    return ServiceFactory.statusListService;
  }

  /**
   * Creates or returns the singleton AssertionService instance
   */
  static async createAssertionService(): Promise<AssertionService> {
    if (!ServiceFactory.assertionService) {
      try {
        logger.info('Creating AssertionService');

        // Create repositories
        const assertionRepository = await RepositoryFactory.createAssertionRepository();
        const badgeClassRepository = await RepositoryFactory.createBadgeClassRepository();
        const issuerRepository = await RepositoryFactory.createIssuerRepository();

        // Create StatusListService
        const statusListService = await ServiceFactory.createStatusListService();

        // Create the service
        ServiceFactory.assertionService = new AssertionService(
          assertionRepository,
          badgeClassRepository,
          issuerRepository,
          statusListService
        );

        logger.info('AssertionService created successfully');
      } catch (error) {
        logger.error('Failed to create AssertionService', {
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    }

    return ServiceFactory.assertionService;
  }

  /**
   * Creates an AssertionController with StatusList integration
   */
  static async createAssertionController(): Promise<AssertionController> {
    try {
      logger.info('Creating AssertionController with StatusList integration');

      // Create repositories
      const assertionRepository = await RepositoryFactory.createAssertionRepository();
      const badgeClassRepository = await RepositoryFactory.createBadgeClassRepository();
      const issuerRepository = await RepositoryFactory.createIssuerRepository();

      // Create AssertionService
      const assertionService = await ServiceFactory.createAssertionService();

      // Create the controller
      const controller = new AssertionController(
        assertionRepository,
        badgeClassRepository,
        issuerRepository,
        assertionService
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
  static async createStatusListController(): Promise<StatusListController> {
    try {
      logger.info('Creating StatusListController');

      // Create StatusListService
      const statusListService = await ServiceFactory.createStatusListService();

      // Create the controller
      const controller = new StatusListController(statusListService);

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
  static async createLegacyAssertionController(): Promise<AssertionController> {
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
  static reset(): void {
    ServiceFactory.statusListService = null;
    ServiceFactory.assertionService = null;
    logger.info('ServiceFactory reset - all singleton instances cleared');
  }

  /**
   * Checks if StatusList functionality is available
   */
  static isStatusListAvailable(): boolean {
    return ServiceFactory.statusListService !== null;
  }

  /**
   * Gets the current StatusListService instance (if available)
   */
  static getStatusListService(): StatusListService | null {
    return ServiceFactory.statusListService;
  }

  /**
   * Gets the current AssertionService instance (if available)
   */
  static getAssertionService(): AssertionService | null {
    return ServiceFactory.assertionService;
  }
}
