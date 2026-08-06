import type { RelatedIssue } from "@beads/sdk"
import type { Task } from "@beads/ui/presentation"

/**
 * Adapt a related issue to the task shape the shared components render.
 *
 * `bd show` reports only an identity summary for each related issue, so the
 * timestamps and labels a full issue carries are absent here.
 */
export function relatedIssueToTask(
  /** Related issue reported alongside a single-issue tool result. */
  issue: RelatedIssue,
): Task {
  return {
    id: issue.id,
    issue_type: issue.type,
    priority: issue.priority,
    status: issue.status,
    title: issue.title,
  }
}
