import { IssueRow } from "./IssueRow.js"
import type { IssueGroup as IssueGroupData } from "./get-issue-groups.js"

/** Render one non-empty issue status group. */
export function IssueGroup({ group }: IssueGroupProps) {
  const StatusIcon = group.config.icon

  return (
    <section className="issue-group">
      <h2
        aria-label={`${group.config.label} ${group.issues.length}`}
        className="issue-group__heading"
      >
        <StatusIcon
          aria-hidden="true"
          className={`status-icon status-icon--${group.config.tone}`}
          stroke={2}
        />
        <span>{group.config.label}</span>
        <span className="issue-group__count">{group.issues.length}</span>
      </h2>
      <div className="issue-group__rows">
        {group.issues.map((issue) => (
          <IssueRow issue={issue} key={issue.id} />
        ))}
      </div>
    </section>
  )
}

/** Props for one visible issue status group. */
export type IssueGroupProps = {
  /** Group data and presentation details. */
  readonly group: IssueGroupData
}
