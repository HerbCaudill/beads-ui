import type { Issue, IssueDetail } from "@beads/sdk"

import { toBeadsViewRelatedTask } from "./to-beads-view-related-task.js"
import type { BeadsViewTask } from "./types.js"

/** Convert the standalone SDK issue shape to the legacy Beads View task shape. */
export function toBeadsViewTask(
  /** Normalized issue returned by the standalone SDK. */
  issue: Issue | IssueDetail,
): BeadsViewTask {
  return {
    closed_at: issue.closedAt,
    created_at: issue.createdAt,
    description: issue.description,
    ...("dependencies" in issue
      ? {
          dependencies: issue.dependencies.map(toBeadsViewRelatedTask),
          dependents: issue.dependents.map(toBeadsViewRelatedTask),
        }
      : {}),
    id: issue.id,
    is_ready: issue.isReady,
    issue_type: issue.type,
    labels: issue.labels,
    parent: issue.parent,
    priority: issue.priority,
    status: issue.status,
    title: issue.title,
  }
}
