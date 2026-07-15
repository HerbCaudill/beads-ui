import type { ViteDevServer } from "vite"
import { describe, expect, it, vi } from "vitest"

import { listenToViteServer } from "../listen-to-vite-server.js"

describe("listenToViteServer", () => {
  it("closes Vite when startup fails", async () => {
    const startupError = new Error("Port 4400 is already in use")
    const close = vi.fn(async () => undefined)
    const server = {
      close,
      listen: vi.fn(async () => {
        throw startupError
      }),
    } as unknown as ViteDevServer

    await expect(listenToViteServer(server)).rejects.toBe(startupError)
    expect(close).toHaveBeenCalledOnce()
  })
})
