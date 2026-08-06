# Beads MCP App

This private workspace package contains the MCP server and inline issue-list and issue-detail
application bundled into `@herbcaudill/beads-ui`.

Run the application as a normal Vite page for hot reloading, representative issue fixtures, host
themes, and responsive widths:

```bash
pnpm --filter @beads/mcp dev
```

Production builds render the MCP host wrapper and exclude the preview controls and fixture data.

## Shared components

Task rows and status groups come from `@beads/ui/presentation`, the same components the web app
renders, so the two stay in sync. That entry point deliberately excludes anything that fetches or
that reaches `@beads/components` — the markdown renderer statically imports shiki, which would
dominate the inlined single-file bundle.

Those components are written against the web app's design tokens (`--foreground`, `--muted`,
`--status-*`). `app.css` maps each of them onto the CSS variables the MCP host supplies at runtime,
so the widget adopts the host's palette rather than shipping its own. `light-dark()` handles both
color schemes, keyed off the `color-scheme` that `applyDocumentTheme` sets.

The components take the HTTP API's snake_case task shape while the MCP tools return the SDK's
camelCase issue; `issue-to-task.ts` and `related-issue-to-task.ts` are the seam between them.
