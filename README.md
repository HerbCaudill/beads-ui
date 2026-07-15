# Beads UI

Beads UI is a local web interface for the Beads database in your current directory. It starts one loopback-only server, opens the task manager in your browser, and stays attached to the terminal until you stop it.

It does not search for workspaces or let the browser choose a directory. The directory where you run the command is the directory it manages.

## Run it

You need Node.js 22 or newer, the `bd` command on your `PATH`, and an existing `.beads` directory.

```bash
cd /path/to/a/beads-project
npx @herbcaudill/beads-ui
```

The manager chooses an available port and opens your browser. To keep the browser closed or request a specific port:

```bash
npx @herbcaudill/beads-ui --no-open
npx @herbcaudill/beads-ui --port 4400
```

The requested port must be available on `127.0.0.1`. The command reports a clear error when Node is too old, `bd` is unavailable, the directory is unreadable, or `.beads` does not exist. It never initializes a database for you.

## Develop it

This pnpm workspace keeps the public CLI in `apps/beads-ui`. The SDK, server, and React application under `packages/` are private and bundled into the published package.

```bash
pnpm install
pnpm dev
```

Before committing, run:

```bash
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright test
pnpm tsx apps/beads-ui/scripts/test-packed.ts
```

The packed test creates a tarball, installs it in a clean temporary project, launches the installed executable against a fixture workspace, and probes the packaged UI and API.

## Release it

Only `@herbcaudill/beads-ui` is public. The other workspace packages have `private: true`, and the tarball contains their bundled runtime code rather than `workspace:*` dependencies.

After CI passes and the package version is updated, authenticate npm through a trusted publisher or an automation token, then run:

```bash
pnpm build
pnpm tsx apps/beads-ui/scripts/test-packed.ts
pnpm --filter @herbcaudill/beads-ui publish --access public --provenance
```

Run the publish command from GitHub Actions when possible. npm provenance then links the package to the workflow and source commit. Do not publish any package under `packages/`.
