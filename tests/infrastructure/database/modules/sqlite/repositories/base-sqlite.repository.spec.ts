/**
 * Tests for BaseSqliteRepository
 *
 * This test suite verifies the common functionality provided by the base repository class.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { BaseSqliteRepository } from '@infrastructure/database/modules/sqlite/repositories/base-sqlite.repository';
import { SqliteConnectionManager } from '@infrastructure/database/modules/sqlite/connection/sqlite-connection.manager';
import { SqliteOperationContext } from '@infrastructure/database/modules/sqlite/types/sqlite-database.types';
import { Shared } from 'openbadges-types';

// Test implementation of BaseSqliteRepository
class TestSqliteRepository extends BaseSqliteRepository {
  protected getEntityType(): 'issuer' {
    return 'issuer';
  }

  protected getTableName(): string {
    return 'test_table';
  }

  // Expose protected methods for testing
  public testCreateOperationContext(operation: string, entityId?: Shared.IRI) {
    return this.createOperationContext(operation, entityId);
  }

  public testLogQueryMetrics(
    context: SqliteOperationContext,
    rowsAffected: number
  ) {
    return this.logQueryMetrics(context, rowsAffected);
  }

  public testExecuteOperation<T>(
    context: SqliteOperationContext,
    operation: () => Promise<T>
  ) {
    return this.executeOperation(context, operation);
  }

  public testExecuteQuery<T>(
    context: SqliteOperationContext,
    query: () => Promise<T[]>
  ) {
    return this.executeQuery(context, query);
  }

  public testExecuteSingleQuery<T>(
    context: SqliteOperationContext,
    query: () => Promise<T[]>
  ) {
    return this.executeSingleQuery(context, query);
  }

  public testExecuteUpdate<T>(
    context: SqliteOperationContext,
    update: () => Promise<T[]>
  ) {
    return this.executeUpdate(context, update);
  }

  public testExecuteDelete(
    context: SqliteOperationContext,
    deleteOp: () => Promise<unknown[]>
  ) {
    return this.executeDelete(context, deleteOp);
  }

  public testValidateEntityId(id: Shared.IRI, operation: string) {
    return this.validateEntityId(id, operation);
  }

  public testGetCurrentTimestamp() {
    return this.getCurrentTimestamp();
  }

  public testCreateErrorMessage(operation: string, details?: string) {
    return this.createErrorMessage(operation, details);
  }
}

describe('BaseSqliteRepository', () => {
  let client: Database;
  let connectionManager: SqliteConnectionManager;
  let repository: TestSqliteRepository;

  beforeEach(async () => {
    // Create in-memory SQLite database for testing
    client = new Database(':memory:');

    // Initialize connection manager
    connectionManager = new SqliteConnectionManager(client, {
      sqliteBusyTimeout: 1000,
      sqliteSyncMode: 'NORMAL',
      sqliteCacheSize: 1000,
    });

    // Connect to the database
    await connectionManager.connect();

    // Create test repository
    repository = new TestSqliteRepository(connectionManager);
  });

  afterEach(async () => {
    if (connectionManager) {
      await connectionManager.disconnect();
    }
    if (client) {
      client.close();
    }
  });

  describe('createOperationContext', () => {
    it('should create operation context with correct properties', () => {
      const operation = 'TEST_OPERATION';
      const entityId = 'test-entity-id' as Shared.IRI;

      const context = repository.testCreateOperationContext(
        operation,
        entityId
      );

      expect(context.operation).toBe(operation);
      expect(context.entityType).toBe('issuer');
      expect(context.entityId).toBe(entityId);
      expect(context.startTime).toBeTypeOf('number');
      expect(context.startTime).toBeGreaterThan(0);
    });

    it('should create operation context without entity ID', () => {
      const operation = 'TEST_OPERATION';

      const context = repository.testCreateOperationContext(operation);

      expect(context.operation).toBe(operation);
      expect(context.entityType).toBe('issuer');
      expect(context.entityId).toBeUndefined();
      expect(context.startTime).toBeTypeOf('number');
    });
  });

  describe('logQueryMetrics', () => {
    it('should log query metrics and return metrics object', () => {
      const context = repository.testCreateOperationContext('SELECT Test');
      const rowsAffected = 5;

      const metrics = repository.testLogQueryMetrics(context, rowsAffected);

      expect(metrics.duration).toBeTypeOf('number');
      expect(metrics.duration).toBeGreaterThanOrEqual(0);
      expect(metrics.rowsAffected).toBe(rowsAffected);
      expect(metrics.queryType).toBe('SELECT');
      expect(metrics.tableName).toBe('test_table');
    });

    it('should correctly determine query types', () => {
      const testCases: Array<{
        operation: string;
        expectedType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'UNKNOWN';
      }> = [
        { operation: 'INSERT Test', expectedType: 'INSERT' },
        { operation: 'UPDATE Test', expectedType: 'UPDATE' },
        { operation: 'DELETE Test', expectedType: 'DELETE' },
        { operation: 'SELECT Test', expectedType: 'SELECT' },
        { operation: 'UNKNOWN Operation', expectedType: 'UNKNOWN' }, // fallback
      ];

      testCases.forEach(({ operation, expectedType }) => {
        const context = repository.testCreateOperationContext(operation);
        const metrics = repository.testLogQueryMetrics(context, 1);
        expect(metrics.queryType).toBe(expectedType);
      });
    });
  });

  describe('executeOperation', () => {
    it('should execute operation successfully and log metrics', async () => {
      const context = repository.testCreateOperationContext('TEST_OPERATION');
      const expectedResult = { id: 'test-id', name: 'test-name' };

      const result = await repository.testExecuteOperation(
        context,
        async () => {
          return expectedResult;
        }
      );

      expect(result).toEqual(expectedResult);
    });

    it('should handle operation errors and re-throw them', async () => {
      const context = repository.testCreateOperationContext('TEST_OPERATION');
      const testError = new Error('Test operation error');

      await expect(
        repository.testExecuteOperation(context, async () => {
          throw testError;
        })
      ).rejects.toThrow('Test operation error');
    });
  });

  describe('executeQuery', () => {
    it('should execute query and return results with correct metrics', async () => {
      const context = repository.testCreateOperationContext('SELECT Test');
      const expectedResults = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ];

      const results = await repository.testExecuteQuery(context, async () => {
        return expectedResults;
      });

      expect(results).toEqual(expectedResults);
    });

    it('should handle empty query results', async () => {
      const context = repository.testCreateOperationContext('SELECT Test');

      const results = await repository.testExecuteQuery(context, async () => {
        return [];
      });

      expect(results).toEqual([]);
    });
  });

  describe('executeSingleQuery', () => {
    it('should return first result when query returns data', async () => {
      const context = repository.testCreateOperationContext('SELECT Test');
      const queryResults = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ];

      const result = await repository.testExecuteSingleQuery(
        context,
        async () => {
          return queryResults;
        }
      );

      expect(result).toEqual(queryResults[0]);
    });

    it('should return null when query returns no data', async () => {
      const context = repository.testCreateOperationContext('SELECT Test');

      const result = await repository.testExecuteSingleQuery(
        context,
        async () => {
          return [];
        }
      );

      expect(result).toBeNull();
    });
  });

  describe('executeUpdate', () => {
    it('should return updated record when update succeeds', async () => {
      const context = repository.testCreateOperationContext('UPDATE Test');
      const updatedRecord = { id: '1', name: 'Updated Item' };

      const result = await repository.testExecuteUpdate(context, async () => {
        return [updatedRecord];
      });

      expect(result).toEqual(updatedRecord);
    });

    it('should return null when no records are updated', async () => {
      const context = repository.testCreateOperationContext('UPDATE Test');

      const result = await repository.testExecuteUpdate(context, async () => {
        return [];
      });

      expect(result).toBeNull();
    });
  });

  describe('executeDelete', () => {
    it('should return true when delete succeeds', async () => {
      const context = repository.testCreateOperationContext('DELETE Test');

      const result = await repository.testExecuteDelete(context, async () => {
        return [{ id: '1' }]; // Simulate one deleted record
      });

      expect(result).toBe(true);
    });

    it('should return false when no records are deleted', async () => {
      const context = repository.testCreateOperationContext('DELETE Test');

      const result = await repository.testExecuteDelete(context, async () => {
        return [];
      });

      expect(result).toBe(false);
    });
  });

  describe('validateEntityId', () => {
    it('should not throw for valid entity IDs', () => {
      const validIds = [
        'valid-id' as Shared.IRI,
        'urn:uuid:123e4567-e89b-12d3-a456-426614174000' as Shared.IRI,
        'https://example.com/entity/123' as Shared.IRI,
      ];

      validIds.forEach((id) => {
        expect(() => {
          repository.testValidateEntityId(id, 'test operation');
        }).not.toThrow();
      });
    });

    it('should throw for invalid entity IDs', () => {
      const invalidIds = [
        '' as Shared.IRI,
        '   ' as Shared.IRI,
        null as unknown as Shared.IRI,
        undefined as unknown as Shared.IRI,
      ];

      invalidIds.forEach((id) => {
        expect(() => {
          repository.testValidateEntityId(id, 'test operation');
        }).toThrow();
      });
    });
  });

  describe('getCurrentTimestamp', () => {
    it('should return a valid timestamp', () => {
      const timestamp = repository.testGetCurrentTimestamp();

      expect(timestamp).toBeTypeOf('number');
      expect(timestamp).toBeGreaterThan(0);
      expect(timestamp).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('createErrorMessage', () => {
    it('should create error message without details', () => {
      const message = repository.testCreateErrorMessage('create');
      expect(message).toBe('Failed to create issuer');
    });

    it('should create error message with details', () => {
      const message = repository.testCreateErrorMessage(
        'update',
        'entity not found'
      );
      expect(message).toBe('Failed to update issuer: entity not found');
    });
  });
});
