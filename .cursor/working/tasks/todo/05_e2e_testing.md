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

## 4. Parking Lot
- Explore browser-based E2E tests for Swagger UI
- Consider E2E tests for authentication and security flows 