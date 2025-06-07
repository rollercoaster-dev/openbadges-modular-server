---
mode: 'agent'
tools: ['codebase', 'githubRepo']
description: 'Create a new API endpoint following OpenBadges modular server patterns'
---

# Create API Endpoint Pattern

Your goal is to create a new API endpoint following the established patterns in this OpenBadges modular server.

## Requirements

Ask for the endpoint details (path, method, domain, functionality) if not provided.

### API Structure
- Use Hono framework patterns
- Implement proper request validation with Zod schemas
- Follow RESTful conventions
- Use proper HTTP status codes

### Request Validation
- Create Zod schemas for request validation
- Use validation middleware that maps request fields
- Store mapped body in context with `c.set('validatedBody', mappedBody)`
- Avoid double parsing of request bodies

### Error Handling
- Use centralized error handling with `sendApiError` helper
- Differentiate validation errors (400) from internal server errors (500)
- Check if error messages contain 'invalid' or 'validation' keywords
- Provide specific error messages for different failure types

### Authentication & Authorization
- Implement proper authentication checks where needed
- Use specific status codes (401/403) for authentication failures
- Validate user permissions for the requested operation

### Database Integration
- Use repository pattern through RepositoryFactory
- Implement proper transaction handling for multi-step operations
- Validate referenced entity existence
- Use entity mapping functions with appropriate `allowId` flags

### Open Badges Compliance
- Ensure Open Badges 3.0 specification compliance
- Validate DID/IRI formats for `recipientId` fields
- Require `criteria` field for badge classes
- Implement proper badge validation

### File Structure
```
src/domains/{domain}/routes/{entity}.routes.ts
src/domains/{domain}/schemas/{entity}.schemas.ts
src/domains/{domain}/services/{entity}.service.ts (if needed)
```

### Example Pattern
```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createEntitySchema, updateEntitySchema } from './schemas';
import { sendApiError } from '@/utils/api-helpers';
import { logger } from '@/utils/logger';

const entityRoutes = new Hono();

entityRoutes.post(
  '/',
  zValidator('json', createEntitySchema),
  async (c) => {
    try {
      const validatedBody = c.get('validatedBody');
      // Implementation with proper error handling
    } catch (error) {
      return sendApiError(c, error);
    }
  }
);
```

### Testing
- Create comprehensive E2E tests
- Test both success and failure scenarios
- Use database-agnostic test patterns
- Test authentication and authorization

Reference existing routes like issuer routes for implementation patterns.
