import type { CommandRunner } from "@beads/sdk"
import request from "supertest"
import { describe, expect, it, vi } from "vitest"

import { createApp } from "../create-app.js"

describe("related data API", () => {
  it("adds and removes dependencies", async () => {
    const runner = vi.fn<CommandRunner>(async () => ({ stdout: "{}", stderr: "" }))
    const app = createApp({ cwd: "/workspace", runner })

    const added = await request(app)
      .post("/api/issues/bd-2/dependencies")
      .send({ dependsOnId: "bd-1", type: "blocks" })
    const removed = await request(app).delete("/api/issues/bd-2/dependencies/bd-1")

    expect(added.status).toBe(204)
    expect(removed.status).toBe(204)
  })

  it("adds and removes labels", async () => {
    const runner = vi.fn<CommandRunner>(async () => ({ stdout: "{}", stderr: "" }))
    const app = createApp({ cwd: "/workspace", runner })

    const added = await request(app).post("/api/issues/bd-1/labels").send({ label: "frontend" })
    const removed = await request(app).delete("/api/issues/bd-1/labels/frontend")

    expect(added.status).toBe(204)
    expect(removed.status).toBe(204)
  })

  it("lists and adds comments", async () => {
    const runner = vi.fn<CommandRunner>(async (command) => ({
      stdout: JSON.stringify(
        command.args[1] === "add"
          ? {
              id: "comment-2",
              issue_id: "bd-1",
              author: "Herb",
              text: "New comment",
              created_at: "2026-07-15T11:00:00Z",
            }
          : [
              {
                id: "comment-1",
                issue_id: "bd-1",
                author: "Herb",
                text: "Existing comment",
                created_at: "2026-07-15T10:00:00Z",
              },
            ],
      ),
      stderr: "",
    }))
    const app = createApp({ cwd: "/workspace", runner })

    const listed = await request(app).get("/api/issues/bd-1/comments")
    const added = await request(app)
      .post("/api/issues/bd-1/comments")
      .send({ text: "New comment", author: "Herb" })

    expect(listed.status).toBe(200)
    expect(listed.body).toEqual([expect.objectContaining({ id: "comment-1" })])
    expect(added.status).toBe(201)
    expect(added.body).toEqual(expect.objectContaining({ id: "comment-2" }))
  })
})
