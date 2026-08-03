---
name: list-beads
description: Use the Beads MCP tools to show rich issue lists from the current repository. Use whenever Codex needs to list, show, review, filter, compare, triage, or summarize multiple Beads issues, or whenever a user asks what Beads work is open, active, blocked, deferred, completed, or highest priority.
---

# List Beads

Use the plugin's read-only MCP tools so compatible hosts render the searchable issue list inline.

- Before querying, confirm the current repository contains `.beads`. Do not search parent directories or initialize a database.
- For multiple issues, call the Beads `list_issues` tool. Set `includeClosed` only when the user asks for completed or historical work.
- For one known issue, call `get_issue`.
- Let the MCP App present the full collection. Add a prose summary only when requested or when it materially helps; do not duplicate every row by default.
- Use `bd` or another task-management skill for writes and for operations the read-only MCP tools do not expose.
- If the Beads MCP server is unavailable, fall back to `bd` and explain that the inline view is unavailable.
