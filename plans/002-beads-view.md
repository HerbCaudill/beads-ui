# Beads View extraction

## Goal

Replace the simplified React UI with a faithful standalone extraction of Ralph's `packages/beads-view`.

## Approach

Treat the Ralph package as the source of truth and keep that checkout read-only. Recreate its source structure, retained tests, stories, Zustand store, hooks, hotkeys, and required shared UI primitives here. Make a hard cutover from the existing `packages/ui` implementation.

Keep the current SDK, fixed-workspace server, CLI, build, and development launcher. Remove workspace switching and Ralph session or agent integration at explicit seams. Adapt the original UI contracts to the same-origin standalone API, adding real server operations when retained behavior needs them.

## Tasks

1. Inventory Beads View imports and copy its source, retained tests, stories, styles, and required shared primitives into private packages.
2. Delete the simplified UI source and tests so the two implementations cannot be mixed.
3. Establish a compiling baseline for pure utilities, components, the Zustand store, and hooks.
4. Remove workspace selection, workspace persistence, cross-workspace caches, and workspace query parameters.
5. Remove Ralph session linking, agent-view integration, and Ralph-specific shared types.
6. Add contract tests for the standalone API adapter and WebSocket refresh behavior.
7. Add missing SDK and server operations required by retained UI behavior.
8. Wire the extracted root application, fonts, Tailwind styles, URL routing, and Vite entry point.
9. Restore retained unit and component tests, changing only intentionally removed behavior.
10. Expand Playwright coverage for search, creation, editing, comments, relationships, hotkeys, and routed details.
11. Verify formatting, typechecking, unit tests, build, Playwright, and the packed tarball.

## Unresolved questions

None.
