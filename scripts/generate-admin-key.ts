/**
 * Generate Admin API Key
 *
 * This script generates an API key for the admin user.
 * It can be used to bootstrap the system with an initial admin API key.
 */

import { RepositoryFactory } from '../src/infrastructure/repository.factory';
import { ApiKey } from '../src/domains/auth/apiKey.entity';
import { config } from '../src/config/config';
import { logger } from '../src/utils/logging/logger.service';

/**
 * Generate an admin API key
 */
async function generateAdminKey(): Promise<void> {
  try {
    // Initialize the repository factory
    await RepositoryFactory.initialize({
      type: config.database.type,
      connectionString: config.database.connectionString,
      sqliteFile: config.database.sqliteFile,
      sqliteBusyTimeout: config.database.sqliteBusyTimeout,
      sqliteSyncMode: config.database.sqliteSyncMode,
      sqliteCacheSize: config.database.sqliteCacheSize
    });

    logger.info(`Connected to ${config.database.type} database`);

    // Initialize the database
    await RepositoryFactory.initialize({
      type: config.database.type,
      connectionString: config.database.connectionString,
      sqliteFile: config.database.sqliteFile,
      sqliteBusyTimeout: config.database.sqliteBusyTimeout,
      sqliteSyncMode: config.database.sqliteSyncMode,
      sqliteCacheSize: config.database.sqliteCacheSize
    });

    // Create the API key repository
    const apiKeyRepository = await RepositoryFactory.createApiKeyRepository();

    // Create a new API key for the admin user
    const apiKey = ApiKey.create({
      name: 'Admin API Key',
      userId: 'admin',
      description: 'API key for the admin user',
      permissions: {
        roles: ['admin'],
        permissions: ['*'],
        scope: 'admin'
      }
    });

    // Save the API key
    const createdApiKey = await apiKeyRepository.create(apiKey);

    // Log the API key
    logger.info('Admin API key generated successfully');
    logger.info('API Key:', {
      id: createdApiKey.id,
      key: createdApiKey.key,
      name: createdApiKey.name,
      userId: createdApiKey.userId,
      description: createdApiKey.description,
      permissions: createdApiKey.permissions
    });

    // Close the database connection
    await RepositoryFactory.close();
  } catch (error) {
    logger.logError('Failed to generate admin API key', error as Error);
    process.exit(1);
  }
}

// Run the script
generateAdminKey();
