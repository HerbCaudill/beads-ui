/**
 * BoardView component.
 *
 * Displays a kanban board with four columns:
 * - Blocked: Issues that are blocked
 * - Ready: Issues ready to work on
 * - In Progress: Issues currently being worked on
 * - Closed: Recently closed issues
 *
 * Supports drag-and-drop between columns and keyboard navigation.
 */
import { useCallback, useEffect, useRef } from "react"

import { useAppStore, type ClosedFilter } from "../store/index.js"
import { BoardColumn } from "./BoardColumn.js"

export interface BoardViewProps {
  /** Handler for navigating to an issue. */
  onNavigate: (id: string) => void
}

/**
 * Hook to subscribe to Zustand store for the closed filter.
 *
 * @returns The current closed filter value.
 */
function useClosedFilter(): ClosedFilter {
  return useAppStore(state => state.board.closed_filter)
}

/**
 * BoardView component.
 *
 * Renders a kanban board with four columns and supports keyboard navigation
 * between columns using arrow keys.
 *
 * @param props - Component props.
 */
export function BoardView({ onNavigate }: BoardViewProps): React.JSX.Element {
  const closed_filter = useClosedFilter()
  const board_ref = useRef<HTMLDivElement>(null)

  /**
   * Handle closed filter change.
   * Updates the Zustand store which persists the value.
   */
  const handleClosedFilterChange = useCallback((filter: ClosedFilter): void => {
    useAppStore.getState().setBoard({ closed_filter: filter })
  }, [])

  /**
   * Handle keyboard navigation between columns.
   * ArrowLeft/ArrowRight moves focus to the first card in an adjacent non-empty column.
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>): void => {
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
    if (key !== "ArrowLeft" && key !== "ArrowRight") {
      return
    }

    e.preventDefault()

    // Get all columns
    const board = board_ref.current
    if (!board) {
      return
    }

    const columns: HTMLElement[] = Array.from(board.querySelectorAll(".board-column"))
    const current_col = card.closest(".board-column") as HTMLElement | null
    if (!current_col) {
      return
    }

    const col_idx = columns.indexOf(current_col)
    if (col_idx === -1) {
      return
    }

    // Find adjacent column with at least one card
    const dir = key === "ArrowRight" ? 1 : -1
    let next_idx = col_idx + dir

    while (next_idx >= 0 && next_idx < columns.length) {
      const candidate = columns[next_idx]
      if (candidate) {
        const c_body = candidate.querySelector(".board-column__body") as HTMLElement | null
        const c_cards = c_body ? Array.from(c_body.querySelectorAll(".board-card")) : []
        if (c_cards.length > 0) {
          // Found a column with cards - focus the first card
          const first = c_cards[0] as HTMLElement
          if (first) {
            // Update roving tabindex
            card.tabIndex = -1
            first.tabIndex = 0
            first.focus()
          }
          return
        }
      }
      next_idx += dir
    }
  }, [])

  return (
    <div className="panel__body board-root" ref={board_ref} onKeyDown={handleKeyDown}>
      <BoardColumn
        title="Blocked"
        columnId="blocked-col"
        mode="blocked"
        clientId="tab:board:blocked"
        onNavigate={onNavigate}
      />
      <BoardColumn
        title="Ready"
        columnId="ready-col"
        mode="ready"
        clientId="tab:board:ready"
        onNavigate={onNavigate}
      />
      <BoardColumn
        title="In Progress"
        columnId="in-progress-col"
        mode="in_progress"
        clientId="tab:board:in-progress"
        onNavigate={onNavigate}
      />
      <BoardColumn
        title="Closed"
        columnId="closed-col"
        mode="closed"
        clientId="tab:board:closed"
        onNavigate={onNavigate}
        closedFilter={closed_filter}
        onClosedFilterChange={handleClosedFilterChange}
      />
    </div>
  )
}
