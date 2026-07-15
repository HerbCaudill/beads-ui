# Agent instructions

## Project overview

This repository contains a standalone web manager for Beads task databases. The public package is `@herbcaudill/beads`; it launches against the current directory with `npx @herbcaudill/beads`.

## Packages

- `apps/beads` — published CLI and packaged web application
- `packages/sdk` — private typed adapter around the `bd` CLI
- `packages/server` — private single-workspace HTTP and WebSocket server
- `packages/ui` — private React task-manager application

## Commands

```bash
pnpm build
pnpm dev
pnpm format
pnpm test
pnpm typecheck
```

## Conventions

Use TypeScript, React, pnpm, oxfmt, Vitest, and Playwright. Use named exports. Put each component and helper function in its own file, with tests in adjacent `tests/` directories. Document declarations and parameters with JSDoc block comments. Use TDD for meaningful behavior.

Use `bd` for task tracking. Work is complete only after verification, commit, and push.
