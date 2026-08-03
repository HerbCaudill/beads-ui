import { IconGitBranch, IconUser } from "@tabler/icons-react"

import { getWorkspaceName } from "./get-workspace-name.js"
import { IssueComments } from "./IssueComments.js"
import { RelatedIssueList } from "./RelatedIssueList.js"
import { STATUS_CONFIG } from "./status-config.js"
import type { IssueResult } from "./types.js"

/** Render one issue with its full available Beads context. */
export function IssueDetailView({ result }: IssueDetailViewProps) {
  const { issue } = result
  const status = STATUS_CONFIG.find((candidate) => candidate.status === issue.status)
  const StatusIcon = status?.icon
  const comments = "comments" in issue ? issue.comments : []
  const dependencies = "dependencies" in issue ? issue.dependencies : []
  const dependents = "dependents" in issue ? issue.dependents : []

  return (
    <main className="issue-detail">
      <header className="issue-detail__header">
        <div className="issue-detail__context">
          <span>Beads</span>
          <span aria-hidden="true">·</span>
          <span>{getWorkspaceName(result.workspace)}</span>
        </div>
        <div className="issue-detail__identity">
          <code className="issue-id">{issue.id}</code>
          <span className={`priority priority--${issue.priority}`}>P{issue.priority}</span>
        </div>
        <h1>{issue.title}</h1>
        <div className="issue-detail__badges">
          {StatusIcon && (
            <span className={`status-badge status-badge--${status.tone}`}>
              <StatusIcon aria-hidden="true" stroke={2} />
              {status.label}
            </span>
          )}
          <span className="detail-badge">{issue.type}</span>
          {issue.labels.map((label) => (
            <span className="label" key={label}>
              {label}
            </span>
          ))}
        </div>
      </header>

      {issue.description && (
        <section className="issue-description">
          <h2>Description</h2>
          <p>{issue.description}</p>
        </section>
      )}

      {(issue.assignee || issue.owner || issue.parent) && (
        <dl className="issue-detail__metadata">
          {issue.assignee && (
            <div>
              <dt>
                <IconUser aria-hidden="true" />
                Assignee
              </dt>
              <dd>{issue.assignee}</dd>
            </div>
          )}
          {issue.owner && (
            <div>
              <dt>
                <IconUser aria-hidden="true" />
                Owner
              </dt>
              <dd>{issue.owner}</dd>
            </div>
          )}
          {issue.parent && (
            <div>
              <dt>
                <IconGitBranch aria-hidden="true" />
                Parent
              </dt>
              <dd>{issue.parent}</dd>
            </div>
          )}
        </dl>
      )}

      <div className="issue-detail__sections">
        <RelatedIssueList direction="dependency" issues={dependencies} title="Dependencies" />
        <RelatedIssueList direction="dependent" issues={dependents} title="Dependents" />
        <IssueComments comments={comments} />
      </div>
    </main>
  )
}

/** Props for the focused issue view. */
export type IssueDetailViewProps = {
  /** Structured single-issue tool result to display. */
  readonly result: IssueResult
}
