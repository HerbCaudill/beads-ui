import type { Issue } from "@beads/sdk"
import { describe, expect, test } from "vitest"

import { issueToTask } from "../issue-to-task.js"

describe("issueToTask", () => {
  test("maps the SDK issue shape onto the shared task shape", () => {
    expect(issueToTask(issue)).toEqual({
      closed_at: undefined,
      created_at: "2026-08-03T08:00:00.000Z",
      description: "Expose task data to agents.",
      id: "bd-123",
      issue_type: "feature",
      labels: ["mcp"],
      parent: "bd-120",
      priority: 1,
      status: "in_progress",
      title: "Add MCP support",
    })
  })

  test("copies labels rather than aliasing the readonly source array", () => {
    const task = issueToTask(issue)

    expect(task.labels).toEqual(issue.labels)
    expect(task.labels).not.toBe(issue.labels)
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
  parent: "bd-120",
  priority: 1,
  status: "in_progress",
  title: "Add MCP support",
  type: "feature",
  updatedAt: "2026-08-03T09:00:00.000Z",
} satisfies Issue
