import { describe, expect, it } from "vitest"

import { matchesIssueSearchQuery } from "../matches-issue-search-query.js"
import type { Issue } from "@beads/sdk"

describe("matchesIssueSearchQuery", () => {
  it("combines structured filters and free text", () => {
    expect(
      matchesIssueSearchQuery(
        issue,
        "status:in-progress label:MCP priority:<=P1 type:feat support",
      ),
    ).toBe(true)
    expect(matchesIssueSearchQuery(issue, "priority:P2 support")).toBe(false)
  })

  it("supports alternatives, exclusions, and quoted values", () => {
    expect(
      matchesIssueSearchQuery(
        { ...issue, labels: ["needs review"] },
        'status:open,in_progress label:"needs review" -deprecated',
      ),
    ).toBe(true)
    expect(matchesIssueSearchQuery(issue, "-label:mcp")).toBe(false)
  })

  it("matches readiness, roots, and short parent IDs", () => {
    expect(matchesIssueSearchQuery({ ...issue, isReady: true }, "is:ready is:root", "bd")).toBe(
      true,
    )
    expect(
      matchesIssueSearchQuery({ ...issue, parent: "foo-bar-123" }, "parent:123", "foo-bar"),
    ).toBe(true)
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
} satisfies Issue
