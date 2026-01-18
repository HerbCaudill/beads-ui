/**
 * BoardCard component.
 *
 * Displays a card for an issue on the kanban board with:
 * - Issue title
 * - Type badge
 * - Priority badge
 * - Issue ID
 *
 * Supports HTML5 drag-and-drop and navigation on click.
 */
import { useCallback, useState } from "react"

import type { IssueLite } from "../../types/issues.js"
import { IssueIdButton } from "./IssueIdButton.js"
import { PriorityBadge } from "./PriorityBadge.js"
import { TypeBadge } from "./TypeBadge.js"

export interface BoardCardProps {
  /** The issue data to display. */
  issue: IssueLite
  /** Handler for navigating to the issue detail. */
  onNavigate: (id: string) => void
  /** Tab index for keyboard navigation (roving tabindex pattern). */
  tabIndex?: number
}

/**
 * Card component for displaying an issue on the board.
 *
 * @param props - Component props.
 */
export function BoardCard({ issue, onNavigate, tabIndex = -1 }: BoardCardProps): React.JSX.Element {
  const [is_dragging, setIsDragging] = useState(false)

  /**
   * Handle click to navigate (unless dragging).
   */
  const handleClick = useCallback(
    (e: React.MouseEvent): void => {
      // Ignore if the click is on an interactive element (like the ID button)
      const target = e.target as HTMLElement
      if (target.tagName === "BUTTON") {
        return
      }

      // Only navigate if not in a drag operation
      if (!is_dragging) {
        onNavigate(issue.id)
      }
    },
    [issue.id, onNavigate, is_dragging],
  )

  /**
   * Handle drag start: set data and add dragging state.
   */
  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLElement>): void => {
      setIsDragging(true)
      if (e.dataTransfer) {
        e.dataTransfer.setData("text/plain", issue.id)
        e.dataTransfer.effectAllowed = "move"
      }
    },
    [issue.id],
  )

  /**
   * Handle drag end: remove dragging state.
   */
  const handleDragEnd = useCallback((): void => {
    // Use setTimeout to clear dragging state after click event can check it
    setTimeout(() => {
      setIsDragging(false)
    }, 0)
  }, [])

  const class_name = `board-card${is_dragging ? " board-card--dragging" : ""}`
  const title = issue.title || "(no title)"

  return (
    <article
      className={class_name}
      data-issue-id={issue.id}
      role="listitem"
      tabIndex={tabIndex}
      draggable
      aria-label={`Issue ${title}`}
      onClick={handleClick}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="board-card__title text-truncate">{title}</div>
      <div className="board-card__meta">
        <TypeBadge issue_type={issue.issue_type} />
        <PriorityBadge priority={issue.priority} />
        <IssueIdButton id={issue.id} class_name="mono" />
      </div>
    </article>
  )
}
