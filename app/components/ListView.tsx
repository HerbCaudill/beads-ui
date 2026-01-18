/**
 * ListView component.
 *
 * Displays a filterable, sortable table of issues with inline editing capabilities.
 * Uses the FilterBar for filtering controls and IssueRow for table rows.
 *
 * Features:
 * - Status, type, and search filtering via FilterBar
 * - Inline editing for title, assignee, status, and priority
 * - Scroll position preservation on data updates
 */
import { useCallback, useEffect, useRef, useState } from "react"

import { useListData } from "../hooks/index.js"
import { useTransport } from "../hooks/use-transport.js"
import { useAppStore } from "../store/index.js"
import { FilterBar } from "./FilterBar.js"
import { IssueRow, type IssueUpdatePatch, type IssueRowData } from "./IssueRow.js"

export interface ListViewProps {
  /** Handler for navigating to an issue. */
  onNavigate: (id: string) => void
  /** Optional test ID for testing. */
  testId?: string
}

/**
 * ListView component.
 *
 * Renders a table of issues with filtering, sorting, and inline editing.
 * Uses the useListData hook for data and the FilterBar component for filters.
 *
 * @param props - Component props.
 */
export function ListView({ onNavigate, testId }: ListViewProps): React.JSX.Element {
  // Get filtered and sorted issues from the hook
  const { issues, filteredCount } = useListData("tab:issues")

  // Get transport for mutations
  const transport = useTransport()

  // Get/set selected_id from store for keyboard navigation
  const selected_id = useAppStore(s => s.selected_id)
  const setSelectedId = useCallback((id: string | null) => {
    useAppStore.setState({ selected_id: id })
  }, [])

  // Local selected index derived from issues and selected_id
  const [localSelectedIndex, setLocalSelectedIndex] = useState<number>(-1)

  // Update local index when issues or selected_id changes
  useEffect(() => {
    if (selected_id && issues.length > 0) {
      const idx = issues.findIndex(i => i.id === selected_id)
      setLocalSelectedIndex(idx >= 0 ? idx : -1)
    } else {
      setLocalSelectedIndex(-1)
    }
  }, [selected_id, issues])

  // Ref for scroll position preservation
  const body_ref = useRef<HTMLDivElement>(null)
  const scroll_position_ref = useRef<number>(0)

  // Ref for the container to attach keyboard listener
  const container_ref = useRef<HTMLDivElement>(null)

  /**
   * Save scroll position before re-render.
   */
  useEffect(() => {
    const el = body_ref.current
    if (el) {
      scroll_position_ref.current = el.scrollTop
    }
  })

  /**
   * Restore scroll position after re-render.
   */
  useEffect(() => {
    const el = body_ref.current
    if (el && scroll_position_ref.current > 0) {
      el.scrollTop = scroll_position_ref.current
    }
  }, [issues])

  /**
   * Handle updating an issue.
   *
   * Dispatches field-specific mutations to the server.
   *
   * @param id - The issue ID.
   * @param patch - The update patch.
   */
  const handleUpdate = useCallback(
    async (id: string, patch: IssueUpdatePatch): Promise<void> => {
      try {
        if (typeof patch.title === "string") {
          await transport("edit-text", { id, field: "title", value: patch.title })
        }
        if (typeof patch.assignee === "string") {
          await transport("update-assignee", { id, assignee: patch.assignee })
        }
        if (typeof patch.status === "string") {
          await transport("update-status", { id, status: patch.status })
        }
        if (typeof patch.priority === "number") {
          await transport("update-priority", { id, priority: patch.priority })
        }
      } catch {
        // swallow errors; UI will update on next push
      }
    },
    [transport],
  )

  /**
   * Handle navigating to an issue.
   *
   * @param id - The issue ID.
   */
  const handleNavigate = useCallback(
    (id: string): void => {
      onNavigate(id)
    },
    [onNavigate],
  )

  /**
   * Handle keyboard navigation.
   *
   * Supports:
   * - ArrowDown/ArrowUp: Move selection or move focus within same column
   * - Enter: Navigate to selected issue
   */
  const handleKeyDown = useCallback(
    (ev: React.KeyboardEvent<HTMLDivElement>): void => {
      // Handle grid cell navigation when focus is inside the table and not in an editable control
      if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
        const target = ev.target as HTMLElement
        const table = target.closest("#list-root table.table")

        if (table) {
          // Do not intercept when inside native editable controls
          const inEditable = Boolean(
            target.closest("input") || target.closest("textarea") || target.closest("select"),
          )

          if (!inEditable) {
            const cell = target.closest("td")
            if (cell && cell.parentElement) {
              const row = cell.parentElement as HTMLTableRowElement
              const tbody = row.parentElement as HTMLTableSectionElement | null
              if (tbody) {
                const rows = Array.from(tbody.querySelectorAll("tr"))
                const rowIdx = Math.max(0, rows.indexOf(row))
                const colIdx = cell.cellIndex || 0
                const nextIdx =
                  ev.key === "ArrowDown" ?
                    Math.min(rowIdx + 1, rows.length - 1)
                  : Math.max(rowIdx - 1, 0)
                const nextRow = rows[nextIdx]
                const nextCell = nextRow?.cells?.[colIdx]
                if (nextCell) {
                  const focusable = nextCell.querySelector(
                    'button:not([disabled]), [tabindex]:not([tabindex="-1"]), a[href], select:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled])',
                  ) as HTMLElement | null
                  if (focusable) {
                    ev.preventDefault()
                    focusable.focus()

                    // Also update selection to match focused row
                    const nextIssueId = nextRow.getAttribute("data-issue-id")
                    if (nextIssueId) {
                      setSelectedId(nextIssueId)
                    }
                    return
                  }
                }
              }
            }
          }
        }
      }

      // Row selection navigation (when not focused inside a cell)
      const tbody = body_ref.current?.querySelector("tbody")
      const rows = tbody ? Array.from(tbody.querySelectorAll("tr")) : []
      if (rows.length === 0) return

      // Determine current index
      let idx = localSelectedIndex >= 0 ? localSelectedIndex : 0

      if (ev.key === "ArrowDown") {
        ev.preventDefault()
        const nextIdx = Math.min(idx + 1, rows.length - 1)
        const nextRow = rows[nextIdx]
        const nextId = nextRow?.getAttribute("data-issue-id")
        if (nextId) {
          setSelectedId(nextId)
        }
      } else if (ev.key === "ArrowUp") {
        ev.preventDefault()
        const prevIdx = Math.max(idx - 1, 0)
        const prevRow = rows[prevIdx]
        const prevId = prevRow?.getAttribute("data-issue-id")
        if (prevId) {
          setSelectedId(prevId)
        }
      } else if (ev.key === "Enter") {
        ev.preventDefault()
        const currentRow = rows[idx]
        const id = currentRow?.getAttribute("data-issue-id")
        if (id) {
          onNavigate(id)
        }
      }
    },
    [localSelectedIndex, onNavigate, setSelectedId],
  )

  return (
    <div data-testid={testId} ref={container_ref} tabIndex={0} onKeyDown={handleKeyDown}>
      {/* Filter bar */}
      <FilterBar />

      {/* Issue list body */}
      <div className="panel__body" id="list-root" ref={body_ref}>
        {filteredCount === 0 ?
          <div className="issues-block">
            <div className="muted" style={{ padding: "10px 12px" }}>
              No issues
            </div>
          </div>
        : <div className="issues-block">
            <table className="table" role="grid" aria-rowcount={filteredCount} aria-colcount={7}>
              <colgroup>
                <col style={{ width: "100px" }} />
                <col style={{ width: "120px" }} />
                <col />
                <col style={{ width: "120px" }} />
                <col style={{ width: "160px" }} />
                <col style={{ width: "130px" }} />
                <col style={{ width: "80px" }} />
              </colgroup>
              <thead>
                <tr role="row">
                  <th role="columnheader">ID</th>
                  <th role="columnheader">Type</th>
                  <th role="columnheader">Title</th>
                  <th role="columnheader">Status</th>
                  <th role="columnheader">Assignee</th>
                  <th role="columnheader">Priority</th>
                  <th role="columnheader">Deps</th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {issues.map(issue => (
                  <IssueRow
                    key={issue.id}
                    issue={issue as IssueRowData}
                    selected={issue.id === selected_id}
                    row_class="issue-row"
                    onNavigate={handleNavigate}
                    onUpdate={handleUpdate}
                  />
                ))}
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  )
}
