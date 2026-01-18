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
import { useCallback, useEffect, useRef } from "react"

import { useListData } from "../hooks/index.js"
import { useTransport } from "../hooks/use-transport.js"
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

  // Ref for scroll position preservation
  const body_ref = useRef<HTMLDivElement>(null)
  const scroll_position_ref = useRef<number>(0)

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

  return (
    <div data-testid={testId}>
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
