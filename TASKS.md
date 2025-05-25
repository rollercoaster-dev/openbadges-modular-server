# PostgreSQL Migration Fix Tasks

## 🚨 Critical Issues Found

After investigating the PostgreSQL migration, I found **63 failing tests** caused by a fundamental UUID format mismatch:

**Root Cause**: Application generates URN format IDs (`urn:uuid:...`) but PostgreSQL UUID columns expect plain format (`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

**Error Example**:
```
PostgresError: invalid input syntax for type uuid: "urn:uuid:1b350441-64b3-4ed3-9752-7563d3551d65"
```

## 📋 Task Breakdown

### 🔴 Phase 1: UUID Conversion (CRITICAL - 2 days)

**Task 1.1: Create UUID Conversion Utilities**
- [ ] Create file: `src/infrastructure/database/utils/uuid-conversion.ts`
- [ ] Function: `urnToUuid(urn: string): string` - Extract UUID from URN
- [ ] Function: `uuidToUrn(uuid: string): Shared.IRI` - Convert UUID to URN
- [ ] Function: `isValidUrn(value: string): boolean` - Validate URN format
- [ ] Add error handling for invalid formats
- [ ] Write comprehensive unit tests

**Task 1.2: Fix PostgreSQL Issuer Mapper**
- [ ] File: `src/infrastructure/database/modules/postgresql/mappers/postgres-issuer.mapper.ts`
- [ ] Update `toPersistence()`: Convert `entity.id` from URN to UUID
- [ ] Update `toDomain()`: Convert `record.id` from UUID to URN
- [ ] Test with real data

**Task 1.3: Fix PostgreSQL BadgeClass Mapper**
- [ ] File: `src/infrastructure/database/modules/postgresql/mappers/postgres-badge-class.mapper.ts`
- [ ] Update `toPersistence()`: Convert `entity.id` and `entity.issuer` from URN to UUID
- [ ] Update `toDomain()`: Convert `record.id` and `record.issuerId` from UUID to URN
- [ ] Test foreign key relationships

**Task 1.4: Fix PostgreSQL Assertion Mapper**
- [ ] File: `src/infrastructure/database/modules/postgresql/mappers/postgres-assertion.mapper.ts`
- [ ] Update `toPersistence()`: Convert `entity.id` and `entity.badgeClass` from URN to UUID
- [ ] Update `toDomain()`: Convert `record.id` and `record.badgeClassId` from UUID to URN
- [ ] Test foreign key relationships

**Task 1.5: Update Type Conversion Utilities**
- [ ] File: `src/infrastructure/database/utils/type-conversion.ts`
- [ ] Enhance `convertUuid()` function to handle URN conversion
- [ ] Add PostgreSQL-specific logic
- [ ] Maintain SQLite compatibility

### 🟡 Phase 2: Repository Fixes (HIGH - 1 day)

**Task 2.1: Fix Repository Query Operations**
- [ ] File: `src/infrastructure/database/modules/postgresql/repositories/postgres-issuer.repository.ts`
- [ ] Ensure all `findById()`, `update()`, `delete()` operations convert IDs
- [ ] File: `src/infrastructure/database/modules/postgresql/repositories/postgres-badge-class.repository.ts`
- [ ] Fix `findByIssuer()` to convert issuer ID parameter
- [ ] File: `src/infrastructure/database/modules/postgresql/repositories/postgres-assertion.repository.ts`
- [ ] Fix `findByBadgeClass()` and `findByRecipient()` operations

**Task 2.2: Verify Base Repository**
- [ ] File: `src/infrastructure/database/modules/postgresql/repositories/base-postgres.repository.ts`
- [ ] Update `validateEntityId()` to accept both URN and UUID formats
- [ ] Add conversion helpers for common operations

**Task 2.3: Test All CRUD Operations**
- [ ] Run PostgreSQL repository tests
- [ ] Verify create, read, update, delete operations
- [ ] Test foreign key constraints work correctly

### 🟡 Phase 3: Test Infrastructure (MEDIUM - 1 day)

**Task 3.1: Fix Test Helper**
- [ ] File: `tests/infrastructure/database/modules/postgresql/postgres-test-helper.ts`
- [ ] Update table creation to handle UUID conversion
- [ ] Improve connection management and cleanup
- [ ] Add better error logging

**Task 3.2: Update Repository Tests**
- [ ] File: `tests/infrastructure/database/modules/postgresql/repositories/postgres-issuer.repository.test.ts`
- [ ] File: `tests/infrastructure/database/modules/postgresql/repositories/postgres-badge-class.repository.test.ts`
- [ ] File: `tests/infrastructure/database/modules/postgresql/repositories/postgres-assertion.repository.test.ts`
- [ ] Ensure test data uses correct ID formats
- [ ] Fix any hardcoded UUID references

**Task 3.3: Fix E2E Tests**
- [ ] File: `tests/e2e/openBadgesCompliance.e2e.test.ts`
- [ ] Ensure PostgreSQL E2E tests pass
- [ ] Verify complete workflows work end-to-end

### 🟢 Phase 4: Configuration (LOW - 0.5 days)

**Task 4.1: Update Package.json**
- [ ] Fix default test command to respect `DB_TYPE` environment variable
- [ ] Update PostgreSQL test scripts
- [ ] Ensure consistent environment handling

**Task 4.2: Documentation**
- [ ] Document UUID conversion approach
- [ ] Update troubleshooting guide
- [ ] Add database switching instructions

## ✅ Success Criteria

**Phase 1 Complete:**
- [ ] All UUID conversion utilities working and tested
- [ ] All PostgreSQL mappers convert IDs correctly
- [ ] Basic repository operations pass

**Phase 2 Complete:**
- [ ] All PostgreSQL repository tests pass (currently 63 failing)
- [ ] Foreign key relationships work
- [ ] No SQL syntax errors

**Phase 3 Complete:**
- [ ] All unit tests pass
- [ ] E2E tests pass with PostgreSQL
- [ ] Test infrastructure is reliable

**Phase 4 Complete:**
- [ ] Configuration is consistent
- [ ] Documentation is updated
- [ ] Easy database switching

## 🎯 Final Success Metrics

- [ ] **0 PostgreSQL test failures** (currently 63 failing)
- [ ] **387+ tests passing** (maintain current passing tests)
- [ ] **E2E tests pass** with PostgreSQL backend
- [ ] **No SQLite regression** (all SQLite tests still pass)
- [ ] **Performance acceptable** (similar to SQLite)

## ⚠️ Risks & Mitigation

**High Risk:**
- [ ] Foreign key integrity - Test thoroughly with realistic data
- [ ] Data migration - Create safe migration scripts
- [ ] API compatibility - Ensure no breaking changes

**Medium Risk:**
- [ ] Performance impact - Monitor query performance
- [ ] Test reliability - Improve connection handling
- [ ] Configuration complexity - Simplify environment setup

## 📅 Timeline

- **Phase 1**: 2 days (UUID conversion core)
- **Phase 2**: 1 day (Repository fixes)
- **Phase 3**: 1 day (Test infrastructure)
- **Phase 4**: 0.5 days (Configuration)

**Total Estimated**: 4.5 days

## 🔧 Prerequisites

- [ ] PostgreSQL server running and accessible
- [ ] Test database configured (`openbadges_test`)
- [ ] Environment variables set correctly
- [ ] All dependencies installed (`postgres` package available)
