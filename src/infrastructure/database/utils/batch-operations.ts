/**
 * Batch Operations Utility
 *
 * This utility provides functions for performing batch database operations.
 */

import { QueryLoggerService } from './query-logger.service';

/**
 * Executes a batch of operations in a transaction
 * @param db Database client
 * @param operations Array of operations to execute
 * @param dbType Database type ('sqlite' or 'postgresql')
 * @returns Results of the operations
 */
export async function executeBatch<T>(
  db: any,
  operations: (() => Promise<T>)[],
  dbType: 'sqlite' | 'postgresql'
): Promise<T[]> {
  const startTime = Date.now();
  let transaction: any;

  try {
    // Start transaction
    if (dbType === 'postgresql') {
      await db.query('BEGIN');
      transaction = db;
    } else if (dbType === 'sqlite') {
      // For SQLite, we need to use the underlying client
      const client = (db as any).session?.client;
      client.exec('BEGIN TRANSACTION');
      transaction = client;
    } else {
      throw new Error(`Unsupported database type: ${dbType}`);
    }

    // Execute operations
    const results: T[] = [];
    for (const operation of operations) {
      const result = await operation();
      results.push(result);
    }

    // Commit transaction
    if (dbType === 'postgresql') {
      await db.query('COMMIT');
    } else if (dbType === 'sqlite') {
      transaction.exec('COMMIT');
    }

    const duration = Date.now() - startTime;
    QueryLoggerService.logQuery(
      `BATCH OPERATION (${operations.length} operations)`,
      undefined,
      duration,
      dbType
    );

    return results;
  } catch (error) {
    // Rollback transaction on error
    try {
      if (dbType === 'postgresql') {
        await db.query('ROLLBACK');
      } else if (dbType === 'sqlite') {
        transaction.exec('ROLLBACK');
      }
    } catch (rollbackError) {
      console.error('Error rolling back transaction:', rollbackError);
    }

    const duration = Date.now() - startTime;
    QueryLoggerService.logQuery(
      `ERROR BATCH OPERATION (${operations.length} operations): ${error.message}`,
      undefined,
      duration,
      dbType
    );

    throw error;
  }
}

/**
 * Performs a batch insert operation
 * @param db Database client
 * @param table Table to insert into
 * @param records Records to insert
 * @param dbType Database type ('sqlite' or 'postgresql')
 * @returns Results of the insert operations
 */
export async function batchInsert<T>(
  db: any,
  table: any,
  records: any[],
  dbType: 'sqlite' | 'postgresql'
): Promise<T[]> {
  if (records.length === 0) {
    return [];
  }

  const startTime = Date.now();

  try {
    // For small batches, use individual inserts in a transaction
    if (records.length <= 10) {
      const operations = records.map(record => {
        return async () => {
          return await db.insert(table).values(record).returning();
        };
      });

      const results = await executeBatch(db, operations, dbType);
      return results.flat() as T[];
    }

    // For larger batches, use bulk insert if supported
    let result;
    if (dbType === 'postgresql') {
      // PostgreSQL supports bulk insert
      result = await db.insert(table).values(records).returning();
    } else if (dbType === 'sqlite') {
      // SQLite doesn't support bulk insert with returning, so we need to use a transaction
      const operations = records.map(record => {
        return async () => {
          return await db.insert(table).values(record).returning();
        };
      });

      const results = await executeBatch(db, operations, dbType);
      result = results.flat();
    } else {
      throw new Error(`Unsupported database type: ${dbType}`);
    }

    const duration = Date.now() - startTime;
    QueryLoggerService.logQuery(
      `BATCH INSERT INTO ${table.name} (${records.length} records)`,
      undefined,
      duration,
      dbType
    );

    return result as T[];
  } catch (error) {
    const duration = Date.now() - startTime;
    QueryLoggerService.logQuery(
      `ERROR BATCH INSERT INTO ${table.name} (${records.length} records): ${error.message}`,
      undefined,
      duration,
      dbType
    );

    throw error;
  }
}

/**
 * Performs a batch update operation
 * @param db Database client
 * @param table Table to update
 * @param records Records to update (must include ID)
 * @param idField Name of the ID field
 * @param dbType Database type ('sqlite' or 'postgresql')
 * @returns Results of the update operations
 */
export async function batchUpdate<T>(
  db: any,
  table: any,
  records: any[],
  idField: string,
  dbType: 'sqlite' | 'postgresql'
): Promise<T[]> {
  if (records.length === 0) {
    return [];
  }

  const startTime = Date.now();

  try {
    // Use individual updates in a transaction
    const operations = records.map(record => {
      return async () => {
        const id = record[idField];
        if (!id) {
          throw new Error(`Record missing ID field: ${idField}`);
        }

        // Create a copy of the record without the ID field
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [idField]: _, ...updateData } = record;

        // Update the record
        return await db.update(table).set(updateData).where(db.eq(table[idField], id)).returning();
      };
    });

    const results = await executeBatch(db, operations, dbType);
    const flatResults = results.flat() as T[];

    const duration = Date.now() - startTime;
    QueryLoggerService.logQuery(
      `BATCH UPDATE ${table.name} (${records.length} records)`,
      undefined,
      duration,
      dbType
    );

    return flatResults;
  } catch (error) {
    const duration = Date.now() - startTime;
    QueryLoggerService.logQuery(
      `ERROR BATCH UPDATE ${table.name} (${records.length} records): ${error.message}`,
      undefined,
      duration,
      dbType
    );

    throw error;
  }
}

/**
 * Performs a batch delete operation
 * @param db Database client
 * @param table Table to delete from
 * @param ids IDs of records to delete
 * @param idField Name of the ID field
 * @param dbType Database type ('sqlite' or 'postgresql')
 * @returns Number of deleted records
 */
export async function batchDelete(
  db: any,
  table: any,
  ids: string[],
  idField: string,
  dbType: 'sqlite' | 'postgresql'
): Promise<number> {
  if (ids.length === 0) {
    return 0;
  }

  const startTime = Date.now();

  try {
    let deletedCount = 0;

    // For small batches, use individual deletes in a transaction
    if (ids.length <= 10) {
      const operations = ids.map(id => {
        return async () => {
          const result = await db.delete(table).where(db.eq(table[idField], id)).returning();
          return result.length;
        };
      });

      const results = await executeBatch(db, operations, dbType);
      deletedCount = results.reduce((sum, count) => sum + count, 0);
    } else {
      // For larger batches, use IN clause if supported
      if (dbType === 'postgresql') {
        // PostgreSQL supports IN clause
        const result = await db.delete(table).where(db.inArray(table[idField], ids)).returning();
        deletedCount = result.length;
      } else if (dbType === 'sqlite') {
        // SQLite supports IN clause but might be less efficient
        // We'll use a transaction with individual deletes for better control
        const operations = ids.map(id => {
          return async () => {
            const result = await db.delete(table).where(db.eq(table[idField], id)).returning();
            return result.length;
          };
        });

        const results = await executeBatch(db, operations, dbType);
        deletedCount = results.reduce((sum, count) => sum + count, 0);
      } else {
        throw new Error(`Unsupported database type: ${dbType}`);
      }
    }

    const duration = Date.now() - startTime;
    QueryLoggerService.logQuery(
      `BATCH DELETE FROM ${table.name} (${ids.length} records, deleted ${deletedCount})`,
      undefined,
      duration,
      dbType
    );

    return deletedCount;
  } catch (error) {
    const duration = Date.now() - startTime;
    QueryLoggerService.logQuery(
      `ERROR BATCH DELETE FROM ${table.name} (${ids.length} records): ${error.message}`,
      undefined,
      duration,
      dbType
    );

    throw error;
  }
}
