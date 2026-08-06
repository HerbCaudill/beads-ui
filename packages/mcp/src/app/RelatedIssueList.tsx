import type { RelatedIssue } from "@beads/sdk"
import { TaskCardCompact } from "@beads/ui/presentation"

import {
  formatRelatedIssueRelationship,
  type RelatedIssueDirection,
} from "./format-related-issue-relationship.js"
import { relatedIssueToTask } from "./related-issue-to-task.js"

/** Render one group of issues related to the selected bead. */
export function RelatedIssueList({ direction, issues, title }: RelatedIssueListProps) {
  return (
    <section>
      <h2
        aria-label={`${title} ${issues.length}`}
        className="text-muted-foreground m-0 flex items-center gap-2 text-xs font-medium"
      >
        {title}
        <span className="bg-muted rounded px-1.5 py-0.5">{issues.length}</span>
      </h2>
      {issues.length > 0 ? (
        <div className="mt-1.5">
          {issues.map((issue) => (
            <div
              className="border-border flex flex-wrap items-center gap-x-2 border-b py-1.5 last:border-b-0"
              key={`${issue.dependencyType}-${issue.id}`}
            >
              {/* The relationship label drops to its own line when the host is too narrow for both. */}
              <div className="min-w-0 flex-1 basis-40">
                <TaskCardCompact task={relatedIssueToTask(issue)} />
              </div>
              <span className="text-muted-foreground shrink-0 text-xs whitespace-nowrap">
                {formatRelatedIssueRelationship(issue.dependencyType, direction)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground mt-1.5 mb-0 text-xs italic">None</p>
      )}
    </section>
  )
}

/** Props for one relationship group. */
export type RelatedIssueListProps = {
  /** Which side of the selected issue contains these related issues. */
  readonly direction: RelatedIssueDirection
  /** Related issues to display. */
  readonly issues: readonly RelatedIssue[]
  /** User-facing relationship group name. */
  readonly title: string
}
