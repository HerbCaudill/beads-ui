import { describe, expect, test, vi } from "vitest"

import { loadIssuesFromHost } from "../load-issues-from-host.js"

describe("loadIssuesFromHost", () => {
  test("repeats the issue-list query and parses its structured content", async () => {
    const callServerTool = vi.fn().mockResolvedValue({
      content: [],
      structuredContent: refreshedResult,
    })

    const result = await loadIssuesFromHost({ callServerTool }, currentResult)

    expect(callServerTool).toHaveBeenCalledWith({
      arguments: { includeClosed: false, search: "status:open" },
      name: "list_issues",
    })
    expect(result.issues).toHaveLength(2)
  })

  test("rejects when the tool reports an error", async () => {
    const callServerTool = vi.fn().mockResolvedValue({ content: [], isError: true })

    await expect(loadIssuesFromHost({ callServerTool }, currentResult)).rejects.toThrow(
      "Beads could not refresh the issue list.",
    )
  })
})

const currentResult = {
  includeClosed: false,
  issues: [],
  search: "status:open",
  workspace: "/work/beads-ui",
} as const

const refreshedResult = {
  ...currentResult,
  issues: [
    {
      commentCount: 0,
      createdAt: "2026-08-03T08:00:00.000Z",
      dependencyCount: 0,
      dependentCount: 0,
      id: "bd-123",
      labels: [],
      priority: 1,
      status: "open",
      title: "Add MCP support",
      type: "feature",
      updatedAt: "2026-08-03T09:00:00.000Z",
    },
    {
      commentCount: 0,
      createdAt: "2026-08-03T08:00:00.000Z",
      dependencyCount: 0,
      dependentCount: 0,
      id: "bd-124",
      labels: [],
      priority: 2,
      status: "open",
      title: "Test MCP refresh",
      type: "task",
      updatedAt: "2026-08-03T09:00:00.000Z",
    },
  ],
} as const
