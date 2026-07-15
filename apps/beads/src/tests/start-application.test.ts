import type { CommandRunner } from "@beads/sdk"
import { createServer as createHttpServer } from "node:http"
import { mkdir, mkdtemp, realpath } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it, vi } from "vitest"

import { startApplication } from "../start-application.js"

describe("startApplication", () => {
  it("starts on loopback for the launch directory and opens the browser", async () => {
    const directory = await mkdtemp(join(tmpdir(), "beads-start-"))
    await mkdir(join(directory, ".beads"))
    const canonical = await realpath(directory)
    const runner = vi.fn<CommandRunner>(async () => ({ stdout: "bd version", stderr: "" }))
    const server = createHttpServer()
    const createServer = vi.fn(() => server)
    const openUrl = vi.fn(async () => undefined)
    const writeLine = vi.fn()

    const result = await startApplication(
      directory,
      { openBrowser: true },
      {
        createServer,
        findPort: async () => 0,
        openUrl,
        runner,
        staticDir: "/built/ui",
        writeLine,
      },
    )

    try {
      expect(result.workspace).toBe(canonical)
      expect(result.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/)
      expect(createServer).toHaveBeenCalledWith({
        cwd: canonical,
        runner,
        staticDir: "/built/ui",
      })
      expect(openUrl).toHaveBeenCalledWith(result.url)
      expect(writeLine).toHaveBeenCalledWith(`Beads manager: ${result.url}`)
      expect(writeLine).toHaveBeenCalledWith(`Workspace: ${canonical}`)
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()))
      })
    }
  })

  it("does not open a browser with --no-open", async () => {
    const directory = await mkdtemp(join(tmpdir(), "beads-start-"))
    await mkdir(join(directory, ".beads"))
    const server = createHttpServer()
    const openUrl = vi.fn(async () => undefined)

    await startApplication(
      directory,
      { openBrowser: false },
      {
        createServer: () => server,
        findPort: async () => 0,
        openUrl,
        runner: vi.fn<CommandRunner>(async () => ({ stdout: "bd version", stderr: "" })),
        staticDir: "/built/ui",
        writeLine: vi.fn(),
      },
    )

    try {
      expect(openUrl).not.toHaveBeenCalled()
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()))
      })
    }
  })
})
