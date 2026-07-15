import type { CommandRunner } from "@beads/sdk"
import request from "supertest"
import { describe, expect, it, vi } from "vitest"

import { createApp } from "../create-app.js"

describe("issues API", () => {
  it("creates an issue", async () => {
    const runner = vi.fn<CommandRunner>(async () => ({
      stdout: JSON.stringify({
        id: "bd-1",
        title: "New issue",
        status: "open",
        priority: 2,
        issue_type: "task",
        created_at: "2026-07-15T10:00:00Z",
        updated_at: "2026-07-15T10:00:00Z",
      }),
      stderr: "",
    }))
    const app = createApp({ cwd: "/workspace", runner })

    const response = await request(app).post("/api/issues").send({ title: "New issue" })

    expect(response.status).toBe(201)
    expect(response.body).toEqual(expect.objectContaining({ id: "bd-1" }))
  })

  it("updates an issue", async () => {
    const runner = vi.fn<CommandRunner>(async () => ({
      stdout: JSON.stringify([
        {
          id: "bd-1",
          title: "Updated issue",
          status: "in_progress",
          priority: 2,
          issue_type: "task",
          created_at: "2026-07-15T10:00:00Z",
          updated_at: "2026-07-15T11:00:00Z",
        },
      ]),
      stderr: "",
    }))
    const app = createApp({ cwd: "/workspace", runner })

    const response = await request(app)
      .patch("/api/issues/bd-1")
      .send({ title: "Updated issue", status: "in_progress" })

    expect(response.status).toBe(200)
    expect(response.body).toEqual(expect.objectContaining({ title: "Updated issue" }))
  })

  it("deletes an issue", async () => {
    const runner = vi.fn<CommandRunner>(async () => ({ stdout: "{}", stderr: "" }))
    const app = createApp({ cwd: "/workspace", runner })

    const response = await request(app).delete("/api/issues/bd-1")

    expect(response.status).toBe(204)
  })
})
