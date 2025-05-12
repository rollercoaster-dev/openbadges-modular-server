# E2E Test Fixes

## Current Status (Updated 2023-05-08)

We're working on fixing the E2E tests for the OpenBadges Modular Server. The tests are currently failing due to several issues:

- ❌ **Issuer Creation Tests**: Failing due to validation errors
- ✅ **OpenBadges Compliance Tests**: Now passing after fixes
- ❌ **Other E2E Tests**: Likely failing due to similar issues

## Identified Issues

1. **Type Mismatch in Issuer Data**:
   - Tests were using `type: 'Profile'` (OB2 format) but the server expects `type: 'Issuer'` (OB3 format)
   - Fixed by updating the test data in `test-data.helper.ts` and `issuer.e2e.test.ts`

2. **Environment Configuration**:
   - `.env.test` file had incorrect paths for SQLite database
   - Fixed by updating `SQLITE_DB_PATH` to `./tests/e2e/test_database.sqlite`

3. **API Key Authentication**:
   - Added `AUTH_API_KEY_E2E` to `.env.test` to ensure proper authentication
   - Tests now use the correct API key format

4. **Database Path Issues**:
   - SQLite database path was incorrect in `.env.test`
   - Updated to match the path used in test scripts

## Current Progress

1. **Fixed Issues**:
   - ✅ Updated issuer type from 'Profile' to 'Issuer' in test data
   - ✅ Fixed SQLite database path in `.env.test`
   - ✅ Added proper API key configuration in `.env.test`
   - ✅ Added debug logging to test-data.helper.ts to diagnose issues

2. **Remaining Issues**:
   - ❓ Need to verify if all E2E tests are now passing
   - ❓ May need to update other entity types (BadgeClass, Assertion) to match OB3 format
   - ❓ Potential issues with database connections or cleanup between tests

## Next Steps

1. **Run All E2E Tests**:
   - Run `bun run test:e2e:sqlite` to verify if all tests are now passing
   - Debug any remaining failures

2. **Update Other Entity Types**:
   - Check and update BadgeClass and Assertion test data to ensure they use OB3 format
   - Verify that all test data matches the validation schemas

3. **Improve Test Reliability**:
   - Ensure proper database cleanup between tests
   - Add more robust error handling and logging
   - Consider adding transaction support for test isolation

4. **Documentation**:
   - Update documentation on how to run E2E tests
   - Document common issues and solutions

## Technical Details

### Environment Setup

The E2E tests require specific environment configuration:

```
# Authentication Configuration
AUTH_ENABLED=true
AUTH_API_KEY_TEST=verysecretkeye2e:test-user:E2E Testing Key with Admin Permissions
AUTH_API_KEY_E2E=verysecretkeye2e:e2e-user:E2E Testing Key with Admin Permissions
AUTH_PUBLIC_PATHS=/docs,/swagger,/health,/public,/v3/issuers/*/verify,/v3/badge-classes/*/verify,/v3/assertions/*/verify
AUTH_DISABLE_RBAC=true

# SQLite Test Database
SQLITE_DB_PATH=./tests/e2e/test_database.sqlite
```

### Test Data Helper

The `test-data.helper.ts` file has been updated to:
1. Use OB3 format for issuer data (`type: 'Issuer'`)
2. Add debug logging for API responses
3. Parse response text as JSON to handle potential JSON parsing errors

### Running Tests

To run the E2E tests:

```bash
# For SQLite tests
bun run test:e2e:sqlite

# For PostgreSQL tests
bun run test:e2e:pg
```

## Lessons Learned

1. **OB2 vs OB3 Format**: The server is now using OB3 format, so all test data needs to be updated accordingly.
2. **API Key Authentication**: Proper API key configuration is essential for tests to pass.
3. **Database Paths**: Ensure database paths are consistent between environment files and test scripts.
4. **Debug Logging**: Adding debug logging to API responses helps diagnose validation errors.

## References

- [OpenBadges v3.0 Specification](https://www.imsglobal.org/spec/ob/v3p0)
- [Verifiable Credentials Data Model](https://www.w3.org/TR/vc-data-model/)
- [Hono Framework Documentation](https://hono.dev/)
