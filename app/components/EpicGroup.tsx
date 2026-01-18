/**
 * EpicGroup component.
 *
 * Displays an expandable epic with its children issues.
 */
import { useCallback } from "react"

import type { IssueLite } from "../../types/issues.js"
import { useEpicChildren } from "../hooks/index.js"
import { IssueIdButton } from "./IssueIdButton.js"
import { IssueRow, type IssueRowData, type IssueUpdatePatch } from "./IssueRow.js"

/**
 * Epic entity with total/closed children counters.
 */
export interface EpicEntity extends IssueLite {
  total_children?: number
  closed_children?: number
}

/**
 * Convert IssueLite to IssueRowData.
 * The data from useEpicChildren may have additional fields that come from the server.
 *
 * @param issue - The issue from the store.
 */
function toIssueRowData(issue: IssueLite): IssueRowData {
  // Type assertion for fields that may exist on server response but not in IssueLite
  const extended = issue as IssueLite & {
    assignee?: string
    dependency_count?: number
    dependent_count?: number
  }
  // Build the result object, only including defined properties
  const result: IssueRowData = { id: issue.id }
  if (issue.title !== undefined) {
    result.title = issue.title
  }
  if (issue.status !== undefined) {
    result.status = issue.status
  }
  if (issue.priority !== undefined) {
    result.priority = issue.priority
  }
  if (issue.issue_type !== undefined) {
    result.issue_type = issue.issue_type
  }
  if (extended.assignee !== undefined) {
    result.assignee = extended.assignee
  }
  if (extended.dependency_count !== undefined) {
    result.dependency_count = extended.dependency_count
  }
  if (extended.dependent_count !== undefined) {
    result.dependent_count = extended.dependent_count
  }
  return result
}

export interface EpicGroupProps {
  /** The epic issue data. */
  epic: EpicEntity
  /** Total number of children. */
  total_children: number
  /** Number of closed children. */
  closed_children: number
  /** Whether this epic is expanded. */
  expanded: boolean
  /** Whether children are currently loading. */
  loading: boolean
  /** Handler for toggling expansion. */
  onToggle: (epic_id: string) => void
  /** Handler for navigating to an issue. */
  onNavigate: (id: string) => void
  /** Handler for updating an issue. */
  onUpdate: (id: string, patch: IssueUpdatePatch) => Promise<void>
}

/**
 * A single epic group with expandable children.
 *
 * @param props - Component props.
 */
export function EpicGroup({
  epic,
  total_children,
  closed_children,
  expanded,
  loading,
  onToggle,
  onNavigate,
  onUpdate,
}: EpicGroupProps): React.JSX.Element {
  const id = String(epic.id || "")

  // Get children from the list selectors hook
  const children = useEpicChildren(id)

  const handleHeaderClick = useCallback((): void => {
    onToggle(id)
  }, [id, onToggle])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        onToggle(id)
      }
    },
    [id, onToggle],
  )

  return (
    <div className="epic-group" data-epic-id={id}>
      <div
        className="epic-header"
        onClick={handleHeaderClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
      >
        <IssueIdButton id={id} class_name="mono" />
        <span className="text-truncate" style={{ marginLeft: 8 }}>
          {epic.title || "(no title)"}
        </span>
        <span
          className="epic-progress"
          style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}
        >
          <progress value={closed_children} max={Math.max(1, total_children)} />
          <span className="muted mono">
            {closed_children}/{total_children}
          </span>
        </span>
      </div>
      {expanded && (
        <div className="epic-children">
          {loading ?
            <div className="muted">Loading\u2026</div>
          : children.length === 0 ?
            <div className="muted">No issues found</div>
          : <table className="table">
              <colgroup>
                <col style={{ width: 100 }} />
                <col style={{ width: 120 }} />
                <col />
                <col style={{ width: 120 }} />
                <col style={{ width: 160 }} />
                <col style={{ width: 130 }} />
              </colgroup>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Type</th>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Assignee</th>
                  <th>Priority</th>
                </tr>
              </thead>
              <tbody>
                {children.map(child => (
                  <IssueRow
                    key={child.id}
                    issue={toIssueRowData(child)}
                    row_class="epic-row"
                    onNavigate={onNavigate}
                    onUpdate={onUpdate}
                  />
                ))}
              </tbody>
            </table>
          }
        </div>
      )}
    </div>
  )
}
