# Fix Swagger UI Rendering

> _Intended for: [x] Internal Task  [x] GitHub Issue  [ ] Pull Request_

## 1. Goal & Context
- **Objective:** Ensure the `/swagger` or `/docs` endpoint renders an interactive Swagger UI (or Redoc) for API exploration, not just the raw OpenAPI JSON.
- **Branch:** `fix/swagger-ui-rendering`
- **Status:** [🔲 To Do]

### Background
Currently, the Swagger endpoint only returns JSON. For developer usability, it should serve a browsable UI (Swagger UI or Redoc) that references the OpenAPI spec.

## 2. Steps
- [ ] Research Elysia/Bun-compatible Swagger UI or Redoc integration
- [ ] Add static file serving or middleware for Swagger UI assets
- [ ] Configure the UI to load the OpenAPI JSON from the correct endpoint
- [ ] Add a `/swagger` or `/docs` route that renders the UI
- [ ] Test in browser and document usage in README

## 3. Definition of Done
- [ ] `/swagger` or `/docs` renders a usable UI in browser
- [ ] OpenAPI JSON loads and displays all endpoints
- [ ] Instructions added to README

## 4. Parking Lot
- Consider Redoc as an alternative UI
- Explore API authentication for docs if needed 