# Beads MCP App

This private workspace package contains the MCP server and inline issue-list and issue-detail
application bundled into `@herbcaudill/beads-ui`.

Run the application as a normal Vite page for hot reloading, representative issue fixtures, host
themes, and responsive widths:

```bash
pnpm --filter @beads/mcp dev
```

Production builds render the MCP host wrapper and exclude the preview controls and fixture data.
