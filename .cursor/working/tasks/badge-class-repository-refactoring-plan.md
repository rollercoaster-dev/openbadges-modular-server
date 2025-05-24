# BadgeClass Repository Refactoring Plan

## Overview

This document outlines the plan to refactor the SQLite BadgeClass repository implementation to fix stale database client references and improve connection management, following the successful patterns established in the Issuer repository refactoring.

## Current Issues

### Stale Database Client References in `sqlite-badge-class.repository.ts`
- **Raw Database client constructor**: Accepts `Database` client directly instead of `SqliteConnectionManager`
- **Stale client references**: Repository stores drizzle instance once, causing issues after reconnects
- **No connection validation**: Missing `ensureConnected()` calls before database operations
- **Inconsistent with Issuer pattern**: Different approach compared to properly refactored Issuer repository

### Repository Coordinator Issues in `sqlite-repository.coordinator.ts`
- **Lazy initialization with raw client**: Gets raw client once and stores repository instance
- **Stale references after reconnects**: BadgeClass repository becomes unusable after database reconnections
- **Inconsistent patterns**: Issuer repository correctly uses SqliteConnectionManager, but BadgeClass doesn't

## Success Criteria

### Connection Management ✅
- [ ] Repository uses `SqliteConnectionManager` instead of raw `Database` client
- [ ] Fresh database client obtained for each operation via `getDatabase()`
- [ ] Proper connection validation with `ensureConnected()` calls
- [ ] No stale client references after database reconnections

### Pattern Consistency ✅
- [ ] Follows same pattern as `SqliteIssuerRepository`
- [ ] Repository coordinator passes `SqliteConnectionManager` to repositories
- [ ] Consistent error handling and logging patterns
- [ ] Same operation context and metrics logging approach

### Functionality ✅
- [ ] All existing BadgeClass operations work correctly after reconnects
- [ ] No performance regression from connection management changes
- [ ] Proper error handling with connection context
- [ ] Repository coordinator health checks work correctly

### Code Quality ✅
- [ ] Clean, documented code following established patterns
- [ ] Consistent with Issuer repository implementation
- [ ] Easy to extend and modify
- [ ] Ready for comprehensive test coverage

## Implementation Plan

### Phase 1: Update BadgeClass Repository Constructor and Connection Management
**File**: `src/infrastructure/database/modules/sqlite/repositories/sqlite-badge-class.repository.ts`

**Tasks**:
1. **Update constructor** to accept `SqliteConnectionManager` instead of raw `Database` client
2. **Add `getDatabase()` method** following exact pattern from `SqliteIssuerRepository`
3. **Update all database operations** to use `this.getDatabase()` instead of stored `this.db`
4. **Add operation context and metrics logging** following Issuer repository patterns
5. **Add proper connection validation** with `ensureConnected()` calls

**Expected Outcome**: BadgeClass repository that gets fresh database clients for each operation

### Phase 2: Update Repository Coordinator
**File**: `src/infrastructure/database/modules/sqlite/repositories/sqlite-repository.coordinator.ts`

**Tasks**:
1. **Update `getBadgeClassRepository()` method** to pass `SqliteConnectionManager` instead of raw client
2. **Remove lazy initialization caching** to ensure fresh repository instances or update pattern
3. **Ensure consistent pattern** with how `SqliteIssuerRepository` is handled
4. **Update all coordinator methods** that use BadgeClass repository

**Expected Outcome**: Repository coordinator that properly manages BadgeClass repository connections

### Phase 3: Update Tests and Verify Functionality
**Files**:
- `tests/infrastructure/database/modules/sqlite/repositories/sqlite-badge-class.repository.spec.ts`
- Any other tests that instantiate `SqliteBadgeClassRepository` directly

**Tasks**:
1. **Update test setup** to use `SqliteConnectionManager` instead of raw `Database` client
2. **Verify all existing functionality** works with new connection management
3. **Test reconnection scenarios** to ensure stale client issues are resolved
4. **Update any factory or service tests** that create BadgeClass repositories

**Expected Outcome**: All BadgeClass tests passing with new connection management

### Phase 4: Update Repository Factory (if needed)
**File**: `src/infrastructure/repository.factory.ts`

**Tasks**:
1. **Review BadgeClass repository creation** in factory methods
2. **Update to use SqliteConnectionManager** if factory creates BadgeClass repositories
3. **Ensure consistency** with how Issuer repository is created
4. **Test factory methods** work correctly with updated repositories

**Expected Outcome**: Repository factory properly creates BadgeClass repositories with connection management

## File Structure After Refactoring

```
src/infrastructure/database/modules/sqlite/
├── mappers/
│   ├── sqlite-issuer.mapper.ts ✅ (completed)
│   ├── sqlite-badge-class.mapper.ts 🔄 (to be enhanced)
│   └── sqlite-assertion.mapper.ts (existing)
├── repositories/
│   ├── sqlite-issuer.repository.ts ✅ (completed)
│   ├── sqlite-badge-class.repository.ts 🔄 (to be refactored)
│   ├── sqlite-assertion.repository.ts (existing)
│   └── sqlite-repository.coordinator.ts 🔄 (to be enhanced)
├── services/
│   └── sqlite-database.service.ts 🔄 (to be enhanced)
└── tests/
    ├── repositories/
    │   ├── sqlite-issuer.repository.test.ts ✅ (completed)
    │   └── sqlite-badge-class.repository.spec.ts 🔄 (to be updated)
    └── sqlite.database.test.ts 🔄 (to be fixed)
```

## Dependencies and Prerequisites

### Completed Dependencies ✅
- [x] Type safety foundation (types, converters, connection manager)
- [x] Issuer repository refactoring (provides patterns to follow)
- [x] Service layer architecture
- [x] Repository coordinator foundation

### Required for This Task
- [ ] Review of current BadgeClass repository implementation
- [ ] Understanding of BadgeClass-specific business logic
- [ ] Coordination with Issuer repository patterns

## Risk Assessment

### Low Risk ✅
- **Proven patterns**: Following successful Issuer repository refactoring
- **Incremental approach**: Step-by-step implementation
- **Comprehensive testing**: Each phase will be tested
- **Backward compatibility**: Maintaining existing API

### Mitigation Strategies
- **Follow Issuer patterns exactly**: Proven successful approach
- **Test each phase thoroughly**: Ensure no regressions
- **Maintain API compatibility**: No breaking changes to existing code
- **Document all changes**: Clear documentation for future maintenance

## Timeline Estimate

- **Phase 1 (Repository Connection Management)**: 1-2 hours
- **Phase 2 (Repository Coordinator Update)**: 1 hour
- **Phase 3 (Test Updates)**: 1-2 hours
- **Phase 4 (Repository Factory Update)**: 30 minutes

**Total Estimated Time**: 3.5-5.5 hours

## Success Metrics

### Connection Management
- [ ] Repository uses `SqliteConnectionManager` correctly
- [ ] No stale database client references after reconnections
- [ ] All database operations get fresh clients
- [ ] Consistent with Issuer repository patterns

### Functionality
- [ ] All existing BadgeClass operations work correctly after changes
- [ ] Repository coordinator properly manages BadgeClass repository
- [ ] Proper error handling and logging maintained
- [ ] Performance maintained or improved

### Testing
- [ ] All BadgeClass repository tests pass with new connection management
- [ ] Integration tests pass
- [ ] No regressions in existing functionality
- [ ] Reconnection scenarios work correctly

## Next Steps

1. **Start with Phase 1: Update BadgeClass repository constructor and connection management**
2. **Follow exact same pattern as SqliteIssuerRepository**
3. **Update repository coordinator to pass SqliteConnectionManager**
4. **Test thoroughly to ensure no stale client issues**
5. **Verify all existing functionality works correctly**

---

**Note**: This refactoring focuses specifically on fixing the stale database client issue by ensuring repositories always get fresh database clients through SqliteConnectionManager, following the exact pattern successfully used in the Issuer repository.
