---
mode: 'agent'
tools: ['codebase']
description: 'Create a new repository class following OpenBadges modular server patterns'
---

# Create Repository Pattern

Your goal is to create a new repository class following the established patterns in this OpenBadges modular server.

## Requirements

Ask for the entity name and database operations needed if not provided.

### Repository Structure
- Extend `BaseSqliteRepository<T>` or `BasePostgresRepository<T>` depending on database type
- Implement the repository interface for the entity
- Use proper TypeScript types throughout
- Follow the established naming conventions

### Database Operations
- Use Drizzle ORM with type-safe operations
- Implement proper transaction handling with `db.transaction()`
- Use `returning()` clause after database operations to avoid extra round-trips
- Exclude `id` field from update operations
- Use `JSON.stringify()` for metadata fields

### Error Handling
- Use the project's logger service from `@/utils/logger.ts`
- Implement proper error handling with specific error types
- Sanitize sensitive data in logs (replace with '[REDACTED]')

### Validation
- Validate entity existence for referenced entities
- Use explicit `allowId` flags in entity mapping functions
- Implement proper input validation

### File Structure
```
src/infrastructure/database/modules/{database-type}/repositories/{entity-name}.repository.ts
```

### Example Pattern
```typescript
import { BaseSqliteRepository } from '@/infrastructure/database/modules/sqlite/base-sqlite.repository';
import { EntitySchema } from './schema';
import type { Entity, CreateEntityRequest, UpdateEntityRequest } from '@/domains/{domain}/types';

export class EntityRepository extends BaseSqliteRepository<Entity> {
  constructor(connectionManager: SqliteConnectionManager) {
    super(connectionManager, EntitySchema, 'entities');
  }

  async findByCustomField(field: string): Promise<Entity | null> {
    // Implementation with proper error handling and logging
  }
}
```

### Integration
- Register the repository in the RepositoryFactory
- Add proper dependency injection
- Include in the repository coordinator if needed

Reference existing repositories like `SqliteIssuerRepository` for implementation patterns.
