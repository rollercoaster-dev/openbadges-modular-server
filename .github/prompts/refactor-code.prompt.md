---
mode: 'edit'
tools: ['codebase']
description: 'Refactor existing code following OpenBadges modular server patterns and best practices'
---

# Code Refactoring Pattern

Your goal is to refactor existing code following the established patterns and best practices in this OpenBadges modular server.

## Requirements

Ask for the specific refactoring goals (performance, maintainability, compliance, etc.) if not provided.

### Refactoring Principles
- Maintain backward compatibility where possible
- Preserve existing functionality and behavior
- Improve code quality without breaking changes
- Follow established architectural patterns
- Maintain test coverage throughout refactoring

### Code Quality Improvements
- **TypeScript Strictness**: Add explicit return types, eliminate `any` types
- **Import Optimization**: Convert relative imports to `@/` path aliases
- **Error Handling**: Implement centralized error handling patterns
- **Logging**: Replace `console.log` with project logger service
- **Utility Functions**: Extract common operations into reusable utilities

### Database Refactoring
- **Repository Pattern**: Migrate to RepositoryFactory pattern
- **Transaction Handling**: Use Drizzle's transaction helper properly
- **Connection Management**: Implement proper resource cleanup
- **Type Safety**: Add proper TypeScript types for database operations
- **Query Optimization**: Use `returning()` clause, avoid N+1 queries

### Security Improvements
- **Input Validation**: Add comprehensive Zod schema validation
- **Data Sanitization**: Implement proper logging sanitization
- **Cryptographic Security**: Use `crypto.randomUUID()` for secure IDs
- **Authentication**: Strengthen authentication and authorization
- **Open Badges Compliance**: Ensure DID/IRI validation

### Performance Optimizations
- **Database Queries**: Optimize query patterns and indexing
- **Caching**: Implement appropriate caching strategies
- **Memory Usage**: Reduce memory footprint and leaks
- **Response Times**: Optimize API response times
- **Bundle Size**: Minimize dependencies and imports

### Example Refactoring Patterns

#### Before: Legacy Error Handling
```typescript
// ❌ Old pattern
try {
  const result = await someOperation();
  console.log('Operation completed', result);
  return result;
} catch (error) {
  console.error('Operation failed', error);
  throw error;
}
```

#### After: Improved Error Handling
```typescript
// ✅ Refactored pattern
import { logger } from '@/utils/logger';
import { sendApiError } from '@/utils/api-helpers';

try {
  const result = await someOperation();
  logger.info('Operation completed successfully', { 
    operation: 'someOperation',
    resultId: result.id 
  });
  return result;
} catch (error) {
  logger.error('Operation failed', { 
    operation: 'someOperation',
    error: error.message,
    stack: error.stack 
  });
  return sendApiError(c, error);
}
```

#### Before: Direct Database Access
```typescript
// ❌ Old pattern
import { db } from './database';

async function getUser(id: string) {
  const user = await db.select().from(users).where(eq(users.id, id));
  return user[0];
}
```

#### After: Repository Pattern
```typescript
// ✅ Refactored pattern
import { RepositoryFactory } from '@/infrastructure/database/repository-factory';

async function getUser(id: string): Promise<User | null> {
  const userRepository = RepositoryFactory.getUserRepository();
  return await userRepository.findById(id);
}
```

### Refactoring Checklist
- [ ] Maintain existing API contracts
- [ ] Update or add TypeScript types
- [ ] Convert to established patterns (repository, error handling, etc.)
- [ ] Add proper logging and monitoring
- [ ] Implement security best practices
- [ ] Ensure Open Badges compliance
- [ ] Update tests to match refactored code
- [ ] Document significant changes

### Testing During Refactoring
- Run existing tests frequently to catch regressions
- Add new tests for improved functionality
- Test both SQLite and PostgreSQL compatibility
- Verify E2E workflows still function correctly
- Test error scenarios and edge cases

### Incremental Refactoring Strategy
1. **Phase 1**: Fix immediate issues (types, imports, logging)
2. **Phase 2**: Implement architectural patterns (repositories, services)
3. **Phase 3**: Optimize performance and security
4. **Phase 4**: Add comprehensive testing and documentation

### Documentation Updates
- Update inline code comments
- Revise API documentation if interfaces change
- Update architectural documentation
- Note breaking changes in changelog
- Update migration guides if needed

### Code Review Considerations
- Highlight the refactoring goals and benefits
- Explain any architectural changes
- Document performance improvements
- Note security enhancements
- Provide before/after comparisons

Reference existing refactored code in the repository for established patterns and best practices.
