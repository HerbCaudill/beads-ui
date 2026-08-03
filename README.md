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

## Use it from an agent

The package also includes a read-only MCP server for the Beads database in the agent's current repository. It exposes `list_issues` and `get_issue`. The list tool returns structured issue data, a compact text fallback, and an [MCP App](https://modelcontextprotocol.io/extensions/apps/overview) that compatible hosts render inline.

Install the Codex plugin to register the MCP server and teach Codex when to prefer its inline issue list:

```bash
codex plugin marketplace add HerbCaudill/plugins
codex plugin add beads@herbcaudill
```

If you previously added the MCP server directly, remove that duplicate configuration with `codex mcp remove beads`. To register only the MCP server without the routing skill:

```bash
codex mcp add beads -- npx -y @herbcaudill/beads-ui mcp
```

For another MCP client, configure a local stdio server with:

```json
{
  "command": "npx",
  "args": ["-y", "@herbcaudill/beads-ui", "mcp"]
}
```

Start a new agent session in a repository containing `.beads`, then ask something like “Show me the active Beads issues.” The MCP server stays fixed to the directory in which the client launches it; it does not search parent directories or initialize a database.

## Develop it

This pnpm workspace keeps the public CLI in `apps/beads-ui`. The SDK, HTTP server, React manager, and MCP App under `packages/` are private and bundled into the published package.

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

The packed test creates a tarball, installs it in a clean temporary project, launches the installed executable against a fixture workspace, and probes the packaged browser UI, API, MCP tools, and inline HTML resource.

## Release it

Only `@herbcaudill/beads-ui` is public. The other workspace packages have `private: true`, and the tarball contains their bundled runtime code rather than `workspace:*` dependencies.

Publishing uses npm trusted publishing from `.github/workflows/publish.yml`. After CI passes and the package version is updated, create a non-prerelease GitHub release with a tag matching the package version, such as `v0.1.3`. The workflow verifies, builds, packs, and publishes the package under `latest` using short-lived OIDC credentials.

Configure the npm package's trusted publisher for the `HerbCaudill/beads-ui` repository, the `publish.yml` workflow, and the `npm publish` action. The workflow requires no npm token and publishes provenance automatically.

Do not publish any package under `packages/`.
