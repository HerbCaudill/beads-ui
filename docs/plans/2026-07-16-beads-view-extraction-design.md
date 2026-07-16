# Beads View extraction design

## Problem

The first standalone implementation rebuilt the task manager as a much smaller React application. That lost most of Ralph's `packages/beads-view` behavior and component architecture. The standalone shell is sound, but the UI is not the intended extraction.

## Goal

Use Ralph's `packages/beads-view` as the source of truth for the standalone UI. Preserve its visual design, component hierarchy, Zustand store, hooks, task trees, filters, detail routing, hotkeys, tests, and stories.

Remove only behavior that does not belong in a current-directory application:

- workspace discovery, selection, switching, and persistence;
- cross-workspace caches and WebSocket subscriptions;
- Ralph session linking and agent-view integration; and
- dependencies on Ralph-specific packages and themes.

The existing simplified `packages/ui` implementation will be deleted rather than blended into the extraction.

## Architecture

Keep the current standalone packages around the replacement UI:

```text
apps/
  beads-ui/   # Published CLI and packaged web application
packages/
  components/ # Private UI primitives extracted from Ralph as needed
  sdk/        # Private typed bd adapter
  server/     # Private fixed-workspace HTTP and WebSocket server
  ui/         # Private extraction of Ralph's beads-view
```

Only `@herbcaudill/beads-ui` is published. The build bundles private runtime code and compiled UI assets into that package.

The Ralph checkout remains read-only. Source is recreated in this repository, then changed at explicit integration seams instead of rewritten component by component.

## Data flow

The CLI fixes the workspace at `process.cwd()`. The browser cannot choose or submit a filesystem path.

The extracted Zustand store remains the client-side source of truth for task lists, tree state, selection, filtering, details, comments, dependencies, and optimistic mutations. A same-origin API adapter preserves the interfaces expected by `beads-view` while calling the standalone server.

The adapter removes workspace query parameters and translates between Ralph's task response shapes and the standalone issue API where needed. If the original UI requires a real task operation that the standalone server lacks, add the operation to the SDK and server instead of removing the UI behavior.

The browser connects to `/api/events`. Any fixed-workspace change triggers the appropriate store refresh. There is no workspace-subscription message or workspace-driven reconnection.

## UI scope

Preserve the complete task-management experience from `beads-view`, including:

- grouped and hierarchical task lists;
- search and filters;
- quick task creation;
- full task details and URL-addressable selection;
- status, priority, type, labels, comments, and relationships;
- progress summaries;
- keyboard navigation and hotkeys; and
- loading, empty, and error states.

Do not preserve workspace selection or Ralph session and agent affordances.

## Errors and lifecycle

Startup validation, loopback binding, browser launch, and graceful shutdown remain in the current CLI. Runtime `bd` failures stay structured at the API boundary and visible in the extracted UI. Optimistic mutations refresh or roll back when the server rejects a change.

## Testing

Use strict TDD for new standalone behavior and changed integration seams. Preserve Ralph tests for retained behavior, changing them only where workspace or session behavior has intentionally disappeared.

Work in dependency order:

1. Establish the transplanted component and store baseline.
2. Remove workspace and Ralph-only dependencies behind failing tests.
3. Adapt API and WebSocket behavior with contract tests.
4. Integrate the replacement application and styles.
5. Restore component, hook, hotkey, and pure-function coverage.
6. Cover search, creation, editing, comments, relationships, and routed details in Playwright.
7. Run the production build and packed-package smoke test.

## Decisions

- Replace the simplified UI completely.
- Preserve source structure and behavior instead of selectively recreating components.
- Extract only the shared UI primitives that `beads-view` uses.
- Keep the standalone SDK, server, CLI, and development launcher unless a retained UI behavior exposes a missing contract.
- Keep all implementation packages private.

## Unresolved questions

None.
