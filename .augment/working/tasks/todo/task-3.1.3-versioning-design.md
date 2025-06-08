# Task 3.1.3: Design Data Model Changes for Achievement Versioning

**Status**: In Progress  
**Priority**: High  
**Dependencies**: Research completed (3.1.1, 3.1.2)  

## Design Overview

Based on Open Badges 3.0 specification analysis, we need to add versioning support to the BadgeClass entity and database schema. The design follows OB 3.0 compliance while maintaining backward compatibility.

## Database Schema Changes

### New Fields for badge_classes Table

```sql
-- PostgreSQL Schema Addition
ALTER TABLE badge_classes ADD COLUMN version TEXT;
ALTER TABLE badge_classes ADD COLUMN previous_version TEXT REFERENCES badge_classes(id);

-- SQLite Schema Addition  
ALTER TABLE badge_classes ADD COLUMN version TEXT;
ALTER TABLE badge_classes ADD COLUMN previous_version TEXT REFERENCES badge_classes(id);

-- Indexes for Performance
CREATE INDEX badge_class_version_idx ON badge_classes (version);
CREATE INDEX badge_class_previous_version_idx ON badge_classes (previous_version);
```

### Field Specifications

1. **version** (TEXT, nullable)
   - Stores the version string for the achievement
   - Optional field as per OB 3.0 specification
   - Examples: "1.0", "2.1", "v3.0-beta", "2023.1"
   - No format restrictions - allows flexible versioning schemes

2. **previous_version** (TEXT, nullable, foreign key)
   - References the ID of the previous version of this achievement
   - Creates a linked list of version history
   - Enables version chain traversal
   - Self-referencing foreign key to badge_classes.id

## Entity Model Changes

### BadgeClass Entity Updates

```typescript
export class BadgeClass {
  // Existing fields...
  id: Shared.IRI;
  name: string | Shared.MultiLanguageString;
  description?: string | Shared.MultiLanguageString;
  // ... other existing fields

  // New versioning fields
  /**
   * Version string for this achievement
   * Optional field as per Open Badges 3.0 specification
   */
  version?: string;

  /**
   * Reference to the previous version of this achievement
   * Creates a version chain for tracking achievement evolution
   */
  previousVersion?: Shared.IRI;

  // ... rest of class
}
```

### JSON-LD Serialization Updates

The `toJsonLd()` method will be updated to include version fields only in OB 3.0 output:

```typescript
// In toJsonLd() method for OB 3.0
if (version === BadgeVersion.V3) {
  const achievement: Partial<OB3.Achievement> = {
    // ... existing fields
    version: this.version, // Include if present
    // Note: previousVersion is internal tracking, not in OB 3.0 spec
  };
}
```

## Version Management Logic

### Version Increment Strategy

1. **Manual Versioning**: Allow explicit version strings in API requests
2. **Auto-increment**: Provide utility for semantic version bumping
3. **Version Validation**: Ensure version strings are reasonable

### Version Chain Management

```typescript
interface VersionChain {
  current: BadgeClass;
  previous: BadgeClass[];
  next: BadgeClass[];
}

class VersionManager {
  /**
   * Creates a new version of an existing achievement
   * Links the new version to the previous one
   */
  async createNewVersion(
    originalId: Shared.IRI, 
    updates: Partial<BadgeClass>,
    newVersion?: string
  ): Promise<BadgeClass>;

  /**
   * Gets the complete version chain for an achievement
   */
  async getVersionChain(achievementId: Shared.IRI): Promise<VersionChain>;

  /**
   * Validates that version chains don't create cycles
   */
  async validateVersionChain(achievementId: Shared.IRI): Promise<boolean>;
}
```

## Validation Rules

### Version String Validation
- Optional field - null/undefined allowed
- If provided, must be non-empty string
- No specific format requirements (flexible versioning)
- Maximum length: 50 characters

### Previous Version Validation
- Must reference existing achievement ID
- Cannot create circular references
- Cannot reference self
- Maximum chain depth: 100 versions (prevent infinite chains)

### Circular Dependency Prevention
```typescript
async function validateNoCycles(
  achievementId: Shared.IRI, 
  previousVersionId: Shared.IRI
): Promise<boolean> {
  const visited = new Set<string>();
  let current = previousVersionId;
  
  while (current && !visited.has(current)) {
    if (current === achievementId) {
      return false; // Cycle detected
    }
    visited.add(current);
    
    const achievement = await repository.findById(current);
    current = achievement?.previousVersion;
  }
  
  return true; // No cycle
}
```

## API Impact

### DTO Updates
```typescript
export interface BadgeClassBaseDto {
  // Existing fields...
  name: string;
  description: string;
  // ... other fields

  // New optional versioning fields
  version?: string;
  previousVersion?: string; // IRI reference
}
```

### Repository Interface Updates
```typescript
export interface BadgeClassRepository {
  // Existing methods...
  
  // New versioning methods
  findByVersion(version: string): Promise<BadgeClass[]>;
  findVersionChain(achievementId: Shared.IRI): Promise<BadgeClass[]>;
  getLatestVersion(achievementId: Shared.IRI): Promise<BadgeClass | null>;
}
```

## Migration Strategy

### Database Migration
1. Add new columns as nullable fields
2. Create indexes for performance
3. No data migration needed (new optional fields)
4. Backward compatibility maintained

### Code Migration
1. Update entity class with new optional fields
2. Update DTOs and validation schemas
3. Update repository implementations
4. Update API controllers to handle new fields
5. All changes are additive and backward compatible

## Testing Strategy

### Unit Tests
- Version field serialization in JSON-LD
- Version chain validation logic
- Circular dependency detection
- Backward compatibility with existing data

### Integration Tests
- Database operations with version fields
- API endpoints with version parameters
- Version chain traversal queries

### Edge Cases
- Null/undefined version handling
- Very long version chains
- Concurrent version creation
- Invalid previous version references

## Performance Considerations

### Database Indexes
- Index on `version` field for version-based queries
- Index on `previous_version` for chain traversal
- Composite index on (issuer_id, version) for issuer version queries

### Query Optimization
- Limit version chain depth to prevent expensive recursive queries
- Cache version chains for frequently accessed achievements
- Use pagination for version history endpoints

## Backward Compatibility

### OB 2.0 Compatibility
- Version fields excluded from OB 2.0 JSON-LD output
- Existing API endpoints continue to work unchanged
- No breaking changes to existing functionality

### Database Compatibility
- New fields are nullable - existing records unaffected
- Migration is additive only
- Rollback possible by dropping new columns

## Next Steps

1. Implement database migration scripts
2. Update BadgeClass entity with new fields
3. Update repository implementations
4. Update API controllers and DTOs
5. Add comprehensive tests
6. Update documentation

## Files to Modify

1. **Database Schema**:
   - `src/infrastructure/database/modules/postgresql/schema.ts`
   - `src/infrastructure/database/modules/sqlite/schema.ts`
   - New migration files in `drizzle/migrations/` and `drizzle/pg-migrations/`

2. **Domain Layer**:
   - `src/domains/badgeClass/badgeClass.entity.ts`
   - `src/domains/badgeClass/badgeClass.repository.ts`

3. **API Layer**:
   - `src/api/dtos/badgeClass.dto.ts`
   - `src/api/validation/badgeClass.schemas.ts`
   - `src/api/controllers/badgeClass.controller.ts`

4. **Repository Layer**:
   - `src/infrastructure/database/modules/postgresql/repositories/postgres-badge-class.repository.ts`
   - `src/infrastructure/database/modules/sqlite/repositories/sqlite-badge-class.repository.ts`

5. **Tests**:
   - New unit tests for versioning logic
   - New API tests for version endpoints
   - New E2E tests for version workflows
