# Agents

## Beads (bd) — Work Tracking

Use MCP `beads` (bd) as our dependency‑aware issue tracker. Run
`beads/quickstart` to learn how to use it.

### Issue Types

- `bug` - Something broken that needs fixing
- `feature` - New functionality
- `task` - Work item (tests, docs, refactoring)
- `epic` - Large feature composed of multiple issues
- `chore` - Maintenance work (dependencies, tooling)

### Priorities

- `0` - Critical (security, data loss, broken builds)
- `1` - High (major features, important bugs)
- `2` - Medium (nice-to-have features, minor bugs)
- `3` - Low (polish, optimization)
- `4` - Backlog (future ideas)

### Dependency Types

- `blocks` - Hard dependency (issue X blocks issue Y)
- `related` - Soft relationship (issues are connected)
- `parent-child` - Epic/subtask relationship
- `discovered-from` - Track issues discovered during work

Only `blocks` dependencies affect the ready work queue.

### Structured Fields and Labels

- Use issue `type` and `priority` fields.
- Use issue type "epic" and `parent-child` dependencies.
- Use `related` or `discovered-from` dependencies.
- Area pointers are labels, e.g.: `frontend`, `backend`

### Agent Workflow

If no issue is specified, run `bd ready` and claim an unblocked issue.

1. Open issue with `bd show <id>` and read all linked docs.
2. Assign to `agent`, update status as you work (`in_progress` → `closed`);
   maintain dependencies, and attach notes/links for traceability.
3. Discover new work? Create linked issue with dependency
   `discovered-from:<parent-id>` and reference it in a code comment.
4. Land the change; run tests/lint; update any referenced docs.
5. Close the issue with `bd close <id>`.

Never update `CHANGES.md`.

## Coding Standards

- Use **ECMAScript modules**.
- Use `PascalCase` for **classes** and **interfaces**.
- Use `camelCase` for **functions** and **methods**.
- Use `lower_snake_case` for **variables and parameters**.
  - Use `camelCase` for variables referencing functions or callable objects.
  - Use `PascalCase` only for class constructors or imported class symbols.
- Use `UPPER_SNAKE_CASE` for **constants**.
- Use `kebab-case` for **file and directory names**.
- Use `.js` files for all runtime code with JSDoc type annotations (TypeScript
  mode).
- Use `.ts` files **only** for interface and type definitions. These files must
  not contain runtime code or side effects.
- **TypeScript Migration (in progress)**: Converting modules from `.js` to `.ts`
  with full runtime code. Converted modules:
  - `app/protocol.ts` - WebSocket protocol definitions (message types, envelopes)
  - `app/data/providers.ts` - Data layer for issue mutations
  - `app/data/subscriptions-store.ts` - Client-side list subscription store
  - `app/data/subscription-issue-store.ts` - Per-subscription issue store with sorted snapshots
  - `app/data/subscription-issue-stores.ts` - Registry managing per-subscription issue stores
  - `app/data/list-selectors.ts` - List selectors for subscription-scoped issue queries with view-specific sorting
  - `app/router.ts` - Hash-based URL router for views and issue deep-linking
  - `app/state.ts` - Global app state store with subscription support
  - `app/ws.ts` - WebSocket client with auto-reconnect and message correlation
  - `app/main.ts` - Main app bootstrap/orchestration module
  - `app/utils/logging.ts` - Debug logger helper for the browser app
  - `app/utils/priority.ts` - Priority level constants and types
  - `app/utils/status.ts` - Status constants and label function
  - `app/utils/issue-type.ts` - Issue type constants and label function
  - `app/utils/issue-url.ts` - Issue URL hash builder
  - `app/utils/toast.ts` - Global toast notification display
  - `app/utils/markdown.ts` - Markdown renderer with DOMPurify sanitization
  - `app/utils/priority-badge.ts` - Priority badge DOM element factory
  - `app/utils/status-badge.ts` - Status badge DOM element factory
  - `app/utils/type-badge.ts` - Type badge DOM element factory
  - `app/utils/issue-id-renderer.ts` - Copy-to-clipboard issue ID button
  - `app/utils/activity-indicator.ts` - In-flight request activity tracker
  - `app/views/detail.ts` - Issue detail panel view component with lit-html templating
  - `app/views/board.ts` - Kanban board view component with drag-drop support
  - `app/views/list.ts` - Issues list view component with filtering and inline editing
  - `app/views/epics.ts` - Epics view component with expandable epic groups
  - `server/logging.ts` - Debug logger helper for Node server/CLI
  - `server/config.ts` - Server runtime configuration (host, port, paths)
  - `server/db.ts` - Database path resolution with precedence (flag, env, nearest, home-default)
  - `server/validators.ts` - Input validation for subscription protocol payloads
  - `server/watcher.ts` - File watcher for SQLite DB changes with debounce/cooldown
  - `server/registry-watcher.ts` - Workspace registry watcher and in-memory workspace management
  - `server/subscriptions.ts` - Server-side subscription registry for list data with per-key locking
  - `server/list-adapters.ts` - List query adapters mapping subscription types to bd CLI commands
  - `server/bd.ts` - BD CLI integration module (runs the bd command-line tool)
  - `server/ws.ts` - WebSocket server handler for client-server communication
  - `server/app.ts` - Express app setup and configuration
  - `server/index.ts` - Server entry point and wiring
- Shared types live in `types/`:
  - `index.ts` - Central export point for all types
  - `issues.ts` - Issue, Comment, Dependency types
  - `protocol.ts` - WebSocket protocol types (MessageType, RequestEnvelope, etc.)
  - `ws-client.ts` - WebSocket client types (ConnectionState, WsClient, etc.)
  - `subscriptions.ts` - Subscription protocol types
  - `subscription-issue-store.ts` - Store interface types
  - `list-adapters.ts` - Server list adapter types
- TypeScript strict mode is enabled with additional checks:
  `noUncheckedIndexedAccess`, `noImplicitOverride`, `exactOptionalPropertyTypes`.
- Target ES2024 for Node 22+ and modern browser compatibility.
- Place a JSDoc type import block at the top of each file when needed:
  ```js
  /**
   * @import { X, Y, Z } from './file.js'
   */
  ```
  Omit this block if the symbol is already defined within the file.
- Add JSDoc to all functions and methods:
  - Declare all parameters with `@param`.
  - Add `@returns` only when the return type is **not self-evident** from the
    code (e.g., complex conditionals, unions, or context-dependent types). Omit
    it when the return value is **clear and unambiguous** from the function body
    or signature.
- If a local variable’s type may change, or is initialized as an empty
  collection (`{}`, `[]`, `new Set()`, `new Map()`), add a `@type` JSDoc
  annotation to specify the intended type. This applies to both `let` and
  `const` when inference is ambiguous.
- Use braces for all control flow statements, even single-line bodies.
- Use optional chaining (`?.`, `??`, etc.) only when a value is **intentionally
  nullable**. Prefer explicit type narrowing to guarantee value safety.

## Unit Testing Standards

- Write short, focused test functions asserting **one specific behavior** each.
- Name tests using **active verbs** that describe behavior, e.g.
  `returns correct value`, `throws on invalid input`, `emits event`,
  `calls handler`. Avoid starting names with “should …”.
- Follow the structure: **setup → execution → assertion**, separating each block
  with a blank line for readability.

  ```js
  const store = createStore()

  const result = store.addItem("x")

  expect(result).toEqual("x")
  ```

- Do not modify implementation code to make tests pass; adjust the test or fix
  the underlying issue instead.

## Pre‑Handoff Validation

- Run type checks: `npm run tsc`
- Run tests: `npm test`
- Run eslint: `npm run lint`
- Run prettier: `npm run prettier:write`

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**

- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
