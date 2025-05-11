/**
 * Test Containers Utility
 * 
 * This file provides utilities for managing Docker containers for tests.
 * It's designed to be used with the testcontainers library, but implemented
 * in a way that doesn't require the library to be installed if not needed.
 */

import { logger } from '@/utils/logging/logger.service';

/**
 * Configuration for PostgreSQL test container
 */
export interface TestContainersPostgresConfig {
  image?: string;
  tag?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
}

/**
 * Default configuration for PostgreSQL test container
 */
export const DEFAULT_POSTGRES_CONFIG: TestContainersPostgresConfig = {
  image: 'postgres',
  tag: '15',
  port: 5433,
  username: 'testuser',
  password: 'testpassword',
  database: 'openbadges_test'
};

/**
 * PostgreSQL container interface
 */
export interface PostgresContainer {
  start(): Promise<PostgresContainer>;
  stop(): Promise<void>;
  getConnectionUri(): string;
  getHost(): string;
  getPort(): number;
  getUsername(): string;
  getPassword(): string;
  getDatabase(): string;
}

/**
 * Create a PostgreSQL container
 * 
 * This function is a wrapper around the testcontainers library.
 * If the library is not installed, it will return a mock container
 * that logs warnings when methods are called.
 * 
 * @param config Configuration for the PostgreSQL container
 * @returns PostgresContainer
 */
export async function createPostgresContainer(
  config: TestContainersPostgresConfig = DEFAULT_POSTGRES_CONFIG
): Promise<PostgresContainer> {
  try {
    // Try to import the testcontainers library
    // This is a dynamic import to avoid requiring the library if not used
    const { PostgreSQLContainer } = await import('testcontainers');
    
    // Create and return the container
    const container = new PostgreSQLContainer(
      `${config.image}:${config.tag}`
    )
      .withExposedPorts(config.port || 5432)
      .withUsername(config.username || 'testuser')
      .withPassword(config.password || 'testpassword')
      .withDatabase(config.database || 'openbadges_test');
    
    return container;
  } catch (error) {
    // If the library is not installed, return a mock container
    logger.warn('testcontainers library not found, using mock container', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    return createMockPostgresContainer(config);
  }
}

/**
 * Create a mock PostgreSQL container
 * 
 * This function creates a mock container that logs warnings when methods are called.
 * It's used when the testcontainers library is not installed.
 * 
 * @param config Configuration for the PostgreSQL container
 * @returns PostgresContainer
 */
function createMockPostgresContainer(
  config: TestContainersPostgresConfig = DEFAULT_POSTGRES_CONFIG
): PostgresContainer {
  return {
    async start(): Promise<PostgresContainer> {
      logger.warn('Mock PostgreSQL container cannot be started. Install testcontainers library for real containers.');
      return this;
    },
    
    async stop(): Promise<void> {
      logger.warn('Mock PostgreSQL container cannot be stopped. Install testcontainers library for real containers.');
    },
    
    getConnectionUri(): string {
      return `postgresql://${config.username}:${config.password}@localhost:${config.port}/${config.database}`;
    },
    
    getHost(): string {
      return 'localhost';
    },
    
    getPort(): number {
      return config.port || 5433;
    },
    
    getUsername(): string {
      return config.username || 'testuser';
    },
    
    getPassword(): string {
      return config.password || 'testpassword';
    },
    
    getDatabase(): string {
      return config.database || 'openbadges_test';
    }
  };
}
