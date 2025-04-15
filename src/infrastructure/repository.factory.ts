/**
 * Repository factory for creating repository instances
 * 
 * This factory is responsible for creating repository instances based on the
 * configured database module. It provides a unified interface for accessing
 * repositories regardless of the underlying database implementation.
 */

import postgres from 'postgres';
import { IssuerRepository } from '../domains/issuer/issuer.repository';
import { BadgeClassRepository } from '../domains/badgeClass/badgeClass.repository';
import { AssertionRepository } from '../domains/assertion/assertion.repository';
import { PostgresIssuerRepository } from './database/modules/postgresql/repositories/postgres-issuer.repository';
import { PostgresBadgeClassRepository } from './database/modules/postgresql/repositories/postgres-badge-class.repository';
import { PostgresAssertionRepository } from './database/modules/postgresql/repositories/postgres-assertion.repository';

export class RepositoryFactory {
  private static client: postgres.Sql | null = null;
  private static dbType: string = 'postgresql'; // Default database type
  
  /**
   * Initializes the repository factory with a database connection
   * @param config Database configuration
   */
  static async initialize(config: {
    type: string;
    connectionString: string;
  }): Promise<void> {
    this.dbType = config.type;
    
    if (this.dbType === 'postgresql') {
      this.client = postgres(config.connectionString);
    } else {
      throw new Error(`Unsupported database type: ${this.dbType}`);
    }
  }
  
  /**
   * Creates an issuer repository
   * @returns An implementation of IssuerRepository
   */
  static createIssuerRepository(): IssuerRepository {
    if (!this.client) {
      throw new Error('Repository factory not initialized');
    }
    
    if (this.dbType === 'postgresql') {
      return new PostgresIssuerRepository(this.client);
    }
    
    throw new Error(`Unsupported database type: ${this.dbType}`);
  }
  
  /**
   * Creates a badge class repository
   * @returns An implementation of BadgeClassRepository
   */
  static createBadgeClassRepository(): BadgeClassRepository {
    if (!this.client) {
      throw new Error('Repository factory not initialized');
    }
    
    if (this.dbType === 'postgresql') {
      return new PostgresBadgeClassRepository(this.client);
    }
    
    throw new Error(`Unsupported database type: ${this.dbType}`);
  }
  
  /**
   * Creates an assertion repository
   * @returns An implementation of AssertionRepository
   */
  static createAssertionRepository(): AssertionRepository {
    if (!this.client) {
      throw new Error('Repository factory not initialized');
    }
    
    if (this.dbType === 'postgresql') {
      return new PostgresAssertionRepository(this.client);
    }
    
    throw new Error(`Unsupported database type: ${this.dbType}`);
  }
  
  /**
   * Closes the database connection
   */
  static async close(): Promise<void> {
    if (this.client) {
      await this.client.end();
      this.client = null;
    }
  }
}
