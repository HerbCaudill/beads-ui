/**
 * DetailProperties component.
 *
 * Displays the properties panel in the issue detail view with:
 * - Type badge (read-only)
 * - Status dropdown
 * - Priority dropdown
 * - Assignee field with inline editing
 * - Delete button
 */
import { useCallback, useEffect, useRef, useState } from "react"

import { emojiForPriority } from "../utils/priority-badge.js"
import { priority_levels } from "../utils/priority.js"
import { statusLabel, STATUSES } from "../utils/status.js"
import { useDetailContext } from "./DetailView.js"

const KNOWN_TYPES = new Set(["bug", "feature", "task", "epic", "chore"])

/**
 * Get display label for an issue type.
 */
function labelForType(t: string): string {
  switch (t) {
    case "bug":
      return "Bug"
    case "feature":
      return "Feature"
    case "task":
      return "Task"
    case "epic":
      return "Epic"
    case "chore":
      return "Chore"
    default:
      return "\u2014" // em-dash
  }
}

/**
 * Props for DetailProperties component.
 */
export interface DetailPropertiesProps {
  /** Handler called when delete button is clicked. */
  onDelete?: () => void
  /** Optional test ID for testing. */
  testId?: string
}

/**
 * DetailProperties component.
 *
 * Renders the properties panel with status, priority, type, and assignee fields.
 */
export function DetailProperties({ onDelete, testId }: DetailPropertiesProps): React.JSX.Element {
  const { issue, transport } = useDetailContext()

  // Pending state for optimistic updates
  const [isPending, setIsPending] = useState(false)

  // Assignee inline edit state
  const [isEditingAssignee, setIsEditingAssignee] = useState(false)
  const [assigneeValue, setAssigneeValue] = useState("")
  const [isAssigneeSaving, setIsAssigneeSaving] = useState(false)
  const assigneeInputRef = useRef<HTMLInputElement>(null)

  // Get current values from issue
  const status = issue?.status || "open"
  const priority = typeof issue?.priority === "number" ? issue.priority : 2
  const issueType = (issue as { issue_type?: string } | null)?.issue_type || ""
  const assignee = issue?.assignee || ""

  // Derived type values
  const normalizedType = issueType.toLowerCase()
  const typeClass = KNOWN_TYPES.has(normalizedType) ? normalizedType : "neutral"
  const typeLabel = labelForType(normalizedType)

  /**
   * Handle status change.
   */
  const handleStatusChange = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>): Promise<void> => {
      if (!issue || isPending) return

      const newStatus = e.target.value
      if (newStatus === status) return

      setIsPending(true)
      try {
        await transport("update-status", {
          id: issue.id,
          status: newStatus,
        })
      } catch (error) {
        // On error, the transport layer should handle showing error toast
        console.error("Failed to update status:", error)
      } finally {
        setIsPending(false)
      }
    },
    [issue, isPending, status, transport],
  )

  /**
   * Handle priority change.
   */
  const handlePriorityChange = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>): Promise<void> => {
      if (!issue || isPending) return

      const newPriority = Number(e.target.value)
      if (newPriority === priority) return

      setIsPending(true)
      try {
        await transport("update-priority", {
          id: issue.id,
          priority: newPriority,
        })
      } catch (error) {
        // On error, the transport layer should handle showing error toast
        console.error("Failed to update priority:", error)
      } finally {
        setIsPending(false)
      }
    },
    [issue, isPending, priority, transport],
  )

  /**
   * Enter assignee edit mode.
   */
  const enterAssigneeEditMode = useCallback((): void => {
    setAssigneeValue(assignee)
    setIsEditingAssignee(true)
  }, [assignee])

  /**
   * Cancel assignee edit.
   */
  const cancelAssigneeEdit = useCallback((): void => {
    setIsEditingAssignee(false)
    setAssigneeValue("")
  }, [])

  /**
   * Save assignee.
   */
  const saveAssignee = useCallback(async (): Promise<void> => {
    if (!issue || isAssigneeSaving) return

    const newValue = assigneeValue.trim()
    if (newValue === assignee) {
      setIsEditingAssignee(false)
      return
    }

    setIsAssigneeSaving(true)
    try {
      await transport("update-assignee", {
        id: issue.id,
        assignee: newValue,
      })
      setIsEditingAssignee(false)
    } catch (error) {
      // On error, keep editing mode open so user can retry
      console.error("Failed to update assignee:", error)
    } finally {
      setIsAssigneeSaving(false)
    }
  }, [issue, isAssigneeSaving, assigneeValue, assignee, transport])

  /**
   * Handle assignee span click.
   */
  const handleAssigneeClick = useCallback((): void => {
    enterAssigneeEditMode()
  }, [enterAssigneeEditMode])

  /**
   * Handle assignee span keydown.
   */
  const handleAssigneeKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      if (e.key === "Enter") {
        e.preventDefault()
        enterAssigneeEditMode()
      }
    },
    [enterAssigneeEditMode],
  )

  /**
   * Handle assignee input change.
   */
  const handleAssigneeInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
    setAssigneeValue(e.target.value)
  }, [])

  /**
   * Handle assignee input keydown.
   */
  const handleAssigneeInputKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      if (e.key === "Enter") {
        e.preventDefault()
        void saveAssignee()
      } else if (e.key === "Escape") {
        e.preventDefault()
        cancelAssigneeEdit()
      }
    },
    [saveAssignee, cancelAssigneeEdit],
  )

  /**
   * Handle save button click.
   */
  const handleAssigneeSaveClick = useCallback((): void => {
    void saveAssignee()
  }, [saveAssignee])

  /**
   * Handle cancel button click.
   */
  const handleAssigneeCancelClick = useCallback((): void => {
    cancelAssigneeEdit()
  }, [cancelAssigneeEdit])

  /**
   * Handle delete button click.
   */
  const handleDeleteClick = useCallback(
    (e: React.MouseEvent): void => {
      e.stopPropagation()
      e.preventDefault()
      onDelete?.()
    },
    [onDelete],
  )

  // Focus assignee input when entering edit mode
  useEffect(() => {
    if (isEditingAssignee && assigneeInputRef.current) {
      assigneeInputRef.current.focus()
      assigneeInputRef.current.select()
    }
  }, [isEditingAssignee])

  // Determine assignee display
  const hasAssignee = assignee.trim().length > 0
  const assigneeDisplay = hasAssignee ? assignee : "Unassigned"
  const assigneeClass = hasAssignee ? "editable" : "editable muted"

  return (
    <div className="props-card" data-testid={testId}>
      <div className="props-card__header">
        <div className="props-card__title">Properties</div>
        <button
          className="delete-issue-btn"
          title="Delete issue"
          aria-label="Delete issue"
          onClick={handleDeleteClick}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
          <span className="tooltip">Delete issue</span>
        </button>
      </div>

      {/* Type */}
      <div className="prop">
        <div className="label">Type</div>
        <div className="value">
          <span
            className={`type-badge type-badge--${typeClass}`}
            role="img"
            aria-label={
              KNOWN_TYPES.has(normalizedType) ? `Issue type: ${typeLabel}` : "Issue type: unknown"
            }
            title={KNOWN_TYPES.has(normalizedType) ? `Type: ${typeLabel}` : "Type: unknown"}
          >
            {typeLabel}
          </span>
        </div>
      </div>

      {/* Status */}
      <div className="prop">
        <div className="label">Status</div>
        <div className="value">
          <select
            className={`badge-select badge--status is-${status}`}
            value={status}
            onChange={handleStatusChange}
            disabled={isPending}
          >
            {STATUSES.map(s => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Priority */}
      <div className="prop">
        <div className="label">Priority</div>
        <div className="value">
          <select
            className={`badge-select badge--priority is-p${priority}`}
            value={String(priority)}
            onChange={handlePriorityChange}
            disabled={isPending}
          >
            {priority_levels.map((label, i) => (
              <option key={i} value={String(i)}>
                {emojiForPriority(i)} {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Assignee */}
      <div className="prop assignee">
        <div className="label">Assignee</div>
        <div className="value">
          {isEditingAssignee ?
            <>
              <input
                ref={assigneeInputRef}
                type="text"
                aria-label="Edit assignee"
                value={assigneeValue}
                onChange={handleAssigneeInputChange}
                onKeyDown={handleAssigneeInputKeyDown}
                disabled={isAssigneeSaving}
                size={Math.min(40, Math.max(12, assigneeValue.length + 3))}
              />
              <button
                className="btn"
                style={{ marginLeft: "6px" }}
                onClick={handleAssigneeSaveClick}
                disabled={isAssigneeSaving}
              >
                {isAssigneeSaving ? "Saving..." : "Save"}
              </button>
              <button
                className="btn"
                style={{ marginLeft: "6px" }}
                onClick={handleAssigneeCancelClick}
                disabled={isAssigneeSaving}
              >
                Cancel
              </button>
            </>
          : <span
              className={assigneeClass}
              tabIndex={0}
              role="button"
              aria-label="Edit assignee"
              onClick={handleAssigneeClick}
              onKeyDown={handleAssigneeKeyDown}
            >
              {assigneeDisplay}
            </span>
          }
        </div>
      </div>
    </div>
  )
}
