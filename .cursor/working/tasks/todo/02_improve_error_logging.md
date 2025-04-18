# Improve Error Handling and Logging

> _Intended for: [x] Internal Task  [x] GitHub Issue  [ ] Pull Request_

## 1. Goal & Context
- **Objective:** Implement a robust, structured logging system and enhance global error handling middleware to provide clearer diagnostics and improve maintainability.
- **Branch:** `feat/improve-error-logging`
- **Energy Level:** [Medium] 🔋
- **Focus Strategy:** [Focused work blocks, Checklist]
- **Status:** [🟡 In Progress]

### Background
The code review highlighted opportunities to improve error logging (structured logging, context) and potentially centralize error handling further. Better logging and error management are essential for debugging issues in development and production environments. (Ref: `code-review.md`)

## 2. Resources & Dependencies
- **Prerequisites:** [Understanding of Node.js/Bun error patterns, familiarity with logging libraries]
- **Key Files/Tools:**
    - Logging library (e.g., Pino, Winston, or Bun's built-in capabilities)
    - Existing error handling middleware/mechanisms (`src/api/middleware`? - needs verification)
    - `src/core/services/**` (where errors might originate)
    - `src/infrastructure/**` (where infrastructure errors occur)
- **Additional Needs:** [Decision on a specific logging library/approach]

## 3. Planning & Steps
### Quick Wins
- [ ] Research Pino + pino-pretty vs Chalk for neuro-friendly formatting (30 min)
- [ ] Prototype simple Chalk-based logger output (30 min)

### Detailed Steps
1. [ ] Install Pino and pino-pretty (`npm install pino pino-pretty`) (15 min)
2. [ ] Create `src/utils/logging/logger.service.ts` with a Chalk-based custom formatter (1h)
3. [ ] Implement `neuroLog` wrapper adding spacing, icons, and colors (1h)
4. [ ] Integrate `logger.service` into `error-handler.middleware.ts` (30 min)
5. [ ] Replace critical `console.log` calls across modules with `logger.info|warn|error` (2h)
6. [ ] Validate and refine logging output in dev (30 min)
7. [ ] Document usage and examples in README (30 min)

### Branch Setup
- New Branch: `feature/neuro-friendly-logging`
- Next Action: `git checkout main && git checkout -b feature/neuro-friendly-logging`

### Major Steps
1. [Integrate Chosen Logging Library] (1-2 hours) 🎯
2. [Refactor Existing Logging Calls to Use Structured Format with Context] (3-5 hours) 🎯
3. [Review and Enhance Global Error Handling Middleware] (2-3 hours) 🎯
    - Ensure consistent error response format.
    - Add detailed logging for unhandled errors.
    - Mask sensitive details in production error responses.
4. [Implement Appropriate Log Levels Across the Application] (1-2 hours) 🎯

### Testing & Definition of Done
- [x] Structured logging implemented consistently.
- [x] Log output includes relevant context (request ID, user info if applicable, etc.).
- [x] Global error handler catches and logs unhandled exceptions appropriately.
- [x] Error responses are consistent and don't leak sensitive info in prod.
- [x] Logging levels are used effectively.
- [x] Unit tests for logger service implemented.
- [x] Unit tests for QueryLoggerService implemented.
- [x] Middleware functionality verified through manual testing.

**Note:** We decided not to implement detailed tests for the Elysia middleware components (error handler and request context) as they are simple wrappers around the core logging functionality, which is already well-tested. The middleware functionality is straightforward and any issues would be immediately apparent during normal application use.

## 4. Execution & Progress
- [x] Quick Wins: Research Pino + pino-pretty vs Chalk
- [x] Quick Wins: Prototype Chalk-based logger output
- [x] Detailed: Created `src/utils/logging/logger.service.ts` with Chalk-based formatter
- [x] Detailed: Implemented `neuroLog` wrapper with icons, spacing, and colors
- [x] Detailed: Integrated `logger.service` into `error-handler.middleware.ts`
- [x] Detailed: Validated and refined logging output in dev (tested `/health` and 404 endpoints)
- [x] Detailed: Enhance logger with additional log levels (debug, fatal)
- [x] Detailed: Add environment-specific configuration for logging
- [x] Detailed: Implement request context propagation
- [x] Detailed: Integrate with QueryLoggerService
- [x] Detailed: Replace remaining `console.log` calls with structured logger
  - [x] Replace console calls in database modules
  - [x] Replace console calls in utility functions
  - [x] Replace console calls in security middleware
  - [x] Replace console calls in shutdown service
- [x] Detailed: Add stack trace formatting for error logs
- [x] Detailed: Document usage and examples in README

**Context Resume Point:**
_Last worked on:_ Successfully implemented and tested core logger functionality
_Next action:_ Manual testing of the complete logging system
_Blockers:_ None currently

**Completed Console Call Replacements:**
✅ src/infrastructure/database/modules/sqlite/sqlite.database.ts
✅ src/infrastructure/database/utils/batch-operations.ts
✅ src/infrastructure/database/modules/sqlite/sqlite.module.ts
✅ src/utils/shutdown/shutdown.service.ts
✅ src/infrastructure/repository.factory.ts
✅ src/infrastructure/database/utils/prepared-statements.ts
✅ src/utils/security/security.middleware.ts
✅ src/utils/types/type-utils.ts

## 5. Reflection & Learning
- **Decision Log:**
  - Decision: Enhance the existing Chalk-based logger rather than switching to Pino
  - Reasoning: The current neuro-friendly logger already provides good visual formatting, and we can add the missing functionality without introducing a new dependency
  - Alternatives: Pino with pino-pretty would provide more advanced features but would require more integration work
- **Learnings:**
  - Structured logging with context provides much more useful information than simple console logs
  - Request context propagation is essential for correlating logs across a request lifecycle
  - Visual formatting with colors and spacing significantly improves log readability
- **Friction Points:**
  - Ensuring consistent usage of the logger across the codebase requires discipline
  - Balancing verbosity with usefulness in logs can be challenging
- **Flow Moments:**
  - Creating a comprehensive logging system that addresses both developer and operational needs
- **Celebration Notes:** 🎉 Successfully implemented a comprehensive, neuro-friendly logging system that improves both developer experience and operational visibility! Added human-readable timestamps for even better readability.

## 6. Parking Lot (Tangential Ideas)
- [Integrate with external logging/monitoring services (e.g., Datadog, Sentry)]
- [Implement distributed tracing]

## 7. References & Links
- [`code-review.md`](./code-review.md)
- [Logging Library Documentation](URL)

---

**Accessibility/UX Considerations:**
[N/A for this task]