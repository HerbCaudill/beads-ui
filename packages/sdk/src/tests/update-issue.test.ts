import { describe, expect, it, vi } from "vitest"

import { updateIssue } from "../update-issue.js"
import type { CommandRunner } from "../types.js"

describe("updateIssue", () => {
  it("updates typed issue fields", async () => {
    const runner = vi.fn<CommandRunner>(async () => ({
      stdout: JSON.stringify([
        {
          id: "bd-1",
          title: "Updated",
          description: "New description",
          status: "in_progress",
          priority: 0,
          issue_type: "bug",
          assignee: "Herb",
          parent: "bd-epic",
          created_at: "2026-07-15T10:00:00Z",
          updated_at: "2026-07-15T11:00:00Z",
        },
      ]),
      stderr: "",
    }))

    await updateIssue({ cwd: "/workspace", runner }, "bd-1", {
      title: "Updated",
      description: "New description",
      status: "in_progress",
      priority: 0,
      type: "bug",
      assignee: "Herb",
      parent: "bd-epic",
    })

    expect(runner).toHaveBeenCalledWith({
      args: [
        "update",
        "bd-1",
        "--json",
        "--title",
        "Updated",
        "--description",
        "New description",
        "--status",
        "in_progress",
        "--priority",
        "0",
        "--type",
        "bug",
        "--assignee",
        "Herb",
        "--parent",
        "bd-epic",
      ],
      cwd: "/workspace",
    })
  })

  it("allows a description to be cleared", async () => {
    const runner = vi.fn<CommandRunner>(async () => ({
      stdout: JSON.stringify([
        {
          id: "bd-1",
          title: "Updated",
          description: "",
          status: "open",
          priority: 2,
          issue_type: "task",
          created_at: "2026-07-15T10:00:00Z",
          updated_at: "2026-07-15T11:00:00Z",
        },
      ]),
      stderr: "",
    }))

    await updateIssue({ cwd: "/workspace", runner }, "bd-1", { description: "" })

    expect(runner).toHaveBeenCalledWith({
      args: ["update", "bd-1", "--json", "--description", "", "--allow-empty-description"],
      cwd: "/workspace",
    })
  })
})
