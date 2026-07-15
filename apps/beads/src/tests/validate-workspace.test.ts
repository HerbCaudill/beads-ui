import { mkdir, mkdtemp, realpath } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it, vi } from "vitest"

import { validateWorkspace } from "../validate-workspace.js"

describe("validateWorkspace", () => {
  it("returns the canonical path for a readable Beads workspace", async () => {
    const directory = await mkdtemp(join(tmpdir(), "beads-cli-"))
    await mkdir(join(directory, ".beads"))
    const canonical = await realpath(directory)
    const verifyBd = vi.fn(async () => undefined)

    await expect(validateWorkspace(directory, verifyBd)).resolves.toBe(canonical)
    expect(verifyBd).toHaveBeenCalledOnce()
  })

  it("does not initialize a missing Beads workspace", async () => {
    const directory = await mkdtemp(join(tmpdir(), "beads-cli-"))
    const canonical = await realpath(directory)

    await expect(validateWorkspace(directory, vi.fn())).rejects.toThrow(
      `No .beads directory found in ${canonical}`,
    )
  })
})
