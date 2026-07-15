import { BdCommandError, type CommandRunner } from "@beads/sdk"
import { describe, expect, it, vi } from "vitest"

import { verifyBd } from "../verify-bd.js"

describe("verifyBd", () => {
  it("checks the external executable without a shell", async () => {
    const runner = vi.fn<CommandRunner>(async () => ({ stdout: "bd version", stderr: "" }))

    await verifyBd("/workspace", runner)

    expect(runner).toHaveBeenCalledWith({ args: ["--version"], cwd: "/workspace" })
  })

  it("reports an actionable error when bd is unavailable", async () => {
    const runner = vi.fn<CommandRunner>(async () => {
      throw new BdCommandError(["--version"], null, "", new Error("ENOENT"))
    })

    await expect(verifyBd("/workspace", runner)).rejects.toThrow(
      "Beads CLI (`bd`) is unavailable. Install it and ensure `bd` is on PATH.",
    )
  })
})
