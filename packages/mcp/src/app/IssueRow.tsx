import { IconGitBranch, IconMessageCircle } from "@tabler/icons-react"
import type { Issue } from "@beads/sdk"

import { STATUS_CONFIG } from "./status-config.js"

/** Render one compact issue row. */
export function IssueRow({ issue }: IssueRowProps) {
  const status = STATUS_CONFIG.find((candidate) => candidate.status === issue.status)
  const StatusIcon = status?.icon

  return (
    <article className="issue-row">
      <div className="issue-row__main">
        {StatusIcon && (
          <StatusIcon
            aria-label={status.label}
            className={`status-icon status-icon--${status.tone}`}
            stroke={2}
          />
        )}
        <code className="issue-id">{issue.id}</code>
        <span className="issue-title">{issue.title}</span>
        <span className={`priority priority--${issue.priority}`}>P{issue.priority}</span>
      </div>

      <div className="issue-row__meta">
        <span className="issue-type">{issue.type}</span>
        {issue.parent && (
          <span className="meta-item" title={`Parent: ${issue.parent}`}>
            <IconGitBranch aria-hidden="true" />
            {issue.parent}
          </span>
        )}
        {issue.commentCount > 0 && (
          <span className="meta-item" title={`${issue.commentCount} comments`}>
            <IconMessageCircle aria-hidden="true" />
            {issue.commentCount}
          </span>
        )}
        {issue.labels.map((label) => (
          <span className="label" key={label}>
            {label}
          </span>
        ))}
      </div>
    </article>
  )
}

/** Props for one compact issue row. */
export type IssueRowProps = {
  /** Normalized issue to display. */
  readonly issue: Issue
}
