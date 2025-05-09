# Migration Checklist: Elysia.js → Hono

## Migration Plan

**Objective:**
Migrate all API routing, middleware, and controller logic from Elysia.js to Hono, ensuring type safety, modularity, and maintainability throughout the codebase.

**Guiding Principles:**
- All routers, sub-routers, and middleware must use Hono or OpenAPIHono exclusively—no Elysia code should remain.
- Refactor incrementally, verifying type safety and runtime behavior at each stage.
- Maintain clean, idiomatic TypeScript and adhere to project lint/type-check standards.
- Update documentation and comments to reflect Hono usage.

**Migration Sequence:**
1. **Audit & Planning**
   - Identify all Elysia usage (imports, instantiations, types, comments, plugins).
   - Document affected files and components (see checklist below).
2. **Router Refactor**
   - Refactor main routers (`api.router.ts`, `backpack.router.ts`, `user.router.ts`) to use Hono/OpenAPIHono.
   - Update router composition and exports in `index.ts` and related files.
3. **Middleware Refactor**
   - Refactor all middleware (context, security, validation, error handling, static assets) to Hono equivalents.
   - Replace Elysia-specific APIs and plugins (e.g., helmet, rate-limit) with Hono-compatible solutions.
4. **Controller & Serialization Cleanup**
   <!-- MIGRATION CHECKLIST -->

## Migration Status & Blockers
- **Critical:** Elysia routers/types are still present in several API modules (e.g., backpack.router.ts, versioned routers)
- **Blockers:** Type errors from mixing Elysia and Hono, context/middleware incompatibilities, and incomplete refactoring
- **Lint/Typecheck:** Codebase must pass `bun run lint` and `bun run typecheck` after each migration step

## Architectural Guidance (Hono)
- **Routers:** All routers must return and compose Hono instances only. Do not attempt to wrap/adapt Elysia routers.
- **Router Composition:** Use `.route(path, subRouter)` or `.use(path, subRouter)` for sub-router mounting (see Hono docs)
- **Middleware:** Implement using Hono's `createMiddleware`/`factory` pattern. Access context variables via `c.var`
- **Context:** Use `c.req`, `c.res`, `c.var` for all request/response/context access
- **Validation:** Use Zod schemas for all request validation, with async `.parseAsync` for bodies/queries
- **Strict Typing:** No usage of `any`. All handlers and middleware must use explicit types

## Migration Steps
1. **Remove Elysia:** Delete all Elysia imports, router factories, and usages from each API module
2. **Refactor Routers:** Rewrite each router (user, backpack, versioned, etc.) to use Hono for routes/middleware
3. **Validation:** For each endpoint, use Zod schemas for validation (input/output where possible)
4. **Context:** Replace Elysia context access with Hono context (`c.req`, `c.res`, `c.var`)
5. **Lint/Typecheck:** After each router migration, run `bun run lint` and `bun run typecheck`. Do not proceed if errors remain
6. **Document Issues:** Record any architectural/type issues for review
7. **Reference Docs:** When in doubt, consult official [Hono](https://github.com/honojs/website) and [Zod](https://github.com/colinhacks/zod) documentation

## Code Style & Rules
- Strict typing everywhere (never use `any`)
- All validation via Zod, colocate or import schemas
- Async middleware/handlers, always return Hono Response
- Remove unused imports/variables
- Use Bun for all scripts
- Concise, readable, and well-commented code
- Document architectural decisions/deviations here
- Each router must be fully type-safe and pass lint/typecheck before merging

---
**For implementation agents:**
- Do not attempt to "adapt" Elysia routers—rewrite using Hono idioms
- If you encounter a blocker, document it and pause for review
- Use this checklist as a gate for migration progress


## Migration Status & Blockers
- **Critical:** Elysia routers/types are still present in several API modules (e.g., backpack.router.ts, versioned routers)
- **Blockers:** Type errors from mixing Elysia and Hono, context/middleware incompatibilities, and incomplete refactoring
- **Lint/Typecheck:** Codebase must pass `bun run lint` and `bun run typecheck` after each migration step

## Architectural Guidance (Hono)
- **Routers:** All routers must return and compose Hono instances only. Do not attempt to wrap/adapt Elysia routers.
- **Router Composition:** Use `.route(path, subRouter)` or `.use(path, subRouter)` for sub-router mounting (see Hono docs)
- **Middleware:** Implement using Hono's `createMiddleware`/`factory` pattern. Access context variables via `c.var`
- **Context:** Use `c.req`, `c.res`, `c.var` for all request/response/context access
- **Validation:** Use Zod schemas for all request validation, with async `.parseAsync` for bodies/queries
- **Strict Typing:** No usage of `any`. All handlers and middleware must use explicit types

## Migration Steps
1. **Remove Elysia:** Delete all Elysia imports, router factories, and usages from each API module
2. **Refactor Routers:** Rewrite each router (user, backpack, versioned, etc.) to use Hono for routes/middleware
3. **Validation:** For each endpoint, use Zod schemas for validation (input/output where possible)
4. **Context:** Replace Elysia context access with Hono context (`c.req`, `c.res`, `c.var`)
5. **Lint/Typecheck:** After each router migration, run `bun run lint` and `bun run typecheck`. Do not proceed if errors remain
6. **Document Issues:** Record any architectural/type issues for review
7. **Reference Docs:** When in doubt, consult official [Hono](https://github.com/honojs/website) and [Zod](https://github.com/colinhacks/zod) documentation

## Code Style & Rules
- Strict typing everywhere (never use `any`)
- All validation via Zod, colocate or import schemas
- Async middleware/handlers, always return Hono Response
- Remove unused imports/variables
- Use Bun for all scripts
- Concise, readable, and well-commented code
- Document architectural decisions/deviations here
- Each router must be fully type-safe and pass lint/typecheck before merging

---
**For implementation agents:**
- Do not attempt to "adapt" Elysia routers—rewrite using Hono idioms
- If you encounter a blocker, document it and pause for review
- Use this checklist as a gate for migration progress

   - Remove Elysia serialization workarounds in controllers.
   - Ensure all responses are plain objects as required by Hono/OpenAPIHono.
5. **Auth Middleware Refactor**
   - Refactor authentication and platform auth middleware for Hono.
6. **Verification & Cleanup**
   - Run `bun run typecheck` and lint after each major step.
   - Test endpoints manually and/or via automated tests.
   - Remove any remaining Elysia references, comments, or dead code.
   - Update documentation and this checklist as work progresses.

**Completion Criteria:**
- All checklist items below are marked complete.
- No Elysia code, types, or comments remain.
- Type checks and linting pass with no new errors.
- All endpoints and middleware function as expected under Hono.

---

## App/Server Instantiation
- [x] `src/index.ts`: Replace Elysia app/server instantiation, plugins, and startup logic with Hono equivalents.

## Routers
- [x] `src/api/backpack.router.ts`: Refactor router construction and exports.
- [x] `src/api/user.router.ts`: Refactor router construction and exports.

## Controllers & Serialization
- [x] `src/api/controllers/assets.controller.ts`: Refactor router and serialization logic.
- [x] `src/api/controllers/badgeClass.controller.ts`: Remove Elysia serialization workaround.
- [x] `src/api/controllers/issuer.controller.ts`: Remove Elysia serialization workaround.
- [x] `src/api/controllers/assertion.controller.ts`: Remove Elysia serialization workaround.

## Hono Migration Critical Checklist
- [x] **Ensure all routers, sub-routers, and controller routers are instances of `Hono` or `OpenAPIHono` only.**
- [x] **Remove all Elysia routers and Elysia-specific code from router composition.**
- [x] **Verify all router composition in `api.router.ts`, `index.ts`, and any feature routers use only Hono types.**
- [x] **Re-run typecheck after refactor.**

**Note:**
- Type errors such as `Argument of type 'Elysia<...>' is not assignable to parameter of type 'MiddlewareHandler<...>'` are caused by mixing Elysia and Hono routers. The solution is to unify all router types to Hono and remove Elysia from the codebase.

## Middleware & Context
- [x] `src/utils/validation/validation-middleware.ts`: Refactor Context usage, status handling, and validation logic for Hono.
- [x] `src/utils/logging/request-context.middleware.ts`: Refactor Elysia context and hooks to Hono middleware.
- [x] `src/utils/security/security.middleware.ts`: Refactor security middleware and replace plugins (rate-limit, helmet) with Hono-compatible versions.
- [x] `src/utils/security/middleware/rate-limit.middleware.ts`: Refactor rate limiting for Hono.
- [x] `src/utils/security/middleware/security-headers.middleware.ts`: Refactor security headers for Hono.
- [x] `src/utils/errors/error-handler.middleware.ts`: Refactor error and not-found handlers for Hono.
- [x] `src/api/static-assets.middleware.ts`: Refactor static assets middleware for Hono.

## Auth Middleware
- [x] `src/auth/middleware/auth.middleware.ts`: Refactor authentication middleware for Hono.
- [x] `src/auth/middleware/platform-auth.middleware.ts`: Refactor platform auth middleware for Hono.
- [x] `src/auth/middleware/rbac.middleware.ts`: Refactor RBAC middleware for Hono.

---

## Testing
- [x] Fix TypeScript errors in test files.
- [x] Update test files to use Hono instead of Elysia.
- [x] Run tests to verify functionality.

## Progress Tracking
- Mark each item as complete after code refactor, lint/type-check, and verification.
- Add new items if additional Elysia patterns are discovered during migration.
- Keep this file updated as the single source of truth for migration status.

---

*Generated by David, migration lead.*
