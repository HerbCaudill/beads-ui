import type { RelatedIssue } from "@beads/sdk"

import {
  formatRelatedIssueRelationship,
  type RelatedIssueDirection,
} from "./format-related-issue-relationship.js"
import { STATUS_CONFIG } from "./status-config.js"

/** Render one group of issues related to the selected bead. */
export function RelatedIssueList({ direction, issues, title }: RelatedIssueListProps) {
  return (
    <section className="detail-section">
      <h2 aria-label={`${title} ${issues.length}`} className="detail-section__heading">
        {title}
        <span>{issues.length}</span>
      </h2>
      {issues.length > 0 ? (
        <div className="related-issues">
          {issues.map((issue) => {
            const status = STATUS_CONFIG.find((candidate) => candidate.status === issue.status)
            const StatusIcon = status?.icon
            return (
              <article className="related-issue" key={`${issue.dependencyType}-${issue.id}`}>
                <div className="related-issue__title">
                  {StatusIcon && (
                    <StatusIcon
                      aria-label={status.label}
                      className={`status-icon status-icon--${status.tone}`}
                      stroke={2}
                    />
                  )}
                  <code className="issue-id">{issue.id}</code>
                  <span>{issue.title}</span>
                  <span className={`priority priority--${issue.priority}`}>P{issue.priority}</span>
                </div>
                <span className="related-issue__type">
                  {formatRelatedIssueRelationship(issue.dependencyType, direction)}
                </span>
              </article>
            )
          })}
        </div>
      ) : (
        <p className="detail-empty">None</p>
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
