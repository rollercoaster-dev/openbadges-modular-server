/**
 * Port Manager Helper for E2E Tests
 *
 * This utility provides reliable port allocation for E2E tests to avoid
 * port conflicts during parallel test execution or in CI environments.
 *
 * Environment Variables:
 * - DISABLE_PORT_CLEANUP: Set to 'true' to disable automatic port cleanup
 *   process handlers. This prevents interference with test runners that
 *   manage their own cleanup processes.
 */

import getPort, { portNumbers } from 'get-port';
import { logger } from '@/utils/logging/logger.service';

// Cache of allocated ports to avoid conflicts within the same process
const allocatedPorts = new Set<number>();

/**
 * Gets an available ephemeral port from the OS
 * @param preferredPort Optional preferred port number
 * @returns Promise<number> Available port number
 */
export async function getAvailablePort(
  preferredPort?: number
): Promise<number> {
  try {
    const port = await getPort({
      port: preferredPort
        ? [preferredPort, ...portNumbers(10000, 20000)]
        : portNumbers(10000, 20000),
      host: '0.0.0.0',
    });

    // Track the allocated port
    allocatedPorts.add(port);

    logger.info(`Allocated port ${port} for E2E test`);
    return port;
  } catch (error) {
    logger.error('Failed to get available port', {
      error: error instanceof Error ? error.message : String(error),
      preferredPort,
    });
    throw error;
  }
}

/**
 * Releases a port from the allocation cache
 * @param port Port number to release
 */
export function releasePort(port: number): void {
  allocatedPorts.delete(port);
  logger.debug(`Released port ${port}`);
}

/**
 * Gets all currently allocated ports
 * @returns Array of allocated port numbers
 */
export function getAllocatedPorts(): number[] {
  return Array.from(allocatedPorts);
}

/**
 * Clears all allocated ports from the cache
 */
export function clearAllocatedPorts(): void {
  const count = allocatedPorts.size;
  allocatedPorts.clear();
  logger.debug(`Cleared ${count} allocated ports`);
}

// Cleanup allocated ports on process exit for improved robustness
// Only register process handlers if not disabled by environment variable
// This prevents interference with test runners that manage their own cleanup
if (process.env.DISABLE_PORT_CLEANUP !== 'true') {
  process.on('exit', () => {
    clearAllocatedPorts();
  });

  process.on('SIGINT', () => {
    clearAllocatedPorts();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    clearAllocatedPorts();
    process.exit(0);
  });
}
