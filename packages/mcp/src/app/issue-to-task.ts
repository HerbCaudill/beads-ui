import type { Issue } from "@beads/sdk"
import type { Task } from "@beads/ui/presentation"

/**
 * Adapt an SDK issue to the task shape the shared components render.
 *
 * The MCP tools return the SDK's normalized camelCase issue, while the components
 * in `@beads/ui` take the snake_case shape the HTTP API serves. This is the seam
 * between the two.
 */
export function issueToTask(
  /** Normalized issue from a Beads MCP tool result. */
  issue: Issue,
): Task {
  return {
    closed_at: issue.closedAt,
    created_at: issue.createdAt,
    description: issue.description,
    id: issue.id,
    issue_type: issue.type,
    labels: [...issue.labels],
    parent: issue.parent,
    priority: issue.priority,
    status: issue.status,
    title: issue.title,
  }
}
