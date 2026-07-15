import type { DependencyType, IssueStatus, IssueType } from "@beads/sdk"

/** Dependency relationship values accepted from API clients. */
export const DEPENDENCY_TYPES: readonly DependencyType[] = [
  "blocks",
  "tracks",
  "related",
  "parent-child",
  "discovered-from",
  "until",
  "caused-by",
  "validates",
  "relates-to",
  "supersedes",
]

/** Issue status values accepted from API clients. */
export const ISSUE_STATUSES: readonly IssueStatus[] = [
  "open",
  "in_progress",
  "blocked",
  "deferred",
  "closed",
]

/** Issue type values accepted from API clients. */
export const ISSUE_TYPES: readonly IssueType[] = [
  "bug",
  "feature",
  "task",
  "epic",
  "chore",
  "decision",
  "merge-request",
  "molecule",
  "gate",
  "convoy",
]
