import type { RelatedIssue } from "@beads/sdk"
import { expect, test } from "vitest"

import { relatedIssueToTask } from "../related-issue-to-task.js"

test("maps a related issue onto the shared task shape", () => {
  const relatedIssue = {
    dependencyType: "blocks",
    id: "bd-123",
    priority: 1,
    status: "in_progress",
    title: "Add MCP support",
    type: "feature",
  } satisfies RelatedIssue

  expect(relatedIssueToTask(relatedIssue)).toEqual({
    id: "bd-123",
    issue_type: "feature",
    priority: 1,
    status: "in_progress",
    title: "Add MCP support",
  })
})
