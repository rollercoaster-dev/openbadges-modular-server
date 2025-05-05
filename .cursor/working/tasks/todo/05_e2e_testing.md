# Implement and Improve E2E Testing

> _Intended for: [x] Internal Task  [x] GitHub Issue  [ ] Pull Request_

## 1. Goal & Context
- **Objective:** Establish robust end-to-end (E2E) testing to validate the full API stack, including HTTP endpoints, database, and integration flows.
- **Branch:** `feat/e2e-testing`
- **Status:** [🔲 To Do]

### Background
Current testing is focused on unit and integration tests. E2E tests are needed to ensure the system works as expected from the perspective of a real client, catching issues that lower-level tests may miss.

## 2. Steps
- [ ] Select an E2E testing tool (e.g., Playwright, Supertest, or curl scripts)
- [ ] Set up a dedicated E2E test environment (SQLite and Docker/Postgres)
- [ ] Write E2E tests for critical user flows (issuer, badge, assertion CRUD, verification, revocation)
- [ ] Add E2E tests for error cases and edge conditions
- [ ] Integrate E2E tests into CI pipeline
- [ ] Document how to run E2E tests locally and in CI

## 3. Definition of Done
- [ ] E2E tests cover all major API flows
- [ ] E2E tests run successfully in CI
- [ ] Documentation is updated

## 4. Current Status (Updated 2025-05-05)

This task has not yet been started. Based on a review of the implementation plan and acceptance criteria, here's the current status:

### Completed:
- Initial task planning and requirements gathering

### Remaining (Prioritized):
1. **High Priority:**
   - Select an appropriate E2E testing tool compatible with the project stack
   - Set up a dedicated E2E test environment with both SQLite and PostgreSQL support
   - Implement core E2E tests for the most critical API flows (issuance, verification)

2. **Medium Priority:**
   - Expand test coverage to include all CRUD operations
   - Add tests for error cases and edge conditions
   - Integrate E2E tests into CI pipeline

3. **Lower Priority:**
   - Document E2E testing procedures for developers
   - Optimize test performance and reliability

### Next Steps:
1. Research and select the most appropriate E2E testing tool
2. Create a basic E2E test setup with environment configuration
3. Implement first test case for a core API flow

## 5. Parking Lot
- Explore browser-based E2E tests for Swagger UI
- Consider E2E tests for authentication and security flows
- Investigate visual regression testing for any UI components