# Task 3.1.4: Design Data Model Changes for Related and Endorsement Relationships

**Status**: In Progress  
**Priority**: High  
**Dependencies**: Research completed (3.1.1, 3.1.2), Versioning design (3.1.3)  

## Design Overview

Based on Open Badges 3.0 specification analysis, we need to add support for `related` and `endorsement` fields to the BadgeClass entity. These fields enable rich relationship modeling between achievements and third-party endorsements.

## Open Badges 3.0 Specification Requirements

### Related Field Structure
```typescript
interface Related {
  id: Shared.IRI;           // Required: The related achievement IRI
  type: ["Related"];        // Required: Must be "Related"
  inLanguage?: string;      // Optional: Language code (BCP47)
  version?: string;         // Optional: Version of related achievement
}
```

### Endorsement Field Structure
```typescript
// Full EndorsementCredential objects (not simple endorsements)
interface EndorsementCredential {
  "@context": string[];
  id: Shared.IRI;
  type: ["VerifiableCredential", "EndorsementCredential"];
  issuer: ProfileRef;
  validFrom: string;
  credentialSubject: EndorsementSubject;
  // ... other VC fields
}
```

## Database Schema Changes

### New Fields for badge_classes Table

```sql
-- PostgreSQL Schema Addition
ALTER TABLE badge_classes ADD COLUMN related JSONB;
ALTER TABLE badge_classes ADD COLUMN endorsement JSONB;

-- SQLite Schema Addition  
ALTER TABLE badge_classes ADD COLUMN related TEXT; -- JSON stored as text
ALTER TABLE badge_classes ADD COLUMN endorsement TEXT; -- JSON stored as text

-- Indexes for Performance (PostgreSQL)
CREATE INDEX badge_class_related_gin_idx ON badge_classes USING GIN (related);
CREATE INDEX badge_class_endorsement_gin_idx ON badge_classes USING GIN (endorsement);

-- Indexes for Performance (SQLite)
CREATE INDEX badge_class_related_idx ON badge_classes (related);
CREATE INDEX badge_class_endorsement_idx ON badge_classes (endorsement);
```

### Field Specifications

1. **related** (JSONB/TEXT, nullable)
   - Stores array of Related objects
   - Each object links to another achievement
   - Supports cross-language and cross-version relationships
   - Example: `[{"id": "https://example.edu/achievements/123", "type": ["Related"], "inLanguage": "es", "version": "2.0"}]`

2. **endorsement** (JSONB/TEXT, nullable)
   - Stores array of full EndorsementCredential objects
   - Each is a complete verifiable credential
   - Signed by third-party endorsers
   - Much more complex than simple endorsement strings

## Entity Model Changes

### BadgeClass Entity Updates

```typescript
import { OB3 } from 'openbadges-types';

export class BadgeClass {
  // Existing fields...
  id: Shared.IRI;
  name: string | Shared.MultiLanguageString;
  // ... other existing fields

  // New relationship fields (OB 3.0 only)
  /**
   * Array of related achievements
   * Links to other achievements (different versions, languages, etc.)
   */
  related?: OB3.Related[];

  /**
   * Array of endorsement credentials
   * Third-party endorsements of this achievement's quality/relevance
   */
  endorsement?: OB3.EndorsementCredential[];

  // ... rest of class
}
```

### JSON-LD Serialization Updates

```typescript
// In toJsonLd() method for OB 3.0 only
if (version === BadgeVersion.V3) {
  const achievement: Partial<OB3.Achievement> = {
    // ... existing fields
    related: this.related,         // Include if present
    endorsement: this.endorsement, // Include if present
  };
}

// OB 2.0 excludes these fields (not supported)
```

## Relationship Management Logic

### Related Achievements Manager

```typescript
interface RelatedAchievement {
  id: Shared.IRI;
  type: ["Related"];
  inLanguage?: string;
  version?: string;
}

class RelatedManager {
  /**
   * Adds a related achievement link
   */
  async addRelated(
    achievementId: Shared.IRI,
    relatedId: Shared.IRI,
    options?: { inLanguage?: string; version?: string }
  ): Promise<void>;

  /**
   * Removes a related achievement link
   */
  async removeRelated(
    achievementId: Shared.IRI,
    relatedId: Shared.IRI
  ): Promise<void>;

  /**
   * Gets all related achievements
   */
  async getRelated(achievementId: Shared.IRI): Promise<RelatedAchievement[]>;

  /**
   * Validates related achievement exists and prevents cycles
   */
  async validateRelated(
    achievementId: Shared.IRI,
    relatedId: Shared.IRI
  ): Promise<boolean>;
}
```

### Endorsement Manager

```typescript
class EndorsementManager {
  /**
   * Adds an endorsement credential
   */
  async addEndorsement(
    achievementId: Shared.IRI,
    endorsementCredential: OB3.EndorsementCredential
  ): Promise<void>;

  /**
   * Removes an endorsement credential
   */
  async removeEndorsement(
    achievementId: Shared.IRI,
    endorsementId: Shared.IRI
  ): Promise<void>;

  /**
   * Gets all endorsements for an achievement
   */
  async getEndorsements(
    achievementId: Shared.IRI
  ): Promise<OB3.EndorsementCredential[]>;

  /**
   * Validates endorsement credential signature and structure
   */
  async validateEndorsement(
    endorsementCredential: OB3.EndorsementCredential
  ): Promise<boolean>;
}
```

## Validation Rules

### Related Field Validation
```typescript
const RelatedSchema = z.object({
  id: z.string().url(), // Must be valid IRI
  type: z.array(z.literal("Related")).length(1),
  inLanguage: z.string().regex(/^[a-z]{2,4}(-[A-Z][a-z]{3})?(-([A-Z]{2}|[0-9]{3}))?$/).optional(), // BCP47
  version: z.string().max(50).optional()
});

const RelatedArraySchema = z.array(RelatedSchema).max(100); // Limit array size
```

### Endorsement Field Validation
```typescript
// Full EndorsementCredential validation
const EndorsementCredentialSchema = z.object({
  "@context": z.array(z.string()),
  id: z.string().url(),
  type: z.array(z.string()).refine(
    (types) => types.includes("VerifiableCredential") && types.includes("EndorsementCredential")
  ),
  issuer: ProfileRefSchema,
  validFrom: z.string().datetime(),
  credentialSubject: EndorsementSubjectSchema,
  // ... other VC fields
});
```

### Circular Dependency Prevention
```typescript
async function validateNoCircularRelated(
  achievementId: Shared.IRI,
  relatedId: Shared.IRI
): Promise<boolean> {
  const visited = new Set<string>();
  const toVisit = [relatedId];
  
  while (toVisit.length > 0) {
    const current = toVisit.pop()!;
    
    if (current === achievementId) {
      return false; // Cycle detected
    }
    
    if (visited.has(current)) {
      continue; // Already processed
    }
    
    visited.add(current);
    
    // Get related achievements for current
    const achievement = await repository.findById(current);
    if (achievement?.related) {
      toVisit.push(...achievement.related.map(r => r.id));
    }
    
    // Prevent infinite loops
    if (visited.size > 1000) {
      throw new Error('Related achievement graph too large');
    }
  }
  
  return true; // No cycle
}
```

## API Design

### New Relationship Endpoints

```typescript
// Related achievements
GET    /achievements/{id}/related
POST   /achievements/{id}/related
DELETE /achievements/{id}/related/{relatedId}

// Endorsements  
GET    /achievements/{id}/endorsements
POST   /achievements/{id}/endorsements
DELETE /achievements/{id}/endorsements/{endorsementId}
```

### DTO Updates
```typescript
export interface BadgeClassBaseDto {
  // Existing fields...
  name: string;
  description: string;
  
  // New relationship fields (optional)
  related?: Array<{
    id: string;
    inLanguage?: string;
    version?: string;
  }>;
  
  endorsement?: Array<{
    // Full EndorsementCredential structure
    "@context": string[];
    id: string;
    type: string[];
    issuer: string | object;
    validFrom: string;
    credentialSubject: {
      id: string;
      type: string[];
      endorsementComment?: string;
    };
    // ... other VC fields
  }>;
}
```

### Repository Interface Updates
```typescript
export interface BadgeClassRepository {
  // Existing methods...
  
  // Related achievements
  findRelated(achievementId: Shared.IRI): Promise<OB3.Related[]>;
  addRelated(achievementId: Shared.IRI, related: OB3.Related): Promise<void>;
  removeRelated(achievementId: Shared.IRI, relatedId: Shared.IRI): Promise<void>;
  
  // Endorsements
  findEndorsements(achievementId: Shared.IRI): Promise<OB3.EndorsementCredential[]>;
  addEndorsement(achievementId: Shared.IRI, endorsement: OB3.EndorsementCredential): Promise<void>;
  removeEndorsement(achievementId: Shared.IRI, endorsementId: Shared.IRI): Promise<void>;
  
  // Relationship queries
  findByRelated(relatedId: Shared.IRI): Promise<BadgeClass[]>; // Find achievements that reference this one
  findByEndorser(endorserId: Shared.IRI): Promise<BadgeClass[]>; // Find achievements endorsed by this issuer
}
```

## Performance Considerations

### Database Optimization
- JSONB indexes for PostgreSQL (GIN indexes)
- Consider separate relationship tables for complex queries
- Limit array sizes to prevent performance issues
- Cache frequently accessed relationships

### Query Patterns
```sql
-- Find achievements related to a specific achievement
SELECT * FROM badge_classes 
WHERE related @> '[{"id": "https://example.edu/achievements/123"}]';

-- Find achievements endorsed by a specific issuer
SELECT * FROM badge_classes 
WHERE endorsement @> '[{"issuer": {"id": "https://example.edu/issuers/456"}}]';
```

## Storage Considerations

### JSONB vs Separate Tables

**JSONB Approach (Chosen)**:
- ✅ Simple schema
- ✅ Atomic updates
- ✅ Flexible structure
- ❌ Complex queries
- ❌ Limited relational integrity

**Separate Tables Approach**:
- ✅ Better query performance
- ✅ Relational integrity
- ✅ Easier complex queries
- ❌ More complex schema
- ❌ Multiple table updates

**Decision**: Use JSONB for initial implementation due to:
1. Simpler migration path
2. Atomic updates
3. Flexibility for future OB spec changes
4. Reasonable performance for expected usage

## Migration Strategy

### Database Migration
1. Add new JSONB/TEXT columns as nullable
2. Create appropriate indexes
3. No data migration needed (new optional fields)
4. Backward compatibility maintained

### Code Migration
1. Update entity with new optional fields
2. Update DTOs and validation schemas
3. Add new API endpoints for relationship management
4. Update repository implementations
5. All changes are additive and backward compatible

## Testing Strategy

### Unit Tests
- Related field validation and serialization
- Endorsement field validation and serialization
- Circular dependency detection
- JSON-LD output for OB 3.0 vs OB 2.0

### Integration Tests
- Database JSONB operations
- Relationship API endpoints
- Complex relationship queries
- Endorsement credential validation

### Edge Cases
- Large relationship arrays
- Malformed endorsement credentials
- Circular relationship detection
- Concurrent relationship updates

## Next Steps

1. Implement database migration scripts
2. Update BadgeClass entity with relationship fields
3. Create relationship management utilities
4. Update repository implementations
5. Add new API endpoints
6. Add comprehensive tests
7. Update documentation

## Files to Modify

Same as versioning task plus:
- New relationship management utilities
- New API endpoints for relationship CRUD
- Additional validation schemas
- Extended test coverage for relationships
