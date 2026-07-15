import { describe, expect, it, vi } from "vitest"

import { createCommandRunner } from "../create-command-runner.js"
import type { CommandExecutor } from "../types.js"

describe("createCommandRunner", () => {
  it("executes bd without a shell in the configured workspace", async () => {
    const execute = vi.fn<CommandExecutor>(async () => ({ stdout: "[]", stderr: "" }))
    const runner = createCommandRunner(execute)

    await expect(runner({ args: ["list", "--json"], cwd: "/workspace" })).resolves.toEqual({
      stdout: "[]",
      stderr: "",
    })
    expect(execute).toHaveBeenCalledWith("bd", ["list", "--json"], {
      cwd: "/workspace",
      encoding: "utf8",
    })
  })

  it("maps command failures to structured errors", async () => {
    const execute = vi.fn<CommandExecutor>(async () => {
      throw Object.assign(new Error("command failed"), {
        code: 3,
        stderr: "issue not found",
      })
    })
    const runner = createCommandRunner(execute)

    await expect(runner({ args: ["show", "bd-missing"], cwd: "/workspace" })).rejects.toMatchObject(
      {
        code: "command_failed",
        exitCode: 3,
        stderr: "issue not found",
        args: ["show", "bd-missing"],
      },
    )
  })
})
