# Database Migration Pattern

Your goal is to create database migrations following the established patterns in this OpenBadges modular server.

## Requirements

Ask for the migration details (table changes, new tables, data transformations) if not provided.

### Migration Structure
- Use Drizzle ORM migration patterns
- Support both SQLite and PostgreSQL
- Follow established schema patterns
- Implement proper rollback strategies

### Schema Definition
- Define schemas in appropriate database module directories:
  - SQLite: `src/infrastructure/database/modules/sqlite/schema.ts`
  - PostgreSQL: `src/infrastructure/database/modules/postgresql/schema.ts`
- Use proper Drizzle column types and constraints
- Implement proper indexes for performance
- Add foreign key relationships where appropriate

### Migration Files
- Generate migrations using Drizzle Kit: `bun run db:generate`
- Review generated SQL before applying
- Test migrations on both database types
- Ensure migrations are reversible

### Data Integrity
- Implement proper constraints and validations
- Use transactions for complex migrations
- Validate data consistency after migration
- Handle existing data appropriately

### Open Badges Compliance
- Ensure schema changes maintain Open Badges 3.0 compliance
- Validate DID/IRI format requirements
- Maintain required fields like `criteria`
- Preserve badge integrity and relationships

### Example Schema Pattern
```typescript
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';

export const entityTable = sqliteTable('entities', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),
  description: text('description'),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});
```

### Migration Commands
```bash
# Generate migration
bun run db:generate

# Apply migration (SQLite)
bun run db:migrate

# Apply migration (PostgreSQL)
DB_TYPE=postgresql bun run db:migrate:pg

# Reset database (development only)
bun run db:reset
```

### Testing
- Test migrations on clean databases
- Test with existing data
- Verify both SQLite and PostgreSQL compatibility
- Test rollback scenarios where applicable

### Documentation
- Document schema changes in migration comments
- Update relevant documentation
- Note any breaking changes or required data updates

Reference existing schema files and migrations for established patterns.
