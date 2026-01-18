/**
 * IssueRow component.
 *
 * Renders a table row for an issue with inline editing capabilities for
 * title, assignee, status, and priority.
 */
import { useCallback, useState } from "react"

import { emojiForPriority } from "../utils/priority-badge.js"
import { priority_levels } from "../utils/priority.js"
import { statusLabel } from "../utils/status.js"
import { IssueIdButton } from "./IssueIdButton.js"
import { TypeBadge } from "./TypeBadge.js"

/**
 * Issue data for row rendering.
 */
export interface IssueRowData {
  id: string
  title?: string
  status?: string
  priority?: number
  issue_type?: string
  assignee?: string
  dependency_count?: number
  dependent_count?: number
}

/**
 * Patch object for issue updates.
 */
export interface IssueUpdatePatch {
  title?: string
  assignee?: string
  status?: "open" | "in_progress" | "closed"
  priority?: number
}

export interface IssueRowProps {
  /** The issue data to display. */
  issue: IssueRowData
  /** Whether this row is currently selected. */
  selected?: boolean
  /** CSS class for the row. */
  row_class?: string
  /** Handler for navigating to the issue. */
  onNavigate: (id: string) => void
  /** Handler for updating the issue. */
  onUpdate: (id: string, patch: IssueUpdatePatch) => Promise<void>
}

/**
 * Editable text field component.
 */
function EditableText({
  value,
  placeholder,
  onSave,
}: {
  value: string
  placeholder?: string
  onSave: (value: string) => Promise<void>
}): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const [input_value, setInputValue] = useState(value)

  const handleClick = useCallback((e: React.MouseEvent): void => {
    e.stopPropagation()
    e.preventDefault()
    setEditing(true)
  }, [])

  const handleKeyDownSpan = useCallback((e: React.KeyboardEvent): void => {
    if (e.key === "Enter") {
      e.preventDefault()
      e.stopPropagation()
      setEditing(true)
    }
  }, [])

  const handleSave = useCallback(async (): Promise<void> => {
    if (input_value !== value) {
      await onSave(input_value)
    }
    setEditing(false)
  }, [input_value, value, onSave])

  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLInputElement>): Promise<void> => {
      if (e.key === "Escape") {
        setInputValue(value)
        setEditing(false)
      } else if (e.key === "Enter") {
        await handleSave()
      }
    },
    [value, handleSave],
  )

  const handleBlur = useCallback(async (): Promise<void> => {
    await handleSave()
  }, [handleSave])

  if (editing) {
    return (
      <span>
        <input
          type="text"
          value={input_value}
          className="inline-edit"
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          autoFocus
        />
      </span>
    )
  }

  return (
    <span
      className={`editable text-truncate ${value ? "" : "muted"}`}
      tabIndex={0}
      role="button"
      onClick={handleClick}
      onKeyDown={handleKeyDownSpan}
    >
      {value || placeholder}
    </span>
  )
}

/**
 * Issue row component for displaying in tables.
 *
 * @param props - Component props.
 */
export function IssueRow({
  issue,
  selected = false,
  row_class = "epic-row",
  onNavigate,
  onUpdate,
}: IssueRowProps): React.JSX.Element {
  const cur_status = String(issue.status || "open")
  const cur_prio = String(issue.priority ?? 2)

  const handleRowClick = useCallback(
    (e: React.MouseEvent): void => {
      const target = e.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "SELECT") {
        return
      }
      onNavigate(issue.id)
    },
    [issue.id, onNavigate],
  )

  const handleTitleSave = useCallback(
    async (title: string): Promise<void> => {
      await onUpdate(issue.id, { title })
    },
    [issue.id, onUpdate],
  )

  const handleAssigneeSave = useCallback(
    async (assignee: string): Promise<void> => {
      await onUpdate(issue.id, { assignee })
    },
    [issue.id, onUpdate],
  )

  const handleStatusChange = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>): Promise<void> => {
      const status = e.target.value as "open" | "in_progress" | "closed"
      await onUpdate(issue.id, { status })
    },
    [issue.id, onUpdate],
  )

  const handlePriorityChange = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>): Promise<void> => {
      const priority = Number(e.target.value)
      await onUpdate(issue.id, { priority })
    },
    [issue.id, onUpdate],
  )

  return (
    <tr
      role="row"
      className={`${row_class} ${selected ? "selected" : ""}`}
      data-issue-id={issue.id}
      onClick={handleRowClick}
    >
      <td role="gridcell" className="mono">
        <IssueIdButton id={issue.id} />
      </td>
      <td role="gridcell">
        <TypeBadge issue_type={issue.issue_type} />
      </td>
      <td role="gridcell">
        <EditableText value={issue.title || ""} onSave={handleTitleSave} />
      </td>
      <td role="gridcell">
        <select
          className={`badge-select badge--status is-${cur_status}`}
          value={cur_status}
          onChange={handleStatusChange}
        >
          {(["open", "in_progress", "closed"] as const).map(s => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </select>
      </td>
      <td role="gridcell">
        <EditableText
          value={issue.assignee || ""}
          placeholder="Unassigned"
          onSave={handleAssigneeSave}
        />
      </td>
      <td role="gridcell">
        <select
          className={`badge-select badge--priority is-p${cur_prio}`}
          value={cur_prio}
          onChange={handlePriorityChange}
        >
          {priority_levels.map((p, i) => (
            <option key={i} value={String(i)}>
              {emojiForPriority(i)} {p}
            </option>
          ))}
        </select>
      </td>
      <td role="gridcell" className="deps-col">
        {((issue.dependency_count || 0) > 0 || (issue.dependent_count || 0) > 0) && (
          <span className="deps-indicator">
            {(issue.dependency_count || 0) > 0 && (
              <span
                className="dep-count"
                title={`${issue.dependency_count} ${
                  (issue.dependency_count || 0) === 1 ? "dependency" : "dependencies"
                }`}
              >
                {"\u2192"}
                {issue.dependency_count}
              </span>
            )}
            {(issue.dependent_count || 0) > 0 && (
              <span
                className="dependent-count"
                title={`${issue.dependent_count} ${
                  (issue.dependent_count || 0) === 1 ? "dependent" : "dependents"
                }`}
              >
                {"\u2190"}
                {issue.dependent_count}
              </span>
            )}
          </span>
        )}
      </td>
    </tr>
  )
}
