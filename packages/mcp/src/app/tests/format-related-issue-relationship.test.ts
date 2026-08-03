import { describe, expect, it } from "vitest"

import { formatRelatedIssueRelationship } from "../format-related-issue-relationship.js"

describe("formatRelatedIssueRelationship", () => {
  it("describes blocking relationships from each direction", () => {
    expect(formatRelatedIssueRelationship("blocks", "dependency")).toBe("blocks this issue")
    expect(formatRelatedIssueRelationship("blocks", "dependent")).toBe("blocked by this issue")
  })

  it("describes hierarchy relationships from each direction", () => {
    expect(formatRelatedIssueRelationship("parent-child", "dependency")).toBe(
      "parent of this issue",
    )
    expect(formatRelatedIssueRelationship("parent-child", "dependent")).toBe("child of this issue")
  })

  it.each([
    ["tracks", "tracks"],
    ["related", "related"],
    ["discovered-from", "discovered from"],
    ["until", "until"],
    ["caused-by", "caused by"],
    ["validates", "validates"],
    ["relates-to", "relates to"],
    ["supersedes", "supersedes"],
  ] as const)("keeps %s relationships neutral", (dependencyType, expected) => {
    expect(formatRelatedIssueRelationship(dependencyType, "dependency")).toBe(expected)
    expect(formatRelatedIssueRelationship(dependencyType, "dependent")).toBe(expected)
  })
})
