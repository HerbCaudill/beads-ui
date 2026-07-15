import request from "supertest"
import { describe, expect, it, vi } from "vitest"

import { createApp } from "../create-app.js"
import type { CommandRunner } from "@beads/sdk"

describe("createApp", () => {
  it("reports the one configured workspace", async () => {
    const runner = vi.fn<CommandRunner>()
    const app = createApp({ cwd: "/projects/example", runner })

    const response = await request(app).get("/api/workspace")

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ name: "example", path: "/projects/example" })
    expect(runner).not.toHaveBeenCalled()
  })

  it("ignores browser-supplied workspace paths", async () => {
    const runner = vi.fn<CommandRunner>(async () => ({
      stdout: JSON.stringify([
        {
          id: "bd-1",
          title: "First issue",
          status: "open",
          priority: 2,
          issue_type: "task",
          created_at: "2026-07-15T10:00:00Z",
          updated_at: "2026-07-15T11:00:00Z",
        },
      ]),
      stderr: "",
    }))
    const app = createApp({ cwd: "/projects/example", runner })

    const response = await request(app).get("/api/issues?workspace=/tmp/other")

    expect(response.status).toBe(200)
    expect(response.body).toEqual([expect.objectContaining({ id: "bd-1" })])
    expect(runner).toHaveBeenCalledWith({
      args: ["list", "--json", "--all", "--limit", "0"],
      cwd: "/projects/example",
    })
  })

  it("returns issue details", async () => {
    const runner = vi.fn<CommandRunner>(async () => ({
      stdout: JSON.stringify([
        {
          id: "bd-1",
          title: "First issue",
          status: "open",
          priority: 2,
          issue_type: "task",
          created_at: "2026-07-15T10:00:00Z",
          updated_at: "2026-07-15T11:00:00Z",
        },
      ]),
      stderr: "",
    }))
    const app = createApp({ cwd: "/workspace", runner })

    const response = await request(app).get("/api/issues/bd-1")

    expect(response.status).toBe(200)
    expect(response.body).toEqual(expect.objectContaining({ id: "bd-1" }))
  })

  it("returns workspace status counts", async () => {
    const runner = vi.fn<CommandRunner>(async () => ({
      stdout: JSON.stringify({
        summary: {
          blocked_issues: 1,
          closed_issues: 2,
          deferred_issues: 3,
          in_progress_issues: 4,
          open_issues: 5,
          ready_issues: 6,
          total_issues: 7,
        },
      }),
      stderr: "",
    }))
    const app = createApp({ cwd: "/workspace", runner })

    const response = await request(app).get("/api/status")

    expect(response.status).toBe(200)
    expect(response.body).toEqual(expect.objectContaining({ ready: 6, total: 7 }))
  })
})
