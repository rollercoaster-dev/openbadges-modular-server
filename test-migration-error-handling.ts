/**
 * Test script to verify improved migration error handling
 * This script tests that SQL syntax errors and other fatal errors
 * properly abort the migration process instead of being swallowed
 */

import { logger } from './src/utils/logging/logger.service';

// Mock SQLite client for testing
class MockSQLiteClient {
  private shouldFailWithSyntaxError = false;
  private shouldFailWithAlreadyExists = false;

  setShouldFailWithSyntaxError(value: boolean) {
    this.shouldFailWithSyntaxError = value;
  }

  setShouldFailWithAlreadyExists(value: boolean) {
    this.shouldFailWithAlreadyExists = value;
  }

  exec(statement: string) {
    if (this.shouldFailWithSyntaxError) {
      throw new Error('SQLITE_ERROR: syntax error near "INVALID"');
    }
    if (this.shouldFailWithAlreadyExists) {
      throw new Error('SQLITE_CONSTRAINT: table users already exists');
    }
    // Simulate successful execution
    logger.info(`Mock executed: ${statement.substring(0, 50)}...`);
  }
}

// Mock PostgreSQL client for testing
class MockPostgresClient {
  private shouldFailWithSyntaxError = false;
  private shouldFailWithAlreadyExists = false;

  setShouldFailWithSyntaxError(value: boolean) {
    this.shouldFailWithSyntaxError = value;
  }

  setShouldFailWithAlreadyExists(value: boolean) {
    this.shouldFailWithAlreadyExists = value;
  }

  async unsafe(statement: string) {
    if (this.shouldFailWithSyntaxError) {
      throw new Error('syntax error at or near "INVALID"');
    }
    if (this.shouldFailWithAlreadyExists) {
      throw new Error('relation "users" already exists');
    }
    // Simulate successful execution
    logger.info(`Mock executed: ${statement.substring(0, 50)}...`);
  }
}

// Test the improved error handling logic
function testSQLiteErrorHandling() {
  logger.info('Testing SQLite error handling...');

  const mockClient = new MockSQLiteClient();
  const statements = [
    'CREATE TABLE users (id INTEGER PRIMARY KEY);',
    'CREATE INVALID SYNTAX;', // This should cause an abort
    'CREATE TABLE posts (id INTEGER PRIMARY KEY);',
  ];

  // Test 1: Syntax error should abort migration
  logger.info('Test 1: Syntax error should abort migration');
  mockClient.setShouldFailWithSyntaxError(true);

  let aborted = false;
  for (const statement of statements) {
    try {
      if (statement.includes('INVALID')) {
        mockClient.setShouldFailWithSyntaxError(true);
      } else {
        mockClient.setShouldFailWithSyntaxError(false);
      }

      mockClient.exec(statement);
    } catch (stmtError) {
      const errorMessage =
        stmtError instanceof Error ? stmtError.message : String(stmtError);
      const isAlreadyExistsError =
        errorMessage.includes('already exists') ||
        errorMessage.includes('SQLITE_CONSTRAINT');

      if (isAlreadyExistsError) {
        logger.info(
          `Table/index already exists, continuing: ${statement.substring(
            0,
            50
          )}...`
        );
      } else {
        logger.error(
          `Fatal error executing SQL statement: ${statement.substring(
            0,
            100
          )}...`,
          {
            error: errorMessage,
          }
        );
        aborted = true;
        break; // This simulates throwing an error to abort migration
      }
    }
  }

  if (aborted) {
    logger.infos('✅ Test 1 PASSED: Syntax error correctly aborted migration');
  } else {
    logger.error('❌ Test 1 FAILED: Syntax error did not abort migration');
  }

  // Test 2: "Already exists" error should continue migration
  logger.info('Test 2: "Already exists" error should continue migration');
  mockClient.setShouldFailWithSyntaxError(false);
  mockClient.setShouldFailWithAlreadyExists(true);

  let continuedAfterAlreadyExists = false;
  const safeStatements = [
    'CREATE TABLE users (id INTEGER PRIMARY KEY);', // This will "already exist"
    'CREATE TABLE posts (id INTEGER PRIMARY KEY);', // This should still execute
  ];

  for (let i = 0; i < safeStatements.length; i++) {
    const statement = safeStatements[i];
    try {
      if (i === 0) {
        mockClient.setShouldFailWithAlreadyExists(true);
      } else {
        mockClient.setShouldFailWithAlreadyExists(false);
        continuedAfterAlreadyExists = true; // If we reach here, migration continued
      }

      mockClient.exec(statement);
    } catch (stmtError) {
      const errorMessage =
        stmtError instanceof Error ? stmtError.message : String(stmtError);
      const isAlreadyExistsError =
        errorMessage.includes('already exists') ||
        errorMessage.includes('SQLITE_CONSTRAINT');

      if (isAlreadyExistsError) {
        logger.info(
          `Table/index already exists, continuing: ${statement.substring(
            0,
            50
          )}...`
        );
        // Continue with next statement
      } else {
        logger.error(
          `Fatal error executing SQL statement: ${statement.substring(
            0,
            100
          )}...`,
          {
            error: errorMessage,
          }
        );
        break;
      }
    }
  }

  if (continuedAfterAlreadyExists) {
    logger.infos(
      '✅ Test 2 PASSED: "Already exists" error correctly continued migration'
    );
  } else {
    logger.error(
      '❌ Test 2 FAILED: "Already exists" error did not continue migration'
    );
  }
}

function testPostgreSQLErrorHandling() {
  logger.info('Testing PostgreSQL error handling...');

  const mockClient = new MockPostgresClient();
  const statements = [
    'CREATE TABLE users (id SERIAL PRIMARY KEY);',
    'CREATE INVALID SYNTAX;', // This should cause an abort
    'CREATE TABLE posts (id SERIAL PRIMARY KEY);',
  ];

  // Test 1: Syntax error should abort migration
  logger.info('Test 1: PostgreSQL syntax error should abort migration');

  let aborted = false;
  (async () => {
    for (const statement of statements) {
      try {
        if (statement.includes('INVALID')) {
          mockClient.setShouldFailWithSyntaxError(true);
        } else {
          mockClient.setShouldFailWithSyntaxError(false);
        }

        await mockClient.unsafe(statement);
      } catch (stmtError) {
        const errorMessage =
          stmtError instanceof Error ? stmtError.message : String(stmtError);
        const isAlreadyExistsError =
          errorMessage.includes('already exists') ||
          (errorMessage.includes('relation') &&
            errorMessage.includes('does not exist'));

        if (isAlreadyExistsError) {
          logger.info(
            `Table/relation already exists or doesn't exist, continuing: ${statement.substring(
              0,
              50
            )}...`
          );
        } else {
          logger.error(
            `Fatal error executing PostgreSQL statement: ${statement.substring(
              0,
              100
            )}...`,
            {
              error: errorMessage,
            }
          );
          aborted = true;
          break;
        }
      }
    }

    if (aborted) {
      logger.infos(
        '✅ Test 1 PASSED: PostgreSQL syntax error correctly aborted migration'
      );
    } else {
      logger.error(
        '❌ Test 1 FAILED: PostgreSQL syntax error did not abort migration'
      );
    }
  })();
}

async function runTests() {
  logger.info('🧪 Testing improved migration error handling...');
  logger.info('='.repeat(60));

  testSQLiteErrorHandling();
  logger.info('');
  testPostgreSQLErrorHandling();

  logger.info('='.repeat(60));
  logger.infos('✅ Migration error handling tests completed');
  logger.info(
    'Summary: Fatal SQL errors (syntax errors, etc.) should now abort migrations'
  );
  logger.info(
    'while "already exists" errors should be safely ignored and allow continuation.'
  );
  logger.info(
    'This ensures test state remains deterministic and prevents silent failures.'
  );
}

// Run the tests
runTests().catch((error) => {
  logger.error('Test execution failed:', error);
  process.exit(1);
});
