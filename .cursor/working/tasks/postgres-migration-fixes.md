# PostgreSQL Migration Fixes - Task Analysis

## Summary of Database Switch and Impact

The project has been configured to switch from SQLite to PostgreSQL as the default database, but this change has introduced significant compatibility issues that are causing widespread test failures. The core problem is a **data type mismatch between the application's ID format and PostgreSQL's UUID column type**.

### Key Configuration Changes Made:
- `.env` file: `DB_TYPE=postgresql` and `DATABASE_URL=postgres://postgres:postgres@localhost:5432/openbadges`
- Database factory now defaults to PostgreSQL when `DB_TYPE=postgresql`
- PostgreSQL schema uses native `uuid()` column types
- SQLite schema uses `text()` column types

### Impact Assessment:
- **63 test failures** out of 458 total tests
- **387 tests passing** (mostly non-database tests)
- **8 tests skipped** (SQLite-specific tests)
- All PostgreSQL repository tests failing with UUID format errors
- E2E tests failing due to database connection/operation issues

## Root Cause Analysis

### Primary Issue: UUID Format Mismatch

**Problem**: The application generates IDs in URN format (`urn:uuid:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`) but PostgreSQL's `uuid` column type expects plain UUID format (`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).

**Evidence**:
```
PostgresError: invalid input syntax for type uuid: "urn:uuid:1b350441-64b3-4ed3-9752-7563d3551d65"
```

**Schema Comparison**:
- **SQLite**: `id: text('id').primaryKey()` - accepts any string format including URN
- **PostgreSQL**: `id: uuid('id').primaryKey().defaultRandom()` - requires plain UUID format

**Code Locations**:
- ID generation: `src/utils/types/iri-utils.ts:176` - `return \`urn:uuid:${uuidv4()}\` as Shared.IRI;`
- Domain entities: All use `createOrGenerateIRI()` which generates URN format
- PostgreSQL mappers: Cast URN format directly to string without conversion

## Categorized Issues

### 1. **CRITICAL - UUID Format Conversion** (Priority: HIGH)

**Affected Components**:
- All PostgreSQL mappers (`postgres-issuer.mapper.ts`, `postgres-badge-class.mapper.ts`, `postgres-assertion.mapper.ts`)
- All PostgreSQL repositories
- PostgreSQL schema foreign key references

**Specific Failures**:
- `PostgresIssuerRepository > should create an issuer`
- `PostgresBadgeClassRepository > should create a badge class`
- `PostgresAssertionRepository > should create an assertion`
- All CRUD operations failing with UUID syntax errors

**Required Changes**:
- Create UUID conversion utilities to extract plain UUID from URN format
- Update PostgreSQL mappers to convert between URN and UUID formats
- Ensure foreign key references use consistent UUID format

### 2. **HIGH - Schema Inconsistencies** (Priority: HIGH)

**Issues**:
- PostgreSQL schema uses `uuid()` for all ID fields
- SQLite schema uses `text()` for all ID fields
- Foreign key references expect UUID format in PostgreSQL
- Default value generation differs between databases

**Affected Tables**:
- `users`, `roles`, `api_keys`, `issuers`, `badge_classes`, `assertions`, `platforms`, `platform_users`, `user_roles`, `user_assertions`

### 3. **MEDIUM - Type Conversion Utilities** (Priority: MEDIUM)

**Current State**:
- `convertUuid()` function exists but doesn't handle URN conversion
- No utilities for URN ↔ UUID conversion
- PostgreSQL mappers assume string casting is sufficient

**Required Enhancements**:
- Enhance `convertUuid()` to handle URN format conversion
- Create database-specific ID conversion utilities
- Update type conversion utilities for PostgreSQL compatibility

### 4. **MEDIUM - Test Infrastructure** (Priority: MEDIUM)

**Issues**:
- Test helper creates tables manually instead of using migrations
- Connection timeout issues in some tests
- Database cleanup between tests may be incomplete

**Affected Files**:
- `tests/infrastructure/database/modules/postgresql/postgres-test-helper.ts`
- All PostgreSQL repository test files

### 5. **LOW - Configuration and Environment** (Priority: LOW)

**Issues**:
- Default test command still uses SQLite (`DB_TYPE=sqlite bun test`)
- Some environment variable inconsistencies
- Documentation may need updates

## Prioritized Action Items

### Phase 1: Core UUID Conversion (CRITICAL - 1-2 days)

1. **Create UUID Conversion Utilities**
   - File: `src/infrastructure/database/utils/uuid-conversion.ts`
   - Functions: `urnToUuid()`, `uuidToUrn()`, `extractUuidFromUrn()`
   - Handle validation and error cases

2. **Update PostgreSQL Mappers**
   - `postgres-issuer.mapper.ts`: Convert URN to UUID in `toPersistence()`, UUID to URN in `toDomain()`
   - `postgres-badge-class.mapper.ts`: Same conversion pattern
   - `postgres-assertion.mapper.ts`: Same conversion pattern + foreign key handling

3. **Enhance Type Conversion Utilities**
   - Update `convertUuid()` in `type-conversion.ts`
   - Add PostgreSQL-specific conversion logic
   - Ensure backward compatibility with SQLite

### Phase 2: Repository and Schema Fixes (HIGH - 1 day)

4. **Update PostgreSQL Repositories**
   - Ensure all ID parameters are converted before database operations
   - Update query conditions to use UUID format
   - Fix foreign key reference handling

5. **Verify Schema Consistency**
   - Ensure all foreign key references use UUID format
   - Update migration files if necessary
   - Test schema creation and constraints

### Phase 3: Test Infrastructure (MEDIUM - 1 day)

6. **Fix Test Infrastructure**
   - Update test helpers to handle UUID conversion
   - Improve connection management and cleanup
   - Ensure tests use proper environment configuration

7. **Update Test Data**
   - Ensure test data uses appropriate ID formats
   - Update test assertions to handle conversion
   - Fix any hardcoded ID references

### Phase 4: Configuration and Documentation (LOW - 0.5 days)

8. **Update Configuration**
   - Fix default test command to respect DB_TYPE
   - Update environment variable documentation
   - Ensure consistent configuration across environments

9. **Update Documentation**
   - Document UUID conversion approach
   - Update API documentation if needed
   - Add troubleshooting guide for database switching

## PostgreSQL-Specific Considerations

### Best Practices to Implement:

1. **UUID Handling**
   - Use PostgreSQL's native UUID generation where possible
   - Maintain URN format in application layer for Open Badges compliance
   - Convert at the persistence boundary (mappers)

2. **Performance Optimizations**
   - Leverage PostgreSQL's native UUID indexing
   - Use JSONB for complex data structures
   - Implement proper connection pooling

3. **Data Integrity**
   - Ensure foreign key constraints work with UUID format
   - Implement proper transaction handling
   - Add database-level validation where appropriate

4. **Migration Strategy**
   - Create migration scripts for existing SQLite data
   - Ensure data conversion preserves relationships
   - Test migration with realistic data volumes

## Estimated Complexity and Effort

### Development Effort:
- **Phase 1 (Critical)**: 2 days - Core UUID conversion implementation
- **Phase 2 (High)**: 1 day - Repository and schema fixes  
- **Phase 3 (Medium)**: 1 day - Test infrastructure updates
- **Phase 4 (Low)**: 0.5 days - Configuration and documentation

**Total Estimated Effort**: 4.5 days

### Risk Assessment:
- **Low Risk**: UUID conversion is well-defined and testable
- **Medium Risk**: Ensuring all foreign key relationships work correctly
- **High Risk**: Data migration from existing SQLite databases

### Success Criteria:
1. All PostgreSQL repository tests pass
2. E2E tests pass with PostgreSQL backend
3. No regression in SQLite functionality
4. Performance meets or exceeds SQLite implementation
5. Clear documentation for database switching

## Next Steps

1. **Immediate**: Implement UUID conversion utilities (Phase 1, Item 1)
2. **Short-term**: Update PostgreSQL mappers (Phase 1, Items 2-3)
3. **Medium-term**: Complete repository fixes and test updates (Phases 2-3)
4. **Long-term**: Optimize performance and create migration tools

This comprehensive plan addresses both immediate test failures and long-term PostgreSQL integration success.
