/**
 * BoardColumn component.
 *
 * Displays a column on the kanban board with:
 * - Header with title and count badge
 * - Optional filter dropdown for closed column
 * - List of BoardCard components
 * - Drop target for drag-and-drop
 */
import { useCallback, useMemo, useRef, useState } from "react"

import type { BoardColumnMode } from "../data/list-selectors.js"
import { useBoardColumn, useTransport } from "../hooks/index.js"
import type { ClosedFilter } from "../state.js"
import { showToast } from "../utils/toast.js"
import { BoardCard } from "./BoardCard.js"

/**
 * Map column IDs to their corresponding status values.
 */
const COLUMN_STATUS_MAP: Record<string, "open" | "in_progress" | "closed"> = {
  "blocked-col": "open",
  "ready-col": "open",
  "in-progress-col": "in_progress",
  "closed-col": "closed",
}

export interface BoardColumnProps {
  /** Column title. */
  title: string
  /** Column element ID for accessibility. */
  columnId: string
  /** Board column mode for filtering/sorting. */
  mode: BoardColumnMode
  /** Subscription client ID for the column data. */
  clientId: string
  /** Handler for navigating to an issue. */
  onNavigate: (id: string) => void
  /** Optional closed filter for the closed column. */
  closedFilter?: ClosedFilter
  /** Handler for closed filter changes (closed column only). */
  onClosedFilterChange?: (filter: ClosedFilter) => void
}

/**
 * Check if a timestamp falls within the closed filter window.
 *
 * @param closed_at - The timestamp when the issue was closed.
 * @param filter - The closed filter value.
 * @returns True if the issue should be shown.
 */
function matchesClosedFilter(closed_at: number | null | undefined, filter: ClosedFilter): boolean {
  if (closed_at === null || closed_at === undefined || !Number.isFinite(closed_at)) {
    return false
  }
  const now = new Date()
  let since_ts = 0
  if (filter === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    since_ts = start.getTime()
  } else if (filter === "3") {
    since_ts = now.getTime() - 3 * 24 * 60 * 60 * 1000
  } else if (filter === "7") {
    since_ts = now.getTime() - 7 * 24 * 60 * 60 * 1000
  }
  return closed_at >= since_ts
}

/**
 * Board column component.
 *
 * @param props - Component props.
 */
export function BoardColumn({
  title,
  columnId,
  mode,
  clientId,
  onNavigate,
  closedFilter = "today",
  onClosedFilterChange,
}: BoardColumnProps): React.JSX.Element {
  const [is_drag_over, setIsDragOver] = useState(false)
  const drag_counter_ref = useRef(0)

  // Get issues from the hook
  const raw_issues = useBoardColumn(clientId, mode)

  // Transport for status updates
  const transport = useTransport()

  // Filter closed issues based on filter setting
  const issues = useMemo(() => {
    if (mode !== "closed") {
      return raw_issues
    }
    return raw_issues.filter(issue => matchesClosedFilter(issue.closed_at, closedFilter))
  }, [raw_issues, mode, closedFilter])

  // Count label for accessibility
  const count_label = issues.length === 1 ? "1 issue" : `${issues.length} issues`
  const header_id = `${columnId}-header`

  /**
   * Handle drag over: show drop target indicator.
   */
  const handleDragOver = useCallback((e: React.DragEvent<HTMLElement>): void => {
    e.preventDefault()
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move"
    }
  }, [])

  /**
   * Handle drag enter: increment counter and show indicator.
   */
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLElement>): void => {
    e.preventDefault()
    drag_counter_ref.current++
    if (drag_counter_ref.current === 1) {
      setIsDragOver(true)
    }
  }, [])

  /**
   * Handle drag leave: decrement counter and hide indicator when leaving.
   */
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLElement>): void => {
    e.preventDefault()
    drag_counter_ref.current--
    if (drag_counter_ref.current === 0) {
      setIsDragOver(false)
    }
  }, [])

  /**
   * Handle drop: update issue status.
   */
  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLElement>): Promise<void> => {
      e.preventDefault()
      drag_counter_ref.current = 0
      setIsDragOver(false)

      const issue_id = e.dataTransfer?.getData("text/plain")
      if (!issue_id) {
        return
      }

      const new_status = COLUMN_STATUS_MAP[columnId]
      if (!new_status) {
        return
      }

      try {
        await transport("update-status", { id: issue_id, status: new_status })
        showToast("Status updated", "success", 1500)
      } catch {
        showToast("Failed to update status", "error")
      }
    },
    [columnId, transport],
  )

  /**
   * Handle closed filter change.
   */
  const handleFilterChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>): void => {
      const value = e.target.value
      const filter: ClosedFilter = value === "3" || value === "7" ? value : "today"
      onClosedFilterChange?.(filter)
    },
    [onClosedFilterChange],
  )

  /**
   * Handle keyboard navigation within the column.
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>): void => {
      const target = e.target as HTMLElement

      // Do not intercept keys inside editable controls
      const tag = target.tagName.toLowerCase()
      if (tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable) {
        return
      }

      const card = target.closest(".board-card") as HTMLElement | null
      if (!card) {
        return
      }

      const key = e.key
      if (key === "Enter" || key === " ") {
        e.preventDefault()
        const id = card.getAttribute("data-issue-id")
        if (id) {
          onNavigate(id)
        }
        return
      }

      // ArrowUp/ArrowDown navigation is handled at the column level
      if (key !== "ArrowUp" && key !== "ArrowDown") {
        return
      }

      e.preventDefault()
      const body = card.closest(".board-column__body")
      if (!body) {
        return
      }

      const cards: HTMLElement[] = Array.from(body.querySelectorAll(".board-card"))
      const idx = cards.indexOf(card)
      if (idx === -1) {
        return
      }

      if (key === "ArrowDown" && idx < cards.length - 1) {
        const next_card = cards[idx + 1]
        if (next_card) {
          card.tabIndex = -1
          next_card.tabIndex = 0
          next_card.focus()
        }
      } else if (key === "ArrowUp" && idx > 0) {
        const prev_card = cards[idx - 1]
        if (prev_card) {
          card.tabIndex = -1
          prev_card.tabIndex = 0
          prev_card.focus()
        }
      }
    },
    [onNavigate],
  )

  const class_name = `board-column${is_drag_over ? " board-column--drag-over" : ""}`

  return (
    <section
      className={class_name}
      id={columnId}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onKeyDown={handleKeyDown}
    >
      <header className="board-column__header" id={header_id} role="heading" aria-level={2}>
        <div className="board-column__title">
          <span className="board-column__title-text">{title}</span>
          <span className="badge board-column__count" aria-label={count_label}>
            {issues.length}
          </span>
        </div>
        {mode === "closed" && (
          <label className="board-closed-filter">
            <span className="visually-hidden">Filter closed issues</span>
            <select
              id="closed-filter"
              aria-label="Filter closed issues"
              value={closedFilter}
              onChange={handleFilterChange}
            >
              <option value="today">Today</option>
              <option value="3">Last 3 days</option>
              <option value="7">Last 7 days</option>
            </select>
          </label>
        )}
      </header>
      <div className="board-column__body" role="list" aria-labelledby={header_id}>
        {issues.map((issue, idx) => (
          <BoardCard
            key={issue.id}
            issue={issue}
            onNavigate={onNavigate}
            tabIndex={idx === 0 ? 0 : -1}
          />
        ))}
      </div>
    </section>
  )
}
