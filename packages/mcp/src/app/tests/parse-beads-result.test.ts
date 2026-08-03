import { describe, expect, test } from "vitest"

import { parseBeadsResult } from "../parse-beads-result.js"

describe("parseBeadsResult", () => {
  test("parses a single issue with related data", () => {
    const value = {
      issue: {
        commentCount: 1,
        comments: [
          {
            author: "Herb",
            createdAt: "2026-08-03T10:00:00.000Z",
            id: "comment-1",
            issueId: "bd-123",
            text: "Looks good.",
          },
        ],
        createdAt: "2026-08-03T08:00:00.000Z",
        dependencies: [
          {
            dependencyType: "blocks",
            id: "bd-100",
            priority: 2,
            status: "open",
            title: "Prepare the widget",
            type: "task",
          },
        ],
        dependencyCount: 1,
        dependentCount: 0,
        dependents: [],
        id: "bd-123",
        labels: ["mcp"],
        priority: 1,
        status: "in_progress",
        title: "Display one bead",
        type: "task",
        updatedAt: "2026-08-03T09:00:00.000Z",
      },
      workspace: "/work/beads-ui",
    }

    expect(parseBeadsResult(value)).toEqual(value)
  })

  test("rejects unsupported structured content", () => {
    expect(parseBeadsResult({ issue: { id: "bd-123" } })).toBeUndefined()
  })
})
