# Priority 3.1: Achievement Versioning & Relationships Analysis

**Status**: Research Complete - Ready for Implementation  
**Priority**: High  
**Estimated Effort**: 13 tasks (~3-4 weeks)  
**Dependencies**: None  

## Research Findings

### Open Badges 3.0 Achievement Versioning Requirements

Based on the official Open Badges 3.0 specification analysis:

1. **Version Field**: 
   - Optional `version` property on Achievement objects
   - Type: String
   - Purpose: "Allows issuers to set a version string for an Achievement. This is particularly useful when replacing a previous version with an update."

2. **Related Field**:
   - Optional `related` property on Achievement objects  
   - Type: Array of `Related` objects
   - Structure: `{ id: URI, type: ["Related"], inLanguage?: string, version?: string }`
   - Purpose: "Identifies a related achievement" - used for linking achievements across versions, languages, or other relationships

3. **Endorsement Field**:
   - Optional `endorsement` property on Achievement objects
   - Type: Array of `EndorsementCredential` objects
   - Purpose: Third-party endorsements of the achievement quality/relevance
   - Note: In OB 3.0, endorsements are full verifiable credentials, not simple objects

### Current Codebase State

**Existing Infrastructure**:
- ✅ BadgeClass entity supports OB 2.0 and 3.0 via version-agnostic design
- ✅ Database schema supports JSONB for flexible field storage
- ✅ Migration system in place for both SQLite and PostgreSQL
- ✅ Version handling via `BadgeVersion` enum and serialization

**Missing Components**:
- ❌ No `version` field in BadgeClass entity or database schema
- ❌ No `related` field support for achievement relationships
- ❌ No `endorsement` field support for achievement endorsements
- ❌ No database tables for managing achievement relationships
- ❌ No API endpoints for relationship management
- ❌ No validation logic for circular dependencies

## Implementation Plan

### Phase 1: Research & Design (Tasks 3.1.1 - 3.1.4)

**Task 3.1.1**: ✅ Research achievement versioning requirements (COMPLETED)
**Task 3.1.2**: ✅ Research `related` and `endorsement` field requirements (COMPLETED)

**Task 3.1.3**: ✅ Design data model changes for achievement versioning (COMPLETED)
- ✅ Add `version` field to BadgeClass entity (optional string)
- ✅ Add `previousVersion` field for tracking version history (optional IRI reference)
- ✅ Design version comparison and validation logic

**Task 3.1.4**: ✅ Design data model changes for `related` and `endorsement` relationships (COMPLETED)
- ✅ Add `related` field as array of Related objects
- ✅ Add `endorsement` field as array of EndorsementCredential references
- ✅ Design relationship validation to prevent circular dependencies

### Phase 2: Database Schema Changes (Task 3.1.5)

**Task 3.1.5**: ✅ Write database migration script (COMPLETED)
- ✅ Add `version` column to badge_classes table (TEXT, nullable)
- ✅ Add `previous_version` column to badge_classes table (TEXT/UUID, nullable, references badge_classes.id)
- ✅ Add `related` column to badge_classes table (JSONB/TEXT, nullable)
- ✅ Add `endorsement` column to badge_classes table (JSONB/TEXT, nullable)
- ✅ Create indexes for performance on version and relationship queries
- ✅ Support both SQLite and PostgreSQL schemas

### Phase 3: Entity Updates (Tasks 3.1.6 - 3.1.7)

**Task 3.1.6**: ✅ Update BadgeClass entity for versioning (COMPLETED)
- ✅ Add `version?: string` property
- ✅ Add `previousVersion?: Shared.IRI` property
- ✅ Update `toJsonLd()` method to include version fields in OB 3.0 output
- ✅ Update BadgeClassData type to handle version fields

**Task 3.1.7**: ✅ Update BadgeClass entity for relationships (COMPLETED)
- ✅ Add `related?: OB3.Related[]` property
- ✅ Add `endorsement?: OB3.EndorsementCredential[]` property
- ✅ Update `toJsonLd()` method to include relationship fields in OB 3.0 output
- ✅ Ensure backward compatibility with OB 2.0 (exclude these fields)
- ✅ Update DTOs to include new relationship fields

### Phase 4: API Implementation (Tasks 3.1.8 - 3.1.10)

**Task 3.1.8**: Implement API endpoints for achievement relationships
- `GET /achievements/{id}/related` - Get related achievements
- `POST /achievements/{id}/related` - Add related achievement
- `DELETE /achievements/{id}/related/{relatedId}` - Remove relationship
- `GET /achievements/{id}/endorsements` - Get endorsements
- `POST /achievements/{id}/endorsements` - Add endorsement

**Task 3.1.9**: Implement validation logic for circular dependencies
- Create relationship graph validation
- Prevent circular references in `related` field
- Validate `previousVersion` chains don't create cycles
- Add depth limits for relationship traversal

**Task 3.1.10**: Update BadgeClass API controller
- Modify `createBadgeClass` to handle version and relationship fields
- Modify `updateBadgeClass` to handle version and relationship fields
- Add version increment logic for updates
- Add relationship management in CRUD operations

### Phase 5: Testing (Tasks 3.1.11 - 3.1.13)

**Task 3.1.11**: Add unit tests for updated BadgeClass entity
- Test version field handling
- Test relationship field handling  
- Test JSON-LD serialization with new fields
- Test backward compatibility with OB 2.0

**Task 3.1.12**: Add API tests for versioning and relationship endpoints
- Test CRUD operations with version fields
- Test relationship management endpoints
- Test circular dependency validation
- Test error handling and edge cases

**Task 3.1.13**: Add E2E tests for end-to-end functionality
- Test complete achievement versioning workflow
- Test achievement relationship creation and management
- Test endorsement workflow
- Test cross-version compatibility

## Commit Strategy

**Commit Group 1: Research & Design**
- Document research findings and design decisions
- Create data model specifications

**Commit Group 2: Database Schema**  
- Database migration scripts
- Schema updates for both SQLite and PostgreSQL

**Commit Group 3: Entity Updates**
- BadgeClass entity modifications
- Serialization updates

**Commit Group 4: API Implementation**
- New relationship endpoints
- Controller updates
- Validation logic

**Commit Group 5: Testing**
- Unit tests
- API tests  
- E2E tests

## Risk Assessment

**Low Risk**:
- Adding optional fields to existing entity (backward compatible)
- Database schema changes (additive only)

**Medium Risk**:
- Circular dependency validation complexity
- Performance impact of relationship queries

**High Risk**:
- None identified

## Files to Modify

1. **Database Schema**:
   - `src/infrastructure/database/modules/postgresql/schema.ts`
   - `src/infrastructure/database/modules/sqlite/schema.ts`
   - `drizzle/migrations/` (new migration files)

2. **Domain Entities**:
   - `src/domains/badgeClass/badgeClass.entity.ts`
   - `src/api/dtos/badgeClass.dto.ts`
   - `src/api/validation/badgeClass.schemas.ts`

3. **API Layer**:
   - `src/api/controllers/badgeClass.controller.ts`
   - `src/api/api.router.ts` (new relationship endpoints)

4. **Repository Layer**:
   - `src/infrastructure/database/modules/postgresql/repositories/postgres-badge-class.repository.ts`
   - `src/infrastructure/database/modules/sqlite/repositories/sqlite-badge-class.repository.ts`

5. **Tests**:
   - `tests/unit/domains/badgeClass/` (new unit tests)
   - `tests/api/` (new API tests)
   - `tests/e2e/` (new E2E tests)

## Next Steps

1. Begin with Task 3.1.3 (Design data model changes for versioning)
2. Create detailed technical specifications for each component
3. Implement in the order specified above
4. Test thoroughly at each phase before proceeding

## Open Badges 3.0 Compliance Notes

- All changes maintain backward compatibility with Open Badges 2.0
- New fields are optional and only appear in OB 3.0 JSON-LD output
- Follows OB 3.0 specification exactly for field names and structures
- Supports full EndorsementCredential objects as per OB 3.0 requirements
