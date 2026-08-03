import { describe, expect, it, vi } from "vitest"

import { startMcpApplication } from "../start-mcp-application.js"
import type { CreateBeadsMcpServerOptions } from "@beads/mcp"

describe("startMcpApplication", () => {
  it("connects a workspace-bound server to the supplied transport", async () => {
    const connect = vi.fn(async () => undefined)
    let serverOptions: CreateBeadsMcpServerOptions | undefined
    const createServer = vi.fn((options: CreateBeadsMcpServerOptions) => {
      serverOptions = options
      return { connect }
    })
    const validateWorkspace = vi.fn(async () => "/canonical/workspace")

    await startMcpApplication("/workspace", {
      createServer,
      getIssue: vi.fn(),
      listIssues: vi.fn(),
      readViewHtml: async () => "<html>Beads</html>",
      transport: { start: vi.fn(), send: vi.fn(), close: vi.fn() },
      validateWorkspace,
    })

    expect(validateWorkspace).toHaveBeenCalledWith("/workspace")
    expect(createServer).toHaveBeenCalledOnce()
    expect(serverOptions).toMatchObject({
      viewHtml: "<html>Beads</html>",
      workspace: "/canonical/workspace",
    })
    expect(connect).toHaveBeenCalledWith(expect.any(Object))
  })
})
