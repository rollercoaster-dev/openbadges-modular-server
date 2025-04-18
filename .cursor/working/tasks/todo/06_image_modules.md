# 06 · Image Modules (Simplified)

A modular asset‑storage layer that lets any Open Badges install choose how it stores and serves badge images and issuer logos.

## Objective
Implement a simplified modular assets system within the main codebase that provides file storage capabilities for badge images and issuer logos, with a REST endpoint for uploads and configurable storage backends.

## Deliverables (MVP)

- Assets module with core interfaces (`AssetStorageInterface`, `AssetResolver`)
- Local file storage adapter with static file middleware
- REST endpoint `POST /v1/assets` for file uploads
- Simple frontend helper for image uploads
- Environment variable configuration for storage options
- Short README section with curl example

### Improvements (Phase 1.5)

- Add MIME type detection to static file middleware
- Implement file size limits for uploads
- Add file type validation for security
- Add appropriate caching headers for static files
- Create unit tests for asset storage components

### Deferred (Phase 2+)

S3 adapter, Cloudinary adapter, drag‑and‑drop `<ImageUploader>`, full unit/E2E test suite, detailed docs, additional storage back‑ends.

## Tasks (MVP)

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Define core interfaces in `src/infrastructure/assets` | BE | ☑ |
| 2 | Implement local adapter & static file middleware | BE | ☑ |
| 3 | Add `POST /v1/assets` route for file uploads | BE | ☑ |
| 4 | Create factory for asset storage providers | BE | ☑ |
| 5 | Wire asset provider via environment variables | BE | ☑ |
| 6 | Update README with usage example | Tech‑W | ☑ |

---

**Implementation notes:**
- Branch: `feature/assets-module`
- Interfaces: `src/infrastructure/assets/interfaces/`
- Local adapter: `src/infrastructure/assets/local/`
- Factory: `src/infrastructure/assets/asset-storage.factory.ts`
- Controller: `src/api/controllers/assets.controller.ts`
- Static middleware: `src/api/static-assets.middleware.ts`
- Registered in main API router
- `.env.example` and `README.md` updated with config and usage

