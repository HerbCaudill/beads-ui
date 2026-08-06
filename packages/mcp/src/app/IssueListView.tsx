import { GroupedTaskList, type TaskGroupDescriptor, type TaskStatus } from "@beads/ui/presentation"
import { IconSearch } from "@tabler/icons-react"
import { useCallback, useMemo, useState } from "react"

import { getIssueGroups } from "./get-issue-groups.js"
import { issueToTask } from "./issue-to-task.js"
import { matchesIssueSearch } from "./matches-issue-search.js"
import type { IssueListResult } from "./types.js"

/** Render the structured issue-list result inline. */
export function IssueListView({ onOpenIssue, result }: IssueListViewProps) {
  const [query, setQuery] = useState("")
  const [collapsedGroups, setCollapsedGroups] = useState<CollapsedGroups>({ closed: true })

  const toggleGroup = useCallback(
    (status: TaskStatus) =>
      setCollapsedGroups((current) => ({ ...current, [status]: !(current[status] ?? false) })),
    [],
  )

  const tasks = useMemo(
    () => result.issues.filter((issue) => matchesIssueSearch(issue, query)).map(issueToTask),
    [query, result.issues],
  )
  const groups = useMemo<TaskGroupDescriptor[]>(
    () =>
      getIssueGroups(tasks).map((group) => ({
        count: group.tasks.length,
        isCollapsed: collapsedGroups[group.status] ?? false,
        key: group.status,
        label: group.label,
        onToggle: () => toggleGroup(group.status),
        // The widget groups strictly by status, so every task renders as its own root.
        trees: group.tasks.map((task) => ({ task, children: [] })),
      })),
    [collapsedGroups, tasks, toggleGroup],
  )

  const hasQuery = query.trim().length > 0
  const countLabel = hasQuery
    ? `${tasks.length} matching ${tasks.length === 1 ? "issue" : "issues"}`
    : `${tasks.length}${result.includeClosed ? "" : " active"} ${
        tasks.length === 1 ? "issue" : "issues"
      }`

  return (
    <main className="min-w-70">
      <div className="flex items-center gap-3 px-2 py-2">
        <label className="border-border bg-muted focus-within:ring-ring flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md border px-2 focus-within:ring-1">
          <IconSearch aria-hidden="true" className="text-muted-foreground size-3.5 shrink-0" />
          <span className="sr-only">Filter issues</span>
          <input
            aria-label="Filter issues"
            className="text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-xs outline-none"
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Filter issues"
            type="search"
            value={query}
          />
        </label>
        <span className="text-muted-foreground shrink-0 text-xs whitespace-nowrap">
          {countLabel}
        </span>
      </div>

      {groups.length > 0 ? (
        <GroupedTaskList
          className="h-auto overflow-visible"
          groups={groups}
          onTaskClick={onOpenIssue}
        />
      ) : (
        <div className="text-muted-foreground border-border mx-2 mb-2 rounded-lg border border-dashed px-3 py-6 text-center text-xs">
          <p className="m-0">
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

/** Collapsed state for each status group, keyed by status. */
type CollapsedGroups = Partial<Record<TaskStatus, boolean>>

/** Props for the inline issue-list view. */
export type IssueListViewProps = {
  /** Drill into one issue. Omit to render the list as read-only. */
  readonly onOpenIssue?: (id: string) => void
  /** Structured tool result to display. */
  readonly result: IssueListResult
}
