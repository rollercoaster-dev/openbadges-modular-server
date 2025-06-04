---
mode: 'agent'
tools: ['codebase']
description: 'Create comprehensive test suites following OpenBadges modular server patterns'
---

# Create Test Suite Pattern

Your goal is to create comprehensive test suites following the established patterns in this OpenBadges modular server.

## Requirements

Ask for the test scope (unit, integration, E2E) and component being tested if not provided.

### Test Structure
- Use Bun's built-in test runner
- Follow database-agnostic testing patterns
- Implement proper test isolation and cleanup
- Use descriptive test names and organize with `describe` blocks

### Database Testing
- Use SQLite for local development and testing
- Support PostgreSQL testing when available
- Use `setupTestApp()` for E2E tests with proper port management
- Return ports from setup functions or use dependency injection
- Avoid sharing TEST_PORT environment variables between suites

### Test Configuration
- Use `127.0.0.1/localhost` instead of `0.0.0.0` for test URLs
- Set specific status code expectations (401/403) for authentication tests
- Use conditional test skipping with `describe.skip` for unavailable services
- Avoid `process.exit()` in test setup functions

### Authentication Testing
- Test both authenticated and unauthenticated scenarios
- Use test API keys from environment variables
- Validate proper error responses for invalid credentials
- Test authorization levels and permissions

### Open Badges Testing
- Validate Open Badges 3.0 compliance
- Test DID/IRI format validation for `recipientId`
- Verify required fields like `criteria`
- Test badge issuance and verification workflows

### Example Test Pattern
```typescript
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { setupTestApp, teardownTestApp } from '@tests/helpers/test-setup';
import type { TestApp } from '@tests/types';

describe('Entity API Tests', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await setupTestApp();
  });

  afterAll(async () => {
    await teardownTestApp(testApp);
  });

  describe('POST /entities', () => {
    test('should create entity with valid data', async () => {
      const response = await testApp.request('/entities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testApp.authToken}`,
        },
        body: JSON.stringify({
          name: 'Test Entity',
          description: 'Test description',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.id).toBeDefined();
      expect(data.name).toBe('Test Entity');
    });

    test('should return 401 for unauthenticated requests', async () => {
      const response = await testApp.request('/entities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test' }),
      });

      expect(response.status).toBe(401);
    });
  });
});
```

### Test Types
- **Unit Tests**: Test individual functions and classes in isolation
- **Integration Tests**: Test repository and database interactions
- **E2E Tests**: Test complete API flows from request to response
- **Validation Tests**: Test input validation and error handling

### Test Helpers
- Use existing test helpers in `@tests/helpers/`
- Create reusable test data factories
- Implement proper test database setup and teardown
- Use consistent assertion patterns

### Coverage
- Aim for comprehensive test coverage
- Test both success and failure scenarios
- Include edge cases and boundary conditions
- Test error handling and validation

Reference existing test files for established patterns and helpers.
