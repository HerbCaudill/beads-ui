import { describe, expect, it, vi } from "vitest"

import { createIssue } from "../create-issue.js"
import type { CommandRunner } from "../types.js"

describe("createIssue", () => {
  it("creates an issue from typed input", async () => {
    const runner = vi.fn<CommandRunner>(async () => ({
      stdout: JSON.stringify({
        id: "bd-2",
        title: "Fix quoting; do not execute",
        description: "Keep this as one argument",
        status: "open",
        priority: 1,
        issue_type: "bug",
        assignee: "Herb",
        parent: "bd-1",
        labels: ["sdk", "security"],
        created_at: "2026-07-15T10:00:00Z",
        updated_at: "2026-07-15T10:00:00Z",
      }),
      stderr: "",
    }))

    const issue = await createIssue(
      { cwd: "/workspace", runner },
      {
        title: "Fix quoting; do not execute",
        description: "Keep this as one argument",
        type: "bug",
        priority: 1,
        assignee: "Herb",
        parent: "bd-1",
        labels: ["sdk", "security"],
      },
    )

    expect(runner).toHaveBeenCalledWith({
      args: [
        "create",
        "--json",
        "--title=Fix quoting; do not execute",
        "--description=Keep this as one argument",
        "--type=bug",
        "--priority=1",
        "--assignee=Herb",
        "--parent=bd-1",
        "--labels=sdk,security",
      ],
      cwd: "/workspace",
    })
    expect(issue.id).toBe("bd-2")
  })
})
