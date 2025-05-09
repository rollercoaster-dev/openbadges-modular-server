/**
 * Debug utility for badge assertions
 */
import { logger } from '../logging/logger.service';
import { CreateAssertionSchema } from '../../api/validation/assertion.schemas';

/**
 * Validates an assertion data payload against the schema and logs detailed information
 * @param data The assertion data to validate
 * @returns Whether the data is valid
 */
export function validateAssertionData(data: unknown): boolean {
  logger.debug('Validating assertion data', { data });

  const result = CreateAssertionSchema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues;
    logger.error('Assertion validation failed', { 
      issues,
      formattedErrors: result.error.format()
    });
    return false;
  }
  
  logger.debug('Assertion data validated successfully', { 
    validatedData: result.data
  });
  return true;
}
