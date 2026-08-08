import { describe, expect, test } from "vitest"

import { parseIssueListResult } from "../parse-issue-list-result.js"

describe("parseIssueListResult", () => {
  test("accepts a structured issue-list result", () => {
    expect(
      parseIssueListResult({
        includeClosed: false,
        issues: [issue],
        search: "status:open",
        workspace: "/work/beads-ui",
      }),
    ).toEqual({
      includeClosed: false,
      issues: [issue],
      search: "status:open",
      workspace: "/work/beads-ui",
    })
  })

  test("rejects malformed tool output", () => {
    expect(
      parseIssueListResult({
        issues: [{ id: "bd-123" }],
        workspace: "/work/beads-ui",
      }),
    ).toBeUndefined()
  })
})

const issue = {
  commentCount: 2,
  createdAt: "2026-08-03T08:00:00.000Z",
  dependencyCount: 0,
  dependentCount: 1,
  description: "Expose task data to agents.",
  id: "bd-123",
  labels: ["mcp"],
  priority: 1,
  status: "in_progress",
  title: "Add MCP support",
  type: "feature",
  updatedAt: "2026-08-03T09:00:00.000Z",
}
