# Standalone Beads manager

## Goal

Extract the useful Beads task-manager functionality from Ralph into a focused monorepo published as `@herbcaudill/beads`.

## Approach

Create private SDK, server, and UI packages beneath one published CLI application. Preserve useful task-management behavior while removing Ralph, agent, theme, workspace-discovery, and multi-workspace dependencies. Bundle all private runtime code and compiled UI assets into the published package.

## Tasks

1. Scaffold the pnpm workspace, shared TypeScript configuration, formatting, testing, and CI foundations.
2. Extract a typed, injected `bd` command adapter into the private SDK package.
3. Build a single-workspace HTTP and WebSocket server around the SDK.
4. Extract the React task manager and remove workspace selection and cross-workspace state.
5. Build the public CLI, same-origin static serving, startup validation, browser launch, and graceful shutdown.
6. Add integration, Playwright, and packed-tarball smoke coverage.
7. Document installation, command usage, development, and publishing.

## Unresolved questions

None.
