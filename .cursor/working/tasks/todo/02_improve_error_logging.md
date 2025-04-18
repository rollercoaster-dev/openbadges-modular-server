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
- [ ] Structured logging implemented consistently.
- [ ] Log output includes relevant context (request ID, user info if applicable, etc.).
- [ ] Global error handler catches and logs unhandled exceptions appropriately.
- [ ] Error responses are consistent and don't leak sensitive info in prod.
- [ ] Logging levels are used effectively.

## 4. Execution & Progress
- [ ] [Step/Task]: [Progress/Notes]
- [ ] [Step/Task]: [Progress/Notes]

**Context Resume Point:**
_Last worked on:_
_Next action:_
_Blockers:_

## 5. Reflection & Learning
- **Decision Log:**
  - Decision:
  - Reasoning:
  - Alternatives:
- **Learnings:**
- **Friction Points:**
- **Flow Moments:**
- **Celebration Notes:** 🎉

## 6. Parking Lot (Tangential Ideas)
- [Integrate with external logging/monitoring services (e.g., Datadog, Sentry)]
- [Implement distributed tracing]

## 7. References & Links
- [`code-review.md`](./code-review.md)
- [Logging Library Documentation](URL)

---

**Accessibility/UX Considerations:**
[N/A for this task] 