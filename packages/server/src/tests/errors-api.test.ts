import { BdCommandError, type CommandRunner } from "@beads/sdk"
import request from "supertest"
import { describe, expect, it, vi } from "vitest"

import { createApp } from "../create-app.js"

describe("API errors", () => {
  it("rejects invalid request bodies before invoking bd", async () => {
    const runner = vi.fn<CommandRunner>()
    const app = createApp({ cwd: "/workspace", runner })

    const response = await request(app).post("/api/issues").send({ description: "Missing title" })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      error: { code: "invalid_request", message: "title must be a non-empty string" },
    })
    expect(runner).not.toHaveBeenCalled()
  })

  it("returns structured runtime command failures", async () => {
    const runner = vi.fn<CommandRunner>(async () => {
      throw new BdCommandError(["list"], 1, "database unavailable", new Error("failed"))
    })
    const app = createApp({ cwd: "/workspace", runner })

    const response = await request(app).get("/api/issues")

    expect(response.status).toBe(502)
    expect(response.body).toEqual({
      error: { code: "command_failed", message: "database unavailable" },
    })
  })
})
