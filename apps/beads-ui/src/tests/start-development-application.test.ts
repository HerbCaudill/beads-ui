import type { CommandRunner } from "@beads/sdk"
import { createServer as createHttpServer } from "node:http"
import { mkdir, mkdtemp, realpath } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it, vi } from "vitest"

import { closeServer } from "../close-server.js"
import { startDevelopmentApplication } from "../start-development-application.js"

describe("startDevelopmentApplication", () => {
  it("serves the launch workspace through the Vite development URL", async () => {
    const directory = await mkdtemp(join(tmpdir(), "beads-dev-start-"))
    await mkdir(join(directory, ".beads"))
    const canonical = await realpath(directory)
    const runner = vi.fn<CommandRunner>(async () => ({ stdout: "bd version", stderr: "" }))
    const server = createHttpServer()
    const createServer = vi.fn(() => server)
    const closeFrontend = vi.fn(async () => undefined)
    const startFrontend = vi.fn(async () => ({
      close: closeFrontend,
      url: "http://127.0.0.1:5173",
    }))
    const openUrl = vi.fn(async () => undefined)
    const writeLine = vi.fn()

    const result = await startDevelopmentApplication(
      directory,
      { openBrowser: true },
      {
        createServer,
        findPort: async () => 0,
        openUrl,
        runner,
        startFrontend,
        writeLine,
      },
    )

    try {
      expect(createServer).toHaveBeenCalledWith({ cwd: canonical, runner })
      expect(startFrontend).toHaveBeenCalledWith(result.backendUrl)
      expect(result.url).toBe("http://127.0.0.1:5173")
      expect(openUrl).toHaveBeenCalledWith(result.url)
      expect(writeLine).toHaveBeenCalledWith(`Beads UI: ${result.url}`)
      expect(writeLine).toHaveBeenCalledWith(`Workspace: ${canonical}`)
    } finally {
      await result.close()
    }

    expect(closeFrontend).toHaveBeenCalledOnce()
    expect(server.listening).toBe(false)
  })

  it("closes the backend when closing the frontend fails", async () => {
    const directory = await mkdtemp(join(tmpdir(), "beads-dev-close-"))
    await mkdir(join(directory, ".beads"))
    const server = createHttpServer()
    const application = await startDevelopmentApplication(
      directory,
      { openBrowser: false },
      {
        createServer: () => server,
        findPort: async () => 0,
        openUrl: vi.fn(),
        runner: vi.fn<CommandRunner>(async () => ({ stdout: "bd version", stderr: "" })),
        startFrontend: async () => ({
          close: async () => {
            throw new Error("Frontend close failed")
          },
          url: "http://127.0.0.1:5173",
        }),
        writeLine: vi.fn(),
      },
    )

    try {
      await expect(application.close()).rejects.toThrow("Frontend close failed")
      expect(server.listening).toBe(false)
    } finally {
      if (server.listening) await closeServer(server)
    }
  })
})
