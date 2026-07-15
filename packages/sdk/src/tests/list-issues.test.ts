import { describe, expect, it, vi } from "vitest"

import { listIssues } from "../list-issues.js"
import type { CommandRunner } from "../types.js"

describe("listIssues", () => {
  it("lists every issue in the configured workspace", async () => {
    const runner = vi.fn<CommandRunner>(async () => ({
      stdout: JSON.stringify([
        {
          id: "bd-1",
          title: "First issue",
          status: "open",
          priority: 1,
          issue_type: "task",
          created_at: "2026-07-15T10:00:00Z",
          updated_at: "2026-07-15T11:00:00Z",
          labels: ["frontend"],
          dependency_count: 0,
          dependent_count: 1,
          comment_count: 2,
        },
      ]),
      stderr: "",
    }))

    const issues = await listIssues({ cwd: "/workspace", runner })

    expect(runner).toHaveBeenCalledWith({
      args: ["list", "--json", "--all", "--limit", "0"],
      cwd: "/workspace",
    })
    expect(issues).toEqual([
      expect.objectContaining({
        id: "bd-1",
        title: "First issue",
        type: "task",
        labels: ["frontend"],
        commentCount: 2,
      }),
    ])
  })

  it("maps malformed command output to a structured error", async () => {
    const runner = vi.fn<CommandRunner>(async () => ({ stdout: "not json", stderr: "" }))

    await expect(listIssues({ cwd: "/workspace", runner })).rejects.toMatchObject({
      code: "invalid_output",
      output: "not json",
    })
  })
})
