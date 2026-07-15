import { describe, expect, it, vi } from "vitest"

import { deleteIssue } from "../delete-issue.js"
import type { CommandRunner } from "../types.js"

describe("deleteIssue", () => {
  it("permanently deletes the selected issue", async () => {
    const runner = vi.fn<CommandRunner>(async () => ({ stdout: "{}", stderr: "" }))

    await expect(deleteIssue({ cwd: "/workspace", runner }, "bd-1")).resolves.toBeUndefined()
    expect(runner).toHaveBeenCalledWith({
      args: ["delete", "bd-1", "--force", "--json"],
      cwd: "/workspace",
    })
  })
})
