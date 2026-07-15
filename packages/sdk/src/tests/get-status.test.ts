import { describe, expect, it, vi } from "vitest"

import { getStatus } from "../get-status.js"
import type { CommandRunner } from "../types.js"

describe("getStatus", () => {
  it("returns normalized workspace status counts", async () => {
    const runner = vi.fn<CommandRunner>(async () => ({
      stdout: JSON.stringify({
        schema_version: 1,
        summary: {
          blocked_issues: 2,
          closed_issues: 3,
          deferred_issues: 1,
          in_progress_issues: 4,
          open_issues: 5,
          ready_issues: 6,
          total_issues: 15,
        },
      }),
      stderr: "",
    }))

    const status = await getStatus({ cwd: "/workspace", runner })

    expect(runner).toHaveBeenCalledWith({
      args: ["status", "--json"],
      cwd: "/workspace",
    })
    expect(status).toEqual({
      blocked: 2,
      closed: 3,
      deferred: 1,
      inProgress: 4,
      open: 5,
      ready: 6,
      total: 15,
    })
  })
})
