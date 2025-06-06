/**
 * Database Synchronization Helper for E2E Tests
 *
 * This helper provides simple mechanisms to ensure database operations are committed
 * before proceeding with HTTP requests or other operations that depend on the data.
 *
 * Uses simple, reliable approaches instead of complex polling mechanisms.
 */

/**
 * Ensures database transaction is committed by using a simple delay.
 *
 * This function uses a minimal delay to ensure database operations are committed.
 * For most E2E test scenarios, a simple delay is sufficient and more reliable
 * than complex polling mechanisms that can cause infinite loops.
 *
 * @param delayMs Optional delay in milliseconds (default: 10ms)
 */
export async function ensureTransactionCommitted(
  delayMs: number = 10
): Promise<void> {
  // Simple delay to allow database operations to complete
  await new Promise((resolve) => setTimeout(resolve, delayMs));
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
        throw lastError;
      }

      // Calculate exponential backoff delay
      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // This should never be reached, but TypeScript requires it
  throw lastError || new Error('Unknown error in retry operation');
}

/**
 * Creates a test utility that polls until expected condition is met
 *
 * This is useful for scenarios where you need to wait for specific conditions
 * to become true.
 *
 * @param checkFunction Function that returns true when the expected condition is met
 * @param maxAttempts Maximum number of attempts (default: 10)
 * @param delayMs Delay between attempts in milliseconds (default: 50ms)
 * @returns Promise that resolves when the condition is met
 */
export async function pollUntilCondition(
  checkFunction: () => Promise<boolean>,
  maxAttempts: number = 10,
  delayMs: number = 50
): Promise<void> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const conditionMet = await checkFunction();
      if (conditionMet) {
        return;
      }
    } catch (_error) {
      // Continue polling even if check function throws
    }

    // Wait before next attempt
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error(`Condition polling failed after ${maxAttempts} attempts`);
}
