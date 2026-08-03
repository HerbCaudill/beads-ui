# Beads UI

Beads UI runs a local web interface for the Beads database in your current directory.

You need Node.js 22 or newer, the `bd` command on your `PATH`, and an existing `.beads` directory.

```bash
cd /path/to/a/beads-project
npx @herbcaudill/beads-ui
```

The manager binds to `127.0.0.1`, chooses an available port, opens your browser, and stays attached to the terminal. It manages only the launch directory and never initializes Beads for you.

Use `--no-open` to skip opening the browser, or `--port 4400` to request a specific available port.

The package also includes a read-only MCP server for agents. In an MCP Apps-compatible client, `list_issues` displays a searchable task list inline while still returning structured data and a text fallback.

```bash
codex mcp add beads -- npx -y @herbcaudill/beads-ui mcp
```

Start the agent in a repository containing `.beads`, then ask it to show the active Beads issues. Other MCP clients can launch `npx -y @herbcaudill/beads-ui mcp` as a local stdio server.
