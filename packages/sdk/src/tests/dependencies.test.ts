import { describe, expect, it, vi } from "vitest"

import { addDependency } from "../add-dependency.js"
import { removeDependency } from "../remove-dependency.js"
import type { CommandRunner } from "../types.js"

describe("dependencies", () => {
  it("adds a typed dependency", async () => {
    const runner = vi.fn<CommandRunner>(async () => ({ stdout: "{}", stderr: "" }))

    await addDependency({ cwd: "/workspace", runner }, "bd-2", "bd-1", "related")

    expect(runner).toHaveBeenCalledWith({
      args: ["dep", "add", "bd-2", "bd-1", "--type", "related", "--json"],
      cwd: "/workspace",
    })
  })

  it("removes a dependency", async () => {
    const runner = vi.fn<CommandRunner>(async () => ({ stdout: "{}", stderr: "" }))

    await removeDependency({ cwd: "/workspace", runner }, "bd-2", "bd-1")

    expect(runner).toHaveBeenCalledWith({
      args: ["dep", "remove", "bd-2", "bd-1", "--json"],
      cwd: "/workspace",
    })
  })
})
