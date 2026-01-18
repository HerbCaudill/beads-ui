/**
 * DetailView container component.
 *
 * Displays the full details of an issue in a modal dialog. This is the main container
 * for the issue detail view, which includes:
 * - Header with editable title
 * - Properties panel (status, priority, type, assignee)
 * - Description, design, notes, and acceptance criteria sections
 * - Labels section
 * - Dependencies and dependents lists
 * - Comments section
 *
 * The component uses React context to provide issue data and transport function
 * to child components, enabling them to read and update issue data.
 */
import { createContext, useCallback, useContext, useMemo, useState } from "react"

import type { IssueDetail, Comment, DependencyRef } from "../../types/issues.js"
import { useIssueStore } from "../hooks/index.js"
import { useTransport, type TransportFn } from "../hooks/use-transport.js"
import { parseView, type ViewName } from "../router.js"
import { DetailHeader } from "./DetailHeader.js"
import { DetailProperties } from "./DetailProperties.js"
import { EditableMarkdownField } from "./EditableMarkdownField.js"
import { LabelsSection } from "./LabelsSection.js"

/**
 * Context value for DetailView children.
 *
 * Provides access to the current issue data and transport function for mutations.
 */
export interface DetailContextValue {
  /** The current issue being displayed. */
  issue: IssueDetail | null
  /** Whether data is loading. */
  loading: boolean
  /** Transport function for sending mutations to the server. */
  transport: TransportFn
  /** Navigate to another issue. */
  onNavigate: (id: string) => void
}

/**
 * React context for DetailView.
 *
 * Child components use this context to access issue data and the transport function.
 */
export const DetailContext = createContext<DetailContextValue | null>(null)

/**
 * Hook to access the DetailContext.
 *
 * @throws Error if used outside of a DetailView component.
 * @returns The DetailContext value.
 */
export function useDetailContext(): DetailContextValue {
  const context = useContext(DetailContext)
  if (!context) {
    throw new Error("useDetailContext must be used within a DetailView component")
  }
  return context
}

/**
 * Props for the DetailView component.
 */
export interface DetailViewProps {
  /** The ID of the issue to display. */
  issueId: string
  /** Handler for navigating to another issue. */
  onNavigate: (id: string) => void
  /** Optional test ID for testing. */
  testId?: string
}

/**
 * Placeholder component for DependencyList.
 *
 * Will be replaced with the actual DependencyList component in a subsequent issue.
 */
function DependencyListPlaceholder({
  title,
  items,
}: {
  title: "Dependencies" | "Dependents"
  items: DependencyRef[]
}): React.JSX.Element {
  const testId =
    title === "Dependencies" ? "detail-dependencies-placeholder" : "detail-dependents-placeholder"
  return (
    <div className="props-card" data-testid={testId}>
      <div>
        <div className="props-card__title">{title}</div>
      </div>
      <ul>
        {items.map(dep => (
          <li key={dep.id}>
            <span className="text-truncate">{dep.title || dep.id}</span>
          </li>
        ))}
      </ul>
      <div className="props-card__footer">
        <input type="text" placeholder="Issue ID" disabled />
        <button disabled>Add</button>
      </div>
    </div>
  )
}

/**
 * Placeholder component for CommentSection.
 *
 * Will be replaced with the actual CommentSection component in a subsequent issue.
 */
function CommentSectionPlaceholder({ comments }: { comments: Comment[] }): React.JSX.Element {
  return (
    <div className="comments" data-testid="detail-comments-placeholder">
      <div className="props-card__title">Comments</div>
      {comments.length === 0 ?
        <div className="muted">No comments yet</div>
      : comments.map(comment => (
          <div key={comment.id} className="comment-item">
            <div className="comment-header">
              <span className="comment-author">{comment.author || "Unknown"}</span>
              <span className="comment-date">{comment.created_at || ""}</span>
            </div>
            <div className="comment-text">{comment.text}</div>
          </div>
        ))
      }
      <div className="comment-input">
        <textarea placeholder="Add a comment..." rows={3} disabled />
        <button disabled>Add Comment</button>
      </div>
    </div>
  )
}

/**
 * Props for the DeleteConfirmDialog component.
 */
interface DeleteConfirmDialogProps {
  /** Whether the dialog is open. */
  isOpen: boolean
  /** The ID of the issue to delete. */
  issueId: string
  /** The title of the issue to delete. */
  issueTitle: string
  /** Handler called when the user confirms deletion. */
  onConfirm: () => void
  /** Handler called when the user cancels deletion. */
  onCancel: () => void
}

/**
 * DeleteConfirmDialog component.
 *
 * Renders a confirmation dialog for deleting an issue.
 * Will be replaced with a full component in a subsequent issue.
 */
function DeleteConfirmDialog({
  isOpen,
  issueId,
  issueTitle,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps): React.JSX.Element | null {
  if (!isOpen) return null

  return (
    <dialog
      open
      id="delete-confirm-dialog"
      role="alertdialog"
      aria-modal="true"
      data-testid="delete-confirm-dialog"
    >
      <div className="delete-confirm">
        <h2 className="delete-confirm__title">Delete Issue</h2>
        <p className="delete-confirm__message">
          Are you sure you want to delete issue <strong>{issueId}</strong> —{" "}
          <strong>{issueTitle || "(no title)"}</strong>? This action cannot be undone.
        </p>
        <div className="delete-confirm__actions">
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn danger" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </dialog>
  )
}

/**
 * DetailView container component.
 *
 * Renders the full issue detail view with all sections. Uses React context to
 * provide issue data and transport to child components.
 *
 * The component subscribes to the issue store using the `detail:${issueId}` client_id
 * pattern to receive real-time updates when the issue data changes.
 *
 * @param props - Component props.
 */
export function DetailView({ issueId, onNavigate, testId }: DetailViewProps): React.JSX.Element {
  // Get transport for mutations
  const transport = useTransport()

  // Subscribe to issue store for this specific issue
  const client_id = `detail:${issueId}`
  const issues = useIssueStore(client_id)

  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  // Find the specific issue from the store
  const issue = useMemo(() => {
    if (!issues || issues.length === 0) return null
    // Find the issue matching the ID, or use the first one if not found
    const found = issues.find(i => i.id === issueId)
    return (found || issues[0]) as IssueDetail | null
  }, [issues, issueId])

  // Create context value
  const contextValue = useMemo<DetailContextValue>(
    () => ({
      issue,
      loading: !issue,
      transport,
      onNavigate,
    }),
    [issue, transport, onNavigate],
  )

  /**
   * Handle delete button click - opens the confirmation dialog.
   */
  const handleDeleteClick = useCallback((): void => {
    setIsDeleteDialogOpen(true)
  }, [])

  /**
   * Handle delete confirmation.
   */
  const handleDeleteConfirm = useCallback(async (): Promise<void> => {
    if (!issue) return

    setIsDeleteDialogOpen(false)

    try {
      await transport("delete-issue", { id: issue.id })
      // Navigate back to the current view (list or board)
      const currentHash = typeof window !== "undefined" ? window.location.hash || "" : ""
      const view: ViewName = parseView(currentHash)
      onNavigate(`#/${view}`)
    } catch (error) {
      console.error("Failed to delete issue:", error)
      // The transport layer should handle showing error toast
    }
  }, [issue, transport, onNavigate])

  /**
   * Handle delete cancellation.
   */
  const handleDeleteCancel = useCallback((): void => {
    setIsDeleteDialogOpen(false)
  }, [])

  // Loading state
  if (!issue) {
    return (
      <div className="panel__body" id="detail-root" data-testid={testId}>
        <p className="muted">Loading...</p>
      </div>
    )
  }

  // Extract fields with defaults
  const description = issue.description || ""
  const design = issue.design || ""
  const notes = issue.notes || ""
  const acceptance = issue.acceptance || ""
  const labels = issue.labels || []
  const dependencies = issue.dependencies || []
  const dependents = issue.dependents || []
  const comments = issue.comments || []

  return (
    <DetailContext.Provider value={contextValue}>
      <div className="panel__body" id="detail-root" data-testid={testId}>
        <div className="detail-layout">
          {/* Main content area */}
          <div className="detail-main">
            <DetailHeader testId="detail-header" />
            <EditableMarkdownField
              field="description"
              value={description}
              label="Description"
              placeholder="Description"
              testId="detail-description"
            />
            <EditableMarkdownField
              field="design"
              value={design}
              label="Design"
              placeholder="Add design..."
              testId="detail-design"
            />
            <EditableMarkdownField
              field="notes"
              value={notes}
              label="Notes"
              placeholder="Add notes..."
              testId="detail-notes"
            />
            <EditableMarkdownField
              field="acceptance"
              value={acceptance}
              label="Acceptance Criteria"
              placeholder="Add acceptance criteria..."
              className="acceptance"
              testId="detail-acceptance"
            />
            <CommentSectionPlaceholder comments={comments} />
          </div>

          {/* Sidebar */}
          <div className="detail-side">
            <DetailProperties onDelete={handleDeleteClick} testId="detail-properties" />
            <LabelsSection labels={labels} testId="detail-labels" />
            <DependencyListPlaceholder title="Dependencies" items={dependencies} />
            <DependencyListPlaceholder title="Dependents" items={dependents} />
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        issueId={issue.id}
        issueTitle={issue.title || ""}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </DetailContext.Provider>
  )
}
