import { describe, expect, it, vi } from "vitest"

import { addComment } from "../add-comment.js"
import { listComments } from "../list-comments.js"
import type { CommandRunner } from "../types.js"

describe("comments", () => {
  it("lists comments for an issue", async () => {
    const runner = vi.fn<CommandRunner>(async () => ({
      stdout: JSON.stringify([
        {
          id: "comment-1",
          issue_id: "bd-1",
          author: "Herb",
          text: "Working on it",
          created_at: "2026-07-15T10:00:00Z",
        },
      ]),
      stderr: "",
    }))

    const comments = await listComments({ cwd: "/workspace", runner }, "bd-1")

    expect(runner).toHaveBeenCalledWith({
      args: ["comments", "bd-1", "--json"],
      cwd: "/workspace",
    })
    expect(comments[0]).toEqual({
      id: "comment-1",
      issueId: "bd-1",
      author: "Herb",
      text: "Working on it",
      createdAt: "2026-07-15T10:00:00Z",
    })
  })

  it("adds a comment with an optional author", async () => {
    const runner = vi.fn<CommandRunner>(async () => ({
      stdout: JSON.stringify({
        id: "comment-1",
        issue_id: "bd-1",
        author: "Herb",
        text: "Done",
        created_at: "2026-07-15T10:00:00Z",
      }),
      stderr: "",
    }))

    const comment = await addComment({ cwd: "/workspace", runner }, "bd-1", "Done", "Herb")

    expect(runner).toHaveBeenCalledWith({
      args: ["comments", "add", "bd-1", "Done", "--author", "Herb", "--json"],
      cwd: "/workspace",
    })
    expect(comment.id).toBe("comment-1")
  })
})
