# Standalone Beads UI design

## Goal

Create a focused monorepo for a polished Beads task manager that runs from any Beads project with `npx @herbcaudill/beads-ui`.

## Architecture

The repository contains one public application and three private implementation packages:

```text
apps/
  beads-ui/ # Published CLI and packaged web application
packages/
  sdk/      # Typed adapter around the bd CLI
  server/   # Single-workspace HTTP and WebSocket server
  ui/       # React task manager
```

Only `@herbcaudill/beads-ui` is published. Its release build bundles the private runtime packages and includes the compiled UI assets, so consumers never install internal workspace packages.

The extraction starts from the useful behavior in Ralph's `beads-sdk`, `beads-server`, `beads-view`, and `beads-demo` packages. It deliberately excludes Ralph orchestration, agent chat, workspace discovery, shared agent themes, demos, and generic component-library machinery.

## Runtime behavior

The CLI resolves the launch directory once, verifies that `bd` is installed and `.beads` exists, then starts a server bound to `127.0.0.1`. The server serves the React application, HTTP API, and WebSocket endpoint from one origin. It never accepts an arbitrary workspace path from the browser.

The default command selects an available port, prints the URL and workspace path, opens the browser, and remains attached until interrupted. Initial options are `--port` and `--no-open`. A missing `bd` executable or `.beads` directory produces a specific terminal error; the application does not initialize Beads on the user's behalf.

The UI manages only the launch directory. It has no workspace registry, discovery, selector, namespaced URLs, or cross-workspace cache. A change poller detects mutations made outside the UI and tells connected browsers to refresh over WebSocket.

## Product behavior

The standalone application retains task listing, search, filtering, creation, editing, deletion, relationships, labels, comments, keyboard navigation, hotkeys, and task status summaries from the existing Beads demo. UI primitives required by those features live inside the private UI package.

## Errors and security

Startup failures are terminal and actionable: unsupported Node version, unavailable `bd`, missing `.beads`, unreadable workspace, or an unavailable requested port. Runtime `bd` failures become structured API errors and visible UI messages without crashing the process.

The server listens on loopback only. The workspace is fixed at startup, canonicalized to an absolute path, and held server-side. Browser input cannot select filesystem paths or command arguments outside the supported API.

## Testing and release

The SDK has unit tests for command construction, parsing, and error mapping through an injected command runner. The server has API and WebSocket integration tests against disposable fixtures. The UI uses Vitest and Testing Library for meaningful user interactions. Playwright covers the built application's main task-management flow.

A release smoke test runs `npm pack`, installs the tarball in a clean directory, invokes the real executable, and verifies the packaged UI and API. CI runs formatting checks, typechecking, unit tests, the package smoke test, and Playwright. Publishing releases only `@herbcaudill/beads-ui`, with npm provenance.

## Decisions

- Start with a fresh Git history instead of filtering Ralph's history.
- Publish one scoped package while retaining private workspace boundaries.
- Manage only the current directory.
- Do not initialize Beads automatically.
- Keep configuration limited to demonstrated needs.

## Unresolved questions

None.
