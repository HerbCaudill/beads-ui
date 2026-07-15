import { describe, expect, it, vi } from "vitest"

import { addLabel } from "../add-label.js"
import { removeLabel } from "../remove-label.js"
import type { CommandRunner } from "../types.js"

describe("labels", () => {
  it("adds a label to an issue", async () => {
    const runner = vi.fn<CommandRunner>(async () => ({ stdout: "{}", stderr: "" }))

    await addLabel({ cwd: "/workspace", runner }, "bd-1", "frontend")

    expect(runner).toHaveBeenCalledWith({
      args: ["label", "add", "--json", "--", "bd-1", "frontend"],
      cwd: "/workspace",
    })
  })

  it("removes a label from an issue", async () => {
    const runner = vi.fn<CommandRunner>(async () => ({ stdout: "{}", stderr: "" }))

    await removeLabel({ cwd: "/workspace", runner }, "bd-1", "frontend")

    expect(runner).toHaveBeenCalledWith({
      args: ["label", "remove", "--json", "--", "bd-1", "frontend"],
      cwd: "/workspace",
    })
  })
})
