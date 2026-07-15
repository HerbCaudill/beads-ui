import type { CommandRunner } from "@beads/sdk"
import { type AddressInfo } from "node:net"
import { WebSocket } from "ws"
import { describe, expect, it, vi } from "vitest"

import { createServer } from "../create-server.js"

describe("createServer", () => {
  it("notifies connected browsers when workspace issues change", async () => {
    let title = "Initial"
    const runner = vi.fn<CommandRunner>(async () => ({
      stdout: JSON.stringify([
        {
          id: "bd-1",
          title,
          status: "open",
          priority: 2,
          issue_type: "task",
          created_at: "2026-07-15T10:00:00Z",
          updated_at: "2026-07-15T11:00:00Z",
        },
      ]),
      stderr: "",
    }))
    const server = createServer({ cwd: "/workspace", runner, pollIntervalMs: 10 })
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    const address = server.address() as AddressInfo
    const socket = new WebSocket(`ws://127.0.0.1:${address.port}/api/events`)

    try {
      await new Promise<void>((resolve, reject) => {
        socket.once("open", resolve)
        socket.once("error", reject)
      })
      await vi.waitFor(() => expect(runner).toHaveBeenCalled())
      title = "Changed"

      const message = await new Promise<string>((resolve, reject) => {
        socket.once("message", (data) => resolve(data.toString()))
        socket.once("error", reject)
      })

      expect(JSON.parse(message)).toEqual({ type: "workspace_changed" })
    } finally {
      socket.close()
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()))
      })
    }
  })

  it("closes active WebSocket connections during graceful shutdown", async () => {
    const runner = vi.fn<CommandRunner>(async () => ({ stdout: "[]", stderr: "" }))
    const server = createServer({ cwd: "/workspace", runner })
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    const address = server.address() as AddressInfo
    const socket = new WebSocket(`ws://127.0.0.1:${address.port}/api/events`)
    await new Promise<void>((resolve, reject) => {
      socket.once("open", resolve)
      socket.once("error", reject)
    })

    try {
      await Promise.race([
        new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()))
        }),
        new Promise<never>((_resolve, reject) => {
          setTimeout(() => reject(new Error("Server did not close")), 100)
        }),
      ])
      await vi.waitFor(() => expect(socket.readyState).toBe(WebSocket.CLOSED))
    } finally {
      socket.terminate()
      if (server.listening) {
        await new Promise<void>((resolve) => server.close(() => resolve()))
      }
    }
  })
})
