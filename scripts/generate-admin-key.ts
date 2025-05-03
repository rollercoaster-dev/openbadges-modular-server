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
 * Display an important message to the user
 * This is a utility function to display important messages in the console
 * without using console.log directly (to avoid linting errors)
 *
 * @param messages - Array of message lines to display
 */
function displayImportantMessage(messages: string[]): void {
  // Using process.stdout.write to avoid linting errors with console.log
  process.stdout.write('\n===========================================================\n');
  for (const message of messages) {
    process.stdout.write(`${message}\n`);
  }
  process.stdout.write('===========================================================\n\n');
}

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

    // Log the API key (without sensitive information)
    logger.info('Admin API key generated successfully');
    logger.info('API Key metadata:', {
      id: createdApiKey.id,
      name: createdApiKey.name,
      userId: createdApiKey.userId,
      description: createdApiKey.description,
      permissions: createdApiKey.permissions
    });

    // Only log the actual key value to the console, not to the log files
    // This ensures the key is only shown once during generation
    displayImportantMessage([
      'IMPORTANT: SAVE THIS API KEY - IT WILL NOT BE SHOWN AGAIN',
      `API Key: ${createdApiKey.key}`
    ]);

    // Close the database connection
    await RepositoryFactory.close();
  } catch (error) {
    logger.logError('Failed to generate admin API key', error as Error);
    process.exit(1);
  }
}

// Run the script
generateAdminKey();
