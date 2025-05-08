#!/usr/bin/env bun

/**
 * Script to update E2E tests to use the new test setup
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const E2E_TEST_DIR = 'test/e2e';
const SETUP_IMPORT = "import { setupTestApp, stopTestServer } from './setup-test-app';";
const PORT_CONFIG = `
// Use a random port for testing to avoid conflicts
const TEST_PORT = Math.floor(Math.random() * 10000) + 10000; // Random port between 10000-20000
process.env.TEST_PORT = TEST_PORT.toString();

// Base URL for the API
const API_URL = \`http://\${config.server.host}:\${TEST_PORT}\`;`;

const SERVER_SETUP = `
// Server instance for the test
let server: unknown = null;

describe('`;

const BEFORE_ALL = `  // Start the server before all tests
  beforeAll(async () => {
    // Set environment variables for the test server
    process.env['NODE_ENV'] = 'test';

    try {
      logger.info(\`E2E Test: Starting server on port \${TEST_PORT}\`);
      const result = await setupTestApp();
      server = result.server;
      logger.info('E2E Test: Server started successfully');
      // Wait for the server to be fully ready
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      logger.error('E2E Test: Failed to start server', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  });

  // Stop the server after all tests
  afterAll(async () => {
    if (server) {
      try {
        logger.info('E2E Test: Stopping server');
        stopTestServer(server);
        logger.info('E2E Test: Server stopped successfully');
      } catch (error) {
        logger.error('E2E Test: Error stopping server', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
      }
    }
  });`;

async function updateE2ETests() {
  try {
    // Get all E2E test files
    const files = await readdir(E2E_TEST_DIR);
    const testFiles = files.filter(file => file.endsWith('.e2e.test.ts') && file !== 'issuer.e2e.test.ts' && file !== 'assertion.e2e.test.ts');

    for (const file of testFiles) {
      const filePath = join(E2E_TEST_DIR, file);
      console.log(`Updating ${filePath}...`);

      // Read the file content
      let content = await readFile(filePath, 'utf8');

      // Update imports
      if (!content.includes('afterAll, beforeAll')) {
        content = content.replace(
          /import { describe, it, expect([^}]*) } from 'bun:test';/,
          "import { describe, it, expect, afterAll, beforeAll$1 } from 'bun:test';"
        );
      }

      // Add setup import
      if (!content.includes('setupTestApp')) {
        const importLines = content.split('\n').filter(line => line.startsWith('import '));
        const lastImportLine = importLines[importLines.length - 1];
        content = content.replace(lastImportLine, `${lastImportLine}\n${SETUP_IMPORT}`);
      }

      // Update port configuration
      if (!content.includes('TEST_PORT')) {
        content = content.replace(
          /const API_URL = [^\n]+/,
          PORT_CONFIG
        );
      }

      // Add server setup
      if (!content.includes('server: unknown')) {
        content = content.replace(
          /describe\('([^']+)'/,
          `${SERVER_SETUP}$1'`
        );
      }

      // Add beforeAll and afterAll
      if (!content.includes('beforeAll')) {
        content = content.replace(
          /describe\('[^']+'\) => {[^\n]*/,
          `$&\n${BEFORE_ALL}`
        );
      }

      // Write the updated content back to the file
      await writeFile(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
    }

    console.log('All E2E tests updated successfully!');
  } catch (error) {
    console.error('Error updating E2E tests:', error);
    process.exit(1);
  }
}

updateE2ETests();
