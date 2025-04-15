/**
 * Configuration for the Open Badges API
 * 
 * This file contains configuration settings for the API, including
 * database connection details and other environment-specific settings.
 */

export const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
  },
  
  // Database configuration
  database: {
    type: process.env.DB_TYPE || 'postgresql',
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/openbadges',
  },
  
  // API configuration
  api: {
    basePath: '/api',
    version: 'v1',
  },
  
  // Open Badges configuration
  openBadges: {
    version: '3.0',
    context: 'https://w3id.org/openbadges/v3',
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  }
};
