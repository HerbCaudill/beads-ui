import { describe, expect, test, vi } from "vitest"

import { loadIssueFromHost } from "../load-issue-from-host.js"

describe("loadIssueFromHost", () => {
  test("calls the get_issue tool and parses its structured content", async () => {
    const callServerTool = vi.fn().mockResolvedValue({
      content: [],
      structuredContent: { issue, workspace: "/work/beads-ui" },
    })

    const result = await loadIssueFromHost({ callServerTool }, "bd-123")

    expect(callServerTool).toHaveBeenCalledWith({ arguments: { id: "bd-123" }, name: "get_issue" })
    expect(result.issue.title).toBe("Add MCP support")
  })

  test("rejects when the tool reports an error", async () => {
    const callServerTool = vi.fn().mockResolvedValue({ content: [], isError: true })

    await expect(loadIssueFromHost({ callServerTool }, "bd-123")).rejects.toThrow(
      "Beads could not load bd-123.",
    )
  })

  test("rejects when the structured content is not a single issue", async () => {
    const callServerTool = vi.fn().mockResolvedValue({
      content: [],
      structuredContent: { includeClosed: false, issues: [], workspace: "/work/beads-ui" },
    })

    await expect(loadIssueFromHost({ callServerTool }, "bd-123")).rejects.toThrow(
      "The host returned an unsupported result for bd-123.",
    )
  })
})

const issue = {
  commentCount: 0,
  createdAt: "2026-08-03T08:00:00.000Z",
  dependencyCount: 0,
  dependentCount: 0,
  id: "bd-123",
  labels: [],
  priority: 1,
  status: "in_progress",
  title: "Add MCP support",
  type: "feature",
  updatedAt: "2026-08-03T09:00:00.000Z",
}
