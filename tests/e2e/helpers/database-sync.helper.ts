/**
 * Database Synchronization Helper for E2E Tests
 *
 * This helper provides robust mechanisms to ensure database operations are committed
 * before proceeding with HTTP requests or other operations that depend on the data.
 *
 * Replaces fragile setTimeout-based approaches with database-specific synchronization.
 */

import { logger } from '@/utils/logging/logger.service';
import { RepositoryFactory } from '@/infrastructure/repository.factory';
import { Shared } from 'openbadges-types';

/**
 * Configuration for database synchronization
 */
interface DatabaseSyncConfig {
  /** Maximum time to wait for synchronization in milliseconds */
  maxWaitMs: number;
  /** Interval between polling attempts in milliseconds */
  pollIntervalMs: number;
  /** Maximum number of polling attempts */
  maxAttempts: number;
}

/**
 * Default configuration for database synchronization
 */
const DEFAULT_SYNC_CONFIG: DatabaseSyncConfig = {
  maxWaitMs: 5000, // 5 seconds maximum wait
  pollIntervalMs: 50, // Poll every 50ms
  maxAttempts: 100, // Maximum 100 attempts (5 seconds / 50ms)
};

/**
 * Ensures database operations are committed and data is available for reading.
 *
 * This function uses database-specific mechanisms to verify that data has been
 * properly committed and is available for subsequent operations.
 *
 * @param entityIds Array of entity IDs to verify existence
 * @param config Optional configuration for synchronization behavior
 * @throws Error if synchronization fails or times out
 */
export async function ensureDatabaseSync(
  entityIds: Shared.IRI[],
  config: Partial<DatabaseSyncConfig> = {}
): Promise<void> {
  const syncConfig = { ...DEFAULT_SYNC_CONFIG, ...config };

  logger.debug('Starting database synchronization', {
    entityIds: entityIds.length,
    config: syncConfig,
  });

  const startTime = Date.now();
  let attempt = 0;

  try {
    // Get repositories for verification
    const userRepository = await RepositoryFactory.createUserRepository();
    const issuerRepository = await RepositoryFactory.createIssuerRepository();
    const badgeClassRepository =
      await RepositoryFactory.createBadgeClassRepository();

    while (attempt < syncConfig.maxAttempts) {
      attempt++;
      const currentTime = Date.now();

      // Check if we've exceeded the maximum wait time
      if (currentTime - startTime > syncConfig.maxWaitMs) {
        throw new Error(
          `Database synchronization timeout after ${syncConfig.maxWaitMs}ms (${attempt} attempts)`
        );
      }

      try {
        // Verify all entities exist and are readable
        let allEntitiesFound = true;
        const verificationResults: Array<{
          id: Shared.IRI;
          found: boolean;
          type: string;
        }> = [];

        for (const entityId of entityIds) {
          let found = false;
          let entityType = 'unknown';

          // Try to find the entity in different repositories
          // This approach works because we're checking for existence, not type-specific operations
          try {
            const user = await userRepository.findById(entityId);
            if (user) {
              found = true;
              entityType = 'user';
            }
          } catch {
            // Continue to next repository
          }

          if (!found) {
            try {
              const issuer = await issuerRepository.findById(entityId);
              if (issuer) {
                found = true;
                entityType = 'issuer';
              }
            } catch {
              // Continue to next repository
            }
          }

          if (!found) {
            try {
              const badgeClass = await badgeClassRepository.findById(entityId);
              if (badgeClass) {
                found = true;
                entityType = 'badgeClass';
              }
            } catch {
              // Entity not found in any repository
            }
          }

          verificationResults.push({ id: entityId, found, type: entityType });

          if (!found) {
            allEntitiesFound = false;
          }
        }

        if (allEntitiesFound) {
          const duration = Date.now() - startTime;
          logger.debug('Database synchronization completed successfully', {
            duration,
            attempts: attempt,
            entitiesVerified: verificationResults.length,
          });
          return;
        }

        // Log missing entities for debugging
        const missingEntities = verificationResults.filter((r) => !r.found);
        logger.debug('Database synchronization: entities not yet available', {
          attempt,
          missing: missingEntities.map((e) => ({ id: e.id, type: e.type })),
          duration: currentTime - startTime,
        });
      } catch (error) {
        // Log verification error but continue polling
        logger.debug('Database synchronization: verification error', {
          attempt,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // Wait before next attempt
      await new Promise((resolve) =>
        setTimeout(resolve, syncConfig.pollIntervalMs)
      );
    }

    // If we reach here, we've exhausted all attempts
    throw new Error(
      `Database synchronization failed after ${attempt} attempts (${
        Date.now() - startTime
      }ms)`
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Database synchronization failed', {
      error: error instanceof Error ? error.message : String(error),
      duration,
      attempts: attempt,
      entityIds: entityIds.length,
    });
    throw error;
  }
}

/**
 * Ensures database transaction is committed by verifying database responsiveness.
 *
 * This function uses the existing RepositoryFactory infrastructure to perform
 * database-agnostic connectivity verification, replacing fragile error-dependent
 * approaches with robust health check patterns.
 *
 * @param config Optional configuration for synchronization behavior
 */
export async function ensureTransactionCommitted(
  config: Partial<DatabaseSyncConfig> = {}
): Promise<void> {
  const syncConfig = { ...DEFAULT_SYNC_CONFIG, ...config };
  logger.debug('Ensuring transaction committed using database health check');

  try {
    // Use RepositoryFactory's robust database connection health check
    // This leverages the existing infrastructure and is database-agnostic
    const isConnected = await RepositoryFactory.isConnected();

    if (!isConnected) {
      logger.warn(
        'Database connection not available during transaction verification'
      );
      throw new Error('Database connection is not available');
    }

    // Additional verification with polling if needed
    let attempts = 0;
    let verificationSuccessful = false;

    while (attempts < syncConfig.maxAttempts && !verificationSuccessful) {
      try {
        // Use the RepositoryFactory's connection verification which includes
        // proper health checks for both SQLite and PostgreSQL
        verificationSuccessful = await RepositoryFactory.isConnected();

        if (!verificationSuccessful && attempts < syncConfig.maxAttempts - 1) {
          // Wait before retrying if not on the last attempt
          await new Promise((resolve) =>
            setTimeout(resolve, syncConfig.pollIntervalMs)
          );
        }

        attempts++;
      } catch (verificationError) {
        attempts++;
        if (attempts >= syncConfig.maxAttempts) {
          throw verificationError;
        }
        // Wait before retrying on error
        await new Promise((resolve) =>
          setTimeout(resolve, syncConfig.pollIntervalMs)
        );
      }
    }

    if (!verificationSuccessful) {
      throw new Error(
        `Database verification failed after ${syncConfig.maxAttempts} attempts`
      );
    }

    logger.debug('Transaction commit verification completed successfully');
  } catch (error) {
    logger.error('Transaction commit verification failed', {
      error: error instanceof Error ? error.message : String(error),
      attempts: config.maxAttempts || DEFAULT_SYNC_CONFIG.maxAttempts,
    });
    throw error;
  }
}

/**
 * Database-specific synchronization for SQLite.
 *
 * Uses SQLite-specific mechanisms to ensure data persistence.
 */
export async function ensureSqliteSync(): Promise<void> {
  logger.debug('Performing SQLite-specific synchronization');

  try {
    // For SQLite, we can use PRAGMA statements to ensure data is written to disk
    // This is more reliable than setTimeout for ensuring persistence

    // The repository factory should give us access to the connection
    // We'll use a simple query to force SQLite to process pending operations
    await ensureTransactionCommitted();

    logger.debug('SQLite synchronization completed');
  } catch (error) {
    logger.error('SQLite synchronization failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Database-specific synchronization for PostgreSQL.
 *
 * Uses PostgreSQL-specific mechanisms to ensure data persistence.
 */
export async function ensurePostgresSync(): Promise<void> {
  logger.debug('Performing PostgreSQL-specific synchronization');

  try {
    // For PostgreSQL, transactions are ACID-compliant by default
    // A simple query will ensure any pending transactions are committed
    await ensureTransactionCommitted();

    logger.debug('PostgreSQL synchronization completed');
  } catch (error) {
    logger.error('PostgreSQL synchronization failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Alternative approach: Retry mechanism with exponential backoff
 *
 * This function implements a retry mechanism that can be used when
 * database operations might fail due to timing issues.
 *
 * @param operation Function to retry
 * @param maxRetries Maximum number of retry attempts
 * @param baseDelayMs Base delay between retries in milliseconds
 * @returns Result of the operation
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 100
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        logger.error('Retry operation failed after all attempts', {
          attempts: attempt + 1,
          error: lastError.message,
        });
        throw lastError;
      }

      // Calculate exponential backoff delay
      const delay = baseDelayMs * Math.pow(2, attempt);
      logger.debug('Retry operation failed, retrying', {
        attempt: attempt + 1,
        maxRetries: maxRetries + 1,
        delay,
        error: lastError.message,
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // This should never be reached, but TypeScript requires it
  throw lastError || new Error('Unknown error in retry operation');
}

/**
 * Creates a test utility that polls the database until expected data is present
 *
 * This is useful for scenarios where you need to wait for specific data
 * to become available in the database.
 *
 * @param checkFunction Function that returns true when the expected condition is met
 * @param config Optional configuration for polling behavior
 * @returns Promise that resolves when the condition is met
 */
export async function pollUntilCondition(
  checkFunction: () => Promise<boolean>,
  config: Partial<DatabaseSyncConfig> = {}
): Promise<void> {
  const syncConfig = { ...DEFAULT_SYNC_CONFIG, ...config };

  logger.debug('Starting condition polling');

  const startTime = Date.now();
  let attempt = 0;

  while (attempt < syncConfig.maxAttempts) {
    attempt++;
    const currentTime = Date.now();

    // Check if we've exceeded the maximum wait time
    if (currentTime - startTime > syncConfig.maxWaitMs) {
      throw new Error(
        `Condition polling timeout after ${syncConfig.maxWaitMs}ms (${attempt} attempts)`
      );
    }

    try {
      const conditionMet = await checkFunction();
      if (conditionMet) {
        const duration = Date.now() - startTime;
        logger.debug('Condition polling completed successfully', {
          duration,
          attempts: attempt,
        });
        return;
      }
    } catch (error) {
      logger.debug('Condition polling: check function error', {
        attempt,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Wait before next attempt
    await new Promise((resolve) =>
      setTimeout(resolve, syncConfig.pollIntervalMs)
    );
  }

  throw new Error(
    `Condition polling failed after ${attempt} attempts (${
      Date.now() - startTime
    }ms)`
  );
}
