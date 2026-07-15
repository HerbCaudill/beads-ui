import { describe, expect, it, vi } from "vitest"

import { getIssue } from "../get-issue.js"
import type { CommandRunner } from "../types.js"

describe("getIssue", () => {
  it("gets one issue with its related data", async () => {
    const runner = vi.fn<CommandRunner>(async () => ({
      stdout: JSON.stringify([
        {
          id: "bd-1",
          title: "First issue",
          status: "open",
          priority: 2,
          issue_type: "task",
          created_at: "2026-07-15T10:00:00Z",
          updated_at: "2026-07-15T11:00:00Z",
          dependencies: [
            {
              id: "bd-parent",
              title: "Parent",
              status: "open",
              priority: 1,
              issue_type: "epic",
              created_at: "2026-07-14T10:00:00Z",
              updated_at: "2026-07-14T11:00:00Z",
              dependency_type: "parent-child",
            },
          ],
          dependents: [
            {
              id: "bd-2",
              title: "Dependent",
              status: "open",
              priority: 2,
              issue_type: "task",
              created_at: "2026-07-15T10:00:00Z",
              updated_at: "2026-07-15T11:00:00Z",
              dependency_type: "blocks",
            },
          ],
          comments: [
            {
              id: "comment-1",
              issue_id: "bd-1",
              author: "Herb",
              text: "Context",
              created_at: "2026-07-15T10:30:00Z",
            },
          ],
        },
      ]),
      stderr: "",
    }))

    const issue = await getIssue({ cwd: "/workspace", runner }, "bd-1")

    expect(runner).toHaveBeenCalledWith({
      args: ["show", "--json", "--include-comments", "--include-dependents", "--", "bd-1"],
      cwd: "/workspace",
    })
    expect(issue).toEqual(
      expect.objectContaining({
        id: "bd-1",
        labels: [],
        commentCount: 0,
        dependencies: [
          expect.objectContaining({ id: "bd-parent", dependencyType: "parent-child" }),
        ],
        dependents: [expect.objectContaining({ id: "bd-2", dependencyType: "blocks" })],
        comments: [expect.objectContaining({ id: "comment-1", text: "Context" })],
      }),
    )
  })

  it("returns null when the issue is absent", async () => {
    const runner = vi.fn<CommandRunner>(async () => ({ stdout: "[]", stderr: "" }))

    await expect(getIssue({ cwd: "/workspace", runner }, "bd-missing")).resolves.toBeNull()
  })
})
