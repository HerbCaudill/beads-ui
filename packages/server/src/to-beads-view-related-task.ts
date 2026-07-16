import type { RelatedIssue } from "@beads/sdk"

import type { BeadsViewRelatedTask } from "./types.js"

/** Convert an SDK relationship to the legacy Beads View relationship shape. */
export function toBeadsViewRelatedTask(
  /** Normalized related issue returned by the standalone SDK. */
  issue: RelatedIssue,
): BeadsViewRelatedTask {
  return {
    dependency_type: issue.dependencyType,
    id: issue.id,
    issue_type: issue.type,
    priority: issue.priority,
    status: issue.status,
    title: issue.title,
  }
}
