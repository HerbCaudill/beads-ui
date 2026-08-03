import { IconSearch } from "@tabler/icons-react"
import { useMemo, useState } from "react"

import { getIssueGroups } from "./get-issue-groups.js"
import { getWorkspaceName } from "./get-workspace-name.js"
import { IssueGroup } from "./IssueGroup.js"
import { matchesIssueSearch } from "./matches-issue-search.js"
import type { IssueListResult } from "./types.js"

/** Render the structured issue-list result inline. */
export function IssueListView({ result }: IssueListViewProps) {
  const [query, setQuery] = useState("")
  const issues = useMemo(
    () => result.issues.filter((issue) => matchesIssueSearch(issue, query)),
    [query, result.issues],
  )
  const groups = getIssueGroups(issues)
  const hasQuery = query.trim().length > 0
  const countLabel = hasQuery
    ? `${issues.length} matching ${issues.length === 1 ? "issue" : "issues"}`
    : `${issues.length}${result.includeClosed ? "" : " active"} ${
        issues.length === 1 ? "issue" : "issues"
      }`

  return (
    <main className="issue-list">
      <header className="issue-list__header">
        <div>
          <p className="eyebrow">Beads</p>
          <h1>{getWorkspaceName(result.workspace)}</h1>
        </div>
        <span className="issue-list__summary">{countLabel}</span>
      </header>

      <label className="search">
        <IconSearch aria-hidden="true" />
        <span className="sr-only">Filter issues</span>
        <input
          aria-label="Filter issues"
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Filter issues"
          type="search"
          value={query}
        />
      </label>

      {groups.length > 0 ? (
        <div className="issue-list__groups">
          {groups.map((group) => (
            <IssueGroup group={group} key={group.config.status} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>
            {hasQuery
              ? "No matching issues"
              : result.includeClosed
                ? "No issues"
                : "No active issues"}
          </p>
          {hasQuery && <span>Try a different ID, title, description, or label.</span>}
        </div>
      )}
    </main>
  )
}

/** Props for the inline issue-list view. */
export type IssueListViewProps = {
  /** Structured tool result to display. */
  readonly result: IssueListResult
}
