# Fix Swagger UI Rendering

> _Intended for: [x] Internal Task  [x] GitHub Issue  [ ] Pull Request_

## 1. Goal & Context
- **Objective:** Ensure the `/swagger` or `/docs` endpoint renders an interactive Swagger UI (or Redoc) for API exploration, not just the raw OpenAPI JSON.
- **Branch:** `fix/swagger-ui-rendering`
- **Status:** [✅ Done]

### Background
Currently, the Swagger endpoint only returns JSON. For developer usability, it should serve a browsable UI (Swagger UI or Redoc) that references the OpenAPI spec.

## 2. Steps
- [x] Research Elysia/Bun-compatible Swagger UI or Redoc integration
- [x] Configure the UI to load the OpenAPI JSON from the correct endpoint
- [x] Add a `/docs` route that renders the Swagger UI
- [x] Test in browser and document usage in README

## 3. Definition of Done
- [x] `/docs` renders a usable Swagger UI in browser
- [x] OpenAPI JSON loads and displays all endpoints
- [x] Instructions added to README

## 4. Parking Lot
- Consider Redoc as an alternative UI
- Explore API authentication for docs if needed