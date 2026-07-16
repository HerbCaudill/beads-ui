import type { CommandRunner } from "@beads/sdk"
import request from "supertest"
import { describe, expect, it, vi } from "vitest"

import { createApp } from "../create-app.js"

describe("Beads View compatibility API", () => {
  it("lists tasks using the Beads View response contract", async () => {
    const runner = vi.fn<CommandRunner>(async () => ({
      stdout: JSON.stringify([
        {
          id: "bd-1",
          title: "Extract Beads View",
          status: "in_progress",
          priority: 1,
          issue_type: "task",
          created_at: "2026-07-16T10:00:00Z",
          updated_at: "2026-07-16T11:00:00Z",
          dependency_count: 1,
          dependent_count: 2,
          comment_count: 3,
        },
      ]),
      stderr: "",
    }))
    const app = createApp({ cwd: "/workspace", runner })

    const response = await request(app).get("/api/tasks?all=true")

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      ok: true,
      issues: [
        expect.objectContaining({
          id: "bd-1",
          issue_type: "task",
          created_at: "2026-07-16T10:00:00Z",
        }),
      ],
    })
  })

  it("gets task details with legacy relationship fields", async () => {
    const runner = vi.fn<CommandRunner>(async () => ({
      stdout: JSON.stringify([
        {
          id: "bd-2",
          title: "Blocked task",
          status: "blocked",
          priority: 2,
          issue_type: "task",
          created_at: "2026-07-16T10:00:00Z",
          updated_at: "2026-07-16T11:00:00Z",
          dependencies: [
            {
              id: "bd-1",
              title: "Blocker",
              status: "open",
              priority: 1,
              issue_type: "task",
              dependency_type: "blocks",
            },
          ],
          dependents: [],
        },
      ]),
      stderr: "",
    }))
    const app = createApp({ cwd: "/workspace", runner })

    const response = await request(app).get("/api/tasks/bd-2")

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      ok: true,
      issue: expect.objectContaining({
        id: "bd-2",
        dependencies: [expect.objectContaining({ id: "bd-1", dependency_type: "blocks" })],
        dependents: [],
      }),
    })
  })

  it("creates a task using the Beads View response contract", async () => {
    const runner = vi.fn<CommandRunner>(async () => ({
      stdout: JSON.stringify({
        id: "bd-3",
        title: "New task",
        status: "open",
        priority: 2,
        issue_type: "task",
        created_at: "2026-07-16T10:00:00Z",
        updated_at: "2026-07-16T10:00:00Z",
      }),
      stderr: "",
    }))
    const app = createApp({ cwd: "/workspace", runner })

    const response = await request(app).post("/api/tasks").send({ title: "New task" })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({
      ok: true,
      issue: expect.objectContaining({ id: "bd-3", issue_type: "task" }),
    })
  })

  it("updates a task using the Beads View response contract", async () => {
    const runner = vi.fn<CommandRunner>(async () => ({
      stdout: JSON.stringify([
        {
          id: "bd-3",
          title: "Updated task",
          status: "in_progress",
          priority: 2,
          issue_type: "task",
          created_at: "2026-07-16T10:00:00Z",
          updated_at: "2026-07-16T11:00:00Z",
        },
      ]),
      stderr: "",
    }))
    const app = createApp({ cwd: "/workspace", runner })

    const response = await request(app)
      .patch("/api/tasks/bd-3")
      .send({ title: "Updated task", status: "in_progress" })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      ok: true,
      issue: expect.objectContaining({ id: "bd-3", title: "Updated task" }),
    })
  })

  it("deletes a task using the Beads View response contract", async () => {
    const runner = vi.fn<CommandRunner>(async () => ({ stdout: "{}", stderr: "" }))
    const app = createApp({ cwd: "/workspace", runner })

    const response = await request(app).delete("/api/tasks/bd-3")

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ ok: true })
  })

  it("lists task labels using the Beads View response contract", async () => {
    const runner = vi.fn<CommandRunner>(async () => ({
      stdout: JSON.stringify([
        {
          id: "bd-3",
          title: "Labeled task",
          status: "open",
          priority: 2,
          issue_type: "task",
          created_at: "2026-07-16T10:00:00Z",
          updated_at: "2026-07-16T10:00:00Z",
          labels: ["ui", "public"],
        },
      ]),
      stderr: "",
    }))
    const app = createApp({ cwd: "/workspace", runner })

    const response = await request(app).get("/api/tasks/bd-3/labels")

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ ok: true, labels: ["ui", "public"] })
  })

  it("adds a task label using the Beads View response contract", async () => {
    const runner = vi.fn<CommandRunner>(async () => ({ stdout: "{}", stderr: "" }))
    const app = createApp({ cwd: "/workspace", runner })

    const response = await request(app).post("/api/tasks/bd-3/labels").send({ label: "ui" })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ ok: true })
  })

  it("removes a task label using the Beads View response contract", async () => {
    const runner = vi.fn<CommandRunner>(async () => ({ stdout: "{}", stderr: "" }))
    const app = createApp({ cwd: "/workspace", runner })

    const response = await request(app).delete("/api/tasks/bd-3/labels/user%20interface")

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ ok: true })
  })

  it("lists task comments using the Beads View response contract", async () => {
    const runner = vi.fn<CommandRunner>(async () => ({
      stdout: JSON.stringify([
        {
          id: "7",
          issue_id: "bd-3",
          author: "Herb",
          text: "Keep the original UI.",
          created_at: "2026-07-16T12:00:00Z",
        },
      ]),
      stderr: "",
    }))
    const app = createApp({ cwd: "/workspace", runner })

    const response = await request(app).get("/api/tasks/bd-3/comments")

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      ok: true,
      comments: [
        {
          id: 7,
          issue_id: "bd-3",
          author: "Herb",
          text: "Keep the original UI.",
          created_at: "2026-07-16T12:00:00Z",
        },
      ],
    })
  })

  it("adds a task comment using the Beads View request contract", async () => {
    const runner = vi.fn<CommandRunner>(async () => ({
      stdout: JSON.stringify({
        id: "8",
        issue_id: "bd-3",
        author: "User",
        text: "Looks good.",
        created_at: "2026-07-16T12:10:00Z",
      }),
      stderr: "",
    }))
    const app = createApp({ cwd: "/workspace", runner })

    const response = await request(app)
      .post("/api/tasks/bd-3/comments")
      .send({ comment: " Looks good. ", author: "User" })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({ ok: true })
    expect(runner).toHaveBeenCalledWith({
      args: ["comments", "add", "--author=User", "--json", "--", "bd-3", "Looks good."],
      cwd: "/workspace",
    })
  })

  it("adds a blocker using the Beads View request contract", async () => {
    const runner = vi.fn<CommandRunner>(async () => ({ stdout: "{}", stderr: "" }))
    const app = createApp({ cwd: "/workspace", runner })

    const response = await request(app).post("/api/tasks/bd-3/blockers").send({ blockerId: "bd-1" })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({ ok: true })
    expect(runner).toHaveBeenCalledWith({
      args: ["dep", "add", "--type=blocks", "--json", "--", "bd-3", "bd-1"],
      cwd: "/workspace",
    })
  })

  it("removes a blocker using the Beads View response contract", async () => {
    const runner = vi.fn<CommandRunner>(async () => ({ stdout: "{}", stderr: "" }))
    const app = createApp({ cwd: "/workspace", runner })

    const response = await request(app).delete("/api/tasks/bd-3/blockers/bd-1")

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ ok: true })
  })

  it("lists blocked tasks for one parent", async () => {
    const runner = vi.fn<CommandRunner>(async () => ({
      stdout: JSON.stringify([
        {
          id: "bd-4",
          title: "Blocked child",
          status: "blocked",
          priority: 2,
          issue_type: "task",
          parent: "bd-parent",
          created_at: "2026-07-16T10:00:00Z",
          updated_at: "2026-07-16T10:00:00Z",
        },
        {
          id: "bd-5",
          title: "Blocked elsewhere",
          status: "blocked",
          priority: 2,
          issue_type: "task",
          parent: "bd-other",
          created_at: "2026-07-16T10:00:00Z",
          updated_at: "2026-07-16T10:00:00Z",
        },
      ]),
      stderr: "",
    }))
    const app = createApp({ cwd: "/workspace", runner })

    const response = await request(app).get("/api/tasks/blocked?parent=bd-parent")

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      ok: true,
      issues: [expect.objectContaining({ id: "bd-4" })],
    })
  })

  it("returns Beads View's string error contract for invalid requests", async () => {
    const runner = vi.fn<CommandRunner>()
    const app = createApp({ cwd: "/workspace", runner })

    const response = await request(app).post("/api/tasks").send({ title: "" })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ ok: false, error: "title must be a non-empty string" })
  })

  it("clears a task parent when Beads View sends null", async () => {
    const runner = vi.fn<CommandRunner>(async () => ({
      stdout: JSON.stringify([
        {
          id: "bd-3",
          title: "Unparented task",
          status: "open",
          priority: 2,
          issue_type: "task",
          created_at: "2026-07-16T10:00:00Z",
          updated_at: "2026-07-16T11:00:00Z",
        },
      ]),
      stderr: "",
    }))
    const app = createApp({ cwd: "/workspace", runner })

    const response = await request(app).patch("/api/tasks/bd-3").send({ parent: null })

    expect(response.status).toBe(200)
    expect(runner).toHaveBeenCalledWith({
      args: ["update", "--json", "--parent=", "--", "bd-3"],
      cwd: "/workspace",
    })
  })
})
